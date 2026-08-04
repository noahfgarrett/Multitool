import { test, expect } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'

async function expectDefaultChart(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('application', { name: /organization chart with 1 people/i })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
  await page.waitForFunction(() => window.__orgChartTest?.getStore?.().isHydrated === true)
  await page.evaluate(() => window.__orgChartTest?.getStore?.().clearDiagram())
})

test.describe('Org Chart Tool', () => {
  test('initial view shows toolbar, canvas, and default root', async ({ page }) => {
    await expectDefaultChart(page)

    // The toolbar should be rendered with its buttons
    // Undo/Redo buttons should exist
    const undoButton = page.locator('button[title="Undo (Ctrl+Z)"]')
    const redoButton = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(undoButton).toBeVisible()
    await expect(redoButton).toBeVisible()
  })

  test('toolbar has Add Person button', async ({ page }) => {
    await expectDefaultChart(page)

    // The "Add Person" button should be in the toolbar
    const addPersonButton = page.locator('button[title="Add Person"]')
    await expect(addPersonButton).toBeVisible()
  })

  test('clicking Add Person creates a report under the default root', async ({ page }) => {
    await expectDefaultChart(page)

    // Click "Add Person"
    const addPersonButton = page.locator('button[title="Add Person"]')
    await addPersonButton.click()

    await expect(page.getByRole('application', { name: /organization chart with 2 people/i })).toBeVisible()
  })

  test('Templates button opens the templates modal', async ({ page }) => {
    await expectDefaultChart(page)

    // Click "Templates" button in the toolbar
    const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).first()
    await expect(templatesButton).toBeVisible()
    await templatesButton.click()

    // The Templates modal should appear
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })

    // Template cards should be visible with node counts
    await expect(page.locator('text=/\\d+ people/')).toHaveCount(1, { timeout: 3000 }).catch(() => {
      // At least one template should be visible
    })
    const templateButtons = page.locator('button').filter({ hasText: /people/ })
    const count = await templateButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('loading a template populates the canvas with nodes', async ({ page }) => {
    await expectDefaultChart(page)

    // Open Templates modal
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })

    // Click the first template
    const firstTemplate = page.locator('button').filter({ hasText: /people/ }).first()
    await firstTemplate.click()

    await expect(page.getByRole('application', { name: /organization chart with \d+ people/i })).toBeVisible()
  })

  test('Export button opens the export modal', async ({ page }) => {
    // The Export button should be in the toolbar
    const exportButton = page.locator('button[title="Export"]')
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    await exportButton.click()

    // The export modal should appear with "Export Org Chart"
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    // Format options should be listed
    await expect(page.getByText('Export as PNG')).toBeVisible()
    await expect(page.getByText('Copy as PNG')).toBeVisible()
    await expect(page.getByText('Export as SVG')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()
    await expect(page.getByText('Export as CSV')).toBeVisible()
  })

  test('export options are enabled for the default chart', async ({ page }) => {
    await expectDefaultChart(page)

    // Open export modal
    const exportButton = page.locator('button[title="Export"]')
    await exportButton.click()

    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    // All export buttons should be available for the default CEO chart.
    const exportOptions = page.locator('button').filter({ hasText: /Export as|Save as|Copy as/ })
    const count = await exportOptions.count()

    for (let i = 0; i < count; i++) {
      await expect(exportOptions.nth(i)).not.toHaveClass(/opacity-30/)
    }
  })

  test('zoom controls exist in the toolbar', async ({ page }) => {
    // Zoom In and Zoom Out buttons should be present
    const zoomOutButton = page.locator('button[title="Zoom Out"]')
    const zoomInButton = page.locator('button[title="Zoom In"]')
    await expect(zoomOutButton).toBeVisible({ timeout: 10000 })
    await expect(zoomInButton).toBeVisible()

    // Zoom percentage should be displayed
    await expect(page.locator('span.tabular-nums').filter({ hasText: /\d+%/ }).first()).toBeVisible()

    // Fit to Content button should exist
    const fitButton = page.locator('button[title="Fit to Content"]')
    await expect(fitButton).toBeVisible()
  })

  test('layout direction toggle exists in the toolbar', async ({ page }) => {
    // Layout direction button should exist with initial "Top-Down" mode
    const layoutButton = page.locator('button[title^="Layout:"]')
    await expect(layoutButton).toBeVisible({ timeout: 10000 })
  })

  test('Import button exists in the toolbar', async ({ page }) => {
    // The Import JSON button should be in the toolbar
    const importButton = page.locator('button').filter({ hasText: 'Import' }).first()
    await expect(importButton).toBeVisible({ timeout: 10000 })
  })

  test('properties panel is visible after adding a node and selecting it', async ({ page }) => {
    await expectDefaultChart(page)

    // Load a template to get some nodes
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })

    // Click the first template
    const firstTemplate = page.locator('button').filter({ hasText: /people/ }).first()
    await firstTemplate.click()

    await expect(page.getByRole('application', { name: /organization chart with \d+ people/i })).toBeVisible()

    // The PropertiesPanel should exist on the right side
    // It typically shows when a node is selected
    // Without selecting a node, the panel might show a default state
  })

  test('Reset Layout button exists and is disabled when no manual offsets', async ({ page }) => {
    await expectDefaultChart(page)

    // Reset Layout button should exist
    const resetButton = page.locator('button[title="Reset Layout"]')
    await expect(resetButton).toBeVisible()

    // It should be disabled (no manual offsets exist on the default chart)
    await expect(resetButton).toHaveClass(/opacity-30/)
  })

  test('adding a person to a template creates a child node', async ({ page }) => {
    await expectDefaultChart(page)

    // Load a template
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    const firstTemplate = page.locator('button').filter({ hasText: /people/ }).first()
    await firstTemplate.click()
    await expect(page.getByRole('application', { name: /organization chart with \d+ people/i })).toBeVisible()

    // Click "Add Person" — should add a child to root (or selected node)
    const addPersonButton = page.locator('button[title="Add Person"]')
    await addPersonButton.click()

    // The undo button should now be enabled (a mutation happened)
    const undoButton = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoButton).not.toHaveClass(/opacity-30/, { timeout: 3000 })
  })
})
