import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait } from '../../helpers/pdf-annotate'

// Pinch-to-zoom must work on TOUCH TABLETS (e.g. iPad), which use the desktop
// layout (width > 767px → isMobile false) but ARE touch devices. This is the
// regression guard for the pinch handler being gated on isTouchDevice, not
// isMobile (the latter excluded every iPad and broke pinch-to-zoom there).
//
// NOTE: needs the BUILT app served on :5180 (the dev server can't fetch the
// pdf.js worker via @fs, so no PDF renders). Run against `vite preview`.
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } })

async function firePinch(page: Page): Promise<void> {
  await page.getByTestId('pdf-scroll').evaluate((el) => {
    const mk = (id: number, x: number, y: number): Touch =>
      new Touch({ identifier: id, target: el, clientX: x, clientY: y, pageX: x, pageY: y })
    const fire = (t: string, p: Touch[]): void => {
      el.dispatchEvent(new TouchEvent(t, { touches: p, targetTouches: p, changedTouches: p, bubbles: true, cancelable: true }))
    }
    const cx = 640, cy = 380 // on the PDF page, right of the sidebar
    fire('touchstart', [mk(1, cx, cy - 60), mk(2, cx, cy + 60)])
    fire('touchmove', [mk(1, cx, cy - 140), mk(2, cx, cy + 140)])
  })
}

test.describe('PDF Annotate — touch pinch-to-zoom (tablet width)', () => {
  test('pinch runs and applies a composited transform on a touch tablet', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)

    // The exact iPad case: desktop layout (not mobile) but a touch device.
    const media = await page.evaluate(() => ({
      isMobile: matchMedia('(max-width: 767px) and (any-pointer: coarse)').matches,
      isTouch: matchMedia('(any-pointer: coarse)').matches,
    }))
    expect(media.isMobile).toBe(false)
    expect(media.isTouch).toBe(true)

    const scroll = page.getByTestId('pdf-scroll')
    const before = await scroll.evaluate((el) => ({ left: el.scrollLeft, top: el.scrollTop }))

    await firePinch(page)

    // Handler runs at tablet width → composited (translate3d) transform applied.
    const layer = page.getByTestId('pdf-gesture-layer')
    await expect
      .poll(() => layer.evaluate((el) => (el as HTMLElement).style.transform))
      .toMatch(/translate3d\([^)]*\)\s*scale\(/)

    const transform = await layer.evaluate((el) => (el as HTMLElement).style.transform)
    const scale = Number(transform.match(/scale\(([\d.]+)\)/)?.[1])
    expect(scale).toBeGreaterThan(1) // fingers spread → zoomed in

    // Pure transform: native scroll untouched during the gesture.
    const during = await scroll.evaluate((el) => ({ left: el.scrollLeft, top: el.scrollTop }))
    expect(during).toEqual(before)

    expect(pageErrors).toEqual([])
  })
})
