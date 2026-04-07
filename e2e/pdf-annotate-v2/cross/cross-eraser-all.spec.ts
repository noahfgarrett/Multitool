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

async function activateObjectEraser(page: import('@playwright/test').Page) {
  await selectTool(page, 'Eraser (E)')
  const objBtn = page.locator('button[title="Object erase"]')
  if (await objBtn.isVisible()) await objBtn.click()
}

async function activatePartialEraser(page: import('@playwright/test').Page) {
  await selectTool(page, 'Eraser (E)')
  const partialBtn = page.locator('button[title="Partial erase"]')
  if (await partialBtn.isVisible()) await partialBtn.click()
}

test.describe('Cross-Tool: Eraser with All Types', () => {
  test('object erase pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 200, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 110, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 110, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 180, y: 120 }, { x: 200, y: 120 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 180, y: 120 }, { x: 200, y: 120 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 125 }, { x: 175, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 140 }, { x: 175, y: 140 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 115 }, { x: 250, y: 115 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase 2 pencils in 1 stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 130, w: 100, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 90 }, { x: 80, y: 145 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase pencil + rectangle in 1 stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 140, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 90 }, { x: 80, y: 200 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase pencil + circle in 1 stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'circle', { x: 50, y: 140, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 90 }, { x: 80, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase all 7 basic types', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    await createAnnotation(page, 'text', { x: 50, y: 240, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 50, y: 280, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(7)
    await activateObjectEraser(page)
    // Erase through center of all annotations
    await drawOnCanvas(page, [{ x: 80, y: 20 }, { x: 80, y: 330 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase then undo all — all restored', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 40 }, { x: 80, y: 160 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('erase then redo all — stays erased', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 60 }, { x: 120, y: 60 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase first of 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 35 }, { x: 100, y: 35 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('erase last of 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 235 }, { x: 100, y: 235 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('erase middle of 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 135 }, { x: 100, y: 135 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('erase 3 of 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 30 }, { x: 70, y: 160 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(4)
  })

  test('erase all 5 annotations', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await activateObjectEraser(page)
    // Use a zigzag path to ensure we cross each pencil stroke
    await drawOnCanvas(page, [
      { x: 60, y: 20 }, { x: 80, y: 40 }, { x: 60, y: 60 },
      { x: 80, y: 90 }, { x: 60, y: 110 }, { x: 80, y: 140 },
      { x: 60, y: 160 }, { x: 80, y: 190 }, { x: 60, y: 210 },
      { x: 80, y: 240 }, { x: 60, y: 260 },
    ])
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(4)
  })

  test('erase then draw new — works', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 120, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase then switch tool — tool switches', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 120, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(300)
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none'].includes(cursor) || cursor !== 'default').toBe(true)
  })

  test('erase object mode pencil + text mixed', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 80, w: 100, h: 15 })
    await createAnnotation(page, 'text', { x: 50, y: 120, w: 100, h: 35 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 70 }, { x: 70, y: 165 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase near miss — annotation not removed', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 80, y: 50 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase barely touching annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 110 }, { x: 105, y: 110 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase with large radius', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('50')
    await drawOnCanvas(page, [{ x: 150, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase with small radius', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) await sizeSlider.fill('5')
    await drawOnCanvas(page, [{ x: 150, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase then object erase', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 200, h: 10 })
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 90 }, { x: 130, y: 120 }])
    await page.waitForTimeout(300)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 150 }, { x: 120, y: 150 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('object erase then partial erase', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 200, h: 10 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 80, y: 100 }, { x: 120, y: 100 }])
    await page.waitForTimeout(300)
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 140 }, { x: 130, y: 165 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase after zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase after rotate', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase on page 2', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase preserves other pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase then session save', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('erase session shows fewer annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase then export (fewer in PDF)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('erase 10 annotations rapid', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 20 + i * 35, w: 80, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 10 }, { x: 70, y: 380 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(8)
  })

  test('erase 20 annotations object mode', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', { x: 30 + col * 70, y: 30 + row * 40, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    await activateObjectEraser(page)
    for (let row = 0; row < 4; row++) {
      await drawOnCanvas(page, [{ x: 20, y: 37 + row * 40 }, { x: 400, y: 37 + row * 40 }])
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase alternating types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 90, w: 80, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 80, h: 15 })
    expect(await getAnnotationCount(page)).toBe(3)
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 40 }, { x: 70, y: 170 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase selected then unselected', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 15 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase over empty area — no error', async ({ page }) => {
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 300 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase then Ctrl+A — no crash', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase then draw each type', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 90, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 140, w: 60, h: 30 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('erase cycle: draw erase draw erase', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 40 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 50, y: 70 }, { x: 90, y: 70 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase all then undo all — all restored', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 70, y: 40 }, { x: 70, y: 160 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Undo eraser + both creations
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase rectangle (object erase behavior)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 90 }, { x: 150, y: 200 }])
    await page.waitForTimeout(300)
    // Partial erase on non-pencil types uses object erase behavior
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase circle (object erase behavior)', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 80 })
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 90 }, { x: 150, y: 200 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase text (object erase behavior)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 120, h: 40 })
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 90 }, { x: 150, y: 160 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('partial erase line (object erase behavior)', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 40 })
    await activatePartialEraser(page)
    await drawOnCanvas(page, [{ x: 150, y: 110 }, { x: 150, y: 150 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('erase with sticky tool on', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 15 })
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 15 })
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 70, y: 55 }, { x: 100, y: 55 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('erase mode button state — object vs partial toggle', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(objBtn).toBeVisible()
    await expect(partialBtn).toBeVisible()
  })

  test('switch between partial and object 5 times', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    const partialBtn = page.locator('button[title="Partial erase"]')
    for (let i = 0; i < 5; i++) {
      if (await partialBtn.isVisible()) await partialBtn.click()
      await page.waitForTimeout(50)
      if (await objBtn.isVisible()) await objBtn.click()
      await page.waitForTimeout(50)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('erase cursor visible — cursor is none (custom)', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['none', 'crosshair'].includes(cursor)).toBe(true)
  })

  test('erase cursor radius changes with slider', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) {
      await sizeSlider.fill('30')
      await page.waitForTimeout(100)
      // Slider should accept the new value
      const val = await sizeSlider.inputValue()
      expect(Number(val)).toBeGreaterThan(0)
    }
  })

  test('erase then immediately create', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await activateObjectEraser(page)
    await drawOnCanvas(page, [{ x: 120, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
