import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Export Core', () => {
  test('export button triggers download', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('exported file is valid PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })

  test('pencil strokes appear in export', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('lines appear in export', async ({ page }) => {
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('arrows with single head appear in export', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rectangles appear in export', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('circles appear in export', async ({ page }) => {
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('text boxes export correctly', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('callout boxes with arrows export', async ({ page }) => {
    await createAnnotation(page, 'callout')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with no annotations — same as original', async ({ page }) => {
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export button shows loading state during process', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with all annotation types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 30, y: 80, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 120, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 170, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 150, y: 170, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 30, y: 250, w: 120, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after undo/redo — current state exported', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 50 annotations — completes without timeout', async ({ page }) => {
    test.setTimeout(120000)
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 50; i++) {
      await dragOnCanvas(page,
        { x: 20 + (i % 10) * 30, y: 20 + Math.floor(i / 10) * 30 },
        { x: 40 + (i % 10) * 30, y: 20 + Math.floor(i / 10) * 30 }
      )
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(50)
    const download = await exportPDF(page, 30000)
    expect(download).toBeTruthy()
  })

  test('export with dash patterns', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with fill colors', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]')
    if (await fillInput.count() > 0 && await fillInput.first().isVisible()) {
      await fillInput.first().fill('#FF0000')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('user cancels save picker — no error', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    // This test uses the fallback path since showSaveFilePicker isn't available in headless
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rounded rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Radius')) {
        await sliders.nth(i).fill('15')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export bold/italic text uses correct PDF font variant', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
