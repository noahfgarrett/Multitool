import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile, uploadFiles } from '../helpers/file-upload'


/**
 * Small fixtures convert in a few milliseconds, so the progress UI can come and go
 * between two polls. Record what the progress area showed with a MutationObserver
 * that is installed before Convert All is clicked.
 */
async function watchBulkProgress(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __bulk: { text: boolean; hiddenConvertAll: boolean } }
    w.__bulk = { text: false, hiddenConvertAll: false }
    const check = () => {
      const body = document.body.innerText
      if (/Converting \d+ of 2 files/.test(body)) {
        w.__bulk.text = true
        const btn = [...document.querySelectorAll('button')].find(b => /Convert All/.test(b.textContent ?? ''))
        if (!btn) w.__bulk.hiddenConvertAll = true
      }
    }
    new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
}

async function readBulkProgress(page: import('@playwright/test').Page) {
  return page.evaluate(() => (window as unknown as { __bulk: { text: boolean; hiddenConvertAll: boolean } }).__bulk)
}

test.describe('File Converter — HEIC/HEIF support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 })

    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'File Converter' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('File Converter')
  })

  test('HEIC file is recognized and shows correct output formats', async ({ page }) => {
    await uploadFile(page, 'sample.heic')

    // File entry should appear
    await expect(page.locator('text=sample.heic')).toBeVisible({ timeout: 5000 })

    // Should show as HEIC type in the type label (scoped to the entry)
    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample.heic' })
    await expect(entry.locator('text=/HEIC · /')).toBeVisible()

    // Should show "Convert to:" label
    await expect(entry.locator('text=Convert to:')).toBeVisible()

    // HEIC should offer PNG, JPEG, WebP, PDF output formats
    await expect(entry.locator('button').filter({ hasText: 'PNG' })).toBeVisible()
    await expect(entry.locator('button').filter({ hasText: 'JPEG' })).toBeVisible()
    await expect(entry.locator('button').filter({ hasText: 'WebP' })).toBeVisible()
    await expect(entry.locator('button').filter({ hasText: 'PDF' })).toBeVisible()
  })

  test('HEIC file shows convert button when format is selected', async ({ page }) => {
    await uploadFile(page, 'sample.heic')
    await expect(page.locator('text=sample.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample.heic' })

    // No per-entry Convert button before selecting format
    await expect(entry.locator('button').filter({ hasText: /^Convert$/ })).toBeHidden()

    // Select PNG format
    await entry.locator('button').filter({ hasText: 'PNG' }).click()

    // Per-entry Convert button should appear
    await expect(entry.locator('button').filter({ hasText: /^Convert$/ })).toBeVisible()
  })

  test('HEIC conversion shows descriptive error for invalid HEIC data', async ({ page }) => {
    // Our minimal fixture has valid HEIC ftyp header but no image data
    // heic2any should fail with a descriptive error, not crash
    await uploadFile(page, 'sample.heic')
    await expect(page.locator('text=sample.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample.heic' })

    // Select PNG and convert (use per-entry Convert button)
    await entry.locator('button').filter({ hasText: 'PNG' }).click()
    await entry.locator('button').filter({ hasText: /^Convert$/ }).click()

    // Should show error state (not crash, not hang) — error text appears in a red paragraph
    await expect(entry.locator('.text-red-400')).toBeVisible({ timeout: 15000 })
  })

  test('HEIC file converts to PNG successfully', async ({ page }) => {
    await uploadFile(page, 'sample-real.heic')
    await expect(page.locator('text=sample-real.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-real.heic' })
    await entry.locator('button').filter({ hasText: 'PNG' }).click()
    await entry.locator('button').filter({ hasText: /^Convert$/ }).click()

    // Should complete successfully — "1 converted" in toolbar confirms it
    await expect(page.locator('text=/1 converted/')).toBeVisible({ timeout: 30000 })
    // Entry should not be in error state
    await expect(entry.locator('text=/Failed|error/i')).toBeHidden()
  })

  test('HEIC file converts to JPEG successfully', async ({ page }) => {
    await uploadFile(page, 'sample-real.heic')
    await expect(page.locator('text=sample-real.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-real.heic' })
    await entry.locator('button').filter({ hasText: 'JPEG' }).click()
    await entry.locator('button').filter({ hasText: /^Convert$/ }).click()

    await expect(page.locator('text=/1 converted/')).toBeVisible({ timeout: 30000 })
    await expect(entry).toHaveClass(/border-\[#14B8A6\]/)
  })

  test('HEIC file converts to WebP successfully', async ({ page }) => {
    await uploadFile(page, 'sample-real.heic')
    await expect(page.locator('text=sample-real.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-real.heic' })
    await entry.locator('button').filter({ hasText: 'WebP' }).click()
    await entry.locator('button').filter({ hasText: /^Convert$/ }).click()

    await expect(page.locator('text=/1 converted/')).toBeVisible({ timeout: 30000 })
    await expect(entry).toHaveClass(/border-\[#14B8A6\]/)
  })

  test('HEIC file converts to PDF successfully', async ({ page }) => {
    await uploadFile(page, 'sample-real.heic')
    await expect(page.locator('text=sample-real.heic')).toBeVisible({ timeout: 5000 })

    const entry = page.locator('.rounded-xl.border').filter({ hasText: 'sample-real.heic' })
    await entry.locator('button').filter({ hasText: 'PDF' }).click()
    await entry.locator('button').filter({ hasText: /^Convert$/ }).click()

    await expect(page.locator('text=/1 converted/')).toBeVisible({ timeout: 30000 })
    await expect(entry).toHaveClass(/border-\[#14B8A6\]/)
  })

  test('HEIC file can be removed from the list', async ({ page }) => {
    await uploadFile(page, 'sample.heic')
    await expect(page.locator('text=sample.heic')).toBeVisible({ timeout: 5000 })

    // Click the remove button
    await page.locator('button[aria-label="Remove sample.heic"]').click()

    // Should return to empty state
    await expect(page.locator('text=Drop files to convert')).toBeVisible()
  })
})

test.describe('File Converter — Bulk conversion progress bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 })

    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'File Converter' }).click()
    await waitForToolLoad(page)
  })

  test('Convert All button shows file count for multiple files', async ({ page }) => {
    // Upload multiple files
    await uploadFiles(page, ['sample-image.png', 'sample.csv'])

    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=sample.csv')).toBeVisible({ timeout: 5000 })

    // Should show "2 files" count
    await expect(page.locator('text=/2 files/')).toBeVisible()

    // Select output format for both files
    const entries = page.locator('.rounded-xl.border')
    await entries.filter({ hasText: 'sample-image.png' }).locator('button').filter({ hasText: 'JPEG' }).click()
    await entries.filter({ hasText: 'sample.csv' }).locator('button').filter({ hasText: 'JSON' }).click()

    // Convert All button should show count
    await expect(page.locator('button').filter({ hasText: /Convert All \(2\)/ })).toBeVisible()
  })

  test('progress bar appears during Convert All and disappears after', async ({ page }) => {
    // Upload files that are known to convert successfully
    await uploadFiles(page, ['sample-image.png', 'sample.csv'])

    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=sample.csv')).toBeVisible({ timeout: 5000 })

    // Select output formats
    const entries = page.locator('.rounded-xl.border')
    await entries.filter({ hasText: 'sample-image.png' }).locator('button').filter({ hasText: 'JPEG' }).click()
    await entries.filter({ hasText: 'sample.csv' }).locator('button').filter({ hasText: 'TSV' }).click()

    // Click Convert All
    await watchBulkProgress(page)
    await page.locator('button').filter({ hasText: /Convert All/ }).click()

    // Wait for conversions to complete
    await expect(page.locator('text=/2 converted/')).toBeVisible({ timeout: 30000 })

    // "Converting X of 2 files..." was shown while the batch ran
    expect((await readBulkProgress(page)).text).toBe(true)

    // Progress bar text should be gone
    await expect(page.locator('text=/Converting \\d+ of \\d+ files/')).toBeHidden()
  })

  test('Convert All button is hidden during bulk conversion', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.csv'])

    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    const entries = page.locator('.rounded-xl.border')
    await entries.filter({ hasText: 'sample-image.png' }).locator('button').filter({ hasText: 'JPEG' }).click()
    await entries.filter({ hasText: 'sample.csv' }).locator('button').filter({ hasText: 'TSV' }).click()

    // Convert All should be visible before clicking
    const convertAllBtn = page.locator('button').filter({ hasText: /Convert All/ })
    await expect(convertAllBtn).toBeVisible()

    // Click it
    await watchBulkProgress(page)
    await convertAllBtn.click()

    // After completion
    await expect(page.locator('text=/2 converted/')).toBeVisible({ timeout: 30000 })

    // While the progress text was on screen, the Convert All button was gone
    const seen = await readBulkProgress(page)
    expect(seen.text).toBe(true)
    expect(seen.hiddenConvertAll).toBe(true)
  })

  test('converted files show download options after bulk conversion', async ({ page }) => {
    await uploadFiles(page, ['sample-image.png', 'sample.csv'])

    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    const entries = page.locator('.rounded-xl.border')
    await entries.filter({ hasText: 'sample-image.png' }).locator('button').filter({ hasText: 'JPEG' }).click()
    await entries.filter({ hasText: 'sample.csv' }).locator('button').filter({ hasText: 'TSV' }).click()

    await page.locator('button').filter({ hasText: /Convert All/ }).click()

    // Wait for all to complete
    await expect(page.locator('text=/2 converted/')).toBeVisible({ timeout: 30000 })

    // Download All button should appear (for 2+ converted files)
    await expect(page.locator('button').filter({ hasText: 'Download All' })).toBeVisible()
  })

  test('mixed HEIC and other files in bulk shows correct count', async ({ page }) => {
    await uploadFiles(page, ['sample.heic', 'sample-image.png'])

    await expect(page.locator('text=sample.heic')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=sample-image.png')).toBeVisible({ timeout: 5000 })

    // Both should show "Convert to:" labels
    const convertLabels = page.locator('text=Convert to:')
    await expect(convertLabels).toHaveCount(2)

    // Should show "2 files" in toolbar
    await expect(page.locator('text=/2 files/')).toBeVisible()

    // HEIC should have its own format buttons
    const entries = page.locator('.rounded-xl.border')
    const heicEntry = entries.filter({ hasText: 'sample.heic' })
    await expect(heicEntry.locator('button').filter({ hasText: 'PNG' })).toBeVisible()
    await expect(heicEntry.locator('button').filter({ hasText: 'JPEG' })).toBeVisible()
  })
})
