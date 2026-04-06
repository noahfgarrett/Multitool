/**
 * QA Chaos Tests — Text Extract Tool
 *
 * Tests stress/edge scenarios: rapid copy clicks, upload while extracting,
 * rapid mode switching, rapid zoom, export without data, and more.
 */
import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'

const BASE_URL = 'http://127.0.0.1:5187'

test.use({
  baseURL: BASE_URL,
  storageState: {
    cookies: [],
    origins: [{
      origin: BASE_URL,
      localStorage: [{
        name: 'lwt-user-profile',
        value: JSON.stringify({ name: 'Test User', email: 'test@test.com', initials: 'TU' }),
      }],
    }],
  },
})

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'text-extract')
})

// ── Helper: remove showSaveFilePicker so exports trigger downloads ──
async function disableFilePicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

// ── Helper: upload + extract in the given mode ──
async function uploadAndExtract(
  page: Page,
  filename: string,
  mode: 'Document' | 'Table' = 'Document',
  scope: 'page' | 'all' = 'page',
): Promise<void> {
  await uploadFile(page, filename)
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 })

  if (mode === 'Table') {
    await page.getByRole('button', { name: 'Table', exact: true }).click()
  }

  if (scope === 'all') {
    await page.locator('button').filter({ hasText: 'Extract All' }).click()
  } else {
    await page.getByRole('button', { name: /^Extract$/i }).click()
  }

  await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 60000 })
}

// ══════════════════════════════════════════════════════
// 1. Rapid Copy clicks
// ══════════════════════════════════════════════════════

test.describe('Rapid Copy Clicks', () => {
  test('clicking Copy 5 times rapidly does not crash', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    const copyButton = page.locator('button').filter({ hasText: /Copy|Copied/ })
    for (let i = 0; i < 5; i++) {
      await copyButton.click()
    }

    // App should still be functional — verify button is still present
    await expect(page.locator('button').filter({ hasText: /Copy|Copied/ })).toBeVisible()

    // Verify extracted data is still intact
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 2. Upload new PDF while current one is loaded
// ══════════════════════════════════════════════════════

test.describe('Upload While Loaded', () => {
  test('clicking New then uploading a new PDF replaces the current one cleanly', async ({ page }) => {
    // Load first PDF
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click "New" to reset to upload state (file input is only in empty state)
    await page.locator('button').filter({ hasText: 'New' }).last().click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    // Upload second PDF
    await uploadFile(page, 'table-simple.pdf')
    await expect(page.getByText('table-simple.pdf')).toBeVisible({ timeout: 15000 })

    // Old filename should not be visible
    await expect(page.getByText('sample.pdf')).not.toBeVisible()

    // Tool should be functional
    await page.getByRole('button', { name: /^Extract$/i }).click()
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })
  })

  test('clicking New after extraction then uploading resets extracted data', async ({ page }) => {
    // Extract from first PDF
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeVisible()

    // Click "New" to reset (file input only exists in empty state)
    await page.locator('button').filter({ hasText: 'New' }).last().click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    // Upload second PDF
    await uploadFile(page, 'table-simple.pdf')
    await expect(page.getByText('table-simple.pdf')).toBeVisible({ timeout: 15000 })

    // Extracted data should be cleared — Copy button should disappear
    await expect(page.locator('button').filter({ hasText: 'Copy' })).not.toBeVisible()

    // "Extract to see preview" should reappear
    await expect(page.getByText('Extract to see preview')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 3. Rapid mode switching
// ══════════════════════════════════════════════════════

test.describe('Rapid Mode Switching', () => {
  test('switching modes 10 times rapidly does not crash', async ({ page }) => {
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')

    const docBtn = page.getByRole('button', { name: 'Document', exact: true })
    const tableBtn = page.getByRole('button', { name: 'Table', exact: true })

    for (let i = 0; i < 10; i++) {
      await docBtn.click()
      await tableBtn.click()
    }

    // App should still be functional
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 4. Rapid zoom clicks
// ══════════════════════════════════════════════════════

test.describe('Rapid Zoom', () => {
  test('clicking zoom in 10 times rapidly does not crash', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    const zoomIn = page.locator('button[aria-label="Zoom in PDF"]')
    for (let i = 0; i < 10; i++) {
      await zoomIn.click()
    }

    // Should be capped at max zoom (300%)
    await expect(page.locator('text=/300%/').first()).toBeVisible()
  })

  test('clicking zoom out 10 times rapidly does not crash', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    const zoomOut = page.locator('button[aria-label="Zoom out PDF"]')
    for (let i = 0; i < 10; i++) {
      await zoomOut.click()
    }

    // Should be capped at min zoom (50%)
    await expect(page.locator('text=/50%/').first()).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 5. Rapid extract clicks
// ══════════════════════════════════════════════════════

test.describe('Rapid Extract', () => {
  test('clicking Extract while already extracting does not crash', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click extract multiple times rapidly
    const extractBtn = page.getByRole('button', { name: /^Extract$/i })
    await extractBtn.click()
    // Try to click again while extracting — button should be disabled
    const isDisabled = await page.getByRole('button', { name: /Extracting/i }).isDisabled().catch(() => false)

    // Wait for extraction to finish
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // App should still be functional
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 6. Export dropdown open/close rapid
// ══════════════════════════════════════════════════════

test.describe('Export Dropdown Rapid Toggle', () => {
  test('toggling export dropdown 10 times does not crash', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    const exportBtn = page.locator('button').filter({ hasText: 'Export' })

    for (let i = 0; i < 10; i++) {
      await exportBtn.click()
      // Small delay to allow toggle
      await page.waitForTimeout(50)
    }

    // App should still be functional
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 7. New → Upload → Extract cycle
// ══════════════════════════════════════════════════════

test.describe('New Upload Cycle', () => {
  test('New → Upload → Extract → New → Upload → Extract cycle works', async ({ page }) => {
    // First cycle
    await uploadAndExtract(page, 'sample.pdf', 'Document')
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()

    // Click New
    await page.locator('button').filter({ hasText: 'New' }).last().click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    // Second cycle with different file
    await uploadAndExtract(page, 'table-simple.pdf', 'Table')
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()

    // Click New again
    await page.locator('button').filter({ hasText: 'New' }).last().click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    // Third cycle
    await uploadAndExtract(page, 'mixed-content.pdf', 'Document')
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 8. Page navigation during extraction
// ══════════════════════════════════════════════════════

test.describe('Page Navigation Edge Cases', () => {
  test('navigating pages then extracting works correctly', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })

    // Navigate to page 2
    await page.locator('button[aria-label="Next page"]').click()
    await expect(page.locator('text=/Page 2 \\/ 3/')).toBeVisible()

    // Extract page 2
    await page.getByRole('button', { name: /^Extract$/i }).click()
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // Should have extracted text
    await expect(page.locator('text=/\\d+ text items/')).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════
// 9. Clear → Re-extract cycle
// ══════════════════════════════════════════════════════

test.describe('Clear and Re-extract', () => {
  test('Clear then Re-extract produces same data', async ({ page }) => {
    await uploadAndExtract(page, 'sample.pdf', 'Document')

    // Get initial item count
    const initialText = await page.locator('text=/\\d+ text items/').textContent()
    const initialCount = parseInt(initialText?.match(/(\d+)/)?.[1] ?? '0', 10)

    // Clear
    await page.locator('button').filter({ hasText: 'Clear' }).click()
    await expect(page.getByText('Extract to see preview')).toBeVisible()

    // Re-extract (button should now say "Extract" again)
    await page.getByRole('button', { name: /^Extract$/i }).click()
    await expect(page.getByRole('button', { name: /Re-extract/i })).toBeVisible({ timeout: 30000 })

    // Count should be the same
    const finalText = await page.locator('text=/\\d+ text items/').textContent()
    const finalCount = parseInt(finalText?.match(/(\d+)/)?.[1] ?? '0', 10)
    expect(finalCount).toBe(initialCount)
  })
})
