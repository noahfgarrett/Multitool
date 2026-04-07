import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Export Annotations', () => {
  test('export pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil with red color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#FF0000')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil with thick width (10px)', async ({ page }) => {
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
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil with thin width (1px)', async ({ page }) => {
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
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil with 50% opacity', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity')) {
        await sliders.nth(i).fill('50')
        break
      }
    }
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil with dashed pattern', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export horizontal line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export vertical line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 100 }, { x: 200, y: 400 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export diagonal line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export dashed line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export dotted line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dottedBtn = page.locator('button:has-text("···")')
    if (await dottedBtn.isVisible()) await dottedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export thick line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('8')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export colored line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#0000FF')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export arrow single head', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export arrow double head', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const arrowStartBtn = page.locator('button').filter({ hasText: /Arrow Start/i }).first()
    if (await arrowStartBtn.isVisible()) await arrowStartBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export dashed arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export thick arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('8')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export filled rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const colorInputs = page.locator('input[type="color"]')
    const count = await colorInputs.count()
    if (count > 1) await colorInputs.nth(1).fill('#00FF00')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export unfilled rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
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

  test('export dashed rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export colored rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#FF00FF')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export filled circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const colorInputs = page.locator('input[type="color"]')
    const count = await colorInputs.count()
    if (count > 1) await colorInputs.nth(1).fill('#FFFF00')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export unfilled circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export dashed circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export colored circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#00FFFF')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text Arial', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ hasText: /Arial/ }).first()
    if (await fontSelect.isVisible()) await fontSelect.selectOption('Arial')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Arial text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text Times New Roman', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ hasText: /font/i }).first()
    if (await fontSelect.isVisible()) await fontSelect.selectOption({ label: 'Times New Roman' })
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Times text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text Courier', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ hasText: /font/i }).first()
    if (await fontSelect.isVisible()) await fontSelect.selectOption({ label: 'Courier New' })
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Courier text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export bold text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export italic text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export bold+italic text', async ({ page }) => {
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

  test('export text size 12', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text size 24', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeInput = page.locator('input[type="number"]').first()
    if (await fontSizeInput.isVisible()) await fontSizeInput.fill('24')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Large')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text size 48', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeInput = page.locator('input[type="number"]').first()
    if (await fontSizeInput.isVisible()) await fontSizeInput.fill('48')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Huge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text with line spacing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const lineSpacing = page.locator('select[title="Line spacing"]')
    if (await lineSpacing.isVisible()) await lineSpacing.selectOption('2')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1\nLine 2')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text aligned center', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title*="center" i], button[title*="Center" i]').first()
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export text aligned right', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title*="right" i], button[title*="Right" i]').first()
    if (await rightBtn.isVisible()) await rightBtn.click()
    await page.keyboard.type('Right aligned')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export callout with arrow', async ({ page }) => {
    await createAnnotation(page, 'callout')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export callout with formatting', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export highlight yellow', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export highlight green', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#00FF00')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export highlight blue', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#0000FF')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp APPROVED', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /APPROVED/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp DRAFT', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /DRAFT/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp CONFIDENTIAL', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /CONFIDENTIAL/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp REVIEWED', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /REVIEWED/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp VOID', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /VOID/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export stamp FOR REVIEW', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /FOR REVIEW/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export cloud with fill', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const colorInputs = page.locator('input[type="color"]')
    const count = await colorInputs.count()
    if (count > 1) await colorInputs.nth(1).fill('#FFCCCC')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export measurement', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export all types in one PDF', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 30, y: 80, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 120, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 170, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 150, y: 170, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 30, y: 250, w: 120, h: 40 })
    await createAnnotation(page, 'callout', { x: 200, y: 250, w: 150, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multiple rectangles', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 70, y: 50, w: 60, h: 40 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export mixed 20 annotations', async ({ page }) => {
    test.setTimeout(120000)
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, types[i % types.length], {
        x: 20 + (i % 5) * 70,
        y: 20 + Math.floor(i / 5) * 60,
        w: 50,
        h: 30,
      })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    const download = await exportPDF(page, 30000)
    expect(download).toBeTruthy()
  })
})
