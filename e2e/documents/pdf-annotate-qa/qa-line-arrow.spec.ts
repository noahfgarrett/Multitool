import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  screenshotCanvas,
  waitForSessionSave,
  getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── 1. Line Creation ───────────────────────────────────────────────────────

test.describe('Line Tool — Creation', () => {
  test('line drag creates annotation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('L key activates Line tool', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Line (L)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('line type stored correctly in session', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('line')
  })

  test('multiple lines create multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 150, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 150, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 300, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('diagonal line creates annotation', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('short line still created', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 205 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zero-length click with no drag creates no annotation', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('line changes canvas visually', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── 2. Arrow Creation ──────────────────────────────────────────────────────

test.describe('Arrow Tool — Creation', () => {
  test('arrow drag creates annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('A key activates Arrow tool', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Arrow (A)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('arrow type stored correctly in session', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
  })

  test('multiple arrows create multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 50, y: 100, w: 150, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('diagonal arrow creates annotation', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('short arrow still created', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 215, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zero-length click with no drag creates no arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 3. Line/Arrow Color ────────────────────────────────────────────────────

test.describe('Line/Arrow — Color', () => {
  test('line stores color in session', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].color).toBe('string')
    expect(anns[0].color.length).toBeGreaterThan(0)
  })

  test('arrow stores color in session', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].color).toBe('string')
  })

  test('color presets visible for line tool', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const colorButtons = page.locator('button[style*="background"]')
    const count = await colorButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ─── 4. Line/Arrow Stroke Width ─────────────────────────────────────────────

test.describe('Line/Arrow — Stroke Width', () => {
  test('stroke width slider visible for Line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('line with custom width stores correctly', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('8')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(8)
  })

  test('arrow with custom width stores correctly', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('12')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(12)
  })
})

// ─── 5. Line/Arrow Opacity ──────────────────────────────────────────────────

test.describe('Line/Arrow — Opacity', () => {
  test('opacity slider visible for Line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('opacity slider visible for Arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('line with custom opacity stores correctly', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('60')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.6, 1)
  })

  test('arrow with custom opacity stores correctly', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('40')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.4, 1)
  })
})

// ─── 6. Undo/Redo ───────────────────────────────────────────────────────────

test.describe('Line/Arrow — Undo/Redo', () => {
  test('Ctrl+Z undoes line creation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Z undoes arrow creation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo multiple lines in order', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 150, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 7. Session Data ────────────────────────────────────────────────────────

test.describe('Line/Arrow — Session Data', () => {
  test('line has two points in session', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('arrow has two points in session', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('line and arrow have distinct IDs', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 150, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 150, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('line persists after tool switch', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow persists after tool switch', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await selectTool(page, 'Rectangle (R)')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
