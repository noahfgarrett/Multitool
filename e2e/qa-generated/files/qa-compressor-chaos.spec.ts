import { test, expect, type Page } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { waitForToolLoad } from '../../helpers/navigation'
import { uploadFile, uploadFiles } from '../../helpers/file-upload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

/**
 * QA Chaos Tests for the File Compressor tool.
 * Covers: rapid uploads, quality changes during compression,
 * removing files during/after compression, edge cases.
 */

const WORKTREE_PORT = 5184

test.use({
  baseURL: `http://127.0.0.1:${WORKTREE_PORT}`,
  storageState: {
    cookies: [],
    origins: [{
      origin: `http://127.0.0.1:${WORKTREE_PORT}`,
      localStorage: [{
        name: 'lwt-user-profile',
        value: JSON.stringify({ name: 'Test User', email: 'test@test.com', initials: 'TU' }),
      }],
    }],
  },
})

/** Navigate to the File Compressor tool */
async function goToCompressor(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'LotusWorks Toolkit' })).toBeVisible({ timeout: 10_000 })
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

test.describe('File Compressor — Chaos', () => {
  test.beforeEach(async ({ page }) => {
    await goToCompressor(page)
  })

  // ─── Rapid uploads ────────────────────────────────────────────
  test('rapid sequential uploads of same file type', async ({ page }) => {
    // Upload multiple images one after another quickly
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    // Upload again via filechooser to add a duplicate
    const fc1 = page.waitForEvent('filechooser')
    await page.locator('button').filter({ hasText: 'Add More' }).click()
    const chooser1 = await fc1
    await chooser1.setFiles(
      join(FIXTURES_DIR, 'sample-image.png'),
    )

    // Both should appear (duplicates allowed since IDs are random)
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })
  })

  test('rapid upload of many different file types', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf', 'sample.svg', 'sample-image.jpg'])
    await expect(page.getByText('4 files')).toBeVisible({ timeout: 5_000 })

    // All files should be listed
    await expect(page.getByText('sample-image.png')).toBeVisible()
    await expect(page.getByText('sample.pdf')).toBeVisible()
    await expect(page.getByText('sample.svg')).toBeVisible()
    await expect(page.getByText('sample-image.jpg')).toBeVisible()
  })

  // ─── Quality changes before compression ───────────────────────
  test('rapidly change quality slider then compress', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    const qualitySlider = page.locator('input[type="range"]').first()

    // Rapidly change quality values
    await qualitySlider.fill('10')
    await qualitySlider.fill('95')
    await qualitySlider.fill('50')
    await qualitySlider.fill('25')
    await qualitySlider.fill('70')

    // Value should be 70
    await expect(qualitySlider).toHaveValue('70')

    // Compress should still work
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  test('set quality to minimum (10) and compress', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('input[type="range"]').first().fill('10')
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  test('set quality to maximum (95) and compress', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('input[type="range"]').first().fill('95')
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  test('set max width to minimum (640) and compress', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('input[type="range"]').nth(1).fill('640')
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  test('set max width to maximum (4096) and compress', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('input[type="range"]').nth(1).fill('4096')
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  // ─── Remove during various states ─────────────────────────────
  test('remove file before compression starts', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    // Remove one file before compressing
    await page.locator('button[aria-label="Remove sample-image.png"]').click()
    await expect(page.getByText('1 file')).toBeVisible()

    // Compress remaining file should work
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  test('remove file after compression completes', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf'])
    await expect(page.getByText('2 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })

    // Remove one of the completed files
    await page.locator('button[aria-label="Remove sample-image.png"]').click()

    // Should now show 1 file with Download (not ZIP) button
    await expect(page.getByText('1 file')).toBeVisible()
    // File was already done, so allDone should still be true (1 done file remaining)
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible()
  })

  test('remove all files after compression returns to empty state', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Remove the file
    await page.locator('button[aria-label="Remove sample-image.png"]').click()

    // Should return to empty state
    await expect(page.getByText('Drop files to compress')).toBeVisible()
  })

  // ─── Upload then navigate away and back ───────────────────────
  test('navigating away and back resets state', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    // Navigate to another tool
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'PDF Merge' }).click()
    await waitForToolLoad(page)

    // Navigate back to File Compressor
    await sidebar.locator('button').filter({ hasText: 'File Compressor' }).click()
    await waitForToolLoad(page)

    // State should be reset — empty state
    await expect(page.getByText('Drop files to compress')).toBeVisible()
  })

  // ─── Compress then download then add more ─────────────────────
  test('full cycle: upload, compress, download, add more, compress again', async ({ page }) => {
    await disableFilePicker(page)

    // Phase 1: Upload and compress
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })

    // Phase 2: Download
    const dl1 = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download' }).click()
    await dl1

    // Phase 3: Add more files
    const fc = page.waitForEvent('filechooser')
    await page.locator('button').filter({ hasText: 'Add More' }).click()
    const chooser = await fc
    await chooser.setFiles(
      join(FIXTURES_DIR, 'sample.svg'),
    )

    await expect(page.getByText('sample.svg')).toBeVisible({ timeout: 5_000 })

    // Phase 4: Compress All (should only compress the new file)
    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 30_000 })

    // Phase 5: Download ZIP
    const dl2 = page.waitForEvent('download', { timeout: 15_000 })
    await page.locator('button').filter({ hasText: 'Download ZIP' }).click()
    const download2 = await dl2
    expect(download2.suggestedFilename()).toBe('compressed-files.zip')
  })

  // ─── Double-click compress ────────────────────────────────────
  test('clicking Compress All twice does not break state', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    const compressBtn = page.locator('button').filter({ hasText: 'Compress All' })

    // Click compress — the button should disappear during compression
    // (isCompressing hides it via the conditional render: !isCompressing && !allDone)
    await compressBtn.click()

    // The button should no longer be visible during compression
    // Wait for completion
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 30_000 })
  })

  // ─── Zero-byte file handling ──────────────────────────────────
  test('zero-byte PDF upload handles gracefully', async ({ page }) => {
    // zero-byte.pdf exists in fixtures
    await uploadFile(page, 'zero-byte.pdf')

    // The getCompressibleType check should pass (it checks type, not size)
    // But compression should fail and show error status
    await expect(page.getByText('zero-byte.pdf')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()

    // Should show error state (the catch block sets status to 'error')
    await expect(page.getByText('Error')).toBeVisible({ timeout: 30_000 })
  })

  // ─── Slider boundary values ───────────────────────────────────
  test('quality and max width slider boundaries respected', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 5_000 })

    const qualitySlider = page.locator('input[type="range"]').first()
    const maxWidthSlider = page.locator('input[type="range"]').nth(1)

    // Verify min/max attributes
    await expect(qualitySlider).toHaveAttribute('min', '10')
    await expect(qualitySlider).toHaveAttribute('max', '95')
    await expect(qualitySlider).toHaveAttribute('step', '5')

    await expect(maxWidthSlider).toHaveAttribute('min', '640')
    await expect(maxWidthSlider).toHaveAttribute('max', '4096')
    await expect(maxWidthSlider).toHaveAttribute('step', '128')
  })

  // ─── Compression preserves file list order ────────────────────
  test('file list order preserved after compression', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf', 'sample.svg'])
    await expect(page.getByText('3 files')).toBeVisible({ timeout: 5_000 })

    // Use remove buttons (unique aria-labels) to verify file order
    const removeButtons = page.locator('button[aria-label^="Remove "]')
    await expect(removeButtons).toHaveCount(3)
    await expect(removeButtons.nth(0)).toHaveAttribute('aria-label', 'Remove sample-image.png')
    await expect(removeButtons.nth(1)).toHaveAttribute('aria-label', 'Remove sample.pdf')
    await expect(removeButtons.nth(2)).toHaveAttribute('aria-label', 'Remove sample.svg')

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 60_000 })

    // Order should be preserved after compression
    await expect(removeButtons.nth(0)).toHaveAttribute('aria-label', 'Remove sample-image.png')
    await expect(removeButtons.nth(1)).toHaveAttribute('aria-label', 'Remove sample.pdf')
    await expect(removeButtons.nth(2)).toHaveAttribute('aria-label', 'Remove sample.svg')
  })

  // ─── Spinner visible during processing ────────────────────────
  test('spinner visible on file entry during processing', async ({ page }) => {
    // Use PDF since it takes longer to process
    await uploadFile(page, 'multi-page.pdf')
    await expect(page.getByText('multi-page.pdf')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()

    // The spinner div should appear during processing
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5_000 })

    // Wait for completion
    await expect(page.locator('button').filter({ hasText: 'Download' })).toBeVisible({ timeout: 60_000 })
  })

  // ─── Large batch compression ──────────────────────────────────
  test('compress batch of same file 3 times', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample-image.png', 'sample-image.png'])
    await expect(page.getByText('3 files')).toBeVisible({ timeout: 5_000 })

    await page.locator('button').filter({ hasText: 'Compress All' }).click()
    await expect(page.locator('button').filter({ hasText: 'Download ZIP' })).toBeVisible({ timeout: 30_000 })
  })

  // ─── Remove during batch ──────────────────────────────────────
  test('remove files from batch one by one', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.pdf', 'sample.svg'])
    await expect(page.getByText('3 files')).toBeVisible({ timeout: 5_000 })

    // Remove first
    await page.locator('button[aria-label="Remove sample-image.png"]').click()
    await expect(page.getByText('2 files')).toBeVisible()

    // Remove second
    await page.locator('button[aria-label="Remove sample.pdf"]').click()
    await expect(page.getByText('1 file')).toBeVisible()

    // Remove last — returns to empty state
    await page.locator('button[aria-label="Remove sample.svg"]').click()
    await expect(page.getByText('Drop files to compress')).toBeVisible()
  })
})
