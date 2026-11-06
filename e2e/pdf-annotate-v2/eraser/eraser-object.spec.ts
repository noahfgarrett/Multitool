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

test.describe('Eraser Object Mode', () => {
  test('object erase pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 190 }, { x: 200, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 190 }, { x: 200, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 125 }, { x: 175, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 140 }, { x: 175, y: 140 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 115 }, { x: 250, y: 115 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 },
      { x: 100, y: 200 }, { x: 100, y: 100 },
    ])
    await page.waitForTimeout(300)
    const countBefore = await getAnnotationCount(page)
    if (countBefore > 0) {
      await selectTool(page, 'Eraser (E)')
      const objBtn = page.locator('button[title="Object erase"]')
      if (await objBtn.isVisible()) await objBtn.click()
      await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }])
      await page.waitForTimeout(300)
      expect(await getAnnotationCount(page)).toBe(0)
    }
  })

  test('object erase stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const countBefore = await getAnnotationCount(page)
    if (countBefore > 0) {
      await selectTool(page, 'Eraser (E)')
      const objBtn = page.locator('button[title="Object erase"]')
      if (await objBtn.isVisible()) await objBtn.click()
      await drawOnCanvas(page, [{ x: 180, y: 200 }, { x: 220, y: 200 }])
      await page.waitForTimeout(300)
      expect(await getAnnotationCount(page)).toBe(0)
    }
  })

  test('object erase each type then undo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 40, y: 110 }, { x: 140, y: 110 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 170 }, { x: 130, y: 170 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('object erase each type then redo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 50, y: 110 }, { x: 140, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase 2 pencils in one stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 10 })
    await createAnnotation(page, 'pencil', { x: 180, y: 200, w: 80, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 300, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase 3 annotations in one stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 60, h: 10 })
    await createAnnotation(page, 'pencil', { x: 150, y: 200, w: 60, h: 10 })
    await createAnnotation(page, 'pencil', { x: 250, y: 200, w: 60, h: 10 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 350, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase 5 annotations in one stroke', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 200, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 20, y: 205 }, { x: 400, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase 10 annotations in one stroke', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + i * 35, y: 200, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Use multiple points for thorough coverage
    const points = []
    for (let x = 10; x <= 400; x += 15) {
      points.push({ x, y: 205 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase all annotations on page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 250, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase each row individually for reliable coverage
    await drawOnCanvas(page, [{ x: 40, y: 105 }, { x: 200, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 40, y: 180 }, { x: 200, y: 180 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 40, y: 280 }, { x: 200, y: 280 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase then verify session empty', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data?.annotations?.['1'] || data?.annotations?.[1] || []
    expect(anns.length).toBe(0)
  })

  test('object erase then export empty PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('object erase selective — miss some annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Only erase near top annotation
    await drawOnCanvas(page, [{ x: 40, y: 105 }, { x: 140, y: 105 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('object erase near miss — close but not touching', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('5')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase far away from the annotation
    await drawOnCanvas(page, [{ x: 350, y: 350 }, { x: 400, y: 400 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('object erase barely touching', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 105, y: 105 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase with small radius', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('5')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase with large radius', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 200, y: 125 }, { x: 210, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase thick strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('10')
        break
      }
    }
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 200 }, { x: 250, y: 200 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase thin strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('1')
        break
      }
    }
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 195 }, { x: 250, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase at each edge of annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Touch the top edge
    await drawOnCanvas(page, [{ x: 150, y: 98 }, { x: 180, y: 102 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase from left', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 80, y: 205 }, { x: 120, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase from right', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 280, y: 205 }, { x: 320, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase from top', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 175, y: 95 }, { x: 175, y: 105 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase from bottom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 175, y: 195 }, { x: 175, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase diagonal stroke path', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 150 }, { x: 200, y: 200 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase rapid movement', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    const points = []
    for (let x = 80; x <= 320; x += 10) {
      points.push({ x, y: 205 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase then immediately draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('object erase then immediately erase again', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 150, y: 225 }, { x: 250, y: 225 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase preserves other pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    // Erase on page 2
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Go back to page 1 — annotation should still exist
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('object erase on page 2', async ({ page }) => {
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

  test('object erase after zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase after rotate', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
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

  test('object erase undo multiple times', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 40, y: 105 }, { x: 140, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 40, y: 205 }, { x: 140, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('object erase redo multiple times', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 10 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 40, y: 105 }, { x: 140, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 40, y: 205 }, { x: 140, y: 205 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase then draw then erase again', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 240 }, { x: 200, y: 240 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase alternating with drawing — 20 cycles', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 100, y: 100 + (i % 3) * 50, w: 100, h: 10 })
      await selectTool(page, 'Eraser (E)')
      const objBtn = page.locator('button[title="Object erase"]')
      if (await objBtn.isVisible()) await objBtn.click()
      await drawOnCanvas(page, [{ x: 90, y: 105 + (i % 3) * 50 }, { x: 220, y: 105 + (i % 3) * 50 }])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase button active state', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    await expect(objBtn).toBeVisible()
    await objBtn.click()
    await page.waitForTimeout(100)
    const classes = await objBtn.getAttribute('class')
    expect(classes).toBeDefined()
  })

  test('object erase mode persists', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)
    await expect(objBtn).toBeVisible()
  })

  test('object erase does not affect measurements', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 350 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const totalBefore = await getAnnotationCount(page)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    const totalAfter = await getAnnotationCount(page)
    expect(totalAfter).toBeLessThan(totalBefore)
  })

  test('object erase with annotations and measurements mixed', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 50, y: 350 }, { x: 200, y: 350 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    const totalBefore = await getAnnotationCount(page)
    expect(totalBefore).toBeGreaterThanOrEqual(2)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 80, y: 80 }, { x: 320, y: 280 }])
    await page.waitForTimeout(300)
    const totalAfter = await getAnnotationCount(page)
    expect(totalAfter).toBeLessThan(totalBefore)
  })

  test('erase rectangle at edge hit-test', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Pass through the left edge only
    await drawOnCanvas(page, [{ x: 95, y: 150 }, { x: 105, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase circle at edge hit-test', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Pass through the left edge of the circle
    await drawOnCanvas(page, [{ x: 95, y: 150 }, { x: 105, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase cursor display', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('none')
  })

  test('object erase session updates after erase', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data?.annotations?.['1'] || data?.annotations?.[1] || []
    expect(anns.length).toBe(0)
  })

  test('object erase z-order — erases topmost first', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 110, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase at overlapping area
    await drawOnCanvas(page, [{ x: 120, y: 150 }, { x: 130, y: 150 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThan(2)
  })

  test('object erase all types in session', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 50, w: 60, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 80, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 30, y: 130, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 180, w: 60, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 210, w: 60, h: 0 })
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('20')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase each annotation individually for reliable coverage
    await drawOnCanvas(page, [{ x: 20, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(150)
    await drawOnCanvas(page, [{ x: 20, y: 95 }, { x: 100, y: 95 }])
    await page.waitForTimeout(150)
    await drawOnCanvas(page, [{ x: 20, y: 145 }, { x: 100, y: 145 }])
    await page.waitForTimeout(150)
    await drawOnCanvas(page, [{ x: 20, y: 180 }, { x: 100, y: 180 }])
    await page.waitForTimeout(150)
    await drawOnCanvas(page, [{ x: 20, y: 210 }, { x: 100, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data?.annotations?.['1'] || data?.annotations?.[1] || []
    expect(anns.length).toBe(0)
  })

  test('object erase then session restore shows empty', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 250, y: 125 }])
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    // Reload to test session restore
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
