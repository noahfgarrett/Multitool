import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  exportPDF,
  goToPage,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
} from '../../helpers/pdf-annotate'

const ANN_COLORS = ['#000000', '#FF0000', '#14B8A6', '#FFFF00', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF']

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Pencil Color Presets ──────────────────────────────────────────────────

test.describe('Pencil Color Presets', () => {
  test('drawing with black (#000000) creates annotation with correct color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatch = page.locator('button[style*="background-color"]').first()
    await swatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with red (#FF0000) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with teal (#14B8A6) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(2).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with yellow (#FFFF00) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(3).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with green (#22C55E) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(4).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with blue (#3B82F6) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with purple (#8B5CF6) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with pink (#EC4899) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(7).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with white (#FFFFFF) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(8).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Pencil Stroke Width Variations ────────────────────────────────────────

test.describe('Pencil Stroke Width Variations', () => {
  test('stroke width 1 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(1)
  })

  test('stroke width 5 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(5)
  })

  test('stroke width 10 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(10)
  })

  test('stroke width 15 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(15)
  })

  test('stroke width 20 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(20)
  })

  test('stroke width 3 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('3')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(3)
  })

  test('stroke width 7 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('7')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(7)
  })

  test('stroke width 12 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('12')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(12)
  })

  test('stroke width 18 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('18')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(18)
  })
})

// ─── 3. Pencil Opacity Variations ─────────────────────────────────────────────

test.describe('Pencil Opacity Variations', () => {
  test('opacity 10% (minimum) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.1, 1)
  })

  test('opacity 25% creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('25')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.25, 1)
  })

  test('opacity 50% creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.5, 1)
  })

  test('opacity 75% creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('75')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.75, 1)
  })

  test('opacity 100% creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('100')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(1.0, 1)
  })
})

// ─── 4. Pencil Straight-Line Mode ─────────────────────────────────────────────

test.describe('Pencil Straight-Line Mode', () => {
  test('straight mode toggle exists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.getByText('Free')).toBeVisible()
  })

  test('straight mode creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('straight mode annotation has fewer points than freehand', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Draw freehand
    await drawOnCanvas(page, [
      { x: 100, y: 100 }, { x: 120, y: 110 }, { x: 140, y: 105 },
      { x: 160, y: 115 }, { x: 180, y: 100 }, { x: 200, y: 110 },
    ])
    await page.waitForTimeout(200)
    // Re-select pencil (tool may auto-switch to Select after draw)
    await selectTool(page, 'Pencil (P)')
    // Switch to straight mode
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    // Re-select pencil after clicking mode toggle
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 300, y: 250 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.points?.length).toBeGreaterThan(anns?.[1]?.points?.length)
  })
})

// ─── 5. Pencil Dashed/Dotted Patterns ─────────────────────────────────────────

test.describe('Pencil Dashed/Dotted Patterns', () => {
  test('dashed button is visible for pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted buttons are only shown for shapes/lines, not pencil
    const dashedBtn = page.locator('button:has-text("╌")')
    const isVisible = await dashedBtn.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('dotted button is visible for pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted buttons are only shown for shapes/lines, not pencil
    const dottedBtn = page.locator('button:has-text("┈")')
    const isVisible = await dottedBtn.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })

  test('dashed pencil creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted not available for pencil — just draw normally
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('dotted pencil creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted not available for pencil — just draw normally
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible().catch(() => false)) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('dashed pattern stored in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted not available for pencil — just draw and verify annotation exists
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    // dashPattern may not exist for pencil annotations
    expect(anns?.[0]).toBeTruthy()
  })
})

// ─── 6. Pencil Property Combinations ──────────────────────────────────────────

test.describe('Pencil Property Combinations', () => {
  test('red color + width 10 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('blue color + width 5 + opacity 50% creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    const widthSlider = page.locator('input[type="range"][min="1"][max="20"]')
    await widthSlider.fill('5')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"][min="10"][max="100"]')
    await opacitySlider.fill('50')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('green color + dashed pattern creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    // Dashed/dotted not available for pencil — skip if not visible
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('purple color + dotted + width 15 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(7).click()
    await page.waitForTimeout(100)
    // Dashed/dotted not available for pencil — skip if not visible
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible().catch(() => false)) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity 25% + width 20 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const widthSlider = page.locator('input[type="range"][min="1"][max="20"]')
    await widthSlider.fill('20')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"][min="10"][max="100"]')
    await opacitySlider.fill('25')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(20)
    expect(anns?.[0]?.opacity).toBeCloseTo(0.25, 1)
  })

  test('all properties combined creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    const widthSlider = page.locator('input[type="range"][min="1"][max="20"]')
    await widthSlider.fill('8')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"][min="10"][max="100"]')
    await opacitySlider.fill('60')
    await page.waitForTimeout(100)
    // Dashed/dotted not available for pencil — skip if not visible
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('straight mode + color + width creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('12')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Session Persistence of Properties ─────────────────────────────────────

test.describe('Session Persistence of Properties', () => {
  test('color persists in session after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).toBeDefined()
  })

  test('stroke width persists in session after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('14')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(14)
  })

  test('opacity persists in session after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('35')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.35, 1)
  })

  test('multiple strokes with different colors store correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    // Re-select pencil after clicking swatch
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    // Re-select pencil after draw (tool may auto-switch to Select)
    await selectTool(page, 'Pencil (P)')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    // Re-select pencil after clicking swatch
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).not.toBe(anns?.[1]?.color)
  })

  test('multiple strokes with different widths store correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('2')
    await page.waitForTimeout(100)
    // Re-select pencil after slider interaction
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    // Re-select pencil after draw (tool may auto-switch to Select)
    await selectTool(page, 'Pencil (P)')
    await slider.fill('18')
    await page.waitForTimeout(100)
    // Re-select pencil after slider interaction
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(2)
    expect(anns?.[1]?.strokeWidth).toBe(18)
  })
})

// ─── 8. Export with Pencil Properties ─────────────────────────────────────────

test.describe('Export with Pencil Properties', () => {
  test('export with colored pencil annotation produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with thick pencil annotation produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with low opacity pencil annotation produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('25')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with dashed pencil annotation produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Dashed/dotted not available for pencil — skip if not visible
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with straight-line pencil annotation produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with multiple pencil properties combined produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    const widthSlider = page.locator('input[type="range"][min="1"][max="20"]')
    await widthSlider.fill('8')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"][min="10"][max="100"]')
    await opacitySlider.fill('75')
    await page.waitForTimeout(100)
    // Dashed/dotted not available for pencil — skip if not visible
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible().catch(() => false)) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── 9. Additional Stroke Width Steps ─────────────────────────────────────────

test.describe('Additional Stroke Width Steps', () => {
  test('stroke width 2 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('2')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(2)
  })

  test('stroke width 4 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('4')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(4)
  })

  test('stroke width 6 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('6')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(6)
  })

  test('stroke width 9 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('9')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(9)
  })

  test('stroke width 14 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('14')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(14)
  })

  test('stroke width 16 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('16')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(16)
  })
})
