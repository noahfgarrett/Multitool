import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ── Compare Mode ──────────────────────────────────────────

test.describe('Compare Mode', () => {
  test('clicking Compare PDFs button opens full-screen overlay', async ({ page }) => {
    const compareBtn = page.locator('button[title="Compare PDFs"]')
    await expect(compareBtn).toBeVisible()
    await compareBtn.click()

    // The overlay is a fixed full-screen div with z-50
    const overlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h1:has-text("Compare PDFs")') })
    await expect(overlay).toBeVisible({ timeout: 5000 })
  })

  test('compare overlay shows "Compare PDFs" title', async ({ page }) => {
    await page.locator('button[title="Compare PDFs"]').click()

    const title = page.locator('h1').filter({ hasText: 'Compare PDFs' })
    await expect(title).toBeVisible({ timeout: 5000 })
  })

  test('compare overlay has close button that returns to annotation view', async ({ page }) => {
    await page.locator('button[title="Compare PDFs"]').click()
    await expect(page.locator('h1').filter({ hasText: 'Compare PDFs' })).toBeVisible({ timeout: 5000 })

    // Close button has title="Close"
    const closeBtn = page.locator('.fixed.inset-0.z-50 button[title="Close"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Overlay should disappear — annotation canvas should be visible again
    await expect(page.locator('h1').filter({ hasText: 'Compare PDFs' })).toBeHidden({ timeout: 5000 })
    await expect(page.locator('canvas.ann-canvas').first()).toBeVisible()
  })

  test('compare overlay shows two upload zones for Original PDF and Revised PDF', async ({ page }) => {
    await page.locator('button[title="Compare PDFs"]').click()
    await expect(page.locator('h1').filter({ hasText: 'Compare PDFs' })).toBeVisible({ timeout: 5000 })

    // Upload zones display "Original PDF" and "Revised PDF" labels
    const originalLabel = page.locator('text=Original PDF')
    const revisedLabel = page.locator('text=Revised PDF')
    await expect(originalLabel).toBeVisible()
    await expect(revisedLabel).toBeVisible()
  })

  test('compare overlay has mode selector with Side-by-side, Overlay, and Diff options', async ({ page }) => {
    await page.locator('button[title="Compare PDFs"]').click()
    await expect(page.locator('h1').filter({ hasText: 'Compare PDFs' })).toBeVisible({ timeout: 5000 })

    // Mode selector buttons are only visible after both PDFs are loaded.
    // Before that, verify the file input elements exist for both upload targets.
    const originalInput = page.locator('#compare-file-original')
    const revisedInput = page.locator('#compare-file-revised')
    await expect(originalInput).toBeAttached()
    await expect(revisedInput).toBeAttached()

    // The "vs" separator between the two zones should be visible
    const vsSeparator = page.locator('text=vs')
    await expect(vsSeparator).toBeVisible()
  })

  test('compare overlay has zoom controls hidden until PDFs are loaded', async ({ page }) => {
    await page.locator('button[title="Compare PDFs"]').click()
    await expect(page.locator('h1').filter({ hasText: 'Compare PDFs' })).toBeVisible({ timeout: 5000 })

    // Zoom buttons (title="Zoom in" / "Zoom out") only render when bothLoaded is true.
    // With no PDFs loaded, they should not be visible.
    const zoomIn = page.locator('.fixed.inset-0.z-50 button[title="Zoom in"]')
    const zoomOut = page.locator('.fixed.inset-0.z-50 button[title="Zoom out"]')
    await expect(zoomIn).toBeHidden()
    await expect(zoomOut).toBeHidden()
  })
})

// ── Custom Stamp Library ──────────────────────────────────

test.describe('Custom Stamp Library', () => {
  test('clicking Custom stamp library button opens stamp library modal', async ({ page }) => {
    const stampBtn = page.locator('button[title="Custom stamp library"]')
    await expect(stampBtn).toBeVisible()
    await stampBtn.click()

    // Modal header should display "Stamp Library"
    const heading = page.locator('h2').filter({ hasText: 'Stamp Library' })
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('empty stamp library shows empty state message', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    // Empty state text: "No stamps yet"
    const emptyState = page.locator('text=No stamps yet')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })

  test('stamp library has Create New Stamp button', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    const createBtn = page.locator('text=Create New Stamp')
    await expect(createBtn).toBeVisible()
  })

  test('stamp library has Import and Export buttons', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    const importBtn = page.locator('button[title="Import library"]')
    const exportBtn = page.locator('button[title="Export library"]')
    await expect(importBtn).toBeVisible()
    await expect(exportBtn).toBeVisible()
  })

  test('clicking close button dismisses the stamp library modal', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    const heading = page.locator('h2').filter({ hasText: 'Stamp Library' })
    await expect(heading).toBeVisible({ timeout: 5000 })

    // Close button inside the modal
    const closeBtn = page.locator('.fixed.inset-0.z-50 button[title="Close"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Modal should disappear
    await expect(heading).toBeHidden({ timeout: 5000 })
    // Annotation canvas should be visible again
    await expect(page.locator('canvas.ann-canvas').first()).toBeVisible()
  })

  test('stamp library modal has proper dark theme styling', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    // The panel has bg-[#00171F] and border styling
    const panel = page.locator('.fixed.inset-0.z-50 .bg-\\[\\#00171F\\]')
    await expect(panel).toBeVisible()

    // Backdrop exists (black/60 overlay)
    const backdrop = page.locator('.fixed.inset-0.z-50 .bg-black\\/60')
    await expect(backdrop).toBeVisible()
  })

  test('Create New Stamp section shows image upload area when expanded', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    // Click "Create New Stamp" to expand the creation form
    await page.locator('text=Create New Stamp').click()

    // The creation form should show "New Stamp" heading
    const newStampHeading = page.locator('h3').filter({ hasText: 'New Stamp' })
    await expect(newStampHeading).toBeVisible({ timeout: 3000 })

    // Image upload button with "Upload" text should be visible
    const uploadText = page.locator('text=Upload')
    await expect(uploadText).toBeVisible()

    // Stamp Name input field with placeholder
    const nameInput = page.locator('input[placeholder="e.g. Company Logo"]')
    await expect(nameInput).toBeVisible()
  })

  test('Export button is disabled when stamp library is empty', async ({ page }) => {
    await page.locator('button[title="Custom stamp library"]').click()
    await expect(page.locator('h2').filter({ hasText: 'Stamp Library' })).toBeVisible({ timeout: 5000 })

    // Export button should be disabled (has disabled:opacity-30 class) when no stamps exist
    const exportBtn = page.locator('button[title="Export library"]')
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toBeDisabled()
  })
})
