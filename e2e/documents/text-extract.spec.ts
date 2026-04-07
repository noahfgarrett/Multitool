import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'text-extract')
})

test.describe('Text Extract Tool', () => {
  test('empty state shows upload area with correct label', async ({ page }) => {
    // The FileDropZone should be visible with the correct label and description
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Extract text and tables from PDFs — embedded text or OCR')).toBeVisible()

    // The hidden file input should exist
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('uploading a PDF shows the toolbar with file info and extraction controls', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')

    // Wait for the file to load — file name should appear in toolbar
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Page count badge (e.g., "2p") should be visible
    await expect(page.locator('text=/\\d+p/')).toBeVisible()

    // Mode toggle buttons should be visible (Document and Table)
    await expect(page.locator('button').filter({ hasText: 'Document' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Table' })).toBeVisible()

    // Extract button should be visible
    await expect(page.getByRole('button', { name: /^Extract$/i })).toBeVisible()
  })

  test('Extract button triggers extraction and shows results', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click the Extract button
    const extractButton = page.getByRole('button', { name: /^Extract$/i })
    await extractButton.click()

    // Wait for extraction to complete — the button should change to "Re-extract"
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // After extraction, the Copy button should appear
    await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeVisible()

    // The Export dropdown should also appear
    await expect(page.locator('button').filter({ hasText: 'Export' })).toBeVisible()
  })

  test('Copy button is visible after extraction', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click Extract
    const extractButton = page.getByRole('button', { name: /^Extract$/i })
    await extractButton.click()

    // Wait for extraction to complete
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // The Copy button should be visible
    const copyButton = page.locator('button').filter({ hasText: 'Copy' })
    await expect(copyButton).toBeVisible()
  })

  test('extraction mode can be switched between Document and Table', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Document mode should be selected by default (orange bg)
    const docButton = page.locator('button').filter({ hasText: 'Document' })
    await expect(docButton).toHaveClass(/bg-\[#14B8A6\]/)

    // Click Table mode
    const tableButton = page.locator('button').filter({ hasText: 'Table' })
    await tableButton.click()

    // Table mode should now be highlighted
    await expect(tableButton).toHaveClass(/bg-\[#14B8A6\]/)
    await expect(docButton).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('page navigation controls exist for multi-page PDFs', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Page navigation should be visible in the left pane toolbar
    // "Page 1 / N" text should be visible
    await expect(page.locator('text=/Page \\d+ \\/ \\d+/')).toBeVisible()

    // Previous and next page buttons should exist
    const prevButton = page.locator('button[aria-label="Previous page"]')
    const nextButton = page.locator('button[aria-label="Next page"]')
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()
  })

  test('region tool button exists', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The region selection tool button should be visible
    const regionButton = page.locator('button').filter({ hasText: 'Region' })
    await expect(regionButton).toBeVisible()
  })

  test('zoom controls exist in the left pane', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Zoom in and zoom out buttons should exist
    const zoomOutButton = page.locator('button[aria-label="Zoom out PDF"]')
    const zoomInButton = page.locator('button[aria-label="Zoom in PDF"]')
    await expect(zoomOutButton).toBeVisible()
    await expect(zoomInButton).toBeVisible()
  })

  test('New button resets to upload state', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click the "New" button
    const newButton = page.locator('button').filter({ hasText: 'New' }).last()
    await newButton.click()

    // Should return to the upload state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('Export dropdown shows format options after extraction', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Extract first
    const extractButton = page.getByRole('button', { name: /^Extract$/i })
    await extractButton.click()
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // Click the Export dropdown
    const exportButton = page.locator('button').filter({ hasText: 'Export' })
    await exportButton.click()

    // Dropdown should show format options
    await expect(page.getByText('PDF (.pdf)')).toBeVisible()
    await expect(page.getByText('Excel (.xlsx)')).toBeVisible()
    await expect(page.getByText('Word (.docx)')).toBeVisible()
    await expect(page.getByText('CSV (.csv)')).toBeVisible()
    await expect(page.getByText('Text (.txt)')).toBeVisible()
  })
})
