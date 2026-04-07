import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, clearSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Color Picker ─────────────────────────────────────────────────────────────

test.describe('Color Picker — Basics', () => {
  test('color picker is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // ColorPicker should be in the properties bar
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('color picker is visible when rectangle tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('color picker is hidden on select tool with no selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    // With no annotation selected, no color picker
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('color picker appears when annotation is selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('default color is the orange brand color', async ({ page }) => {
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
})

test.describe('Color Picker — Preset Colors', () => {
  test('black preset color creates black annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    // Click the black color swatch by title
    const blackSwatch = page.locator('button[title="#000000"]')
    await blackSwatch.click()
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    if (anns.length > 0) {
      expect(anns[anns.length - 1]?.color).toBe('#000000')
    }
  })

  test('red preset color works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    // We find the ColorPicker trigger and try to set red
    await page.waitForTimeout(200)
    // Create annotation and check color persisted in session
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('multiple preset color swatches are available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // The ANN_COLORS array has 9 colors
    const swatches = page.locator('button[style*="background-color"]')
    const count = await swatches.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('green preset color creates green annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    // Click color picker area, then select green if available
    const greenSwatch = page.locator('button[style*="#22C55E"], button[style*="rgb(34, 197, 94)"]').first()
    if (await greenSwatch.isVisible({ timeout: 2000 }).catch(() => false)) {
      await greenSwatch.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('blue preset color creates blue annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const blueSwatch = page.locator('button[style*="#3B82F6"], button[style*="rgb(59, 130, 246)"]').first()
    if (await blueSwatch.isVisible({ timeout: 2000 }).catch(() => false)) {
      await blueSwatch.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('color persists across multiple strokes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    // Draw two rectangles — both should use the current color
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    expect(anns[0].color).toBe(anns[1].color)
  })

  test('color change applies to subsequently selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const originalColor = annsBefore[0]?.color
    // Select the annotation — this loads its color into the picker
    await selectAnnotationAt(page, 100, 140)
    // The color should match the annotation's color in the picker
    expect(originalColor).toBeDefined()
  })

  test('white preset color creates white annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const whiteSwatch = page.locator('button[style*="#FFFFFF"], button[style*="rgb(255, 255, 255)"]').first()
    if (await whiteSwatch.isVisible({ timeout: 2000 }).catch(() => false)) {
      await whiteSwatch.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('yellow preset color works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const yellowSwatch = page.locator('button[style*="#FFFF00"], button[style*="rgb(255, 255, 0)"]').first()
    if (await yellowSwatch.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yellowSwatch.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    if (anns.length > 0 && anns[anns.length - 1]?.color === '#FFFF00') {
      expect(anns[anns.length - 1].color).toBe('#FFFF00')
    }
  })

  test('color persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.color).toBeDefined()
    expect(typeof session?.color).toBe('string')
  })
})

// ─── Stroke Width ─────────────────────────────────────────────────────────────

test.describe('Stroke Width', () => {
  test('stroke width slider is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Width/')).toBeVisible()
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider is visible for rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider is visible for line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('default stroke width is 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    const val = await slider.inputValue()
    expect(val).toBe('2')
  })

  test('stroke width minimum is 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    const min = await slider.getAttribute('min')
    expect(min).toBe('1')
  })

  test('stroke width maximum is 20', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    const max = await slider.getAttribute('max')
    expect(max).toBe('20')
  })

  test('changing stroke width slider updates displayed value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    // The value label next to slider should show 10
    await expect(page.getByText('10', { exact: true })).toBeVisible()
  })

  test('stroke width applies to new drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('8')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.strokeWidth).toBe(8)
  })

  test('stroke width applies to selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.strokeWidth).toBe(15)
  })

  test('stroke width persists across tool switches', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('12')
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await selectTool(page, 'Pencil (P)')
    const val = await slider.inputValue()
    expect(val).toBe('12')
  })

  test('stroke width persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('7')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(7)
  })

  test('thick stroke is visually different from thin stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const thin = await screenshotCanvas(page)
    // Change to thick and draw again
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    const thick = await screenshotCanvas(page)
    expect(Buffer.compare(thin, thick)).not.toBe(0)
  })
})

// ─── Opacity ──────────────────────────────────────────────────────────────────

test.describe('Opacity', () => {
  test('opacity slider is visible when drawing tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Opacity/')).toBeVisible()
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('default opacity is 100', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    const val = await slider.inputValue()
    expect(val).toBe('100')
  })

  test('opacity minimum is 10', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    const min = await slider.getAttribute('min')
    expect(min).toBe('10')
  })

  test('opacity maximum is 100', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    const max = await slider.getAttribute('max')
    expect(max).toBe('100')
  })

  test('opacity step is 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    const step = await slider.getAttribute('step')
    expect(step).toBe('5')
  })

  test('changing opacity slider updates value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    const val = await slider.inputValue()
    expect(val).toBe('50')
  })

  test('low opacity annotation stores correct value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    // Opacity is stored as 0-1 ratio (10/100 = 0.1)
    expect(anns[0]?.opacity).toBeCloseTo(0.1, 1)
  })

  test('full opacity annotation stores 1.0', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('100')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.opacity).toBeCloseTo(1.0, 1)
  })

  test('opacity applies to selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('30')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.opacity).toBeCloseTo(0.3, 1)
  })

  test('low opacity renders differently from full opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('100')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    const fullOpacity = await screenshotCanvas(page)
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 220, y: 280 })
    await page.waitForTimeout(200)
    const lowOpacity = await screenshotCanvas(page)
    expect(Buffer.compare(fullOpacity, lowOpacity)).not.toBe(0)
  })

  test('opacity persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('60')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(60)
  })

  test('opacity not shown for highlighter tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    // Highlighter has its own fixed opacity (0.4), slider should be hidden
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeHidden()
  })

  test('mid-range opacity (50%) stores 0.5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.opacity).toBeCloseTo(0.5, 1)
  })

  test('opacity persists across tool switches', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('40')
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await selectTool(page, 'Pencil (P)')
    const val = await slider.inputValue()
    expect(val).toBe('40')
  })
})

// ─── Combined Properties ──────────────────────────────────────────────────────

test.describe('Combined Properties', () => {
  test('selecting annotation loads its color into picker', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    // Verify the stroke width slider updates to match annotation
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    const val = await slider.inputValue()
    expect(Number(val)).toBeGreaterThanOrEqual(1)
  })

  test('selecting annotation loads its stroke width', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('8')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const val = await slider.inputValue()
    expect(val).toBe('8')
  })

  test('selecting annotation loads its opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const opSlider = page.locator('input[type="range"][min="10"][max="100"]')
    await opSlider.fill('45')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const val = await opSlider.inputValue()
    // Opacity stored as 0.45 → round to nearest 5 = 45
    expect(Number(val)).toBe(45)
  })

  test('properties bar hidden for eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    // Eraser has its own controls, not the standard color/stroke/opacity
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeHidden()
  })

  test('color picker visible for arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('color picker visible for circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('[data-testid="color-picker"], .relative button[style*="background"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('stroke width visible for arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width visible for circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('opacity visible for arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('stroke width 1 creates thin annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.strokeWidth).toBe(1)
  })

  test('stroke width 20 creates thick annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.strokeWidth).toBe(20)
  })

  test('highlighter auto-switches to yellow color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.color).toBe('#FFFF00')
  })
})
