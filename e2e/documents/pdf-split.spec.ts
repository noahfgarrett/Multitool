import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-split')
})

test.describe('PDF Split Tool', () => {
  test('empty state shows upload area with correct label', async ({ page }) => {
    // The FileDropZone should be visible with the correct label and description
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Select pages to split into documents')).toBeVisible()

    // The hidden file input should exist
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('uploading a PDF shows the two-panel layout with page grid and sidebar', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')

    // Wait for the file to load — the file name should appear in the toolbar
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The page count info should be shown (e.g., "2 pages")
    await expect(page.locator('text=/\\d+ pages?/')).toBeVisible()

    // The "Output Documents" sidebar header should be visible
    await expect(page.getByText('Output Documents')).toBeVisible()

    // "Document 1" should be auto-created
    await expect(page.getByRole('button', { name: 'Document 1', exact: true })).toBeVisible()

    // The active label should indicate painting mode
    await expect(page.getByText(/Active.*click pages to assign/i)).toBeVisible()
  })

  test('page range input is visible after upload', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The page range input field should be visible with the placeholder
    const rangeInput = page.locator('input[placeholder*="1-50"]')
    await expect(rangeInput).toBeVisible()

    // The add-by-range button should be visible
    const addRangeButton = page.locator('button[aria-label="Add pages by range"]')
    await expect(addRangeButton).toBeVisible()
  })

  test('invalid page range shows error', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Type an invalid range (way beyond page count)
    const rangeInput = page.locator('input[placeholder*="1-50"]')
    await rangeInput.fill('999-1000')

    // Submit the form by clicking the add button
    const addRangeButton = page.locator('button[aria-label="Add pages by range"]')
    await addRangeButton.click()

    // Should show a range error message
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 3000 })
  })

  test('New Document button creates additional output documents', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click "New Document" button in the sidebar
    const newDocButton = page.getByRole('button', { name: /New Document/i })
    await expect(newDocButton).toBeVisible()
    await newDocButton.click()

    // Should now show "Document 2"
    await expect(page.getByRole('button', { name: 'Document 2', exact: true })).toBeVisible()

    // The sidebar should show 2 documents
    await expect(page.locator('text=/^2$/')).toBeVisible() // The count badge
  })

  test('Export Document button appears when pages are assigned via range input', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Use the range input to assign pages
    const rangeInput = page.locator('input[placeholder*="1-50"]')
    await rangeInput.fill('1')

    const addRangeButton = page.locator('button[aria-label="Add pages by range"]')
    await addRangeButton.click()

    // The Export Document button should appear (since 1 doc has pages)
    await expect(page.getByRole('button', { name: /Export Document/i })).toBeVisible({ timeout: 5000 })
  })

  test('New button resets to empty state', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click the "New" reset button
    const newButton = page.getByRole('button', { name: /^New$/i })
    await newButton.click()

    // Should return to the upload/drop zone
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('zoom controls exist in the toolbar', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Zoom in and zoom out buttons should exist
    const zoomOutButton = page.locator('button[aria-label="Zoom out"]')
    const zoomInButton = page.locator('button[aria-label="Zoom in"]')

    await expect(zoomOutButton).toBeVisible()
    await expect(zoomInButton).toBeVisible()

    // Column count indicator should be visible
    await expect(page.getByText(/\dcol/)).toBeVisible()
  })
})
