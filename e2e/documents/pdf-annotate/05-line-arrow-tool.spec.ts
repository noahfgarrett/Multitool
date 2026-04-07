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

// ─── 1. Basic Line Creation ──────────────────────────────────────────────────

test.describe('Basic Line Creation', () => {
  test('line drag creates annotation, count goes to 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('L key activates Line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Line (L)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Line tool shows "Shift for perfect shapes" status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple lines create multiple annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 0 })
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 120, h: 0 })
    await createAnnotation(page, 'line', { x: 100, y: 300, w: 120, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('horizontal line creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertical line creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 100 }, { x: 200, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('diagonal line creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very short line creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 205, y: 205 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line annotation type is stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('line')
  })
})

// ─── 2. Basic Arrow Creation ─────────────────────────────────────────────────

test.describe('Basic Arrow Creation', () => {
  test('arrow drag creates annotation, count goes to 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('A key activates Arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Arrow (A)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Arrow tool shows "Shift for perfect shapes" status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple arrows create multiple annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 120, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 120, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow annotation type is stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
  })

  test('diagonal arrow creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Line/Arrow Color ─────────────────────────────────────────────────────

test.describe('Line/Arrow Color', () => {
  test('line uses current color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
  })

  test('arrow uses current color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
  })

  test('two lines with same color settings match', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 0 })
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 100, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBe(anns[1].color)
  })
})

// ─── 4. Line/Arrow Stroke Width ──────────────────────────────────────────────

test.describe('Line/Arrow Stroke Width', () => {
  test('line stroke width slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('arrow stroke width slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('changing line stroke width is reflected in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('8')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(8)
  })

  test('changing arrow stroke width is reflected in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('12')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(12)
  })
})

// ─── 5. Line/Arrow Opacity ───────────────────────────────────────────────────

test.describe('Line/Arrow Opacity', () => {
  test('line opacity slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('arrow opacity slider visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('line with custom opacity stores correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('40')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.4, 1)
  })
})

// ─── 6. Select & Move Lines/Arrows ───────────────────────────────────────────

test.describe('Select & Move Lines/Arrows', () => {
  test('line can be selected with Select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('arrow can be selected with Select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('line can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 150, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 150, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line can be nudged with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Delete Lines/Arrows ──────────────────────────────────────────────────

test.describe('Delete Lines/Arrows', () => {
  test('selected line can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('selected arrow can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting line does not affect arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 250, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 8. Undo/Redo Lines/Arrows ───────────────────────────────────────────────

test.describe('Undo/Redo Lines/Arrows', () => {
  test('Ctrl+Z undoes line creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Z undoes arrow creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
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

  test('redo restores undone arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 9. Lines/Arrows at Different Zoom Levels ────────────────────────────────

test.describe('Lines/Arrows at Different Zoom Levels', () => {
  test('line works at 125% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line', { x: 50, y: 50, w: 60, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow works at 50% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('50%', { exact: true }).click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Line/Arrow Persistence ──────────────────────────────────────────────

test.describe('Line/Arrow Persistence', () => {
  test('line persists after tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await selectTool(page, 'Pencil (P)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow persists after tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await selectTool(page, 'Rectangle (R)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line saved to session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(1)
  })

  test('mixed line and arrow annotations coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 100, h: 50 })
    await createAnnotation(page, 'line', { x: 100, y: 300, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── 11. Duplicate & Copy-Paste ──────────────────────────────────────────────

test.describe('Duplicate & Copy-Paste Lines/Arrows', () => {
  test('Ctrl+D duplicates line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 12. Line/Arrow Session Data ─────────────────────────────────────────────

test.describe('Line/Arrow Session Data', () => {
  test('line has exactly 2 points in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('arrow has exactly 2 points in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('line and arrow have distinct IDs', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 100, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('line points have valid coordinates', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    for (const pt of anns[0].points) {
      expect(typeof pt.x).toBe('number')
      expect(typeof pt.y).toBe('number')
      expect(pt.x).toBeGreaterThanOrEqual(0)
      expect(pt.y).toBeGreaterThanOrEqual(0)
    }
  })

  test('arrow opacity stored as 0-1 value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })
})

// ─── 13. Line/Arrow on Rotated Pages ─────────────────────────────────────────

test.describe('Line/Arrow on Rotated Pages', () => {
  test('line works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
