import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadFile, uploadFiles } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-merge')
})

test.describe('PDF Merge Tool', () => {
  test('empty state shows upload area with correct label', async ({ page }) => {
    // The FileDropZone should be visible with the correct label and description
    await expect(page.getByText('Drop PDF files here')).toBeVisible()
    await expect(page.getByText('Add 2 or more PDFs to merge')).toBeVisible()

    // The hidden file input should exist for the FileDropZone
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('uploading PDFs shows file list with file info', async ({ page }) => {
    // Upload two PDF files
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])

    // Wait for the files to load — the toolbar should show file count
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    // Each file name should be displayed in the file list
    await expect(page.getByText('sample.pdf')).toBeVisible()
    await expect(page.getByText('single-page.pdf')).toBeVisible()

    // File info should show page count and size
    // The format is "{N} page(s) · {size}" per file row
    await expect(page.locator('text=/\\d+ pages?/')).toHaveCount(2, { timeout: 5000 })
  })

  test('file rows have reorder buttons (up/down arrows)', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    // The first file should have a disabled "up" button and an enabled "down" button
    const moveUpButtons = page.locator('button[aria-label*="Move"][aria-label*="up"]')
    const moveDownButtons = page.locator('button[aria-label*="Move"][aria-label*="down"]')

    await expect(moveUpButtons).toHaveCount(2)
    await expect(moveDownButtons).toHaveCount(2)

    // First file's "up" button should be disabled
    await expect(moveUpButtons.first()).toBeDisabled()
    // Last file's "down" button should be disabled
    await expect(moveDownButtons.last()).toBeDisabled()
  })

  test('reorder moves file position', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    // The order numbers (1, 2) should be visible
    const orderBadges = page.locator('.bg-\\[\\#14B8A6\\]\\/15')
    await expect(orderBadges).toHaveCount(2)

    // Click "move down" on the first file (sample.pdf)
    const moveDownFirst = page.locator('button[aria-label*="Move sample.pdf down"]')
    await moveDownFirst.click()

    // After reorder, single-page.pdf should now be first
    // Verify the first file name in the list is single-page.pdf
    const fileNames = page.locator('.text-sm.text-white.truncate')
    await expect(fileNames.first()).toHaveText('single-page.pdf')
    await expect(fileNames.last()).toHaveText('sample.pdf')
  })

  test('remove button removes a file from the list', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    // Click the remove button for sample.pdf
    const removeButton = page.locator('button[aria-label="Remove sample.pdf"]')
    await removeButton.click()

    // Should now show 1 file
    await expect(page.getByText(/1 file\b/)).toBeVisible()
    // sample.pdf should be gone, single-page.pdf should remain
    await expect(page.getByText('sample.pdf')).not.toBeVisible()
    await expect(page.getByText('single-page.pdf')).toBeVisible()
  })

  test('removing all files returns to empty state', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    // Remove the only file
    const removeButton = page.locator('button[aria-label="Remove sample.pdf"]')
    await removeButton.click()

    // Should return to the FileDropZone empty state
    await expect(page.getByText('Drop PDF files here')).toBeVisible()
  })

  test('Merge & Download button exists and is clickable after upload', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    // The Merge & Download button should be visible and enabled
    const mergeButton = page.getByRole('button', { name: /Merge & Download/i })
    await expect(mergeButton).toBeVisible()
    await expect(mergeButton).toBeEnabled()
  })

  test('Add Files button exists when files are loaded', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    // The "Add Files" button should be visible
    const addFilesButton = page.getByRole('button', { name: /Add Files/i })
    await expect(addFilesButton).toBeVisible()
  })

  test('expand toggle exists for each file row', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    // The expand/collapse button should exist (ChevronRight icon button with title)
    const expandButton = page.locator('button[title="Expand pages"]')
    await expect(expandButton).toBeVisible()

    // Click to expand
    await expandButton.click()

    // After expansion, the title should change to "Collapse pages"
    const collapseButton = page.locator('button[title="Collapse pages"]')
    await expect(collapseButton).toBeVisible()
  })
})
