import { type Page, type Locator } from '@playwright/test'

/** The zoom-percentage button in the top bar that toggles the preset dropdown */
export function zoomPresetsButton(page: Page): Locator {
  return page.locator('button[title="Zoom presets"]')
}

/** The zoom preset dropdown (rendered right after the zoom-percentage button) */
export function zoomMenu(page: Page): Locator {
  return page.locator('button[title="Zoom presets"] + div')
}

/** A single option in the zoom dropdown, matched exactly ("50%", "Fit Page", ...) */
export function zoomOption(page: Page, label: string): Locator {
  return zoomMenu(page).getByRole('button', { name: label, exact: true })
}

/** Open the zoom dropdown and pick a preset; waits until the zoom label shows it */
export async function chooseZoomPreset(page: Page, label: string) {
  await zoomPresetsButton(page).click()
  await zoomOption(page, label).click()
  if (/^\d+%$/.test(label)) {
    await page.waitForFunction(
      (want) => document.querySelector('button[title="Zoom presets"]')?.textContent?.trim() === want,
      label,
    )
  }
}

/**
 * Hash of a page canvas layer's backing pixels ("WxH:sha256").
 *
 * Element screenshots of the page are not reproducible any more (toasts, layout
 * shifts from the properties bar, tiled re-renders), so visual before/after checks
 * compare the canvas bitmaps directly instead:
 *  - 'ann' is the annotation layer (annotations, selection handles, hover outline)
 *  - 'pdf' is the rendered PDF page
 */
export async function canvasLayerHash(page: Page, layer: 'ann' | 'pdf', pageNum = 1): Promise<string> {
  return page.locator(`[data-page="${pageNum}"] canvas.${layer}-canvas`).evaluate(async (el) => {
    const cv = el as HTMLCanvasElement
    if (!cv.width || !cv.height) return `${cv.width}x${cv.height}:empty`
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data
    const digest = await crypto.subtle.digest('SHA-256', data)
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${cv.width}x${cv.height}:${hex}`
  })
}

/** Annotation-layer hash of page 1 (see canvasLayerHash) */
export function annotationLayerHash(page: Page, pageNum = 1) {
  return canvasLayerHash(page, 'ann', pageNum)
}

/** Rotation of a page as stored in the session ("pageRotations"), 0 when unrotated */
export async function getPageRotation(page: Page, pageNum = 1): Promise<number> {
  return page.evaluate((pn) => {
    const raw = sessionStorage.getItem('mt-pdf-annotate-session')
    const rot = raw ? JSON.parse(raw)?.pageRotations?.[pn] : undefined
    return rot ?? 0
  }, pageNum)
}

/**
 * canvasLayerHash once the layer has painted something and stopped changing
 * (two reads 250ms apart agree). Use for the PDF layer, which re-renders
 * asynchronously after rotation/zoom.
 */
export async function settledLayerHash(page: Page, layer: 'ann' | 'pdf', pageNum = 1, timeout = 15000): Promise<string> {
  const painted = () => page.locator(`[data-page="${pageNum}"] canvas.${layer}-canvas`).evaluate((el) => {
    const cv = el as HTMLCanvasElement
    if (!cv.width || !cv.height) return false
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data
    for (let i = 3; i < d.length; i += 4) if (d[i]) return true
    return false
  })
  const deadline = Date.now() + timeout
  let prev = ''
  while (Date.now() < deadline) {
    const cur = (await painted()) ? await canvasLayerHash(page, layer, pageNum) : ''
    if (cur && cur === prev) return cur
    prev = cur
    await page.waitForTimeout(250)
  }
  throw new Error(`${layer} layer of page ${pageNum} did not settle within ${timeout}ms`)
}

/** Rendered size of a page container in unscaled page units, e.g. "612x792" */
export async function pageBoxSize(page: Page, pageNum = 1): Promise<string> {
  return page.locator(`[data-page="${pageNum}"]`).evaluate((el) => {
    const s = (el as HTMLElement).style
    return `${Math.round(parseFloat(s.width))}x${Math.round(parseFloat(s.height))}`
  })
}

/**
 * Scroll the document viewer back to its top-left corner. Zoom presets zoom
 * around the viewport centre, so at >100% the top-left of page 1 (where the
 * canvas-relative drawing helpers aim) is scrolled out of view.
 */
export async function scrollViewerToOrigin(page: Page) {
  await page.locator('[data-testid="pdf-scroll"]').evaluate((el) => el.scrollTo({ left: 0, top: 0, behavior: 'instant' as ScrollBehavior }))
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="pdf-scroll"]')
    return !!el && el.scrollTop === 0 && el.scrollLeft === 0
  })
  await page.waitForTimeout(150)
}

/** Number of non-transparent pixels on a page canvas layer */
export async function paintedPixelCount(page: Page, layer: 'ann' | 'pdf', pageNum = 1): Promise<number> {
  return page.locator(`[data-page="${pageNum}"] canvas.${layer}-canvas`).evaluate((el) => {
    const cv = el as HTMLCanvasElement
    if (!cv.width || !cv.height) return 0
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++
    return n
  })
}
