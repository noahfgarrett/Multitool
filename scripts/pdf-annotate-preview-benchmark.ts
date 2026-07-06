import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium, type BrowserContext, type Page } from 'playwright'
import {
  evaluatePreviewTargets,
  summarizeFrameDeltas,
  type PreviewBenchmarkSummary,
} from '../src/tools/pdf-annotate/previewBenchmarkMetrics.ts'

const MB = 1024 * 1024
const DEFAULT_PORT = Number(process.env.MULTITOOL_BENCH_PORT ?? 5194)
const APP_URL = process.env.MULTITOOL_URL ?? `http://127.0.0.1:${DEFAULT_PORT}/`
const PDF_PATH = process.env.MULTITOOL_PDF ?? '/Users/noahgarrett/Downloads/Elec 4-14-25.pdf'
const OUT_PATH = process.env.MULTITOOL_BENCH_OUT ?? '/tmp/multitool-pdf-annotate-preview-benchmark.json'
const SHOT_PATH = process.env.MULTITOOL_BENCH_SHOT ?? '/tmp/multitool-pdf-annotate-preview-benchmark.png'
const HEADLESS = process.env.MULTITOOL_HEADLESS !== '0'

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

interface PsRow {
  pid: number
  ppid: number
  rssKB: number
  command: string
}

interface VisibleSurfaceMetrics {
  visiblePageNumbers: number[]
  visiblePageCount: number
  significantVisiblePageCount: number
  readablePageCount: number
  coveredPageCount: number
  settledWhitePageCount: number
  visibleSurfaceCoverageRatio: number
  tileCoverageRatio: number
  tileCanvasCount: number
  blackCanvasLikeCount: number
  bottomGapPx: number
  scrollTop: number
  maxScrollTop: number
  zoomText: string
}

interface PhaseResult {
  label: string
  ms: number
  metrics: VisibleSurfaceMetrics
}

function psRows(): PsRow[] {
  const out = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,command='], { encoding: 'utf8' })
  return out.trim().split('\n').map(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/)
    if (!match) return null
    return {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      rssKB: Number(match[3]),
      command: match[4] ?? '',
    }
  }).filter((row): row is PsRow => !!row)
}

function processTreeRssMB(rootPid: number | null): number | null {
  if (!rootPid) return null
  const rows = psRows()
  const children = new Map<number, PsRow[]>()
  for (const row of rows) {
    const list = children.get(row.ppid) ?? []
    list.push(row)
    children.set(row.ppid, list)
  }

  const stack = [rootPid]
  const seen = new Set<number>()
  let rssKB = 0
  while (stack.length) {
    const pid = stack.pop()
    if (!pid || seen.has(pid)) continue
    seen.add(pid)
    const row = rows.find(candidate => candidate.pid === pid)
    if (row) rssKB += row.rssKB
    for (const child of children.get(pid) ?? []) stack.push(child.pid)
  }
  return rssKB / 1024
}

function findBrowserPidByUserDataDir(userDataDir: string): number | null {
  const rows = psRows().filter(row => row.command.includes(userDataDir))
  const browser = rows.find(row => !row.command.includes('--type=')) ?? rows[0]
  return browser?.pid ?? null
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until Vite is ready.
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function startServerIfNeeded(): Promise<ChildProcess | null> {
  if (process.env.MULTITOOL_URL) {
    await waitForServer(APP_URL)
    return null
  }

  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(npmBin, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(DEFAULT_PORT)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', () => {})
  child.stderr?.on('data', () => {})
  await waitForServer(APP_URL)
  return child
}

async function stopServer(child: ChildProcess | null): Promise<void> {
  if (!child || child.killed) return
  child.kill('SIGTERM')
  await sleep(250)
  if (!child.killed) child.kill('SIGKILL')
}

async function installFrameProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = {
      active: false,
      last: 0,
      frames: [] as number[],
      raf: 0,
    }
    const tick = (time: number): void => {
      if (state.active && state.last) state.frames.push(time - state.last)
      state.last = time
      state.raf = requestAnimationFrame(tick)
    }
    state.raf = requestAnimationFrame(tick)
    Object.defineProperty(window, '__mtPreviewBench', {
      value: {
        startFrames() {
          state.frames = []
          state.last = 0
          state.active = true
        },
        stopFrames() {
          state.active = false
          return state.frames.slice()
        },
      },
      configurable: true,
    })
  })
}

async function getVisibleMetrics(page: Page): Promise<VisibleSurfaceMetrics> {
  return page.evaluate(() => {
    const scroll = document.querySelector<HTMLElement>('[data-testid="pdf-scroll"]')
    const scrollRect = scroll?.getBoundingClientRect()
    const zoomText = document.querySelector('button[title="Zoom presets"]')?.textContent?.trim() ?? ''
    if (!scroll || !scrollRect) {
      return {
        visiblePageNumbers: [],
        visiblePageCount: 0,
        significantVisiblePageCount: 0,
        readablePageCount: 0,
        coveredPageCount: 0,
        settledWhitePageCount: 0,
        visibleSurfaceCoverageRatio: 0,
        tileCoverageRatio: 0,
        tileCanvasCount: 0,
        blackCanvasLikeCount: 0,
        bottomGapPx: 0,
        scrollTop: 0,
        maxScrollTop: 0,
        zoomText,
      }
    }

    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = 64
    sampleCanvas.height = 64
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })

    const inspectCanvas = (canvas: HTMLCanvasElement): { readable: boolean; blackLike: boolean; area: number } => {
      if (!sampleCtx || canvas.width === 0 || canvas.height === 0) return { readable: false, blackLike: false, area: 0 }
      const rect = canvas.getBoundingClientRect()
      const left = Math.max(rect.left, scrollRect.left)
      const top = Math.max(rect.top, scrollRect.top)
      const right = Math.min(rect.right, scrollRect.right)
      const bottom = Math.min(rect.bottom, scrollRect.bottom)
      const cssW = right - left
      const cssH = bottom - top
      if (cssW <= 0 || cssH <= 0 || rect.width <= 0 || rect.height <= 0) return { readable: false, blackLike: false, area: 0 }

      const sx = ((left - rect.left) / rect.width) * canvas.width
      const sy = ((top - rect.top) / rect.height) * canvas.height
      const sw = (cssW / rect.width) * canvas.width
      const sh = (cssH / rect.height) * canvas.height
      sampleCtx.clearRect(0, 0, 64, 64)
      try {
        sampleCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, 64, 64)
        const data = sampleCtx.getImageData(0, 0, 64, 64).data
        let ink = 0
        let black = 0
        let opaque = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 255
          const g = data[i + 1] ?? 255
          const b = data[i + 2] ?? 255
          const a = data[i + 3] ?? 0
          if (a < 8) continue
          opaque++
          if (r < 245 || g < 245 || b < 245) ink++
          if (r < 10 && g < 10 && b < 10) black++
        }
        return {
          readable: ink > 6,
          blackLike: opaque > 0 && black / opaque > 0.85,
          area: cssW * cssH,
        }
      } catch {
        return { readable: false, blackLike: false, area: cssW * cssH }
      }
    }

    const visiblePages = Array.from(document.querySelectorAll<HTMLElement>('[data-page]'))
      .map(pageEl => ({ pageEl, rect: pageEl.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom >= scrollRect.top && rect.top <= scrollRect.bottom)

    let readablePageCount = 0
    let coveredPageCount = 0
    let significantVisiblePageCount = 0
    let renderedSurfaceArea = 0
    let tileRenderedArea = 0
    let pageVisibleArea = 0
    let tileCanvasCount = 0
    let blackCanvasLikeCount = 0

    for (const { pageEl, rect } of visiblePages) {
      const visibleW = Math.max(0, Math.min(rect.right, scrollRect.right) - Math.max(rect.left, scrollRect.left))
      const visibleH = Math.max(0, Math.min(rect.bottom, scrollRect.bottom) - Math.max(rect.top, scrollRect.top))
      const pageArea = visibleW * visibleH
      pageVisibleArea += pageArea
      const isSignificantVisiblePage = pageArea >= scrollRect.width * scrollRect.height * 0.05
      let pageReadable = false
      let pageRenderedArea = 0

      for (const canvas of Array.from(pageEl.querySelectorAll<HTMLCanvasElement>('canvas.pdf-canvas, canvas.pdf-tile'))) {
        const inspected = inspectCanvas(canvas)
        if (canvas.width > 0 && canvas.height > 0) {
          pageRenderedArea += inspected.area
          renderedSurfaceArea += inspected.area
        }
        if (canvas.classList.contains('pdf-tile') && canvas.width > 0 && canvas.height > 0) {
          tileCanvasCount++
          tileRenderedArea += inspected.area
        }
        if (inspected.readable) pageReadable = true
        if (inspected.blackLike) blackCanvasLikeCount++
      }

      if (pageReadable) readablePageCount++
      if (isSignificantVisiblePage) {
        significantVisiblePageCount++
        if (pageRenderedArea / pageArea >= 0.85) coveredPageCount++
      }
    }

    const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight)
    return {
      visiblePageNumbers: visiblePages.map(({ pageEl }) => Number(pageEl.dataset.page)).filter(Number.isFinite),
      visiblePageCount: visiblePages.length,
      significantVisiblePageCount,
      readablePageCount,
      coveredPageCount,
      settledWhitePageCount: Math.max(0, significantVisiblePageCount - coveredPageCount),
      visibleSurfaceCoverageRatio: pageVisibleArea > 0 ? Math.min(1, renderedSurfaceArea / pageVisibleArea) : 0,
      tileCoverageRatio: pageVisibleArea > 0 ? Math.min(1, tileRenderedArea / pageVisibleArea) : 0,
      tileCanvasCount,
      blackCanvasLikeCount,
      bottomGapPx: maxScrollTop - scroll.scrollTop,
      scrollTop: scroll.scrollTop,
      maxScrollTop,
      zoomText,
    }
  })
}

async function waitForReadable(page: Page, timeoutMs = 10_000): Promise<PhaseResult> {
  const started = Date.now()
  let last = await getVisibleMetrics(page)
  while (Date.now() - started < timeoutMs) {
    last = await getVisibleMetrics(page)
    if (last.visiblePageCount > 0 && last.readablePageCount > 0) {
      return { label: 'readable', ms: Date.now() - started, metrics: last }
    }
    await sleep(50)
  }
  return { label: 'timeout', ms: Date.now() - started, metrics: last }
}

async function waitForTileCoverage(page: Page, ratio = 0.85, timeoutMs = 8_000): Promise<PhaseResult> {
  const started = Date.now()
  let last = await getVisibleMetrics(page)
  while (Date.now() - started < timeoutMs) {
    last = await getVisibleMetrics(page)
    if (last.tileCoverageRatio >= ratio && last.readablePageCount > 0) {
      return { label: 'tile-coverage', ms: Date.now() - started, metrics: last }
    }
    await sleep(50)
  }
  return { label: 'timeout', ms: Date.now() - started, metrics: last }
}

async function waitForVisibleSurfaceCoverage(page: Page, ratio = 0.95, timeoutMs = 8_000): Promise<PhaseResult> {
  const started = Date.now()
  let last = await getVisibleMetrics(page)
  while (Date.now() - started < timeoutMs) {
    last = await getVisibleMetrics(page)
    if (last.visibleSurfaceCoverageRatio >= ratio && last.readablePageCount > 0) {
      return { label: 'surface-coverage', ms: Date.now() - started, metrics: last }
    }
    await sleep(50)
  }
  return { label: 'timeout', ms: Date.now() - started, metrics: last }
}

async function scrollToRatio(page: Page, ratio: number): Promise<void> {
  await page.locator('[data-testid="pdf-scroll"]').evaluate((el, value) => {
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * value)
  }, ratio)
}

async function scrollToPage(page: Page, pageNum: number): Promise<void> {
  await page.locator('[data-testid="pdf-scroll"]').evaluate((scrollEl, targetPage) => {
    const pageEl = document.querySelector<HTMLElement>(`[data-page="${targetPage}"]`)
    if (!pageEl) return
    scrollEl.scrollTop = Math.max(0, pageEl.offsetTop - 24)
  }, pageNum)
}

async function zoomTo(page: Page, percent: number): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const text = (await page.locator('button[title="Zoom presets"]').innerText()).trim()
    if (text === `${percent}%`) return
    const current = Number(text.replace(/[^\d.]/g, ''))
    await page.keyboard.press(current < percent ? 'Meta+=' : 'Meta+-')
    await sleep(100)
  }
}

async function activeWheelScroll(page: Page): Promise<number[]> {
  const scroll = page.locator('[data-testid="pdf-scroll"]')
  const box = await scroll.boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.evaluate(() => {
    const bench = (window as unknown as { __mtPreviewBench?: { startFrames: () => void } }).__mtPreviewBench
    bench?.startFrames()
  })
  for (let i = 0; i < 90; i++) {
    await page.mouse.wheel(0, i % 12 === 0 ? 900 : 520)
    await sleep(16)
  }
  await sleep(120)
  return page.evaluate(() => {
    const bench = (window as unknown as { __mtPreviewBench?: { stopFrames: () => number[] } }).__mtPreviewBench
    return bench?.stopFrames() ?? []
  })
}

async function runBenchmark(): Promise<void> {
  mkdirSync(dirname(OUT_PATH), { recursive: true })
  const server = await startServerIfNeeded()
  let context: BrowserContext | null = null
  let userDataDir: string | null = null
  const memorySamples: Array<{ label: string; ms: number; rssMb: number | null }> = []
  const phases: Record<string, PhaseResult | number | string[]> = {}
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const startedAt = Date.now()

  try {
    userDataDir = mkdtempSync(join(tmpdir(), 'multitool-pdf-bench-'))
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: HEADLESS,
      viewport: { width: 1440, height: 950 },
      deviceScaleFactor: 1,
    })
    const browserPid = findBrowserPidByUserDataDir(userDataDir)
    await context.route('https://api.github.com/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', assets: [] }),
    }))

    const page = context.pages()[0] ?? await context.newPage()
    await page.addInitScript({ content: 'window.__name = target => target;' })
    await installFrameProbe(page)
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', error => pageErrors.push(String(error)))
    await page.addInitScript(() => {
      localStorage.setItem('mt-user-profile', JSON.stringify({
        name: 'Benchmark User',
        email: 'benchmark@test.com',
        initials: 'BU',
        jobTitle: '',
        company: '',
        photo: '',
      }))
    })

    let currentStage = 'launch'
    let sampling = true
    const sampler = (async () => {
      while (sampling) {
        memorySamples.push({
          label: currentStage,
          ms: Date.now() - startedAt,
          rssMb: processTreeRssMB(browserPid),
        })
        await sleep(250)
      }
    })()

    currentStage = 'load'
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.evaluate('window.__name = target => target')
    await page.locator('nav button').filter({ hasText: 'PDF Annotate' }).click()
    const uploadStarted = Date.now()
    await page.locator('input[type="file"]').setInputFiles(PDF_PATH)
    await page.locator('[data-testid="pdf-scroll"]').waitFor({ state: 'visible', timeout: 120_000 })
    const coldFirst = await waitForReadable(page, 20_000)
    coldFirst.ms = Date.now() - uploadStarted
    phases.coldFirst = coldFirst

    currentStage = 'active-scroll'
    const frameDeltas = await activeWheelScroll(page)
    const activeScrollFrames = summarizeFrameDeltas(frameDeltas)
    phases.activeScrollFrameCount = frameDeltas.length

    phases.afterActiveScroll = await waitForVisibleSurfaceCoverage(page, 0.95, 10_000)

    currentStage = 'one-notch'
    await waitForReadable(page, 10_000)
    const oneNotchStarted = Date.now()
    await page.mouse.wheel(0, 700)
    const oneNotch = await waitForReadable(page, 5_000)
    oneNotch.ms = Date.now() - oneNotchStarted
    phases.oneNotch = oneNotch

    currentStage = 'warm-pages'
    for (const pageNum of [1, 76, 121]) {
      await scrollToPage(page, pageNum)
      await waitForReadable(page, 10_000)
      await waitForVisibleSurfaceCoverage(page, 0.95, 10_000)
    }

    currentStage = 'revisit'
    await scrollToPage(page, 1)
    const revisitStarted = Date.now()
    await scrollToPage(page, 76)
    const revisit = await waitForReadable(page, 5_000)
    revisit.ms = Date.now() - revisitStarted
    phases.revisit = revisit

    currentStage = 'high-zoom'
    await zoomTo(page, 400)
    const highZoomStarted = Date.now()
    const highZoomFirstTile = await waitForReadable(page, 8_000)
    highZoomFirstTile.ms = Date.now() - highZoomStarted
    const highZoomCoverage = await waitForTileCoverage(page, 0.85, 10_000)
    highZoomCoverage.ms = Date.now() - highZoomStarted
    phases.highZoomFirstTile = highZoomFirstTile
    phases.highZoomCoverage = highZoomCoverage

    currentStage = 'bottom'
    await scrollToRatio(page, 1)
    const bottomPhase = await waitForVisibleSurfaceCoverage(page, 0.85, 5_000)
    const bottom = bottomPhase.metrics
    phases.bottom = { ...bottomPhase, label: 'bottom' }

    currentStage = 'settled'
    await zoomTo(page, 100)
    await scrollToPage(page, 1)
    await sleep(1600)
    const settled = await getVisibleMetrics(page)
    phases.settled = { label: 'settled', ms: 0, metrics: settled }
    await page.screenshot({ path: SHOT_PATH, fullPage: false })

    sampling = false
    await sampler

    const rssValues = memorySamples
      .map(sample => sample.rssMb)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const peakRssMb = rssValues.length ? Math.max(...rssValues) : 0
    const settledRssMb = rssValues.at(-1) ?? 0
    const settledWhitePages = [
      (phases.afterActiveScroll as PhaseResult | undefined)?.metrics.settledWhitePageCount ?? 0,
      (phases.oneNotch as PhaseResult | undefined)?.metrics.settledWhitePageCount ?? 0,
      (phases.revisit as PhaseResult | undefined)?.metrics.settledWhitePageCount ?? 0,
      (phases.highZoomCoverage as PhaseResult | undefined)?.metrics.settledWhitePageCount ?? 0,
    ]

    const summary: PreviewBenchmarkSummary = {
      activeScrollFrames,
      oneNotchRevisitReadableMs: (phases.oneNotch as PhaseResult).ms,
      coldFirstReadableMs: (phases.coldFirst as PhaseResult).ms,
      revisitReadableMs: (phases.revisit as PhaseResult).ms,
      highZoomFirstTileMs: (phases.highZoomFirstTile as PhaseResult).ms,
      highZoomVisibleCoverageMs: (phases.highZoomCoverage as PhaseResult).ms,
      peakRssMb,
      settledRssMb,
      correctness: {
        noBlackCanvases: Object.values(phases).every(value => {
          if (typeof value !== 'object' || !value || !('metrics' in value)) return true
          return (value as PhaseResult).metrics.blackCanvasLikeCount === 0
        }),
        noConsoleErrors: consoleErrors.length === 0,
        noPageErrors: pageErrors.length === 0,
        noBottomVoid: bottom.visiblePageCount > 0 && bottom.bottomGapPx <= 60,
        noSettledWhitePages: settledWhitePages.every(count => count === 0),
      },
    }

    const report = {
      appUrl: APP_URL,
      pdfPath: PDF_PATH,
      screenshot: SHOT_PATH,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      summary,
      targets: evaluatePreviewTargets(summary),
      phases,
      memorySamples,
      consoleErrors,
      pageErrors,
    }

    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({
      outPath: OUT_PATH,
      screenshot: SHOT_PATH,
      summary,
      targets: report.targets,
    }, null, 2))
  } finally {
    if (context) await context.close().catch(() => {})
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true })
    await stopServer(server)
  }
}

runBenchmark().catch(error => {
  console.error(error)
  process.exitCode = 1
})
