import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait } from '../../helpers/pdf-annotate'

// The reported bug: at "specific levels of zoom when it crosses that threshold,
// it'll jump positions." The threshold is where the content crosses the
// viewport size and the scroll range collapses to 0 on an axis. The live pinch
// transform must be clamped to the SAME scroll range the commit uses, so the
// page stays put across the transform→scroll handoff even when a fit threshold
// is crossed mid-gesture. Needs the BUILT app on :5180 (inlined pdf.js worker).
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } })

const CX = 900 // bottom-right midpoint: zooming out from max scroll pushes the
const CY = 680 // desired scroll PAST the (shrinking) range → the upper clamp.

/** Drive one pinch frame at the given finger spread, then let its rAF paint. */
async function pinchTo(page: Page, spread: number): Promise<void> {
  await page.getByTestId('pdf-scroll').evaluate((el, p) => {
    const mk = (id: number, x: number, y: number): Touch =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y })
    el.dispatchEvent(new TouchEvent('touchmove', {
      touches: [mk(1, p.x, p.y - p.spread), mk(2, p.x, p.y + p.spread)],
      targetTouches: [mk(1, p.x, p.y - p.spread), mk(2, p.x, p.y + p.spread)],
      changedTouches: [mk(1, p.x, p.y - p.spread), mk(2, p.x, p.y + p.spread)],
      bubbles: true, cancelable: true,
    }))
  }, { x: CX, y: CY, spread })
  await page.waitForTimeout(80) // let the rAF paint + record this frame
}

test('no snap when a pinch crosses the fit threshold', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)

  // Zoom in via the toolbar so the page overflows the viewport (real scroll
  // range on both axes), then scroll away from the origin.
  const zoomIn = page.locator('button[title="Zoom in"]')
  for (let i = 0; i < 5; i++) await zoomIn.click()
  await page.waitForTimeout(300)
  const zoomLabel = page.locator('button').filter({ hasText: /\d+%/ }).first()
  const zoomedInPct = Number((await zoomLabel.textContent())?.replace(/\D/g, ''))
  expect(zoomedInPct).toBeGreaterThan(150) // overflowing the viewport
  const scroll = page.getByTestId('pdf-scroll')
  // Scroll to the bottom-right MAX, so the scroll offset starts pinned to the
  // range. Zooming out then shrinks the range below the current offset.
  await scroll.evaluate((el) => { el.scrollLeft = 99999; el.scrollTop = 99999 })
  await page.waitForTimeout(100)
  const startScroll = await scroll.evaluate((el) => ({ sl: el.scrollLeft, st: el.scrollTop }))
  expect(startScroll.st).toBeGreaterThan(1000) // page overflows → real scroll range

  // Start a two-finger pinch, then zoom OUT moderately over several frames. As
  // the page shrinks, the scroll range drops below the current (maxed) offset —
  // the threshold. The desired anchor scroll exceeds the new range → upper clamp.
  await scroll.evaluate((el, p) => {
    const mk = (id: number, x: number, y: number): Touch =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y })
    el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [mk(1, p.x, p.y - 220), mk(2, p.x, p.y + 220)],
      targetTouches: [mk(1, p.x, p.y - 220), mk(2, p.x, p.y + 220)],
      changedTouches: [mk(1, p.x, p.y - 220), mk(2, p.x, p.y + 220)],
      bubbles: true, cancelable: true,
    }))
  }, { x: CX, y: CY })

  // Pinch together moderately (220 → 150 spread ≈ 0.68× = ~250% → ~170%); the
  // page still overflows, so we cross the range threshold, not zoom-to-fit.
  for (const spread of [200, 185, 170, 160, 150]) await pinchTo(page, spread)

  // What's on screen at the END of the gesture (last painted frame).
  const before = await page.locator('[data-page="1"]').boundingBox()

  // Lift — the commit recomputes the bounded scroll at the final zoom.
  await scroll.evaluate((el) => {
    el.dispatchEvent(new TouchEvent('touchend', {
      touches: [], targetTouches: [], changedTouches: [], bubbles: true, cancelable: true,
    }))
  })
  await page.waitForTimeout(350)

  const after = await page.locator('[data-page="1"]').boundingBox()
  const endScroll = await scroll.evaluate((el) => ({ sl: el.scrollLeft, st: el.scrollTop }))
  const dx = Math.abs((after?.x ?? 0) - (before?.x ?? 0))
  const dy = Math.abs((after?.y ?? 0) - (before?.y ?? 0))
  // No snap across the transform→scroll handoff, even though the gesture crossed
  // the threshold and the upper clamp engaged. The live frame and the commit use
  // the identical (exact, unrounded) zoom + bounds, so they agree to the pixel.
  expect(dx).toBeLessThan(6)
  expect(dy).toBeLessThan(6)

  // Not a vacuous pass: the pinch really zoomed out a lot…
  const finalPct = Number((await zoomLabel.textContent())?.replace(/\D/g, ''))
  expect(finalPct).toBeLessThan(zoomedInPct - 50)
  // …and the scroll range collapsed below the start offset — the clamp tracked
  // it down (proving we crossed the threshold, not a no-op pan).
  expect(endScroll.st).toBeLessThan(startScroll.st - 300)
  expect(pageErrors).toEqual([])
})
