/**
 * QA Sanity Smoke Tests — PDF Annotate
 *
 * Covers the core demo workflows for the PDF Annotate tool:
 *   1. Upload PDF / pages render
 *   2. Rectangle annotation
 *   3. Pencil drawing
 *   4. Text annotation
 *   5. Stamp placement
 *   6. Highlighter
 *   7. Measurement
 *   8. Undo / Redo
 *   9. Select and delete
 *  10. Export PDF
 *  11. Page switching
 *  12. Zoom in/out
 */

import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  goToPage,
  screenshotCanvas,
  waitForSessionSave,
  getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Upload & Render ─────────────────────────────────────────────────────

test.describe('Upload & Render', () => {
  test('uploading a PDF renders canvases and shows toolbar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // At least 2 canvases (pdf + annotation) should be visible
    const canvases = page.locator('canvas')
    await expect(canvases.first()).toBeVisible()
    await expect(canvases.nth(1)).toBeVisible()
    // Toolbar visible
    await expect(page.locator('button[title="Select (S)"]')).toBeVisible()
    await expect(page.getByText('Export PDF')).toBeVisible()
    // Status bar shows filename
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  test('multi-page PDF shows page count and navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // sample.pdf has 2 pages — use .first() to avoid strict mode with multiple matches
    await expect(page.locator('text=/\\/ 2/').first()).toBeVisible()
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toBeVisible()
    await expect(pageInput).toHaveValue('1')
  })
})

// ─── 2. Rectangle ───────────────────────────────────────────────────────────

test('draw a rectangle annotation', async ({ page }) => {
  await uploadPDFAndWait(page)
  await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
  expect(await getAnnotationCount(page)).toBe(1)
})

// ─── 3. Pencil ──────────────────────────────────────────────────────────────

test('draw with pencil tool', async ({ page }) => {
  await uploadPDFAndWait(page)
  await createAnnotation(page, 'pencil', { x: 80, y: 200, w: 200, h: 100 })
  expect(await getAnnotationCount(page)).toBe(1)
})

// ─── 4. Text ────────────────────────────────────────────────────────────────

test('add text annotation, type text, commit', async ({ page }) => {
  await uploadPDFAndWait(page)
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: 100, y: 120 }, { x: 300, y: 170 })
  await page.waitForTimeout(300)
  await page.keyboard.type('Hello World')
  await page.waitForTimeout(200)
  // Commit the text by pressing Escape
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  // Text annotation pushes 2 history entries (creation + text commit)
  expect(await getAnnotationCount(page)).toBe(1)
})

// ─── 5. Stamp ───────────────────────────────────────────────────────────────

test('place a stamp annotation', async ({ page }) => {
  await uploadPDFAndWait(page)
  // Activate stamp tool via keyboard shortcut G
  await page.keyboard.press('g')
  await page.waitForTimeout(200)
  // Status bar should show stamp is active
  await expect(page.locator('text=/click to place/')).toBeVisible({ timeout: 3000 })
  // Click on canvas to place the default stamp
  await clickCanvasAt(page, 200, 200)
  await page.waitForTimeout(300)
  expect(await getAnnotationCount(page)).toBe(1)
})

// ─── 6. Highlighter ─────────────────────────────────────────────────────────

test('use highlighter tool', async ({ page }) => {
  await uploadPDFAndWait(page)
  await selectTool(page, 'Highlight (H)')
  // Draw a highlight stroke
  await drawOnCanvas(page, [
    { x: 80, y: 100 },
    { x: 200, y: 100 },
    { x: 350, y: 100 },
  ])
  await page.waitForTimeout(300)
  expect(await getAnnotationCount(page)).toBe(1)
})

// ─── 7. Measurement ─────────────────────────────────────────────────────────

test('create a measurement between two points', async ({ page }) => {
  await uploadPDFAndWait(page)
  await selectTool(page, 'Measure (M)')
  await expect(page.locator('text=/Click two points/')).toBeVisible()
  // Take screenshot before measurement
  const before = await screenshotCanvas(page)
  // Click first point
  await clickCanvasAt(page, 100, 200)
  await page.waitForTimeout(300)
  // Click second point
  await clickCanvasAt(page, 300, 200)
  await page.waitForTimeout(500)
  // Measurement label is drawn on the canvas — verify canvas changed
  const after = await screenshotCanvas(page)
  expect(Buffer.compare(before, after)).not.toBe(0)
})

// ─── 8. Undo / Redo ────────────────────────────────────────────────────────

test.describe('Undo / Redo', () => {
  test('undo removes last annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 9. Select & Delete ────────────────────────────────────────────────────

test.describe('Select & Delete', () => {
  test('select and delete an annotation with Delete key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to select tool and click on rectangle edge
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Delete
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select and delete an annotation with Backspace key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Click on circle edge to select
    await selectAnnotationAt(page, 150, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 10. Export PDF ─────────────────────────────────────────────────────────

test('export PDF triggers download with .pdf extension', async ({ page }) => {
  await uploadPDFAndWait(page, 'sample.pdf')
  // Add an annotation before exporting
  await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
  // Remove showSaveFilePicker so the app falls back to downloadBlob (anchor click)
  // This is required because headless Chromium exposes the API but can't open the picker dialog
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await page.locator('button').filter({ hasText: 'Export PDF' }).click()
  await page.locator('button').filter({ hasText: 'Export for Review' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
})

// ─── 11. Page Switching ─────────────────────────────────────────────────────

test.describe('Page Switching', () => {
  test('navigate to page 2 via page input', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveValue('1')
    await goToPage(page, 2)
    await expect(pageInput).toHaveValue('2')
  })

  test('annotations are per-page (session data)', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create annotation on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Go to page 2 and create an annotation there
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 70 })
    // Total badge should now show 2
    expect(await getAnnotationCount(page)).toBe(2)
    // Verify session data has per-page annotations
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Anns = session.annotations['1'] || session.annotations[1] || []
    const page2Anns = session.annotations['2'] || session.annotations[2] || []
    expect(page1Anns.length).toBe(1)
    expect(page2Anns.length).toBe(1)
  })
})

// ─── 12. Zoom ───────────────────────────────────────────────────────────────

test.describe('Zoom', () => {
  test('zoom in increases zoom percentage', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeGreaterThan(beforePct)
  })

  test('zoom out decreases zoom percentage', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first so we have room to zoom out
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeLessThan(beforePct)
  })
})
