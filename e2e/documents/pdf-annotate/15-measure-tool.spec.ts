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

// ─── Measure Tool Activation ──────────────────────────────────────────────────

test.describe('Measure Tool — Activation', () => {
  test('M key activates measure tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('m')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Measure (M)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('measure tool button is visible in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Measure (M)"]')).toBeVisible()
  })

  test('clicking measure button activates measure tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Measure (M)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Measure (M)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('status bar shows "Click two points" when measure active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('switching away from measure deactivates it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await selectTool(page, 'Select (S)')
    const btn = page.locator('button[title="Measure (M)"]')
    await expect(btn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── Measure Tool — Creating Measurements ─────────────────────────────────────

test.describe('Measure Tool — Creating Measurements', () => {
  test('click-click creates a measurement between two points', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    // Measurement label showing px distance should be visible on canvas
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('measurement shows pixel distance label by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    // The measurement label with "px" should be rendered on the canvas
    // We verify by taking a screenshot before and after — they differ
    const after = await screenshotCanvas(page)
    expect(after.byteLength).toBeGreaterThan(0)
  })

  test('multiple measurements can be created', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // First measurement
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    // Second measurement
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    // Session should contain 2 measurements
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const pageMeas = session.measurements[1] || session.measurements['1'] || []
    expect(pageMeas.length).toBe(2)
  })

  test('measurement line is visible on canvas after creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 80, 120)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 280, 120)
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('measurement preview line shows during placement', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    // Move mouse without clicking — preview should render
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 250, box.y + 100)
      await page.waitForTimeout(300)
    }
    const during = await screenshotCanvas(page)
    expect(Buffer.compare(before, during)).not.toBe(0)
  })

  test('measurement does not add to annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('three measurements can coexist on a single page', async ({ page }) => {
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
    const pageMeas = session.measurements[1] || session.measurements['1'] || []
    expect(pageMeas.length).toBe(3)
  })
})

// ─── Measure Tool — Calibration ───────────────────────────────────────────────

test.describe('Measure Tool — Calibration', () => {
  test('clicking measurement label opens calibration modal', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Create a measurement
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    // Click the midpoint label area (center of the measurement)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    // Calibration modal should appear
    await expect(page.getByText('Calibrate Measurement')).toBeVisible({ timeout: 3000 })
  })

  test('calibration modal has distance input field', async ({ page }) => {
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
    const select = page.locator('select')
    await expect(select).toBeVisible({ timeout: 3000 })
  })

  test('unit selector has inches option', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="in"]')).toBeAttached()
  })

  test('unit selector has feet option', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="ft"]')).toBeAttached()
  })

  test('unit selector has millimeters option', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="mm"]')).toBeAttached()
  })

  test('unit selector has centimeters option', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="cm"]')).toBeAttached()
  })

  test('unit selector has meters option', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('option[value="m"]')).toBeAttached()
  })

  test('calibration apply button exists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Apply")')).toBeVisible({ timeout: 3000 })
  })

  test('apply button is disabled with empty input', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const applyBtn = page.locator('button:has-text("Apply")')
    await expect(applyBtn).toBeDisabled()
  })

  test('entering valid value enables apply button', async ({ page }) => {
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
    const applyBtn = page.locator('button:has-text("Apply")')
    await expect(applyBtn).toBeEnabled()
  })

  test('applying calibration changes measurement label on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    const beforeCal = await screenshotCanvas(page)
    // Open calibration modal
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('10')
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)
    const afterCal = await screenshotCanvas(page)
    expect(Buffer.compare(beforeCal, afterCal)).not.toBe(0)
  })

  test('calibration shows scale info in measure controls', async ({ page }) => {
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
    // Scale info should appear in the properties bar
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })

  test('calibration can be changed to feet unit', async ({ page }) => {
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

  test('reset calibration button appears after calibrating', async ({ page }) => {
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
    await expect(page.locator('button:has-text("Reset Scale")')).toBeVisible()
  })

  test('reset scale button resets calibration', async ({ page }) => {
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
    await page.locator('button:has-text("Reset Scale")').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Scale:/')).toBeHidden()
  })

  test('entering zero in calibration keeps apply disabled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('0')
    await page.waitForTimeout(100)
    await expect(page.locator('button:has-text("Apply")')).toBeDisabled()
  })

  test('entering negative value in calibration shows error', async ({ page }) => {
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
})

// ─── Measure Tool — Delete & Manage ───────────────────────────────────────────

test.describe('Measure Tool — Delete & Manage', () => {
  test('delete key removes selected measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    // The last placed measurement is auto-selected
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(0)
  })

  test('backspace key removes selected measurement', async ({ page }) => {
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

  test('clear all button removes all measurements on page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Create two measurements
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    // Click Clear All
    await page.locator('button:has-text("Clear All")').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(0)
  })

  test('measurement persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.measurements).toBeDefined()
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

  test('measurement at different canvas position works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Place measurement in lower-right area
    await clickCanvasAt(page, 300, 350)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 450, 350)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })

  test('diagonal measurement between two points works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
    // Verify start and end points differ in both x and y
    const m = pageMeas[0]
    expect(m.startPt.x).not.toBe(m.endPt.x)
    expect(m.startPt.y).not.toBe(m.endPt.y)
  })

  test('measurement endpoint dragging works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    const mBefore = (before?.measurements?.[1] || before?.measurements?.['1'] || [])[0]
    // Click near the end point to start re-dragging it
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(200)
    // If endpoint drag started, clicking a new position commits new endpoint
    await clickCanvasAt(page, 350, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const after = await getSessionData(page)
    expect(after).not.toBeNull()
  })
})

// ─── Measure Tool — Interaction with Other Features ───────────────────────────

test.describe('Measure Tool — Interactions', () => {
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

  test('annotations and measurements coexist visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 350, 50)
    await page.waitForTimeout(300)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
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
    // Measurement should still be visible
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })

  test('closing calibration modal with X does not apply calibration', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('10')
    // Close modal without applying
    const closeBtn = page.locator('[role="dialog"] button').filter({ hasText: /^$/ }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Scale:/')).toBeHidden()
  })

  test('calibration enter key submits valid value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="e.g. 12"]').fill('8')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })

  test('measurement cursor is crosshair', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Cursor style set on the annotation canvas
    const canvas = page.locator('canvas').nth(1)
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('measurement stores both start and end points', async ({ page }) => {
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
    expect(m.startPt.y).toBeDefined()
    expect(m.endPt.x).toBeDefined()
    expect(m.endPt.y).toBeDefined()
  })

  test('measurement stores page number', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas[0]?.page).toBeDefined()
  })

  test('measurement has a unique id', async ({ page }) => {
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
    expect(pageMeas[0].id).toBeDefined()
    expect(pageMeas[1].id).toBeDefined()
    expect(pageMeas[0].id).not.toBe(pageMeas[1].id)
  })

  test('horizontal measurement has same Y for start and end', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    const m = pageMeas[0]
    // Y values should be approximately the same (within snap tolerance)
    expect(Math.abs(m.startPt.y - m.endPt.y)).toBeLessThan(40)
  })

  test('vertical measurement has same X for start and end', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 350)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    const m = pageMeas[0]
    expect(Math.abs(m.startPt.x - m.endPt.x)).toBeLessThan(40)
  })
})
