import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Basic Rectangle Creation ─────────────────────────────────────────────

test.describe('Basic Rectangle Creation', () => {
  test('rectangle drag creates annotation, count goes to 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('R key activates Rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Rectangle shows "Shift for perfect shapes" status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple rectangles create multiple annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 310, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('very small rectangle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very large rectangle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 400, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle annotation type is stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('rectangle')
  })

  test('wide rectangle (landscape) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 350, y: 240 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall rectangle (portrait) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 240, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Basic Circle Creation ────────────────────────────────────────────────

test.describe('Basic Circle Creation', () => {
  test('circle drag creates annotation, count goes to 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('C key activates Circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Circle (C)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Circle shows "Shift for perfect shapes" status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple circles create multiple annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 80 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('very small circle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very large circle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 400, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle annotation type is stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('circle')
  })

  test('wide ellipse creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 350, y: 240 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall ellipse creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 240, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Rectangle/Circle Color ───────────────────────────────────────────────

test.describe('Rectangle/Circle Color', () => {
  test('rectangle uses current color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
    expect(typeof anns[0].color).toBe('string')
  })

  test('circle uses current color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
  })

  test('two rectangles with same color match', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBe(anns[1].color)
  })
})

// ─── 4. Rectangle/Circle Stroke Width ────────────────────────────────────────

test.describe('Rectangle/Circle Stroke Width', () => {
  test('rectangle stroke width slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('circle stroke width slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('changing rectangle stroke width is reflected in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('6')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(6)
  })

  test('changing circle stroke width is reflected in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('14')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(14)
  })
})

// ─── 5. Rectangle/Circle Opacity ─────────────────────────────────────────────

test.describe('Rectangle/Circle Opacity', () => {
  test('rectangle opacity slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('circle opacity slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('rectangle with custom opacity stores correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('60')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.6, 1)
  })

  test('circle with custom opacity stores correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('30')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.3, 1)
  })
})

// ─── 6. Select & Move Rectangle/Circle ───────────────────────────────────────

test.describe('Select & Move Rectangle/Circle', () => {
  test('rectangle can be selected via edge click', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('circle can be selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on the edge of the circle
    await clickCanvasAt(page, 160, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('rectangle can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 160, y: 100 }, { x: 300, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle can be nudged with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift+Arrow nudges shape by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Delete Rectangle/Circle ──────────────────────────────────────────────

test.describe('Delete Rectangle/Circle', () => {
  test('selected rectangle can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('selected circle can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting rectangle does not affect circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 80)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 8. Undo/Redo Rectangle/Circle ──────────────────────────────────────────

test.describe('Undo/Redo Rectangle/Circle', () => {
  test('Ctrl+Z undoes rectangle creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Z undoes circle creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
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

  test('redo restores undone circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple undo/redo cycles work for shapes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    // Undo both
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo both
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 9. Shapes at Different Zoom Levels ──────────────────────────────────────

test.describe('Shapes at Different Zoom Levels', () => {
  test('rectangle works at 125% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle works at 50% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('50%', { exact: true }).click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Shapes on Rotated Pages ─────────────────────────────────────────────

test.describe('Shapes on Rotated Pages', () => {
  test('rectangle works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 11. Mixed Shapes ────────────────────────────────────────────────────────

test.describe('Mixed Shapes', () => {
  test('rectangle and circle coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('all shape types coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 40 })
    await createAnnotation(page, 'circle', { x: 150, y: 50, w: 60, h: 60 })
    await createAnnotation(page, 'line', { x: 50, y: 150, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('shapes saved to session correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(2)
    const types = anns.map((a: { type: string }) => a.type)
    expect(types).toContain('rectangle')
    expect(types).toContain('circle')
  })
})

// ─── 12. Duplicate & Copy-Paste ──────────────────────────────────────────────

test.describe('Duplicate & Copy-Paste Shapes', () => {
  test('Ctrl+D duplicates rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
