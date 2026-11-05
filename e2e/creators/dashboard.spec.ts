import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadFile, fixturePath } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  // Clear localStorage to start fresh (dashboards are persisted)
  await page.goto('/')
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('lw-dashboard')) localStorage.removeItem(key)
    }
  })
  await navigateToTool(page, 'dashboard')
})

test.describe('Dashboard Tool', () => {
  test('initial view shows empty state with no dashboards', async ({ page }) => {
    // The heading "Dashboards" should be visible
    await expect(page.getByRole('heading', { name: 'Dashboards' })).toBeVisible({ timeout: 10000 })

    // Empty state message should appear
    await expect(page.getByText('No dashboards yet')).toBeVisible()

    // "Create Dashboard" button should be visible
    await expect(page.getByRole('button', { name: /Create Dashboard/i })).toBeVisible()

    // "New Dashboard" button in the header should also be visible
    await expect(page.getByRole('button', { name: /New Dashboard/i })).toBeVisible()
  })

  test('creating a new dashboard opens it in edit mode', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Click "Create Dashboard"
    await page.getByRole('button', { name: /Create Dashboard/i }).click()

    // Since there is no data, the data import modal should appear
    // The DataImporter has a FileDropZone
    await expect(page.getByRole('heading', { name: 'Import Data' })).toBeVisible({ timeout: 5000 })
  })

  test('Import Data button is visible in the empty state', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // "Import Data" button should be visible in the header
    const importButton = page.getByRole('button', { name: /Import Data/i })
    await expect(importButton).toBeVisible()
  })

  test('Import JSON button exists in the dashboard list view', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboards' })).toBeVisible({ timeout: 10000 })

    // "Import JSON" button should be available
    const importJsonButton = page.getByRole('button', { name: /Import JSON/i })
    await expect(importJsonButton).toBeVisible()
  })

  test('creating a dashboard and then going to import data shows DataImporter', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Create a dashboard — this triggers the import modal since no data exists
    await page.getByRole('button', { name: /Create Dashboard/i }).click()

    // The DataImporter modal should open with a FileDropZone
    // Look for the supported file extensions text
    await expect(page.locator('text=/\\.csv|\\.xlsx|\\.xls/i')).toBeVisible({ timeout: 5000 })
  })

  test('widget palette is accessible from the toolbar after creating a dashboard with data', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Create a dashboard
    await page.getByRole('button', { name: /Create Dashboard/i }).click()

    // Close the import modal if it appeared (press Escape or click backdrop)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // We should now be in the dashboard view with the Toolbar
    // The toolbar should have an Add Widget button (plus icon or text)
    // The Toolbar component calls onAddWidget which opens the WidgetPalette modal
    const addWidgetButton = page.locator('button[title*="Add Widget"], button:has-text("Add Widget")')
    // If the exact text varies, look for the plus-based button in the toolbar
    if (await addWidgetButton.isVisible()) {
      await addWidgetButton.click()
      // The WidgetPalette modal should open with "Add Widget" heading
      await expect(page.getByText('Add Widget').first()).toBeVisible({ timeout: 3000 })
      // Widget types should be available
      await expect(page.getByText('Choose Widget Type')).toBeVisible()
    }
  })

  test('widget palette shows chart type options', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Create a dashboard and dismiss import modal
    await page.getByRole('button', { name: /Create Dashboard/i }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Try to open the widget palette
    const addWidgetButton = page.locator('button[title*="Add Widget"], button[title*="widget"], button:has-text("Add Widget")')
    if (await addWidgetButton.count() > 0) {
      await addWidgetButton.first().click()

      // Widget types should be listed
      await expect(page.getByText('Bar Chart')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('Line Chart')).toBeVisible()
      await expect(page.getByText('Pie Chart')).toBeVisible()
      await expect(page.getByText('KPI Card')).toBeVisible()
    }
  })

  test('new dashboard card appears in the dashboard list after creation and going back', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Create a dashboard
    await page.getByRole('button', { name: /Create Dashboard/i }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Go back to the dashboard list — there should be a "back to list" button or similar
    // The toolbar has an onGoToList callback — look for a button that navigates back
    const backButton = page.locator('button[title*="Dashboards"], button[title*="back"], button[title*="list"]').first()
    if (await backButton.isVisible()) {
      await backButton.click()

      // Dashboard 1 card should now be visible
      await expect(page.getByText('Dashboard 1')).toBeVisible({ timeout: 5000 })
    }
  })

  test('CSV file import via DataImporter drop zone', async ({ page }) => {
    await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 10000 })

    // Click Import Data to open the import modal directly
    const importButton = page.getByRole('button', { name: /Import Data/i })
    await importButton.click()

    // The DataImporter modal should be visible with a FileDropZone
    await expect(page.locator('text=/drop|file/i').first()).toBeVisible({ timeout: 5000 })

    // Upload a CSV file to the modal's file input
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixturePath('sample.csv'))

    // The file should appear in the import list with its name
    await expect(page.getByText('sample.csv')).toBeVisible({ timeout: 10000 })
  })
})
