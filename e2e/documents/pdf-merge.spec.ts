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
    await expect(page.getByText('sample.pdf', { exact: true })).toBeVisible()
    await expect(page.getByText('single-page.pdf', { exact: true })).toBeVisible()

    // File info should show page count and size
    // The format is "{N} page(s) · {size}" per file row
    await expect(page.locator('text=/\\d+ pages?/')).toHaveCount(2, { timeout: 5000 })
  })

  test('dragging a file by its handle moves it in the merge order', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    const fileNames = page.locator('main p.text-sm.text-white.truncate')
    await expect(fileNames).toHaveText(['sample.pdf', 'single-page.pdf'])

    // Rows are reordered with dnd-kit; the pointer sensor needs 8px of movement to start a drag
    const handles = page.locator('main .cursor-grab')
    const from = await handles.nth(0).boundingBox()
    const to = await handles.nth(1).boundingBox()
    if (!from || !to) throw new Error('drag handles not rendered')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 20, { steps: 10 })
    await page.mouse.up()

    await expect(fileNames).toHaveText(['single-page.pdf', 'sample.pdf'])
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
    await expect(page.getByText('sample.pdf', { exact: true })).toHaveCount(0)
    await expect(page.getByText('single-page.pdf', { exact: true })).toBeVisible()
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
