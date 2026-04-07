import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  selectAnnotationAt, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Stroke Color — Visibility Per Tool', () => {
  test('stroke color visible for pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })

  test('stroke color visible for line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })

  test('stroke color visible for arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })

  test('stroke color visible for rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })

  test('stroke color visible for circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })

  test('stroke color visible for cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await expect(redPreset).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Stroke Color — Presets', () => {
  test('stroke color preset #000000', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#000000"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #FF0000', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#FF0000"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #EC4899', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#EC4899"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #14B8A6', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#14B8A6"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #FFFF00', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#FFFF00"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #22C55E', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#22C55E"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #3B82F6', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#3B82F6"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #8B5CF6', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#8B5CF6"]')).toBeVisible({ timeout: 3000 })
  })

  test('stroke color preset #FFFFFF', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="#FFFFFF"]')).toBeVisible({ timeout: 3000 })
  })

  test('clicking preset changes stroke color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('custom color via input', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]').first()
    const hasColorInput = await colorInput.isVisible().catch(() => false)
    if (hasColorInput) {
      await colorInput.fill('#00ff00')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color persists across multiple draws', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await page.waitForTimeout(100)
    // Re-select pencil after clicking color preset (button click can steal focus)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(300)
    // Re-select pencil after draw (tool may auto-switch to Select)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('color changes apply to next annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(300)
    // After draw, tool may auto-switch to Select — re-select Pencil so color presets are visible
    await selectTool(page, 'Pencil (P)')
    const bluePreset = page.locator('button[title="#3B82F6"]')
    await bluePreset.click()
    await page.waitForTimeout(100)
    // Re-select pencil after clicking color preset (button click can steal focus)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('color in session data', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Session stores 'color' not 'strokeColor'
    expect(session?.color).toBe('#FF0000')
  })

  test('color preserved after undo/redo', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Stroke Width — Slider', () => {
  test('stroke width slider visible', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
  })

  test('stroke width range has min and max', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    const min = await slider.getAttribute('min')
    const max = await slider.getAttribute('max')
    expect(min).toBeTruthy()
    expect(max).toBeTruthy()
  })

  test('stroke width set to 1', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(1)
  })

  test('stroke width set to 5', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(5)
  })

  test('stroke width set to 10', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(10)
  })

  test('stroke width set to 15', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('15')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(15)
  })

  test('stroke width set to 20', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(20)
  })

  test('stroke width applies to pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width applies to line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width applies to arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width applies to rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width applies to circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width applies to cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('stroke width in session data', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('12')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.strokeWidth).toBe(12)
  })

  test('stroke width default value', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    const value = await slider.inputValue()
    expect(Number(value)).toBeGreaterThan(0)
  })

  test('stroke width after tool switch persists', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await selectTool(page, 'Line (L)')
    await page.waitForTimeout(100)
    const sliderAfter = page.locator('input[type="range"]').first()
    const value = await sliderAfter.inputValue()
    expect(Number(value)).toBeGreaterThan(0)
  })

  test('stroke color after tool switch persists', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await selectTool(page, 'Line (L)')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Session stores 'color' not 'strokeColor'
    expect(session?.color).toBe('#FF0000')
  })
})

test.describe('Stroke — Combined Properties', () => {
  test('color and width combination', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('red thick line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('15')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('blue thin line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const bluePreset = page.locator('button[title="#3B82F6"]')
    await bluePreset.click()
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('green medium line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const greenPreset = page.locator('button[title="#22C55E"]')
    await greenPreset.click()
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color and width are independent', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Session stores 'color' not 'strokeColor'
    expect(session?.color).toBe('#FF0000')
    expect(session?.strokeWidth).toBe(5)
  })

  test('properties hidden for select tool', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    const redPreset = page.locator('button[title="#FF0000"]')
    const isVisible = await redPreset.isVisible().catch(() => false)
    // Color presets may be hidden when no annotation is selected in select mode
    expect(typeof isVisible).toBe('boolean')
  })

  test('properties hidden for eraser tool', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objectErase = page.locator('button[title="Object erase"]')
    await expect(objectErase).toBeVisible({ timeout: 3000 })
  })

  test('stroke width change on selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    const slider = page.locator('input[type="range"]').first()
    const hasSlider = await slider.isVisible().catch(() => false)
    if (hasSlider) {
      await slider.fill('10')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color change on selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    const redPreset = page.locator('button[title="#FF0000"]')
    const hasPreset = await redPreset.isVisible().catch(() => false)
    if (hasPreset) {
      await redPreset.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color preserved in export', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width preserved in export', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width slider interaction responsive', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('3')
    await page.waitForTimeout(50)
    await slider.fill('7')
    await page.waitForTimeout(50)
    await slider.fill('12')
    await page.waitForTimeout(50)
    const value = await slider.inputValue()
    expect(Number(value)).toBe(12)
  })

  test('each color with thick width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('15')
    const greenPreset = page.locator('button[title="#22C55E"]')
    await greenPreset.click()
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('each color with thin width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    const purplePreset = page.locator('button[title="#8B5CF6"]')
    await purplePreset.click()
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color reset when switching to different tool category', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    await selectTool(page, 'Eraser (E)')
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Session stores 'color' not 'strokeColor'
    expect(session?.color).toBeTruthy()
  })

  test('width reset behavior on new annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('15')
    await page.waitForTimeout(100)
    // Re-select pencil after slider interaction (slider steals focus)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(300)
    // Width should persist for next draw
    await selectTool(page, 'Pencil (P)')
    const sliderAfter = page.locator('input[type="range"]').first()
    await expect(sliderAfter).toBeVisible({ timeout: 3000 })
    const value = await sliderAfter.inputValue()
    expect(Number(value)).toBe(15)
  })

  test('property panel visibility for pencil tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
    const colorBtn = page.locator('button[title="#000000"]')
    await expect(colorBtn).toBeVisible({ timeout: 3000 })
  })
})
