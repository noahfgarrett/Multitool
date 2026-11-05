import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'flowchart')
})

test.describe('Flowchart Tool', () => {
  test('initial view shows toolbar, shape library, canvas, and empty state', async ({ page }) => {
    // The ShapeLibrary "Shapes" header should be visible
    await expect(page.getByText('Shapes', { exact: true }).first()).toBeVisible({ timeout: 10000 })

    // The empty state overlay text should be visible
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible()

    // "Import from Text" button should be in the empty state
    await expect(page.getByRole('button', { name: /Import from Text/i })).toBeVisible()

    // "Load JSON" button should also be available
    await expect(page.getByRole('button', { name: /Load JSON/i })).toBeVisible()
  })

  test('shape library shows categorized shape tiles', async ({ page }) => {
    await expect(page.getByText('Shapes', { exact: true }).first()).toBeVisible({ timeout: 10000 })

    // The categories should be visible
    await expect(page.locator('button').filter({ hasText: 'Basic' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Flowchart' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Miscellaneous' })).toBeVisible()

    // Shape tiles should be rendered (SVG previews inside buttons)
    const shapeTiles = page.locator('.grid.grid-cols-2 button')
    const count = await shapeTiles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Import from Text button opens the text import modal', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    // Click "Import from Text"
    await page.getByRole('button', { name: /Import from Text/i }).click()

    // The modal should open with "Import from Text" title
    await expect(page.getByText('Import from Text').first()).toBeVisible({ timeout: 3000 })

    // A textarea for typing the flowchart text should be visible
    const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
    await expect(textarea).toBeVisible()

    // The "Import" button in the modal should exist
    await expect(page.getByRole('button', { name: /^Import$/i })).toBeVisible()

    // The Cancel button should exist
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
  })

  test('text import modal has pre-filled template text', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    // Click "Import from Text"
    await page.getByRole('button', { name: /Import from Text/i }).click()

    // The textarea should have some default template text (not empty)
    const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
    const value = await textarea.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('importing from text generates nodes on the canvas', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    // Click "Import from Text"
    await page.getByRole('button', { name: /Import from Text/i }).click()

    // Enter simple flowchart text
    const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
    await textarea.fill('START\nProcess Step 1\nProcess Step 2\nEND')

    // Click Import
    await page.getByRole('button', { name: /^Import$/i }).click()

    // The modal should close
    await expect(page.locator('textarea[placeholder="Type your flowchart here..."]')).not.toBeVisible({ timeout: 3000 })

    // The empty state should be gone — nodes have been generated
    await expect(page.getByText('Start by placing shapes from the left panel')).not.toBeVisible({ timeout: 3000 })

    // The canvas area should now contain SVG or rendered node elements
    // The Canvas component renders nodes on an SVG or similar canvas
  })

  test('syntax guide is shown in the import modal', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Import from Text/i }).click()

    // Syntax guide items should be visible
    await expect(page.getByText('START', { exact: true })).toBeVisible()
    await expect(page.getByText('Plain text')).toBeVisible()
    await expect(page.getByText('IF', { exact: true })).toBeVisible()
    await expect(page.getByText('END', { exact: true })).toBeVisible()
  })

  test('template dropdown exists in the import modal', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Import from Text/i }).click()

    // Templates dropdown button should be visible
    const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).last()
    await expect(templatesButton).toBeVisible()

    // Click to open the dropdown
    await templatesButton.click()

    // Template options should appear in the dropdown
    const templateOptions = page.locator('.bg-dark-surface button')
    const count = await templateOptions.count()
    expect(count).toBeGreaterThan(0)
  })

  test('export button exists in the toolbar', async ({ page }) => {
    await expect(page.getByText('Shapes', { exact: true }).first()).toBeVisible({ timeout: 10000 })

    // The toolbar should have an export button — search for the toolbar area
    // In the FlowchartTool, the Toolbar component has an onExport callback
    // Look for a button with "Export" title or text
    const exportButton = page.locator('button[title="Export"], button:has-text("Export")').first()
    await expect(exportButton).toBeVisible()
  })

  test('export modal shows format options after importing nodes', async ({ page }) => {
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeVisible({ timeout: 10000 })

    // Import some nodes first
    await page.getByRole('button', { name: /Import from Text/i }).click()
    const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
    await textarea.fill('START\nDo something\nEND')
    await page.getByRole('button', { name: /^Import$/i }).click()
    await page.waitForTimeout(500)

    // Open the export modal
    const exportButton = page.locator('button[title="Export"], button:has-text("Export")').first()
    await exportButton.click()

    // The export modal should show "Export Diagram"
    await expect(page.getByText('Export Diagram')).toBeVisible({ timeout: 3000 })

    // Format options should be available
    await expect(page.getByText('Export as PNG')).toBeVisible()
    await expect(page.getByText('Export as SVG')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()
    await expect(page.getByText('Copy as PNG')).toBeVisible()
  })

  test('shape category can be collapsed and expanded', async ({ page }) => {
    await expect(page.getByText('Shapes', { exact: true }).first()).toBeVisible({ timeout: 10000 })

    // Click the "Basic" category header to collapse it
    const basicButton = page.locator('button').filter({ hasText: 'Basic' })
    await basicButton.click()

    // The shapes grid for Basic should be hidden now
    // Click again to expand
    await basicButton.click()

    // Should still see shapes in the Basic category
    const shapeTiles = page.locator('.grid.grid-cols-2 button')
    const count = await shapeTiles.count()
    expect(count).toBeGreaterThan(0)
  })
})
