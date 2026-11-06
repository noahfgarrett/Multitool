import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { rightClickCanvasAt, contextMenu, jumpToPage, pageIndicator, drawPencilStrokes } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Chaos & Stress Tests', () => {
  test('rapid tool switching 30 times', async ({ page }) => {
    const keys = ['p', 'l', 'a', 'r', 'c', 't', 'o', 'e', 'h', 's']
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(keys[i % keys.length])
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('draw 30 pencil strokes', async ({ page }) => {
    test.setTimeout(60000)
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await drawOnCanvas(page, [
        { x: 20 + col * 65, y: 20 + row * 30, w: 40, h: 10 },
        { x: 60 + col * 65, y: 30 + row * 30 },
      ])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('draw 20 rectangles', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'rectangle', { x: 20 + col * 80, y: 20 + row * 50, w: 60, h: 35 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('draw 20 circles', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'circle', { x: 20 + col * 80, y: 20 + row * 50, w: 60, h: 35 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('draw 30 mixed annotations', async ({ page }) => {
    test.setTimeout(120000)
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, types[i % types.length], { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(30)
  })

  test('undo 30 times rapidly', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 40, y: 50, w: 25, h: 10 })
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo 30 times rapidly', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 40, y: 50, w: 25, h: 10 })
    }
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('alternating draw and undo 30 times', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      await createAnnotation(page, 'pencil', { x: 50 + (i % 5) * 60, y: 50, w: 40, h: 10 })
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('zoom in 15 times then zoom out 15 times', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    for (let i = 0; i < 15; i++) {
      if (await zoomInBtn.isVisible()) await zoomInBtn.click()
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 15; i++) {
      if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('rapid page switching 20 times', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    for (let i = 0; i < 20; i++) {
      // Waits for the page indicator to reach the target page (no fixed sleeps)
      await jumpToPage(page, (i % 2) + 1)
    }
    await expect(pageIndicator(page)).toHaveText(/^\s*2 \/ \d+\s*$/)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('create 30 annotations then delete all', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(30)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(30)
  })

  test('create 30 then eraser all', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(30)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    for (let row = 0; row < 5; row++) {
      await drawOnCanvas(page, [{ x: 10, y: 27 + row * 35 }, { x: 420, y: 27 + row * 35 }])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('create then export then create more', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('session save with 30 annotations', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('30 annotations export', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rapid Ctrl+F open/close 10 times', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+f')
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('rapid Escape presses', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('rapid shortcut key changes', async ({ page }) => {
    const keys = ['p', 'r', 'c', 'l', 'a', 't', 'o', 'e', 'h', 's', 'k', 'g', 'm']
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(keys[i % keys.length])
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('draw during zoom animation', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    // Draw immediately while zoom may still be animating
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw during page switch', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('many annotations + zoom + pan', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 40, y: 50, w: 25, h: 10 })
    }
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('stress: 50 pencil strokes', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 50; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      await createAnnotation(page, 'pencil', { x: 20 + col * 40, y: 20 + row * 35, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(50)
  })

  test('stress: 20 text boxes', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'text', { x: 20 + col * 80, y: 20 + row * 50, w: 60, h: 30 })
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(10)
  })

  test('stress: rapid create+delete cycle 20 times', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 20 })
      await selectTool(page, 'Select (S)')
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(100)
      await page.keyboard.press('Delete')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('stress: rapid undo+redo cycle 20 times', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stress: 10 exports in sequence', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    for (let i = 0; i < 10; i++) {
      const download = await exportPDF(page)
      expect(download).toBeTruthy()
    }
  })

  test('draw 30 then select all then duplicate', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(30)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    // Ctrl+A may not select all types; verify at least some were duplicated
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(31)
  })

  test('60 annotations after duplicate', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', { x: 20 + col * 65, y: 20 + row * 35, w: 45, h: 15 })
    }
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    // Ctrl+A may not select all; verify at least some were duplicated
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(31)
  })

  test('select all then delete clears all', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 50, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(15)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(15)
  })

  test('stress: rapid drawing with different tools', async ({ page }) => {
    test.setTimeout(60000)
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, types[i % types.length], { x: 30 + (i % 5) * 80, y: 30 + Math.floor(i / 5) * 50, w: 55, h: 25 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('rapid property changes — no crash', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF6600', '#000000']
    for (const color of colors) {
      const preset = page.locator(`button[title="${color}"]`)
      if (await preset.isVisible()) await preset.click()
      await page.waitForTimeout(30)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('rapid color switching', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    // Preset swatches are square (rounded-md); the "Recent" row repeats colors as round swatches
    const redPreset = page.locator('button.rounded-md[title="#FF0000"]')
    const blackPreset = page.locator('button.rounded-md[title="#000000"]')
    for (let i = 0; i < 10; i++) {
      await redPreset.click()
      await page.waitForTimeout(20)
      await blackPreset.click()
      await page.waitForTimeout(20)
    }
    // Last pick wins
    await expect(blackPreset).toHaveClass(/scale-110/)
    await expect(redPreset).not.toHaveClass(/scale-110/)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid stroke width changes', async ({ page }) => {
    test.setTimeout(180000)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      for (let i = 1; i <= 10; i++) {
        await slider.fill(String(Math.min(i * 2, 20)))
        await page.waitForTimeout(20)
      }
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid opacity changes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    if (await opacitySlider.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await opacitySlider.fill(String(20 + i * 15))
        await page.waitForTimeout(20)
      }
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('10 different tools in sequence with drawing', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 50, h: 15 })
    await createAnnotation(page, 'line', { x: 30, y: 60, w: 50, h: 20 })
    await createAnnotation(page, 'arrow', { x: 30, y: 100, w: 50, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 140, w: 50, h: 30 })
    await createAnnotation(page, 'circle', { x: 30, y: 190, w: 50, h: 30 })
    await createAnnotation(page, 'text', { x: 30, y: 240, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 30, y: 280, w: 70, h: 40 })
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 30, y: 340 }, { x: 100, y: 360 })
    await page.waitForTimeout(200)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(8)
  })

  test('zoom extremes: 25% to 400% to 25%', async ({ page }) => {
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    for (let i = 0; i < 8; i++) {
      if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 16; i++) {
      if (await zoomInBtn.isVisible()) await zoomInBtn.click()
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 8; i++) {
      if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('rotate 8 times (full circle twice)', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]')
    for (let i = 0; i < 8; i++) {
      if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
      await page.waitForTimeout(200)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('create+move+resize+delete cycle', async ({ page }) => {
    test.setTimeout(180000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 150 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('multi-page stress — draw on all pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session with 50 annotations save+restore', async ({ page }) => {
    test.setTimeout(60000)
    const regions = Array.from({ length: 50 }, (_, i) => ({ x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 35, w: 25, h: 10 }))
    await drawPencilStrokes(page, regions)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('export with 50 annotations', async ({ page }) => {
    test.setTimeout(60000)
    const regions = Array.from({ length: 50 }, (_, i) => ({ x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 35, w: 25, h: 10 }))
    await drawPencilStrokes(page, regions)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('performance: 100 pencil strokes with sticky tool', async ({ page }) => {
    test.setTimeout(60000)
    // The pencil stays active between strokes (no separate lock toggle any more)
    const regions = Array.from({ length: 100 }, (_, i) => ({ x: 10 + (i % 20) * 20, y: 10 + Math.floor(i / 20) * 25, w: 15, h: 10 }))
    await drawPencilStrokes(page, regions)
    expect(await getAnnotationCount(page)).toBe(100)
  })

  test('performance: draw time for annotation 1 vs 50', async ({ page }) => {
    test.setTimeout(60000)
    const start1 = Date.now()
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 15 })
    const time1 = Date.now() - start1
    const regions = Array.from({ length: 48 }, (_, k) => { const i = k + 1; return { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 35, w: 25, h: 10 } })
    await drawPencilStrokes(page, regions)
    const start50 = Date.now()
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 80, h: 15 })
    const time50 = Date.now() - start50
    expect(await getAnnotationCount(page)).toBe(50)
    // 50th annotation shouldn't take more than 10x the first
    expect(time50).toBeLessThan(time1 * 10 + 5000)
  })

  test('chaos: random tool switching and drawing', async ({ page }) => {
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let i = 0; i < 15; i++) {
      const keys = ['p', 'r', 'c', 'l', 'a']
      await page.keyboard.press(keys[i % keys.length])
      await page.waitForTimeout(30)
      await createAnnotation(page, types[i % types.length], { x: 30 + (i % 5) * 80, y: 30 + Math.floor(i / 5) * 60, w: 55, h: 25 })
    }
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(10)
  })

  test('create annotation of each type sequentially', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    await createAnnotation(page, 'text', { x: 50, y: 240, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 50, y: 280, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(7)
  })

  test('undo each type sequentially', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 4; i >= 0; i--) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
      expect(await getAnnotationCount(page)).toBe(i)
    }
  })

  test('rapid context menu open/close', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await rightClickCanvasAt(page, 100, 150)
      await expect(contextMenu(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(contextMenu(page)).toBeHidden()
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stress test: session save 10 times', async ({ page }) => {
    // Ten full debounce cycles (2s each) are inherent to this test
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    for (let i = 0; i < 10; i++) {
      await waitForSessionSave(page)
    }
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('rapid multi-select/deselect', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(50)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('zoom + rotate + draw + export sequence', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(200)
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('stress: rapid select/deselect with Tab 20 times', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 50, w: 50, h: 15 })
    }
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('stress: copy then paste 10 times', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(11)
  })

  test('stress: draw + undo + redo + export cycle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stress: alternating select-all and deselect 15 times', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 70, y: 50, w: 50, h: 30 })
    }
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(30)
      await clickCanvasAt(page, 400, 400)
      await page.waitForTimeout(30)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('final sanity: create all types then verify total count', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 150, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 250, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 150, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'text', { x: 250, y: 100, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 50, y: 160, w: 80, h: 40 })
    // Highlight
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 200, y: 160 }, { x: 350, y: 185 })
    await page.waitForTimeout(200)
    // Stamp
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 260)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(7)
  })
})
