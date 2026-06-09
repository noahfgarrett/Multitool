import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait } from '../../helpers/pdf-annotate'

test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } })

// Frame-lag scenario: render frame M1, then a SECOND touchmove (M2, shifted)
// immediately followed by touchend in the same tick — so M2's rAF is cancelled
// and never paints. The commit must anchor to M1 (what's on screen), not M2, so
// the PDF page must NOT move between the last rendered frame and the commit.
test('no jump on commit when lifting mid-movement', async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)

  const scroll = page.getByTestId('pdf-scroll')
  const cx = 640, cy = 380

  await scroll.evaluate((el, p) => {
    const mk = (id: number, x: number, y: number): Touch =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y })
    const fire = (t: string, pts: Touch[]): void => {
      el.dispatchEvent(new TouchEvent(t, { touches: pts, targetTouches: pts, changedTouches: pts, bubbles: true, cancelable: true }))
    }
    fire('touchstart', [mk(1, p.cx, p.cy - 60), mk(2, p.cx, p.cy + 60)])
    fire('touchmove', [mk(1, p.cx, p.cy - 140), mk(2, p.cx, p.cy + 140)]) // M1
  }, { cx, cy })
  await page.waitForTimeout(120) // let the rAF paint M1 and record it

  const rect1 = await page.locator('[data-page="1"]').boundingBox()

  await scroll.evaluate((el, p) => {
    const mk = (id: number, x: number, y: number): Touch =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y })
    const fire = (t: string, pts: Touch[]): void => {
      el.dispatchEvent(new TouchEvent(t, { touches: pts, targetTouches: pts, changedTouches: pts, bubbles: true, cancelable: true }))
    }
    // M2: midpoint shifted +60px and a bit more zoom — its rAF is queued…
    fire('touchmove', [mk(1, p.cx + 60, p.cy - 150), mk(2, p.cx + 60, p.cy + 150)])
    // …then cancelled by touchend in the SAME tick (commit happens here).
    fire('touchend', [])
  }, { cx, cy })
  await page.waitForTimeout(350)

  const rect2 = await page.locator('[data-page="1"]').boundingBox()
  const dx = Math.abs((rect2?.x ?? 0) - (rect1?.x ?? 0))
  const dy = Math.abs((rect2?.y ?? 0) - (rect1?.y ?? 0))
  // The page must not jump on the transform→layout handoff. This was ~37px
  // horizontally before the layout-aware commit (the centering padding shifts
  // with zoom); a few px is allowed for zoom rounding / sub-pixel layout.
  expect(dx).toBeLessThan(5)
  expect(dy).toBeLessThan(5)
})
