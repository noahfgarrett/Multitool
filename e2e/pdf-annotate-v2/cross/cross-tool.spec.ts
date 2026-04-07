import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool Interactions', () => {
  test('create pencil then switch to rectangle — pencil committed', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create rectangle then undo — removes rectangle not pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('mix annotation types — all in count', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 50 })
    await createAnnotation(page, 'arrow', { x: 200, y: 50, w: 80, h: 40 })
    await createAnnotation(page, 'line', { x: 200, y: 130, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('switch tools rapidly — no crash', async ({ page }) => {
    const tools = [
      'Pencil (P)', 'Line (L)', 'Arrow (A)', 'Rectangle (R)',
      'Circle (C)', 'Text (T)', 'Callout (O)', 'Eraser (E)',
      'Highlight (H)', 'Select (S)',
    ]
    for (let i = 0; i < 20; i++) {
      await selectTool(page, tools[i % tools.length])
    }
    await page.waitForTimeout(200)
    // Page should still be functional
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('draw with each tool type — all counted correctly', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'line', { x: 50, y: 80, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await createAnnotation(page, 'arrow', { x: 50, y: 130, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(3)
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(4)
    await createAnnotation(page, 'circle', { x: 50, y: 260, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('select annotation created by different tool', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on the rectangle edge to select it
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Should still have 1 annotation (selecting doesn't delete)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete annotations of different types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select and delete rectangle
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 190)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('export with multiple annotation types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })

  test('undo/redo across different tool types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 260, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    // Undo circle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo rectangle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo rectangle
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy rectangle, paste, then draw pencil — all 3 counted', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await createAnnotation(page, 'pencil', { x: 50, y: 280, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('erase specific annotation type among mixed', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase over the pencil stroke
    await drawOnCanvas(page, [{ x: 100, y: 205 }, { x: 200, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tool switch preserves previous annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch through several tools without drawing
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Circle (C)')
    await selectTool(page, 'Arrow (A)')
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('lock tool mode — draw multiple of same type', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Look for pin/lock button
    const lockBtn = page.locator('button[title*="Lock"], button[title*="Pin"], button[title*="lock"], button[title*="pin"]')
    if (await lockBtn.count() > 0) {
      await lockBtn.first().click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 130, y: 100 })
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 130, y: 200 })
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 50, y: 250 }, { x: 130, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('create 10 different annotations then delete all via undo', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 60, y: 50, w: 40, h: 20 })
    }
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 60, y: 120, w: 40, h: 30 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    // Undo all 10 — use longer wait between undos for reliability
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('zoom then draw with different tools', async ({ page }) => {
    // Zoom in once (125%) using the toolbar button
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'rectangle', { x: 80, y: 160, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
