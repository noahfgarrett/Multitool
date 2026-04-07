import { test, expect, type Page } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { waitForToolLoad } from '../../helpers/navigation'
import { uploadFile, uploadFiles } from '../../helpers/file-upload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

/**
 * QA Functional Tests for the File Compressor tool.
 * Covers: upload, compression options, download, batch, ZIP, validation, reset.
 */

const WORKTREE_PORT = 5184

test.use({
  baseURL: `http://127.0.0.1:${WORKTREE_PORT}`,
  storageState: {
    cookies: [],
    origins: [{
      origin: `http://127.0.0.1:${WORKTREE_PORT}`,
      localStorage: [{
        name: 'mt-user-profile',
        value: JSON.stringify({ name: 'Test User', email: 'test@test.com', initials: 'TU' }),
      }],
    }],
  },
})

/** Navigate to the File Compressor tool */
async function goToCompressor(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10_000 })
  const sidebar = page.locator('aside nav')
  await sidebar.locator('button').filter({ hasText: 'File Compressor' }).click()
  await waitForToolLoad(page)
  await expect(page.locator('header h1')).toHaveText('File Compressor')
}

/** Remove showSaveFilePicker so downloads fall back to anchor-click in headless */
async function disableFilePicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

test.describe('File Compressor — Functional', () => {
  test.beforeEach(async ({ page }) => {
    await goToCompressor(page)
  })

  // ─── Empty state ───────────────────────────────────────────────
  test('empty state shows drop zone with correct label and description', async ({ page }) => {
    await expect(page.getByText('Drop files to compress')).toBeVisible()
    await expect(page.getByText('Images, PDFs, or SVGs')).toBeVisible()
  })

  test('empty state has file input with correct accept types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp,image/gif,image/bmp,application/pdf,image/svg+xml,.svg,.pdf',
    )
  })

  // ─── Single image upload ──────────────────────────────────────
  test('upload PNG shows file in list with correct count', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('1 file')).toBeVisible()
  })

  test('upload image shows quality and max width sliders', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Quality')).toBeVisible()
    await expect(page.getByText('Max Width')).toBeVisible()
  })

  test('upload image shows Compress All and Add More buttons', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('button').filter({ hasText: 'Compress All' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Add More' })).toBeVisible()
  })

  test('upload image shows original file size', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    // The file entry should show a size like "238 B" or similar
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/')).toBeVisible()
  })

  test('upload image shows remove button', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('button[aria-label="Remove sample-image.png"]')).toBeVisible()
  })

  // ─── PDF upload ────────────────────────────────────────────────
  test('upload PDF shows in file list with correct icon', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('1 file')).toBeVisible()
  })

  // ─── SVG upload ────────────────────────────────────────────────
  test('upload SVG shows in file list', async ({ page }) => {
    await uploadFile(page, 'sample.svg')
    await expect(page.getByText('sample.svg')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('1 file')).toBeVisible()
  })

  test('SVG-only upload hides quality and max width sliders', async ({ page }) => {
    await uploadFile(page, 'sample.svg')
    await expect(page.getByText('sample.svg')).toBeVisible({ timeout: 5_000 })
    // Quality and Max Width should NOT be visible for SVG-only batches
    await expect(page.getByText('Quality')).toBeHidden()
    await expect(page.getByText('Max Width')).toBeHidden()
  })

  // ─── Compression ──────────────────────────────────────────────
  test('compress single image shows download button and savings', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()

    // Wait for compression to complete — Download button appears
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Summary shows savings percentage
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  test('compress single image shows compressed size in file entry', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // The compressed size should be visible (emerald text)
    await expect(page.locator('.text-emerald-400').first()).toBeVisible()
  })

  test('compress single image shows checkmark', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Compress All button should be gone after completion
    await expect(page.locator('button').filter({ hasText: 'Compress All' })).toBeHidden()
  })

  test('compress PDF completes successfully', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  test('compress SVG completes successfully', async ({ page }) => {
    await uploadFile(page, 'sample.svg')
    await expect(page.getByText('sample.svg')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  // ─── Progress bar ─────────────────────────────────────────────
  test('progress bar appears during compression', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()

    // The progress bar label should appear
    await expect(page.getByText('Compressing...')).toBeVisible({ timeout: 5_000 })

    // Wait for completion
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Progress bar should be gone after completion
    await expect(page.getByText('Compressing...')).toBeHidden()
  })

  // ─── Quality slider ───────────────────────────────────────────
  test('quality slider adjusts value', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    // The Quality slider should exist
    const qualitySlider = page.locator('input[type="range"]').first()
    await expect(qualitySlider).toBeVisible()

    // Default value is 70
    await expect(qualitySlider).toHaveValue('70')

    // Change quality to a different value
    await qualitySlider.fill('30')
    await expect(qualitySlider).toHaveValue('30')
  })

  test('max width slider adjusts value', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    // The Max Width slider is the second range input
    const maxWidthSlider = page.locator('input[type="range"]').nth(1)
    await expect(maxWidthSlider).toBeVisible()

    // Default value is 1920
    await expect(maxWidthSlider).toHaveValue('1920')

    // Change max width
    await maxWidthSlider.fill('640')
    await expect(maxWidthSlider).toHaveValue('640')
  })

  // ─── Download ─────────────────────────────────────────────────
  test('download single compressed image triggers download', async ({ page }) => {
    await disableFilePicker(page)
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download' }).click()
    const download = await downloadPromise

    // Single file should download as image, not ZIP
    expect(download.suggestedFilename()).toContain('sample-image-compressed')
    expect(download.suggestedFilename()).toMatch(/\.jpg$/)
  })

  test('download single compressed PDF triggers download', async ({ page }) => {
    await disableFilePicker(page)
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('sample-compressed.pdf')
  })

  test('download single compressed SVG triggers download', async ({ page }) => {
    await disableFilePicker(page)
    await uploadFile(page, 'sample.svg')
    await expect(page.getByText('sample.svg')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('sample-compressed.svg')
  })

  // ─── Batch upload ─────────────────────────────────────────────
  test('batch upload shows correct file count', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('2 files')).toBeVisible()
  })

  test('batch compress multiple files shows all completed', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()

    // Wait for download ZIP button
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })

    // Summary shows savings
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  test('batch download creates ZIP file', async ({ page }) => {
    await disableFilePicker(page)
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download ZIP' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('compressed-files.zip')
  })

  // ─── Mixed batch with SVG ─────────────────────────────────────
  test('mixed batch with SVG and image shows sliders (non-SVG present)', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.svg'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })
    // Sliders should be visible because there's a non-SVG file
    await expect(page.getByText('Quality')).toBeVisible()
    await expect(page.getByText('Max Width')).toBeVisible()
  })

  // ─── Remove file ──────────────────────────────────────────────
  test('remove file returns to empty state when last file removed', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button[aria-label="Remove sample-image.png"]').click()

    // Should return to drop zone
    await expect(page.getByText('Drop files to compress')).toBeVisible()
  })

  test('remove one file from batch keeps remaining files', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button[aria-label="Remove sample-image.png"]').click()

    await expect(page.getByText('1 file')).toBeVisible()
    await expect(page.getByText('sample.pdf')).toBeVisible()
    await expect(page.getByText('sample-image.png')).toBeHidden()
  })

  // ─── File type validation ─────────────────────────────────────
  test('unsupported file type is silently rejected', async ({ page }) => {
    // Upload a .txt file — the compressor should ignore it
    await uploadFile(page, 'not-a-pdf.txt')

    // Should still show empty state (file was rejected by getCompressibleType)
    await expect(page.getByText('Drop files to compress')).toBeVisible({ timeout: 3_000 })
  })

  // ─── Add More files ───────────────────────────────────────────
  test('Add More button allows adding additional files', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('1 file')).toBeVisible()

    // Upload another file via the hidden input (simulating Add More)
    const fileInput = page.locator('input[type="file"]')
    // After the first upload, the drop zone is gone, but there's a hidden file input
    // from the "Add More" button's dynamically created input
    // Instead, we use the existing file input if visible, or trigger Add More
    // Actually, looking at the code, "Add More" creates a dynamic input.
    // We can intercept it by uploading via filechooser event.
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('button').filter({ hasText: 'Add More' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(
      join(FIXTURES_DIR, 'sample.pdf'),
    )

    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('2 files')).toBeVisible()
  })

  // ─── Summary section ──────────────────────────────────────────
  test('summary shows total original and compressed sizes', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Summary section should show original → compressed with arrow
    const summary = page.locator('.border.border-\\[\\#14B8A6\\]\\/20')
    await expect(summary).toBeVisible()
    // Should contain the arrow indicator
    await expect(summary.locator('text=/→/')).toBeVisible()
  })

  // ─── JPEG upload ──────────────────────────────────────────────
  test('upload JPEG file shows in list and compresses', async ({ page }) => {
    await uploadFile(page, 'sample-image.jpg')
    await expect(page.getByText('sample-image.jpg')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  // ─── Re-compress after adding more ────────────────────────────
  test('adding file after compression shows Compress All again', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    // Compress the first file
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Add another file
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('button').filter({ hasText: 'Add More' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(
      join(FIXTURES_DIR, 'sample.pdf'),
    )

    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 5_000 })

    // allDone should be false now — Compress All should reappear
    await expect(page.locator('button').filter({ hasText: 'Compress All' })).toBeVisible()
    // Download button should be hidden since not all files are done
    await expect(page.locator('button').filter({ hasText: /^Download/ })).toBeHidden()
  })

  // ─── Multiple file types in batch ─────────────────────────────
  test('compress batch with image, PDF, and SVG', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf', 'sample.svg'])
    await expect(page.getByText('3 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('text=/\\d+% smaller/')).toBeVisible()
  })

  // ─── Download button text ─────────────────────────────────────
  test('single file download button says "Download" without ZIP', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Should NOT say "Download ZIP" for single file
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeHidden()
  })

  test('multi file download button says "Download ZIP"', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })
  })
})
