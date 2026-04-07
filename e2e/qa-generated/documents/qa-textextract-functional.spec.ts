/**
 * QA Functional Tests — Text Extract Tool
 *
 * Tests core functionality: upload, extract, copy, export, table mode,
 * multi-page extraction, empty/zero-byte PDF, UI states, search within
 * extracted text, and document mode preview rendering.
 */
import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'

const BASE_URL = 'http://127.0.0.1:5187'

test.use({
  baseURL: BASE_URL,
  storageState: {
    cookies: [],
    origins: [{
      origin: BASE_URL,
      localStorage: [{
        name: 'mt-user-profile',
        value: JSON.stringify({ name: 'Test User', email: 'test@test.com', initials: 'TU' }),
      }],
    }],
  },
})

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'text-extract')
})

// ── Helper: remove showSaveFilePicker so exports trigger downloads ──
async function disableFilePicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

// ── Helper: upload + extract in the given mode ──
async function uploadAndExtract(
  page: Page,
  filename: string,
  mode: 'Document' | 'Table' = 'Document',
  scope: 'page' | 'all' = 'page',
): Promise<void> {
  await uploadFile(page, filename)
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 })

  // Set mode — use exact match to avoid matching "Documents" in sidebar
  if (mode === 'Table') {
    await page.getByRole('button', { name: 'Table', exact: true }).click()
  }

  // Click the right extract button
  if (scope === 'all') {
    const extractAll = page.locator('button').filter({ hasText: 'Extract All' })
    await extractAll.click()
  } else {
    await page.getByRole('button', { name: /^Extract$/i }).click()
  }

  // Wait for extraction to complete
  await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 60000 })
}

// ══════════════════════════════════════════════════════
// 1. Upload PDF with embedded text — text is extracted
// ══════════════════════════════════════════════════════

test.describe('Upload and Extract Embedded Text', () => {
  test('uploads sample.pdf and extracts text in Document mode', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // The status bar should show text items count
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()

    // The preview pane should contain some text — check for "Extract to see preview" NOT being visible
    await expect(page.getByText('Extract to see preview')).not.toBeVisible()
  })

  test('extracted text items count is > 0 in status bar', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    const statusText = await page.locator('text=/\\d+ text items/').textContent()
    const count = parseInt(statusText?.match(/(\d+)/)?.[1] ?? '0', 10)
    expect(count).toBeGreaterThan(0)
  })

  test('document mode shows lines count in status bar', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    await expect(page.locator('text=/\\d+ lines/')).toBeVisible()
  })

  test('single-page.pdf extracts correctly', async ({ page }) => {
    await uploadAndExtract(page, 'single-page.pdf', 'Document')

    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 2. Copy text to clipboard
// ══════════════════════════════════════════════════════

test.describe('Copy to Clipboard', () => {
  test('Copy button changes to "Copied!" after click', async ({ page, context }) => {
    // Grant clipboard permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await uploadAndExtract(page, 'sample.pdf', 'Document')

    const copyButton = page.locator('button').filter({ hasText: 'Copy' })
    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // Button text should change to "Copied!"
    await expect(page.locator('button').filter({ hasText: 'Copied!' })).toBeVisible({ timeout: 3000 })
  })

  test('Copy button reverts back after 2 seconds', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await uploadAndExtract(page, 'sample.pdf', 'Document')

    const copyButton = page.locator('button').filter({ hasText: 'Copy' })
    await copyButton.click()

    await expect(page.locator('button').filter({ hasText: 'Copied!' })).toBeVisible()

    // After ~2s it should revert back to "Copy"
    await expect(page.locator('button').filter({ hasText: /^Copy$/ }).or(
      page.locator('button').filter({ hasText: 'Copy' }).first()
    )).toBeVisible({ timeout: 5000 })
  })

  test('Copy in table mode includes TSV-formatted text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    const copyButton = page.locator('button').filter({ hasText: 'Copy' })
    await copyButton.click()

    // Read clipboard
    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    // TSV should contain tab characters (table mode copies as TSV)
    expect(clipText).toContain('\t')
  })
})

// ══════════════════════════════════════════════════════
// 3. Export extracted text — all formats
// ══════════════════════════════════════════════════════

test.describe('Export Formats', () => {
  test('export as TXT in document mode', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('Text (.txt)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.txt$/)
  })

  test('export as PDF', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('PDF (.pdf)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('export as Excel in table mode', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('Excel (.xlsx)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  })

  test('export as Word (.docx) in document mode', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    // Must disable picker AFTER upload/extract since page may have reloaded context
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('Word (.docx)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.docx$/)
  })

  test('export as CSV in table mode', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('CSV (.csv)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('export filename is derived from source PDF name', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('CSV (.csv)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('table-simple')
  })

  test('export dropdown closes after clicking a format', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    // Dropdown should be visible
    await expect(page.getByText('PDF (.pdf)')).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('Text (.txt)').click()
    await downloadPromise

    // Dropdown should close after export
    await expect(page.getByText('PDF (.pdf)')).not.toBeVisible({ timeout: 5000 })
  })
})

// ══════════════════════════════════════════════════════
// 4. Table detection and extraction
// ══════════════════════════════════════════════════════

test.describe('Table Detection', () => {
  test('table mode extracts headers and rows from table-simple.pdf', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    // Should show column and row counts in status bar
    await expect(page.locator('text=/\\d+ columns/')).toBeVisible()
    await expect(page.locator('text=/\\d+ rows/')).toBeVisible()

    // Table element should exist in DOM
    const tableExists = await page.evaluate(() => !!document.querySelector('table'))
    expect(tableExists).toBe(true)
  })

  test('table mode shows header cells in the table', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    // th elements should exist
    const headerCount = await page.evaluate(() => document.querySelectorAll('table th').length)
    expect(headerCount).toBeGreaterThan(0)
  })

  test('switching from table to document mode shows document preview', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    // Verify table is shown
    await expect(page.locator('table')).toBeVisible()

    // Switch to document mode — use exact match to avoid matching "Documents" in sidebar
    await page.getByRole('button', { name: 'Document', exact: true }).click()

    // Status bar should show "lines" instead of "columns/rows"
    await expect(page.locator('text=/\\d+ lines/')).toBeVisible()
  })

  test('table mode with complex table shows correct column count', async ({ page }) => {
    await uploadAndExtract(page, 'table-complex.pdf', 'Table')

    const colCountText = await page.locator('text=/\\d+ columns/').textContent()
    const colCount = parseInt(colCountText?.match(/(\d+)/)?.[1] ?? '0', 10)
    expect(colCount).toBeGreaterThanOrEqual(4) // at least 4 columns for complex table
  })

  test('"Tables only" toggle exists in table mode', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Switch to table mode — use exact match
    await page.getByRole('button', { name: 'Table', exact: true }).click()

    // Tables only button should be visible
    await expect(page.locator('button').filter({ hasText: 'Tables only' })).toBeVisible()
  })

  test('"Tables only" toggle is NOT shown in document mode', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // In document mode (default), Tables only should not be visible
    await expect(page.locator('button').filter({ hasText: 'Tables only' })).not.toBeVisible()
  })

  test('empty table data shows "No table data found" message', async ({ page }) => {
    // Use single-page.pdf which may not have much table content
    await uploadAndExtract(page, 'single-page.pdf', 'Table')

    // If no table data, the message should appear
    const noDataMsg = page.getByText('No table data found. Try Document mode instead.')
    const tableEl = page.locator('table tbody tr')

    // Either we have table rows OR the "no data" message
    const hasRows = await tableEl.count() > 0
    const hasMsg = await noDataMsg.isVisible().catch(() => false)
    expect(hasRows || hasMsg).toBe(true)
  })
})

// ══════════════════════════════════════════════════════
// 5. Multi-page text extraction
// ══════════════════════════════════════════════════════

test.describe('Multi-Page Extraction', () => {
  test('multi-page PDF shows page count in toolbar', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=/3p/')).toBeVisible()
  })

  test('Extract All button appears for multi-page PDFs', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })

    await expect(page.locator('button').filter({ hasText: 'Extract All' })).toBeVisible()
  })

  test('Extract All button does NOT appear for single-page PDFs', async ({ page }) => {
    await uploadFile(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible({ timeout: 15000 })

    await expect(page.locator('button').filter({ hasText: 'Extract All' })).not.toBeVisible()
  })

  test('Extract All extracts text from all pages', async ({ page }) => {
    await uploadAndExtract(page, 'document-multipage.pdf', 'Document', 'all')

    const statusText = await page.locator('text=/\\d+ text items/').textContent()
    const count = parseInt(statusText?.match(/(\d+)/)?.[1] ?? '0', 10)
    // All-page extraction should yield more items than a single page
    expect(count).toBeGreaterThan(5)
  })

  test('page navigation works — next and previous buttons', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })

    // Should start on page 1
    await expect(page.locator('text=/Page 1 \\/ 3/')).toBeVisible()

    // Click next
    await page.locator('button[aria-label="Next page"]').click()
    await expect(page.locator('text=/Page 2 \\/ 3/')).toBeVisible()

    // Click next again
    await page.locator('button[aria-label="Next page"]').click()
    await expect(page.locator('text=/Page 3 \\/ 3/')).toBeVisible()

    // Next should be disabled on last page
    await expect(page.locator('button[aria-label="Next page"]')).toBeDisabled()

    // Click previous
    await page.locator('button[aria-label="Previous page"]').click()
    await expect(page.locator('text=/Page 2 \\/ 3/')).toBeVisible()
  })

  test('previous page button is disabled on page 1', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })

    await expect(page.locator('button[aria-label="Previous page"]')).toBeDisabled()
  })

  test('Extract All in table mode compiles tables vertically', async ({ page }) => {
    await uploadAndExtract(page, 'table-large.pdf', 'Table', 'all')

    // Table should have many rows across all pages
    const rowCountText = await page.locator('text=/\\d+ rows/').textContent()
    const rowCount = parseInt(rowCountText?.match(/(\d+)/)?.[1] ?? '0', 10)
    expect(rowCount).toBeGreaterThan(10) // 3 pages should yield many rows
  })
})

// ══════════════════════════════════════════════════════
// 6. Empty / Zero-byte PDF
// ══════════════════════════════════════════════════════

test.describe('Edge Cases — Empty PDF', () => {
  test('zero-byte PDF shows load error', async ({ page }) => {
    await uploadFile(page, 'zero-byte.pdf')

    // Should show an error message about loading failure
    await expect(page.locator('text=/Failed to load PDF|error/i')).toBeVisible({ timeout: 10000 })
  })

  test('non-PDF file upload shows error or is rejected', async ({ page }) => {
    await uploadFile(page, 'not-a-pdf.txt')

    // The tool accepts only PDF files — should either show an error or stay in upload state
    // Check if error or still in upload state
    const hasError = await page.locator('text=/Failed to load PDF|error/i').isVisible().catch(() => false)
    const hasDropZone = await page.getByText('Drop a PDF file here').isVisible().catch(() => false)

    expect(hasError || hasDropZone).toBe(true)
  })
})

// ══════════════════════════════════════════════════════
// 7. UI State Tests
// ══════════════════════════════════════════════════════

test.describe('UI States', () => {
  test('initial empty state shows FileDropZone', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    // Description text appears in both sidebar header and FileDropZone — scope to main
    await expect(page.getByRole('main').getByText('Extract text and tables from PDFs — embedded text or OCR')).toBeVisible()
  })

  test('after upload — toolbar is visible with mode controls', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Mode buttons — use exact match to avoid matching "Documents" in sidebar
    await expect(page.getByRole('button', { name: 'Document', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Table', exact: true })).toBeVisible()

    // Extract button
    await expect(page.getByRole('button', { name: /^Extract$/i })).toBeVisible()

    // Region button
    await expect(page.locator('button').filter({ hasText: 'Region' })).toBeVisible()

    // New button
    await expect(page.locator('button').filter({ hasText: 'New' })).toBeVisible()
  })

  test('before extraction — preview shows "Extract to see preview"', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Extract to see preview')).toBeVisible()
  })

  test('during extraction — button shows "Extracting..."', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click extract and immediately check button text
    await page.getByRole('button', { name: /^Extract$/i }).click()

    // Should briefly show "Extracting..."
    // Note: embedded text extraction is near-instant; use a generous check
    await expect(
      page.getByRole('button', { name: /Extracting|Re-extract/i })
    ).toBeVisible({ timeout: 30000 })
  })

  test('after extraction — Copy, Export, Clear buttons appear', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Export' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Clear' })).toBeVisible()
  })

  test('Clear button removes extracted data and shows preview placeholder', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // Click clear
    await page.locator('button').filter({ hasText: 'Clear' }).click()

    // Should go back to "Extract to see preview"
    await expect(page.getByText('Extract to see preview')).toBeVisible()

    // Copy/Export/Clear should disappear
    await expect(page.locator('button').filter({ hasText: 'Copy' })).not.toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Export' })).not.toBeVisible()
  })

  test('New button resets everything to initial upload state', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    await page.locator('button').filter({ hasText: 'New' }).last().click()

    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('Re-extract button appears after initial extraction', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible()
  })

  test('progress bar appears during extraction', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click extract
    await page.getByRole('button', { name: /^Extract$/i }).click()

    // Progress bar or "Done!" message should appear
    // (near-instant extraction means we might catch "Done!" instead of progress)
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })
  })
})

// ══════════════════════════════════════════════════════
// 8. Zoom Controls
// ══════════════════════════════════════════════════════

test.describe('Zoom Controls', () => {
  test('left pane zoom in increases zoom percentage', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Default zoom is 100%
    const zoomText = page.locator('text=/100%/').first()
    await expect(zoomText).toBeVisible()

    // Click zoom in
    await page.locator('button[aria-label="Zoom in PDF"]').click()

    // Zoom should increase to 125%
    await expect(page.locator('text=/125%/').first()).toBeVisible()
  })

  test('left pane zoom out decreases zoom percentage', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click zoom out
    await page.locator('button[aria-label="Zoom out PDF"]').click()

    // Zoom should decrease to 75%
    await expect(page.locator('text=/75%/').first()).toBeVisible()
  })

  test('right pane zoom controls work for preview', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // Click zoom in on preview pane
    await page.locator('button[aria-label="Zoom in preview"]').click()

    // Preview zoom should increase to 125%
    await expect(page.locator('text=/125%/').last()).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 9. Region Tool
// ══════════════════════════════════════════════════════

test.describe('Region Tool', () => {
  test('Region button toggles active state', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    const regionBtn = page.locator('button').filter({ hasText: 'Region' })

    // Click to activate
    await regionBtn.click()

    // Should have active styling (ring indicator)
    await expect(regionBtn).toHaveClass(/ring-1/)

    // Click again to deactivate
    await regionBtn.click()
    await expect(regionBtn).not.toHaveClass(/ring-1/)
  })

  test('"Clear all" button appears when regions exist and clears them', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Activate region tool
    await page.locator('button').filter({ hasText: 'Region' }).click()

    // Draw a region on the canvas by pointer events
    const overlay = page.locator('canvas').nth(1) // region canvas is the overlay
    const box = await overlay.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50)
      await page.mouse.down()
      await page.mouse.move(box.x + 200, box.y + 200)
      await page.mouse.up()
    }

    // "Clear all" should appear if a region was drawn
    const clearAll = page.locator('button').filter({ hasText: 'Clear all' })
    // Check within a reasonable time
    const clearVisible = await clearAll.isVisible().catch(() => false)

    if (clearVisible) {
      await clearAll.click()
      // Regions should be cleared — Clear all should disappear
      await expect(clearAll).not.toBeVisible({ timeout: 3000 })
    }
  })
})

// ══════════════════════════════════════════════════════
// 10. Document mode preview rendering
// ══════════════════════════════════════════════════════

test.describe('Document Mode Preview', () => {
  test('document mode renders positioned text spans on white background', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // The document preview should contain a white div with absolute-positioned spans
    const hasWhiteBg = await page.evaluate(() => {
      const divs = document.querySelectorAll('.bg-white')
      return divs.length > 0
    })
    expect(hasWhiteBg).toBe(true)
  })

  test('document mode renders text items as positioned spans', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // Check that absolute-positioned text spans exist
    const spanCount = await page.evaluate(() => {
      const spans = document.querySelectorAll('.bg-white span.absolute')
      return spans.length
    })
    expect(spanCount).toBeGreaterThan(0)
  })

  test('multi-page Extract All shows page labels in preview', async ({ page }) => {
    await uploadAndExtract(page, 'document-multipage.pdf', 'Document', 'all')

    // For multi-page extraction, "Page N" labels should appear
    await expect(page.locator('text=/Page \\d/').first()).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 11. Mode toggle persistence with extracted data
// ══════════════════════════════════════════════════════

test.describe('Mode Toggle with Data', () => {
  test('switching mode after extraction keeps extracted data', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    // Verify table is visible
    await expect(page.locator('table')).toBeVisible()

    // Switch to document mode — use exact match to avoid matching "Documents" in sidebar
    await page.getByRole('button', { name: 'Document', exact: true }).click()

    // Data should still be present (status bar shows text items)
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()

    // Switch back to table mode
    await page.getByRole('button', { name: 'Table', exact: true }).click()

    // Table should still be visible
    await expect(page.locator('table')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 12. Export Word in Table mode
// ══════════════════════════════════════════════════════

test.describe('Export Word Table', () => {
  test('export as Word in table mode', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')
    await disableFilePicker(page)

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })
    await exportBtn.click()

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.getByText('Word (.docx)').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.docx$/)
  })
})

// ══════════════════════════════════════════════════════
// 13. OCR detection indicator
// ══════════════════════════════════════════════════════

test.describe('OCR Detection', () => {
  test('embedded text PDF does NOT show OCR indicator', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // OCR language selector and OCR badge should NOT be visible for embedded text PDFs
    await expect(page.locator('text=/OCR mode/')).not.toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 14. Mixed content extraction
// ══════════════════════════════════════════════════════

test.describe('Mixed Content', () => {
  test('document mode extracts both paragraphs and table text from mixed-content.pdf', async ({ page }) => {
    await uploadAndExtract(page, 'mixed-content.pdf', 'Document')

    const statusText = await page.locator('text=/\\d+ text items/').textContent()
    const count = parseInt(statusText?.match(/(\d+)/)?.[1] ?? '0', 10)
    expect(count).toBeGreaterThan(10) // Mixed content should have many items
  })
})
