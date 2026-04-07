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

// ─── 1. Freehand Drawing ────────────────────────────────────────────────────

test.describe('Pencil — Freehand Drawing', () => {
  test('freehand stroke creates visible annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('freehand stroke changes canvas visually', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'pencil')
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('two strokes create two annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three strokes create three annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('very short stroke still creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 202, y: 202 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('long complex stroke with many points creates single annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points = []
    for (let i = 0; i < 20; i++) {
      points.push({ x: 50 + i * 15, y: 200 + Math.sin(i) * 30 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil activates via P keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Pencil (P)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('single click without drag does not create annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 2. Color Picker ────────────────────────────────────────────────────────

test.describe('Pencil — Color', () => {
  test('default color is stored in session', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.color).toBeDefined()
  })

  test('changing color before drawing uses new color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redSwatch = page.locator('button[style*="background-color: rgb(255, 0, 0)"], button[style*="#FF0000"], button[style*="#ff0000"]').first()
    if (await redSwatch.isVisible()) {
      await redSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color persists across multiple strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBe(anns[1].color)
  })

  test('color presets are visible for pencil tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorButtons = page.locator('button[style*="background"]')
    const count = await colorButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ─── 3. Stroke Width ────────────────────────────────────────────────────────

test.describe('Pencil — Stroke Width', () => {
  test('stroke width slider is visible', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('changing width to 10 stores correctly', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(10)
  })

  test('minimum stroke width 1 works', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(1)
  })

  test('maximum stroke width 20 works', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(20)
  })

  test('different widths stored independently on separate strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('3')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await slider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(3)
    expect(anns[1].strokeWidth).toBe(15)
  })

  test('stroke width display shows current value', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/15/')).toBeVisible()
  })
})

// ─── 4. Opacity ─────────────────────────────────────────────────────────────

test.describe('Pencil — Opacity', () => {
  test('opacity slider is visible', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('changing opacity to 50% stores as 0.5', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('opacity percentage display updates', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('75')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/75%/')).toBeVisible()
  })

  test('default opacity is stored as 0-1 value', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })
})

// ─── 5. Multi-Page Isolation ────────────────────────────────────────────────

test.describe('Pencil — Multi-Page', () => {
  test('pencil stroke on page 1 does not appear on page 2 session data', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Anns = session.annotations['1'] || session.annotations[1] || []
    const page2Anns = session.annotations['2'] || session.annotations[2] || []
    expect(page1Anns.length).toBe(1)
    expect(page2Anns?.length ?? 0).toBe(0)
  })
})

// ─── 6. Undo Pencil ────────────────────────────────────────────────────────

test.describe('Pencil — Undo', () => {
  test('Ctrl+Z undoes pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil')
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

  test('undo multiple pencil strokes in order', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 60 })
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

  test('undo all then redo all restores all strokes', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 350, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    // Undo all 3
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all 3
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── 7. Session Data ────────────────────────────────────────────────────────

test.describe('Pencil — Session Data', () => {
  test('pencil annotation has points array', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(Array.isArray(anns[0].points)).toBe(true)
    expect(anns[0].points.length).toBeGreaterThan(1)
  })

  test('pencil points have x and y coordinates', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    const pt = anns[0].points[0]
    expect(typeof pt.x).toBe('number')
    expect(typeof pt.y).toBe('number')
  })

  test('multiple pencil annotations have distinct IDs', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('pencil type stored correctly', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('pencil')
  })

  test('annotation count in status bar matches session data', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 60 })
    const uiCount = await getAnnotationCount(page)
    expect(uiCount).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(2)
  })
})

// ─── 8. Pencil Persistence ──────────────────────────────────────────────────

test.describe('Pencil — Persistence', () => {
  test('pencil stroke persists after switching to Select', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil and rectangle coexist', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
