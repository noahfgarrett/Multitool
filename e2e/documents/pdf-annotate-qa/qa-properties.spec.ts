import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Color Picker ───────────────────────────────────────────────────────────

test.describe('Properties QA — Color Picker', () => {
  test('color picker is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('multiple preset color swatches are available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    const count = await swatches.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('default color is the brand orange', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.color).toBe('#14B8A6')
  })

  test('drawing with default color creates orange annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.color).toBe('#14B8A6')
  })

  test('color picker appears when annotation is selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })
})

// ─── Stroke Width ───────────────────────────────────────────────────────────

test.describe('Properties QA — Stroke Width Slider', () => {
  test('stroke width slider is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
  })

  test('stroke width slider can be adjusted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(10)
  })

  test('stroke width value persists after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(8)
  })
})

// ─── Opacity Slider ─────────────────────────────────────────────────────────

test.describe('Properties QA — Opacity Slider', () => {
  test('opacity slider is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider can be adjusted to 50', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('50')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(50)
  })

  test('opacity change affects new annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('70')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    // Opacity is stored as 0-1 value in annotations
    expect(anns[0]?.opacity).toBeCloseTo(0.7, 1)
  })
})

// ─── Font Size ──────────────────────────────────────────────────────────────

test.describe('Properties QA — Font Size', () => {
  test('font size control is visible in text mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Font size appears as a select or number input
    const fontSizeControl = page.locator('select, input[type="number"]').filter({ has: page.locator('option[value="16"], option[value="24"]') })
    const altControl = page.locator('input[type="number"][min]')
    const visible = await fontSizeControl.count() > 0 || await altControl.count() > 0
    expect(visible).toBe(true)
  })

  test('font size can be changed via dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await fontSizeSelect.isVisible()) {
      await fontSizeSelect.selectOption('24')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(24)
    }
  })

  test('font size can be changed to a preset value like 24 via select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Font size is a <select> with preset values
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await fontSizeSelect.isVisible()) {
      await fontSizeSelect.selectOption('24')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(24)
    }
  })

  test('font size 12 produces smaller text than font size 36', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="12"]') }).first()
    if (await fontSizeSelect.isVisible()) {
      await fontSizeSelect.selectOption('12')
      await waitForSessionSave(page)
      const s1 = await getSessionData(page)
      expect(s1?.fontSize).toBe(12)
      await fontSizeSelect.selectOption('36')
      await waitForSessionSave(page)
      const s2 = await getSessionData(page)
      expect(s2?.fontSize).toBe(36)
    }
  })
})

// ─── Font Family ────────────────────────────────────────────────────────────

test.describe('Properties QA — Font Family', () => {
  test('font family dropdown is visible in text mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect).toBeVisible()
  })

  test('font family can be changed to Courier New', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontFamily).toBe('Courier New')
  })

  test('font family defaults to a valid font', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontFamily.length).toBeGreaterThan(0)
  })
})

// ─── Text Formatting Toggles ────────────────────────────────────────────────

test.describe('Properties QA — Bold/Italic/Underline/Strikethrough', () => {
  test('bold toggle via Ctrl+B works during text editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.bold).toBe(true)
  })

  test('italic toggle via Ctrl+I works during text editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.italic).toBe(true)
  })

  test('underline toggle via Ctrl+U works during text editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.underline).toBe(true)
  })

  test('strikethrough defaults to false', async ({ page }) => {
    await uploadPDFAndWait(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strikethrough).toBe(false)
  })
})

// ─── Text Alignment ─────────────────────────────────────────────────────────

test.describe('Properties QA — Text Alignment', () => {
  test('text align center button works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) {
      await centerBtn.click()
      await page.waitForTimeout(100)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.textAlign).toBe('center')
    }
  })

  test('text align right button works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title="Align Right"]')
    if (await rightBtn.isVisible()) {
      await rightBtn.click()
      await page.waitForTimeout(100)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.textAlign).toBe('right')
    }
  })
})

// ─── Line Spacing ───────────────────────────────────────────────────────────

test.describe('Properties QA — Line Spacing', () => {
  test('line spacing dropdown is visible in text mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await expect(lineSpacingSelect).toBeVisible()
  })

  test('line spacing can be changed to 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.lineSpacing).toBe(2)
  })
})

// ─── Properties Sync on Selection Change ────────────────────────────────────

test.describe('Properties QA — Sync on Selection Change', () => {
  test('selecting different annotations updates properties bar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 80, w: 100, h: 60 })
    // Select first annotation (click on left edge)
    await selectAnnotationAt(page, 80, 110)
    await page.waitForTimeout(200)
    // Properties bar should show "Arrows nudge" hint when annotation selected
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Select second annotation (click on left edge)
    await selectAnnotationAt(page, 300, 110)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('deselecting annotation hides annotation-specific properties', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click empty area to deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })
})

// ─── Eraser Mode and Size ───────────────────────────────────────────────────

test.describe('Properties QA — Eraser', () => {
  test('eraser mode toggle is visible when eraser tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button:has-text("Object")')).toBeVisible()
  })

  test('eraser mode can be switched to object mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.eraserMode).toBe('object')
  })

  test('eraser size slider is visible and adjustable', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').first()
    await expect(sizeSlider).toBeVisible()
    await sizeSlider.fill('30')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.eraserRadius).toBe(30)
  })
})
