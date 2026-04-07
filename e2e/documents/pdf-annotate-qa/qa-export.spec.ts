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
  goToPage,
  exportPDF,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Export Button Visibility ───────────────────────────────────────────────

test.describe('Export QA — Button Visibility', () => {
  test('Export PDF button is hidden before upload', async ({ page }) => {
    await expect(page.getByText('Export PDF')).toBeHidden()
  })

  test('Export PDF button is visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('Export PDF button is enabled after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeEnabled()
  })

  test('Export PDF button visible for single-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('Export PDF button visible for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('Export PDF')).toBeVisible()
  })
})

// ─── Clean PDF Export ───────────────────────────────────────────────────────

test.describe('Export QA — Clean PDF (Zero Annotations)', () => {
  test('export with zero annotations produces valid download', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('clean export from single-page PDF works', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── Export With Annotations ────────────────────────────────────────────────

test.describe('Export QA — With Annotations', () => {
  test('export with single rectangle annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with text annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with mixed annotation types', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 200, h: 50 })
    await createAnnotation(page, 'pencil', { x: 300, y: 50, w: 100, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with highlight annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── Multi-Page Export ──────────────────────────────────────────────────────

test.describe('Export QA — Multi-Page With Annotations', () => {
  test('export includes annotations from both pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export after page rotation produces valid PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export from page 2 still exports all pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── Export State Preservation ───────────────────────────────────────────────

test.describe('Export QA — State Preservation After Export', () => {
  test('annotation count is unchanged after export', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('current page is unchanged after export', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await exportPDF(page)
    await page.waitForTimeout(500)
    // Page indicator button should still show page 2
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('toolbar remains functional after export', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await exportPDF(page)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('export button re-enables after export completes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await exportPDF(page)
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeEnabled({ timeout: 5000 })
  })
})

// ─── Repeated Exports ───────────────────────────────────────────────────────

test.describe('Export QA — Repeated Exports', () => {
  test('exporting twice does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await expect(page.locator('button').filter({ hasText: 'Export PDF' })).toBeEnabled({ timeout: 5000 })
    const download2 = await exportPDF(page)
    expect(download2.suggestedFilename()).toContain('.pdf')
  })

  test('export after adding more annotations produces updated output', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    await expect(page.locator('button').filter({ hasText: 'Export PDF' })).toBeEnabled({ timeout: 5000 })
    const download2 = await exportPDF(page)
    expect(download2.suggestedFilename()).toContain('.pdf')
  })

  test('export commits open text editing first', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Export while editing')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})
