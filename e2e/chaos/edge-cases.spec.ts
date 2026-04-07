import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Chaos: Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
  })

  test('upload zero-byte file to PDF Merge tool - graceful error', async ({ page }) => {
    // Navigate to PDF Merge tool
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'PDF Merge' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('PDF Merge')

    // Upload the zero-byte PDF fixture
    await uploadFile(page, 'zero-byte.pdf')

    // Wait a moment for processing
    await page.waitForTimeout(1000)

    // The app should handle this gracefully - either:
    // 1. Show a toast error message about failing to load the file
    // 2. Silently reject the file (still showing empty state)
    // 3. Show an inline error

    // The tool should NOT crash - verify either the empty state persists
    // or an error toast appears. The pdf.ts loadPDFFile will throw on a zero-byte file,
    // and the handler catches it with addToast.
    const hasToastError = await page.locator('[class*="toast"], [role="alert"]').isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=Drop PDF files here').isVisible()
    const hasErrorText = await page.locator('text=/Failed to load|invalid|error|empty/i').isVisible().catch(() => false)

    // At least one of these should be true - the app handled it gracefully
    expect(hasEmptyState || hasToastError || hasErrorText).toBeTruthy()

    // Most importantly: the app is not crashed
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()

    // Sidebar should still be functional
    await expect(page.locator('aside nav')).toBeVisible()
  })

  test('upload wrong file type (.txt) to PDF Merge tool - graceful error or rejection', async ({ page }) => {
    // Navigate to PDF Merge tool
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'PDF Merge' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('PDF Merge')

    // Upload a .txt file (not a PDF)
    await uploadFile(page, 'not-a-pdf.txt')

    // Wait a moment for processing
    await page.waitForTimeout(1000)

    // The app should handle this gracefully - either:
    // 1. The file input's accept="application/pdf" rejects the file silently
    // 2. The handleFiles callback skips non-PDF files (it checks file.name.endsWith('.pdf'))
    // 3. An error message appears

    // The empty state should still be present (file was rejected/skipped)
    // OR a toast error was shown
    const hasEmptyState = await page.locator('text=Drop PDF files here').isVisible()
    const hasErrorText = await page.locator('text=/Failed|invalid|error|not.*pdf/i').isVisible().catch(() => false)

    expect(hasEmptyState || hasErrorText).toBeTruthy()

    // The app should not crash
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()

    // Verify the tool is still functional by checking sidebar responsiveness
    await expect(page.locator('aside nav')).toBeVisible()

    // Navigate to another tool to confirm app is not in a broken state
    await sidebar.locator('button').filter({ hasText: 'QR Code' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('QR Code')
  })

  test('upload zero-byte file to File Compressor - graceful handling', async ({ page }) => {
    // Navigate to File Compressor tool
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'File Compressor' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('File Compressor')

    // Upload the zero-byte PDF fixture
    await uploadFile(page, 'zero-byte.pdf')

    // Wait a moment for processing
    await page.waitForTimeout(1000)

    // The compressor uses getCompressibleType to check file type.
    // A zero-byte PDF might be accepted into the list but fail on compression.
    // Either way, the app should not crash.

    const hasEmptyState = await page.locator('text=Drop files to compress').isVisible()
    const hasFileInList = await page.locator('text=zero-byte.pdf').isVisible().catch(() => false)

    // Either file was rejected (empty state) or it's in the list
    expect(hasEmptyState || hasFileInList).toBeTruthy()

    // If the file was accepted, try to compress and verify graceful error
    if (hasFileInList) {
      const compressBtn = page.locator('button').filter({ hasText: 'Compress All' })
      if (await compressBtn.isVisible()) {
        await compressBtn.click()
        // Wait for processing
        await page.waitForTimeout(3000)
        // Should show error status on the file entry or be done
        // The important thing is no crash
      }
    }

    // App should not be crashed
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    await expect(page.locator('aside nav')).toBeVisible()
  })

  test('upload wrong file type to Data Viewer - graceful handling', async ({ page }) => {
    // Navigate to Data Viewer tool
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Data Viewer' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('Data Viewer')

    // Upload a .txt file (not JSON or CSV) - the viewer accepts .json,.csv,.tsv
    // but the file input accept attribute may not prevent programmatic uploads
    await uploadFile(page, 'not-a-pdf.txt')

    // Wait a moment
    await page.waitForTimeout(1000)

    // The tool tries to parse as JSON. "This is not a PDF" is not valid JSON,
    // so it should show an error like "Invalid JSON"
    const hasError = await page.locator('text=/Invalid JSON|could not parse/i').isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=Drop a JSON or CSV file').isVisible()

    // Either still in empty state or showing an error - both are acceptable
    expect(hasError || hasEmptyState).toBeTruthy()

    // App should not crash
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })
})
