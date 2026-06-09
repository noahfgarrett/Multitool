import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait } from '../../helpers/pdf-annotate'

// Touch is enabled so `(any-pointer: coarse)` matches. We navigate + upload on a
// wide viewport (desktop sidebar works), then shrink to a phone width so the
// app's matchMedia-driven `isMobile` flips true and the pinch listeners attach.
test.use({ hasTouch: true, viewport: { width: 1200, height: 900 } })

/** Dispatch a synthetic two-finger gesture step on an element. */
async function fireTouch(
  page: Page,
  type: 'touchstart' | 'touchmove' | 'touchend',
  points: Array<{ x: number; y: number }>,
): Promise<void> {
  await page.getByTestId('pdf-scroll').evaluate((el, { type, points }) => {
    const touches = points.map((p, i) =>
      new Touch({ identifier: i + 1, target: el, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y }),
    )
    el.dispatchEvent(new TouchEvent(type, {
      touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true,
    }))
  }, { type, points })
}

test.describe('PDF Annotate — mobile pinch-to-zoom', () => {
  test('pinch drives a pure transform and never writes native scroll', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)

    // Switch to a phone-sized viewport → app isMobile becomes true.
    await page.setViewportSize({ width: 390, height: 844 })
    const scroll = page.getByTestId('pdf-scroll')
    await expect(scroll).toBeVisible()
    await page.waitForTimeout(300) // let the isMobile effect re-attach listeners

    const before = await scroll.evaluate((el) => ({ left: el.scrollLeft, top: el.scrollTop }))

    // Two fingers, 100px apart, centred; then spread to 240px apart (zoom in)
    // keeping the same midpoint.
    const cx = 195, cy = 430
    await fireTouch(page, 'touchstart', [{ x: cx - 50, y: cy }, { x: cx + 50, y: cy }])
    await fireTouch(page, 'touchmove', [{ x: cx - 120, y: cy }, { x: cx + 120, y: cy }])

    // The gesture layer must receive a single composited translate+scale.
    const layer = page.getByTestId('pdf-gesture-layer')
    await expect
      .poll(() => layer.evaluate((el) => (el as HTMLElement).style.transform))
      .toMatch(/translate\([^)]*\)\s*scale\(/)

    const transform = await layer.evaluate((el) => (el as HTMLElement).style.transform)
    const scale = Number(transform.match(/scale\(([\d.]+)\)/)?.[1])
    expect(scale).toBeGreaterThan(1) // fingers spread → zoomed in

    // THE fix: native scroll is untouched during the gesture. The old
    // implementation wrote scrollLeft/Top every frame, which clamped against
    // the un-resized scroll range and caused the jitter.
    const during = await scroll.evaluate((el) => ({ left: el.scrollLeft, top: el.scrollTop }))
    expect(during.left).toBe(before.left)
    expect(during.top).toBe(before.top)

    // Lifting the fingers commits the zoom; the layout effect clears the
    // gesture transform.
    await fireTouch(page, 'touchend', [])
    await expect
      .poll(() => layer.evaluate((el) => (el as HTMLElement).style.transform))
      .toBe('')

    expect(pageErrors).toEqual([])
  })
})
