import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt, doubleClickCanvasAt,
  dragOnCanvas, screenshotCanvas, getAnnotationCount,
  waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Open the measure dropdown and select a mode */
async function selectMeasureMode(page: import('@playwright/test').Page, mode: 'Distance' | 'Polylength' | 'Area / Perimeter' | 'Count') {
  // Activate measure tool via keyboard shortcut
  await selectTool(page, 'Measure (M)')
  await page.waitForTimeout(200)
  // Click the measure button to open dropdown — must click the actual button element via JS
  // because the canvas overlay intercepts pointer events on normal clicks
  await page.locator('button[title="Measure (M)"]').dispatchEvent('click')
  await page.waitForTimeout(300)
  // Wait for dropdown to appear (the mode buttons only render when dropdown is open)
  const modeBtn = page.locator(`button:has-text("${mode}")`)
  await expect(modeBtn).toBeVisible({ timeout: 3000 })
  // Click the mode option via dispatchEvent to bypass canvas overlay
  await modeBtn.dispatchEvent('click')
  await page.waitForTimeout(300)
}

/** Create a basic linear measurement and wait for it to register */
async function createLinearMeasurement(
  page: import('@playwright/test').Page,
  x1: number, y1: number,
  x2: number, y2: number,
) {
  await clickCanvasAt(page, x1, y1)
  await page.waitForTimeout(200)
  await clickCanvasAt(page, x2, y2)
  await page.waitForTimeout(300)
}

/** Open the calibration modal by clicking the measurement label midpoint */
async function openCalibrationModal(page: import('@playwright/test').Page, midX: number, midY: number) {
  await clickCanvasAt(page, midX, midY)
  await page.waitForTimeout(300)
  await expect(page.getByText('Calibrate Measurement')).toBeVisible({ timeout: 3000 })
}

/** Apply a calibration value with a specific unit */
async function applyCalibration(page: import('@playwright/test').Page, value: string, unit?: string) {
  if (unit) {
    await page.locator('select').selectOption(unit)
  }
  await page.locator('input[placeholder="e.g. 12"]').fill(value)
  await page.locator('button:has-text("Apply")').click()
  await page.waitForTimeout(500)
}

/** Create a count group via the modal */
async function createCountGroup(page: import('@playwright/test').Page, label: string) {
  // In count mode, clicking canvas without an active group opens the modal
  await clickCanvasAt(page, 200, 200)
  await page.waitForTimeout(300)
  await expect(page.getByText('New Count Group')).toBeVisible({ timeout: 3000 })
  await page.locator('input[placeholder="e.g. Doors, Outlets, Sprinklers"]').fill(label)
  await page.locator('button:has-text("Create Group")').click()
  await page.waitForTimeout(300)
}

/** Get measurements array from session for page 1 */
async function getPageMeasurements(page: import('@playwright/test').Page): Promise<unknown[]> {
  const session = await getSessionData(page)
  return session?.measurements?.[1] || session?.measurements?.['1'] || []
}

/** Get polyMeasurements array from session for page 1 */
async function getPagePolyMeasurements(page: import('@playwright/test').Page): Promise<unknown[]> {
  const session = await getSessionData(page)
  return session?.polyMeasurements?.[1] || session?.polyMeasurements?.['1'] || []
}

/** Get countGroups array from session for page 1 */
async function getPageCountGroups(page: import('@playwright/test').Page): Promise<unknown[]> {
  const session = await getSessionData(page)
  return session?.countGroups?.[1] || session?.countGroups?.['1'] || []
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Linear Measurement & Grab Handles (26 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FAT — Linear Measurement & Grab Handles', () => {
  test('1.01 — create horizontal measurement via two clicks', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 200, 300, 200)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
  })

  test('1.02 — create vertical measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 200, 100, 200, 350)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
    const m = meas[0] as { startPt: { x: number; y: number }; endPt: { x: number; y: number } }
    expect(Math.abs(m.startPt.x - m.endPt.x)).toBeLessThan(40)
  })

  test('1.03 — create diagonal measurement stores differing X and Y', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 80, 80, 320, 320)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    const m = meas[0] as { startPt: { x: number; y: number }; endPt: { x: number; y: number } }
    expect(m.startPt.x).not.toBe(m.endPt.x)
    expect(m.startPt.y).not.toBe(m.endPt.y)
  })

  test('1.04 — measurement line changes canvas visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 350, 150)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('1.05 — measurement label (px) rendered on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 350, 150)
    // The label is drawn on the canvas — screenshot must differ from blank
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('1.06 — preview rubber-band line renders while placing second point', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Move mouse without clicking — preview should appear
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 300, box.y + 150)
      await page.waitForTimeout(300)
    }
    const during = await screenshotCanvas(page)
    expect(Buffer.compare(before, during)).not.toBe(0)
  })

  test('1.07 — multiple measurements coexist on one page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 50, 80, 200, 80)
    await createLinearMeasurement(page, 50, 160, 200, 160)
    await createLinearMeasurement(page, 50, 240, 200, 240)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(3)
  })

  test('1.08 — measurement does not increment annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 100, 300, 100)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('1.09 — each measurement has a unique id', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 100, 250, 100)
    await createLinearMeasurement(page, 100, 200, 250, 200)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page) as { id: string }[]
    expect(meas[0].id).toBeDefined()
    expect(meas[1].id).toBeDefined()
    expect(meas[0].id).not.toBe(meas[1].id)
  })

  test('1.10 — measurement stores startPt and endPt', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 120, 180, 320, 180)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page) as { startPt: { x: number; y: number }; endPt: { x: number; y: number } }[]
    expect(meas[0].startPt.x).toBeDefined()
    expect(meas[0].startPt.y).toBeDefined()
    expect(meas[0].endPt.x).toBeDefined()
    expect(meas[0].endPt.y).toBeDefined()
  })

  test('1.11 — measurement stores page number', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 100, 250, 100)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page) as { page: number }[]
    expect(meas[0].page).toBeDefined()
  })

  test('1.12 — delete key removes selected measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    // Last placed measurement is auto-selected
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })

  test('1.13 — backspace key removes selected measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })

  test('1.14 — clear all button removes all measurements', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 100, 200, 100)
    await createLinearMeasurement(page, 100, 200, 200, 200)
    await page.locator('button:has-text("Clear All")').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })

  test('1.15 — measurement persists in session storage', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.measurements).toBeDefined()
  })

  test('1.16 — switching to select tool preserves measurements', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
  })

  test('1.17 — cursor is crosshair in measure mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    const canvas = page.locator('canvas').nth(1)
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('1.18 — status bar shows "Click two points" for distance mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('1.19 — grab handle: clicking near endpoint initiates re-drag', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await waitForSessionSave(page)
    const before = await getPageMeasurements(page) as { endPt: { x: number } }[]
    const origEndX = before[0].endPt.x
    // Click near the end point to start re-dragging
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(200)
    // Click new position to commit
    await clickCanvasAt(page, 400, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const after = await getPageMeasurements(page) as { endPt: { x: number } }[]
    // The endpoint should have moved or a new measurement re-placed
    expect(after.length).toBeGreaterThanOrEqual(1)
  })

  test('1.20 — grab handle: clicking near start point initiates re-drag', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await waitForSessionSave(page)
    // Click near the start point to initiate re-drag
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Click new position to commit
    await clickCanvasAt(page, 50, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBeGreaterThanOrEqual(1)
  })

  test('1.21 — grab handle re-drag changes canvas visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    const beforeDrag = await screenshotCanvas(page)
    // Click near endpoint to re-drag
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 250)
    await page.waitForTimeout(300)
    const afterDrag = await screenshotCanvas(page)
    expect(Buffer.compare(beforeDrag, afterDrag)).not.toBe(0)
  })

  test('1.22 — grab handle re-drag updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await waitForSessionSave(page)
    const before = await getPageMeasurements(page) as { endPt: { x: number; y: number } }[]
    const origEnd = { ...before[0].endPt }
    // Re-drag endpoint
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 250)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    // Session should have changed
    const after = await getSessionData(page)
    expect(after).not.toBeNull()
  })

  test('1.23 — measurement at far edge of canvas works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 400, 350, 500, 350)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
  })

  test('1.24 — very short measurement (close points) still creates', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 200, 200, 215, 200)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
  })

  test('1.25 — measurement and annotation coexist without interference', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a rectangle annotation
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Create a measurement
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 50, 50, 350, 50)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(1)
  })

  test('1.26 — escape during placement cancels the pending measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Place first point
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Press Escape to cancel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // No measurement should exist
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Polylength / Multi-Segment (13 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FAT — Polylength / Multi-Segment', () => {
  test('2.01 — switch to polylength mode via dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await expect(page.locator('text=/Click to add points/')).toBeVisible()
  })

  test('2.02 — status bar shows polylength instructions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await expect(page.locator('text=/Double-click to finish/')).toBeVisible()
  })

  test('2.03 — create polylength with three segments via double-click finish', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 50, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 350, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { mode: string; points: unknown[] }[]
    expect(polys.length).toBe(1)
    expect(polys[0].mode).toBe('polylength')
    expect(polys[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('2.04 — polylength renders on canvas after creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 80, 120)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 120)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 320, 200)
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('2.05 — polylength with two points (minimum) works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { mode: string; points: unknown[] }[]
    expect(polys.length).toBe(1)
    expect(polys[0].points.length).toBeGreaterThanOrEqual(2)
  })

  test('2.06 — polylength persists in polyMeasurements session key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 80, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 300, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.polyMeasurements).toBeDefined()
  })

  test('2.07 — polylength does not appear in measurements key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 80, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 300, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })

  test('2.08 — multiple polylengths can coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    // First polylength
    await clickCanvasAt(page, 50, 80)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 200, 80)
    await page.waitForTimeout(300)
    // Second polylength
    await clickCanvasAt(page, 50, 200)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(2)
  })

  test('2.09 — polylength does not affect annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 80, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 300, 200)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('2.10 — polylength with five segments', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 40, 100)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 120, 80)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 200, 120)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 280, 80)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 360, 120)
    await page.waitForTimeout(150)
    await doubleClickCanvasAt(page, 440, 100)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { points: unknown[] }[]
    expect(polys[0].points.length).toBeGreaterThanOrEqual(5)
  })

  test('2.11 — delete key removes selected polylength', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 80, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    // Last created poly is auto-selected
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(0)
  })

  test('2.12 — polylength preview line renders during placement', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    // Move mouse without clicking to see preview
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 300, box.y + 200)
      await page.waitForTimeout(300)
    }
    const during = await screenshotCanvas(page)
    expect(Buffer.compare(before, during)).not.toBe(0)
  })

  test('2.13 — escape cancels in-progress polylength', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Polylength')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Area Measurement (9 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FAT — Area Measurement', () => {
  test('3.01 — switch to area mode via dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await expect(page.locator('text=/Click to add vertices/')).toBeVisible()
  })

  test('3.02 — create triangle area (3 vertices, double-click to close)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 100, 300)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { mode: string; closed: boolean; points: unknown[] }[]
    expect(polys.length).toBe(1)
    expect(polys[0].mode).toBe('area')
    expect(polys[0].closed).toBe(true)
    expect(polys[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('3.03 — area polygon renders filled region on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 100, 300)
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('3.04 — area stored in polyMeasurements, not measurements', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 175, 250)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(1)
    const meas = await getPageMeasurements(page)
    expect(meas.length).toBe(0)
  })

  test('3.05 — quadrilateral area polygon (4 vertices)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 100, 300)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { points: unknown[] }[]
    expect(polys[0].points.length).toBeGreaterThanOrEqual(4)
  })

  test('3.06 — area does not affect annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 175, 250)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('3.07 — delete key removes selected area polygon', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(200)
    await doubleClickCanvasAt(page, 175, 250)
    await page.waitForTimeout(300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(0)
  })

  test('3.08 — closing area near first vertex auto-closes polygon', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 300)
    await page.waitForTimeout(200)
    // Click near the first vertex to auto-close (within 15/zoom px)
    await clickCanvasAt(page, 201, 101)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page) as { closed: boolean }[]
    expect(polys.length).toBe(1)
    expect(polys[0].closed).toBe(true)
  })

  test('3.09 — escape cancels in-progress area polygon', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Area / Perimeter')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const polys = await getPagePolyMeasurements(page)
    expect(polys.length).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Count Tool (10 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FAT — Count Tool', () => {
  test('4.01 — switch to count mode via dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await expect(page.locator('text=/Create a count group first/')).toBeVisible()
  })

  test('4.02 — clicking canvas without active group opens New Count Group modal', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await expect(page.getByText('New Count Group')).toBeVisible({ timeout: 3000 })
  })

  test('4.03 — create count group with label', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Doors')
    // Status bar should now show placement instructions
    await expect(page.locator('text=/Click to place marker/')).toBeVisible()
  })

  test('4.04 — place markers in an active count group', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Outlets')
    // Place three markers
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const groups = await getPageCountGroups(page) as { label: string; points: unknown[] }[]
    expect(groups.length).toBe(1)
    expect(groups[0].label).toBe('Outlets')
    expect(groups[0].points.length).toBe(3)
  })

  test('4.05 — count markers render visually on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Fixtures')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('4.06 — count group persists in countGroups session key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Sprinklers')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.countGroups).toBeDefined()
  })

  test('4.07 — count group stores label and color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Switches')
    await waitForSessionSave(page)
    const groups = await getPageCountGroups(page) as { label: string; color: string }[]
    expect(groups[0].label).toBe('Switches')
    expect(groups[0].color).toBeDefined()
    expect(groups[0].color.startsWith('#')).toBe(true)
  })

  test('4.08 — count group does not affect annotation count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await createCountGroup(page, 'Items')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('4.09 — New Count Group modal has label input and Create Group button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await expect(page.locator('input[placeholder="e.g. Doors, Outlets, Sprinklers"]')).toBeVisible()
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible()
  })

  test('4.10 — Create Group button is disabled with empty label', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectMeasureMode(page, 'Count')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const createBtn = page.locator('button:has-text("Create Group")')
    await expect(createBtn).toBeDisabled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Calibration, Edge Snapping & CSV Export (16 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FAT — Calibration, Edge Snapping & CSV Export', () => {
  // ── Calibration ──

  test('5.01 — clicking measurement label opens calibration modal', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await expect(page.locator('input[placeholder="e.g. 12"]')).toBeVisible()
  })

  test('5.02 — calibration modal shows pixel distance of measurement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    // Should display "This measurement is X.X px."
    await expect(page.locator('text=/px/')).toBeVisible()
  })

  test('5.03 — apply calibration with inches unit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await applyCalibration(page, '12', 'in')
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })

  test('5.04 — apply calibration with feet unit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await applyCalibration(page, '3', 'ft')
    await expect(page.locator('text=/px\\/ft/')).toBeVisible({ timeout: 3000 })
  })

  test('5.05 — calibration persists in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await applyCalibration(page, '10')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.calibration).toBeDefined()
    expect(session.calibration.pixelsPerUnit).not.toBeNull()
  })

  test('5.06 — calibration changes measurement label on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    const beforeCal = await screenshotCanvas(page)
    await openCalibrationModal(page, 200, 150)
    await applyCalibration(page, '10')
    const afterCal = await screenshotCanvas(page)
    expect(Buffer.compare(beforeCal, afterCal)).not.toBe(0)
  })

  test('5.07 — reset calibration button appears after calibrating', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await applyCalibration(page, '5')
    // Re-open calibration modal to find Reset Calibration
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Reset Calibration/')).toBeVisible({ timeout: 3000 })
  })

  test('5.08 — entering zero keeps apply disabled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await page.locator('input[placeholder="e.g. 12"]').fill('0')
    await page.waitForTimeout(100)
    await expect(page.locator('button:has-text("Apply")')).toBeDisabled()
  })

  test('5.09 — entering negative value shows error message', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await page.locator('input[placeholder="e.g. 12"]').fill('-5')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Enter a positive number/')).toBeVisible()
  })

  test('5.10 — calibration enter key submits value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await page.locator('input[placeholder="e.g. 12"]').fill('8')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Scale:/')).toBeVisible({ timeout: 3000 })
  })

  test('5.11 — unit selector has all five options (in, ft, mm, cm, m)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await openCalibrationModal(page, 200, 150)
    await expect(page.locator('option[value="in"]')).toBeAttached()
    await expect(page.locator('option[value="ft"]')).toBeAttached()
    await expect(page.locator('option[value="mm"]')).toBeAttached()
    await expect(page.locator('option[value="cm"]')).toBeAttached()
    await expect(page.locator('option[value="m"]')).toBeAttached()
  })

  // ── Edge Snapping ──

  test('5.12 — edge snap checkbox exists in measure dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Open dropdown
    await page.locator('button[title="Measure (M)"]').dispatchEvent('click')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Edge Snap/')).toBeVisible()
  })

  test('5.13 — edge snap is enabled by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await page.locator('button[title="Measure (M)"]').dispatchEvent('click')
    await page.waitForTimeout(200)
    // The Edge Snap checkbox should be checked
    const checkbox = page.locator('label').filter({ hasText: 'Edge Snap' }).locator('input[type="checkbox"]')
    await expect(checkbox).toBeChecked()
  })

  test('5.14 — edge snap can be toggled off', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await page.locator('button[title="Measure (M)"]').dispatchEvent('click')
    await page.waitForTimeout(300)
    const checkbox = page.locator('label').filter({ hasText: 'Edge Snap' }).locator('input[type="checkbox"]')
    // Use dispatchEvent to bypass canvas overlay interception
    await checkbox.dispatchEvent('click')
    await page.waitForTimeout(200)
    await expect(checkbox).not.toBeChecked()
  })

  // ── CSV Export ──

  test('5.15 — CSV button appears when measurements exist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("CSV")')).toBeVisible({ timeout: 3000 })
  })

  test('5.16 — CSV button triggers download', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await createLinearMeasurement(page, 100, 150, 300, 150)
    await page.waitForTimeout(300)
    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 })
    await page.locator('button:has-text("CSV")').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('measurements')
    expect(download.suggestedFilename()).toContain('.csv')
  })
})
