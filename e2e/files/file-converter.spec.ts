import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('File Converter tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to File Converter tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'File Converter' }).click()
    await waitForToolLoad(page)

    // Verify we are on the File Converter tool
    await expect(page.locator('header h1')).toHaveText('File Converter')
  })

  test('empty state shows upload area', async ({ page }) => {
    // The FileDropZone should display its label
    await expect(page.locator('text=Drop files to convert')).toBeVisible()

    // The description should show supported formats
    await expect(page.locator('text=Images, PDFs, spreadsheets, documents, and more')).toBeVisible()

    // There should be a hidden file input
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('upload image file shows format conversion options', async ({ page }) => {
    // Upload the sample image
    await uploadFile(page, 'sample-image.png')

    // Wait for the file entry to appear
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // File count should show
    await expect(page.locator('text=/1 file/')).toBeVisible()

    // "Convert to:" label should be visible
    await expect(page.locator('text=Convert to:')).toBeVisible()

    // Format buttons should be available for image conversion
    // PNG images can typically be converted to JPG, WebP, etc.
    // Look for format option buttons within the entry
    const formatButtons = page.locator('button').filter({ hasText: /^(JPG|PNG|WebP|JPEG|BMP|GIF)$/ })
    const count = await formatButtons.count()
    expect(count).toBeGreaterThan(0)

    // A remove button should be visible
    const removeBtn = page.locator('button[aria-label="Remove sample-image.png"]')
    await expect(removeBtn).toBeVisible()

    // Clear button should be visible
    await expect(page.locator('button').filter({ hasText: 'Clear' })).toBeVisible()
  })

  test('upload CSV file shows format conversion options', async ({ page }) => {
    // Upload the sample CSV
    await uploadFile(page, 'sample.csv')

    // Wait for the file entry to appear
    await expect(page.locator('text=sample.csv')).toBeVisible({ timeout: 5000 })

    // "Convert to:" label should be visible
    await expect(page.locator('text=Convert to:')).toBeVisible()

    // CSV files should have conversion options like JSON, TSV, etc.
    const formatButtons = page.locator('button').filter({ hasText: /^(JSON|TSV|XLSX)$/ })
    const count = await formatButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('selecting a format enables the convert button', async ({ page }) => {
    // Upload an image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Scope to the file entry card
    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-image.png' })

    // Before selecting a format, there should be no per-entry Convert button
    await expect(entry.locator('button').filter({ hasText: /^Convert$/ })).toBeHidden()

    // Click a format option (the first available one)
    const formatButtons = entry.locator('button').filter({ hasText: /^(JPG|JPEG|WebP|BMP|GIF)$/ })
    const firstFormat = formatButtons.first()
    await firstFormat.click()

    // Now a per-entry Convert button should appear
    await expect(entry.locator('button').filter({ hasText: /^Convert$/ })).toBeVisible()
  })

  test('converting a file shows download option', async ({ page }) => {
    // Upload an image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Scope to the file entry card
    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-image.png' })

    // Select a format
    const formatButtons = entry.locator('button').filter({ hasText: /^(JPG|JPEG|WebP)$/ })
    await formatButtons.first().click()

    // Click per-entry Convert button
    const convertBtn = entry.locator('button').filter({ hasText: /^Convert$/ })
    await convertBtn.click()

    // Wait for conversion to complete — the entry should show "done" state
    // The "1 converted" counter in the toolbar confirms the conversion succeeded
    await expect(page.locator('text=/1 converted/')).toBeVisible({ timeout: 15000 })
  })

  test('clear button resets to empty state', async ({ page }) => {
    // Upload a file
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Click Clear
    const clearBtn = page.locator('button').filter({ hasText: 'Clear' })
    await clearBtn.click()

    // Should return to empty state
    await expect(page.locator('text=Drop files to convert')).toBeVisible()
  })
})
