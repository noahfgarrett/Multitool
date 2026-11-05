import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, dragOnCanvas, createAnnotation, getAnnotationCount,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Measurement Creation ───────────────────────────────────────────────────

test.describe('QA Measure — Creation', () => {
  test('click-click places a measurement line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })

  test('measurement has startPt and endPt', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 120, 180)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 320, 180)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    const m = pageMeas[0]
    expect(m.startPt).toBeDefined()
    expect(m.endPt).toBeDefined()
    expect(m.startPt.x).toBeDefined()
    expect(m.endPt.x).toBeDefined()
  })

  test('measurement has a unique id', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas[0].id).toBeDefined()
  })

  test('measurement does not add to annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multiple measurements can coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    for (let i = 0; i < 3; i++) {
      await clickCanvasAt(page, 50, 80 + i * 60)
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 80 + i * 60)
      await page.waitForTimeout(300)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(3)
  })

  test('diagonal measurement stores different x and y for start/end', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    const m = pageMeas[0]
    expect(m.startPt.x).not.toBe(m.endPt.x)
    expect(m.startPt.y).not.toBe(m.endPt.y)
  })

  test('two measurements have different ids', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas[0].id).not.toBe(pageMeas[1].id)
  })
})

// ─── Calibration Modal ──────────────────────────────────────────────────────

test.describe('QA Measure — Calibration', () => {
  test('clicking measurement label opens calibration modal', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.getByText('Calibrate Measurement')).toBeVisible({ timeout: 3000 })
  })

  test('calibration modal has distance input', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('input[placeholder="e.g. 12"]')).toBeVisible({ timeout: 3000 })
  })

  test('calibration modal has unit selector', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('select')).toBeVisible({ timeout: 3000 })
  })

  test('unit selector has inches, feet, mm, cm, m options', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="in"]')).toBeAttached()
    await expect(page.locator('option[value="ft"]')).toBeAttached()
    await expect(page.locator('option[value="mm"]')).toBeAttached()
    await expect(page.locator('option[value="cm"]')).toBeAttached()
    await expect(page.locator('option[value="m"]')).toBeAttached()
  })

  test('apply button disabled with empty input', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Apply")')).toBeDisabled()
  })

  test('entering valid value enables apply', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('12')
    await page.waitForTimeout(100)
    await expect(page.locator('button:has-text("Apply")')).toBeEnabled()
  })

  test('calibration sets real-world values and shows scale info', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('5')
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })

  test('calibration persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('10')
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.calibration).toBeDefined()
    expect(session.calibration.pixelsPerUnit).not.toBeNull()
  })

  test('calibration with feet unit shows px/ft', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('select').selectOption('ft')
    await page.locator('input[placeholder="e.g. 12"]').fill('3')
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/px\\/ft/')).toBeVisible({ timeout: 3000 })
  })

  test('negative value shows error', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('-5')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Enter a positive number/')).toBeVisible()
  })

  test('zero value keeps apply disabled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.getByPlaceholder('e.g.').fill('0')
    await page.waitForTimeout(100)
    await expect(page.locator('button:has-text("Apply")')).toBeDisabled()
  })

  test('Enter key submits calibration', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.getByPlaceholder('e.g.').fill('8')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })
})

// ─── Clear All / Reset Scale ────────────────────────────────────────────────

test.describe('QA Measure — Clear All / Reset Scale', () => {
  test('Clear All removes all measurements', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Clear All")').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(0)
  })

  test('Reset Scale clears calibration', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.getByPlaceholder('e.g.').fill('5')
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("Reset Scale")')).toBeVisible()
    await page.locator('button:has-text("Reset Scale")').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Scale:/')).toBeHidden()
  })

  test('Delete key removes selected measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(0)
  })

  test('Backspace removes selected measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(0)
  })
})

// ─── Undo Measurement (U3 Fix) ──────────────────────────────────────────────

test.describe('QA Measure — Undo (U3 Fix)', () => {
  test('undo does not affect measurements (annotations only)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const measBefore = beforeSession?.measurements?.[1] || beforeSession?.measurements?.['1'] || []
    expect(measBefore.length).toBe(1)
    // Ctrl+Z undo only affects annotations, not measurements
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const measAfter = afterSession?.measurements?.[1] || afterSession?.measurements?.['1'] || []
    expect(measAfter.length).toBe(1)
  })

  test('redo restores undone measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })
})

// ─── Status Bar Hints (P7) ──────────────────────────────────────────────────

test.describe('QA Measure — Status Bar Hints (P7)', () => {
  test('status bar shows "Click two points" when measure active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('cursor is crosshair when measure tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    const canvas = page.locator('canvas.active-canvas').first()
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })
})

// ─── Interactions ───────────────────────────────────────────────────────────

test.describe('QA Measure — Interactions', () => {
  test('measurements do not interfere with annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 50)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switching from measure to select preserves measurements', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })

  test('measurement at different canvas position works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 300, 350)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 450, 350)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })
})
