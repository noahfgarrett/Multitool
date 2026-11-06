/**
 * Extra PDF Annotate helpers for the pdf-annotate-v2 specs.
 *
 * Each rendered page now has three canvases (pdf-canvas, ann-canvas, active-canvas).
 * Pointer events and the tool cursor live on canvas.active-canvas, and the right
 * toolbar keeps its secondary tools (Stamp, Crop, OCR, Sticky Note...) behind a
 * "More tools" expander. Several features moved into the header "More" menu.
 */
import { type Page, type Locator, expect } from '@playwright/test'
import { selectTool } from './pdf-annotate'

/** The interactive (top) canvas of the first page: carries the tool cursor */
export function activeCanvas(page: Page): Locator {
  return page.locator('canvas.active-canvas').first()
}

/** Computed CSS cursor on the first page's interactive canvas */
export async function canvasCursor(page: Page): Promise<string> {
  return activeCanvas(page).evaluate(el => getComputedStyle(el).cursor)
}

/** The bottom status bar hint for the active tool (e.g. "· Shift to snap angles") */
export function statusHint(page: Page, text: string | RegExp): Locator {
  return page.locator('span.truncate').filter({ hasText: text })
}

/** Status-bar hints for the shape tools */
export const HINT_LINE = /Shift to snap angles/
export const HINT_SHAPE = /Shift = constrain, Alt = from center/

// ── Right toolbar ──────────────────────────────────────────

/** The "More tools" expander in the right toolbar (not the header "More" menu) */
export function sidebarMoreTools(page: Page): Locator {
  return page.locator('div:has(> button[title="Select (S)"]) > button[title="More tools"]')
}

/** Expand the right toolbar's secondary tools (Stamp, Crop, Image Stamp, OCR, Sticky Note) */
export async function openSecondaryTools(page: Page) {
  const stamp = page.locator('button[title="Stamp"]')
  if (await stamp.isVisible()) return
  await sidebarMoreTools(page).click()
  await expect(stamp).toBeVisible()
}

/** Click a secondary tool button in the right toolbar, expanding it first */
export async function clickSecondaryTool(page: Page, title: string) {
  await openSecondaryTools(page)
  await page.locator(`button[title="${title}"]`).click()
}

// ── Header "More" menu ─────────────────────────────────────

/** The header "More" dropdown trigger */
export function headerMoreButton(page: Page): Locator {
  return page.locator('button[title="More tools"]').filter({ hasText: 'More' }).first()
}

/** An item of the header "More" dropdown, by its exact label */
export function headerMoreItem(page: Page, label: string): Locator {
  return page.locator('div.absolute button').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })
}

/** Open the header "More" dropdown and click one of its items */
export async function chooseHeaderMoreItem(page: Page, label: string) {
  const item = headerMoreItem(page, label)
  if (!(await item.isVisible())) await headerMoreButton(page).click()
  await expect(item).toBeVisible()
  await item.click()
}

// ── Page-aware canvas interaction ──────────────────────────

/** Current page number from the "N / M" page indicator */
export async function currentPageNum(page: Page): Promise<number> {
  const indicator = page.locator('text=/^\\s*\\d+ \\/ \\d+\\s*$/')
  if (await indicator.count() > 0) {
    const m = (await indicator.first().textContent())?.match(/(\d+)\s*\//)
    if (m) return parseInt(m[1], 10)
  }
  return 1
}

/** The interactive canvas for the page currently shown in the page indicator */
async function currentCanvasBox(page: Page) {
  const pageNum = await currentPageNum(page)
  const canvas = page.locator(`[data-page="${pageNum}"] canvas.active-canvas`)
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  const box = await canvas.boundingBox()
  if (!box) throw new Error(`Canvas for page ${pageNum} not found`)
  return box
}

export async function drawOnCanvas(page: Page, points: { x: number; y: number }[]) {
  if (points.length < 2) return
  const box = await currentCanvasBox(page)
  await page.mouse.move(box.x + points[0].x, box.y + points[0].y)
  await page.mouse.down()
  for (let i = 1; i < points.length; i++) {
    await page.mouse.move(box.x + points[i].x, box.y + points[i].y, { steps: 5 })
  }
  await page.mouse.up()
}

export async function dragOnCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const box = await currentCanvasBox(page)
  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 5 })
  await page.mouse.up()
}

export async function clickCanvasAt(page: Page, x: number, y: number) {
  const box = await currentCanvasBox(page)
  await page.mouse.click(box.x + x, box.y + y)
}

export async function doubleClickCanvasAt(page: Page, x: number, y: number) {
  const box = await currentCanvasBox(page)
  await page.mouse.dblclick(box.x + x, box.y + y)
}

/** Same as the shared createAnnotation, but draws on the current page's canvas */
export async function createAnnotation(
  page: Page,
  type: 'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'callout',
  region?: { x: number; y: number; w: number; h: number },
) {
  const r = region ?? { x: 100, y: 100, w: 120, h: 80 }
  const drag = () => dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  switch (type) {
    case 'pencil':
      await selectTool(page, 'Pencil (P)')
      await drawOnCanvas(page, [
        { x: r.x, y: r.y },
        { x: r.x + r.w * 0.3, y: r.y + r.h * 0.7 },
        { x: r.x + r.w * 0.6, y: r.y + r.h * 0.2 },
        { x: r.x + r.w, y: r.y + r.h },
      ])
      break
    case 'rectangle': await selectTool(page, 'Rectangle (R)'); await drag(); break
    case 'circle': await selectTool(page, 'Circle (C)'); await drag(); break
    case 'arrow': await selectTool(page, 'Arrow (A)'); await drag(); break
    case 'line': await selectTool(page, 'Line (L)'); await drag(); break
    case 'text':
      await selectTool(page, 'Text (T)')
      await drag()
      await page.keyboard.type('Test text')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      break
    case 'callout':
      await selectTool(page, 'Callout (O)')
      await drag()
      await page.keyboard.type('Callout')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      break
  }
  await page.waitForTimeout(200)
}

// ── Annotation context menu ────────────────────────────────

/** Right-click on the first page's interactive canvas (the ann-canvas sits underneath it) */
export async function rightClickCanvasAt(page: Page, x: number, y: number) {
  await activeCanvas(page).click({ position: { x, y }, button: 'right' })
}

/** The annotation right-click menu */
export function contextMenu(page: Page): Locator {
  return page.locator('div.fixed.z-50').filter({ has: page.locator('button', { hasText: 'Bring to Front' }) })
}

/** A context menu entry by its exact label (e.g. "Duplicate", "Delete", "Copy Style") */
export function contextMenuItem(page: Page, label: string): Locator {
  return contextMenu(page).locator(`button:has(> span:text-is("${label}")), button:text-is("${label}")`)
}

// ── OCR ────────────────────────────────────────────────────

/**
 * Region OCR uses Tesseract, which downloads its worker, core and language data
 * from cdn.jsdelivr.net. Abort those requests so a scan deterministically ends in
 * the "OCR scan failed" path instead of depending on internet access.
 */
export async function blockTesseractCdn(page: Page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data)/, route => route.abort())
}

// ── State-based waits (instead of fixed sleeps) ────────────

/** The "N ann" counter in the status bar (current page) */
export function annCountLabel(page: Page): Locator {
  return page.locator('span').filter({ hasText: /^\d+ ann$/ })
}

/** The "N / M" page indicator button in the top bar */
export function pageIndicator(page: Page): Locator {
  return page.locator('button').filter({ hasText: /^\s*\d+ \/ \d+\s*$/ })
}

/** Jump to a page via the page input and wait until the indicator shows it */
export async function jumpToPage(page: Page, pageNum: number) {
  await pageIndicator(page).click()
  const input = page.locator('input[type="number"][min="1"]')
  await input.fill(String(pageNum))
  await input.press('Enter')
  await expect(pageIndicator(page)).toHaveText(new RegExp(`^\\s*${pageNum} / \\d+\\s*$`))
}

/**
 * Draw many pencil strokes on page 1 without per-stroke sleeps (the pencil tool stays
 * active between strokes), then wait until the status bar counts all of them.
 * Each region gets the same curved stroke shape the shared createAnnotation uses.
 */
export async function drawPencilStrokes(page: Page, regions: { x: number; y: number; w: number; h: number }[]) {
  const before = parseInt(((await annCountLabel(page).textContent()) ?? '0').trim(), 10)
  await page.keyboard.press('p')
  const canvas = activeCanvas(page)
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  for (const r of regions) {
    const pts = [
      { x: r.x, y: r.y },
      { x: r.x + r.w * 0.3, y: r.y + r.h * 0.7 },
      { x: r.x + r.w * 0.6, y: r.y + r.h * 0.2 },
      { x: r.x + r.w, y: r.y + r.h },
    ]
    await page.mouse.move(box.x + pts[0].x, box.y + pts[0].y)
    await page.mouse.down()
    for (const p of pts.slice(1)) await page.mouse.move(box.x + p.x, box.y + p.y, { steps: 3 })
    await page.mouse.up()
  }
  await expect(annCountLabel(page)).toHaveText(`${before + regions.length} ann`)
}
