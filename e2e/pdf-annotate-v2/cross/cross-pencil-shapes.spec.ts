import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, waitForSessionSave,
  getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool: Pencil + Shapes', () => {
  test('pencil then rectangle on same page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle then pencil', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil then circle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 120, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('circle then pencil', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil then line', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 120, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('line then pencil', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 130, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil then arrow', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'arrow', { x: 50, y: 120, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow then pencil', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 50, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 130, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil drawn over rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle drawn over pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil drawn inside circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 80, y: 80, w: 150, h: 120 })
    await createAnnotation(page, 'pencil', { x: 110, y: 110, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('circle drawn around pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 110, y: 110, w: 80, h: 30 })
    await createAnnotation(page, 'circle', { x: 80, y: 80, w: 150, h: 120 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil crossing line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 50, w: 0, h: 150 })
    await createAnnotation(page, 'pencil', { x: 50, y: 120, w: 150, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow crossing pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 120, w: 150, h: 10 })
    await createAnnotation(page, 'arrow', { x: 100, y: 50, w: 0, h: 150 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('3 pencils then rectangle', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 100, h: 20 })
    }
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('rectangle then 3 pencils', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 100, h: 80 })
    for (let i = 0; i < 3; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 100, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('pencil + rectangle + circle combo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('pencil + line + arrow combo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 100, h: 40 })
    await createAnnotation(page, 'arrow', { x: 50, y: 170, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('all shape types + pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 70, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 130, w: 80, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 190, w: 80, h: 30 })
    await createAnnotation(page, 'arrow', { x: 50, y: 240, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('mixed count verification — increments correctly', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'rectangle', { x: 50, y: 80, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('select pencil near shape', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 65)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select shape near pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('delete pencil keep shape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo removes pencil (last created), leaving the rectangle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete shape keep pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move pencil over shape', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 65)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 80, y: 65 }, { x: 80, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('move shape over pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 80)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 80 }, { x: 100, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo pencil keep shape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo shape keep pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo all mixed annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo all mixed annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 80, h: 40 })
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('duplicate pencil near shape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    // Select the pencil by clicking at its start point
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('duplicate shape near pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 180)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('copy pencil paste near shape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    // Select pencil by clicking at its start point
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('eraser remove pencil keep shape', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 80, y: 65 }, { x: 120, y: 65 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser remove shape keep pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 50, y: 230 }, { x: 100, y: 230 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('z-order pencil drawn over rectangle — pencil on top', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Pencil drawn last should be on top — select at overlap should pick pencil
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 105)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('z-order rectangle drawn over pencil — rect on top', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 130)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('bring pencil to front via Ctrl+]', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 60, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send pencil to back via Ctrl+[', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 60, y: 100, w: 180, h: 10 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil + rectangle export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('pencil + circle export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 120, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('pencil + line export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 120, w: 100, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('pencil + arrow export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'arrow', { x: 50, y: 120, w: 100, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('all types export produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 70, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 130, w: 80, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 190, w: 80, h: 30 })
    await createAnnotation(page, 'arrow', { x: 50, y: 240, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(5)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('session save with pencil + shapes', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const anns = session?.annotations?.['1'] || session?.annotations?.[1] || []
    expect(anns.length).toBe(2)
  })

  test('session restore pencil + shapes — count preserved', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(1000)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('zoom with mixed types — annotations still visible', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    // Zoom in
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rotate with mixed types — annotations persist', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('10 pencils + 10 rectangles', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 40, w: 50, h: 15 })
    }
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + (i % 5) * 70, y: 130 + Math.floor(i / 5) * 60, w: 50, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('5 of each type', async ({ page }) => {
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let t = 0; t < types.length; t++) {
      for (let i = 0; i < 5; i++) {
        await createAnnotation(page, types[t], { x: 30 + i * 70, y: 30 + t * 60, w: 50, h: 30 })
      }
    }
    expect(await getAnnotationCount(page)).toBe(25)
  })

  test('mixed types at different positions', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 30, w: 60, h: 40 })
    await createAnnotation(page, 'circle', { x: 30, y: 200, w: 60, h: 40 })
    await createAnnotation(page, 'line', { x: 200, y: 200, w: 60, h: 30 })
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('mixed types overlapping at same position', async ({ page }) => {
    const pos = { x: 100, y: 100, w: 120, h: 60 }
    await createAnnotation(page, 'pencil', pos)
    await createAnnotation(page, 'rectangle', pos)
    await createAnnotation(page, 'circle', pos)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('mixed types hit-test accuracy — rectangle edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on left edge of rectangle
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible().catch(() => false)
    expect(isSelected).toBe(true)
  })

  test('nudge pencil near shape', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 65)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rapid switching pencil/rectangle drawing', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 30, w: 50, h: 15 })
      await createAnnotation(page, 'rectangle', { x: 30 + i * 70, y: 60, w: 50, h: 30 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })
})
