import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('File Compressor tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to File Compressor tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'File Compressor' }).click()
    await waitForToolLoad(page)

    // Verify we are on the File Compressor tool
    await expect(page.locator('header h1')).toHaveText('File Compressor')
  })

  test('empty state shows upload area', async ({ page }) => {
    // The FileDropZone should display its label
    await expect(page.locator('text=Drop files to compress')).toBeVisible()

    // The description should show accepted formats
    await expect(page.locator('text=Images, PDFs, or SVGs')).toBeVisible()

    // There should be a hidden file input with correct accept types
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif,image/bmp,application/pdf,image/svg+xml,.svg,.pdf')
  })

  test('upload file shows compression UI with file list', async ({ page }) => {
    // Upload the sample image fixture
    await uploadFile(page, 'sample-image.png')

    // Wait for file to appear in the list
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // The file count should show "1 file"
    await expect(page.locator('text=1 file')).toBeVisible()

    // Quality slider should be visible (image files show quality controls)
    await expect(page.locator('text=Quality')).toBeVisible()

    // Max Width slider should be visible
    await expect(page.locator('text=Max Width')).toBeVisible()

    // "Compress All" button should be visible
    const compressBtn = page.locator('button').filter({ hasText: 'Compress All' })
    await expect(compressBtn).toBeVisible()

    // "Add More" button should be visible
    await expect(page.locator('button').filter({ hasText: 'Add More' })).toBeVisible()

    // The file entry should show original size
    // The file entry card should have a remove button
    const removeBtn = page.locator('button[aria-label="Remove sample-image.png"]')
    await expect(removeBtn).toBeVisible()
  })

  test('upload PDF shows it in the file list', async ({ page }) => {
    // Upload the sample PDF
    await uploadFile(page, 'sample.pdf')

    // Wait for file to appear
    await expect(page.locator('text=sample.pdf')).toBeVisible({ timeout: 5000 })

    // File count
    await expect(page.locator('text=1 file')).toBeVisible()

    // Compress All button should be available
    await expect(page.locator('button').filter({ hasText: 'Compress All' })).toBeVisible()
  })

  test('compress button processes the file', async ({ page }) => {
    // Upload an image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Click Compress All
    const compressBtn = page.locator('button').filter({ hasText: 'Compress All' })
    await compressBtn.click()

    // Wait for compression to complete - the download button should appear
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 15000 })

    // A summary section should show savings percentage
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  test('remove button removes a file from the list', async ({ page }) => {
    // Upload an image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Click the remove button
    const removeBtn = page.locator('button[aria-label="Remove sample-image.png"]')
    await removeBtn.click()

    // File should be removed and empty state should return
    await expect(page.locator('text=Drop files to compress')).toBeVisible()
  })
})
