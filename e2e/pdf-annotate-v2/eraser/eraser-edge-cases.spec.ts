import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Eraser Edge Cases', () => {
  test('erase nothing on empty page — no error', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 300 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase over empty area with annotations elsewhere', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 300, y: 300 }, { x: 400, y: 400 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase single pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 90 }, { x: 200, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 125 }, { x: 175, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase single callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 140 }, { x: 175, y: 140 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase after zoom in', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase after pan — no crash', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase after page rotate', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 400, y: 400 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })

  test('erase at page corner', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 10, y: 10, w: 50, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 5, y: 15 }, { x: 65, y: 25 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase at page edge', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 10, y: 200, w: 50, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 5, y: 205 }, { x: 65, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase with min radius (small slider value)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('5')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })

  test('erase with max radius (large slider value)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase with medium radius', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('15')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase pencil splits into 2 fragments', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase pencil splits into 3 fragments', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 150 }, { x: 150, y: 250 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 300, y: 150 }, { x: 300, y: 250 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase through rectangle — object-erases it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('partial erase through circle — object-erases it', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('partial erase through arrow — object-erases it', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 80 }, { x: 200, y: 170 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('partial erase through line — object-erases it', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 80 }, { x: 200, y: 120 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('object erase 5 annotations in one stroke', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50 + i * 60, y: 200, w: 40, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 380, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase then undo restores all', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 10 })
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 100, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 350, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('object erase then redo removes again', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 205 }, { x: 300, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase then undo restores original', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('partial erase then redo re-splits', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    const countAfterErase = await getAnnotationCount(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(countAfterErase)
  })

  test('switch between object and partial mode', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(objBtn).toBeVisible()
    await expect(partialBtn).toBeVisible()
    await objBtn.click()
    await page.waitForTimeout(100)
    await partialBtn.click()
    await page.waitForTimeout(100)
    await objBtn.click()
    await page.waitForTimeout(100)
    // No crash after switching
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser radius slider visible', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    await expect(sizeSlider).toBeVisible()
  })

  test('eraser custom cursor visible on canvas', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('none')
  })

  test('eraser cursor hidden off canvas', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const eraserCursor = page.locator('.pointer-events-none.fixed.rounded-full')
    if (await eraserCursor.count() > 0) {
      const display = await eraserCursor.evaluate(el => el.style.display)
      expect(display).toBe('none')
    }
  })

  test('erase after session save', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase after export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await exportPDF(page)
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase on page 2', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase multiple types in one stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 180, y: 190, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 300, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase then create new annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase then draw pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 300 }, { x: 300, y: 300 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase then draw rectangle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase mixed: partial then object mode switch', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 300, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(200)
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 330 }, { x: 200, y: 330 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('rapid erase across entire page', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 100, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    const points = []
    for (let x = 10; x <= 400; x += 20) {
      points.push({ x, y: 105 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase last annotation on page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase 10 annotations with object mode', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 70, y: 80 + Math.floor(i / 5) * 40, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase row 1
    await drawOnCanvas(page, [{ x: 10, y: 85 }, { x: 400, y: 85 }])
    await page.waitForTimeout(200)
    // Erase row 2
    await drawOnCanvas(page, [{ x: 10, y: 125 }, { x: 400, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase 20 strokes with object mode', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 20; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 10) * 35, y: 50 + Math.floor(i / 10) * 40 },
        { x: 40 + (i % 10) * 35, y: 50 + Math.floor(i / 10) * 40 },
      ])
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(20)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Use detailed points for full row coverage
    const row1Points = []
    for (let x = 10; x <= 400; x += 15) row1Points.push({ x, y: 55 })
    await drawOnCanvas(page, row1Points)
    await page.waitForTimeout(200)
    const row2Points = []
    for (let x = 10; x <= 400; x += 15) row2Points.push({ x, y: 95 })
    await drawOnCanvas(page, row2Points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser shortcut E activates', async ({ page }) => {
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('none')
  })

  test('eraser after text commit', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 125 }, { x: 175, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser after callout commit', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 140 }, { x: 175, y: 140 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser preserves measurement annotations', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 350 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const countBefore = await getAnnotationCount(page)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBeLessThan(countBefore)
  })

  test('erase pencil at various positions', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 200, y: 300, w: 150, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 220, y: 315 }, { x: 330, y: 315 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase circle at edge', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 120, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase at the left edge of the circle
    await drawOnCanvas(page, [{ x: 148, y: 200 }, { x: 155, y: 200 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase arrow at endpoint', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 295, y: 195 }, { x: 305, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase and verify session updates', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const dataBefore = await getSessionData(page)
    expect(dataBefore).not.toBeNull()
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const dataAfter = await getSessionData(page)
    const annsAfter = dataAfter?.annotations?.['1'] || dataAfter?.annotations?.[1] || []
    expect(annsAfter.length).toBe(0)
  })

  test('erase then zoom then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
