import { test, expect } from '@playwright/test'
import { navigateToTool, ensureUserProfile } from '../helpers/navigation'

test.beforeEach(async ({ page }) => {
  // Seed localStorage with user profile to prevent the "Set Up Your Profile" modal
  await ensureUserProfile(page)
  await page.addInitScript(() => {
    if (!localStorage.getItem('lwt-user-profile')) {
      localStorage.setItem('lwt-user-profile', JSON.stringify({
        name: 'Test User', email: 'test@test.com', initials: 'TU',
        jobTitle: '', company: '', photo: '',
      }))
    }
  })
  await page.goto('/')
  await navigateToTool(page, 'flowchart')
  // Wait for the shape library sidebar "Shapes" section header to be ready
  await expect(page.locator('.uppercase').filter({ hasText: 'Shapes' })).toBeVisible({ timeout: 10000 })
})

test.describe('Flowchart P&ID Features', () => {
  test('P&ID shape categories exist in shape library', async ({ page }) => {
    // The "P&ID Symbols" group header should be visible
    await expect(page.getByText('P&ID Symbols')).toBeVisible()

    // P&ID sub-categories should exist as collapsible buttons
    // They start collapsed by default, but the category buttons should be visible
    await expect(page.locator('button').filter({ hasText: 'Vessels & Tanks' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Valves' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Instruments' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Rotating Equipment' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Heat Transfer' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Piping' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Misc Equipment' })).toBeVisible()
  })

  test('shape search works for "pump"', async ({ page }) => {
    // Find the search input in the shape library sidebar
    const searchInput = page.locator('input[placeholder="Search shapes..."]').first()
    await expect(searchInput).toBeVisible()

    // Type "pump" into the search
    await searchInput.fill('pump')

    // Results should appear — look for a result count indicator
    const resultText = page.locator('text=/\\d+ result/')
    await expect(resultText).toBeVisible({ timeout: 5000 })

    // At least one result should be found (not "0 results")
    const text = await resultText.textContent()
    expect(text).not.toBe('0 results')

    // Shape tiles should be rendered in the search results grid
    const shapeTiles = page.locator('.grid.grid-cols-2 button')
    const count = await shapeTiles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('shape search works for "valve"', async ({ page }) => {
    // Find the search input in the shape library sidebar
    const searchInput = page.locator('input[placeholder="Search shapes..."]').first()
    await expect(searchInput).toBeVisible()

    // Type "valve" into the search
    await searchInput.fill('valve')

    // Results should appear
    const resultText = page.locator('text=/\\d+ result/')
    await expect(resultText).toBeVisible({ timeout: 5000 })

    // At least one valve shape should be found
    const text = await resultText.textContent()
    expect(text).not.toBe('0 results')

    // Shape tiles should be visible
    const shapeTiles = page.locator('.grid.grid-cols-2 button')
    const count = await shapeTiles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('background image button exists in toolbar', async ({ page }) => {
    // The toolbar should have a "Background Image" button (via title attribute)
    const bgButton = page.locator('button[title="Background Image"]')
    await expect(bgButton).toBeVisible()
  })

  test('export modal has Visio option', async ({ page }) => {
    // Click the Export button in the toolbar (title="Export")
    const exportButton = page.locator('button[title="Export"]')
    await expect(exportButton).toBeVisible()
    await exportButton.click()

    // The export modal should open with "Export Diagram" title
    await expect(page.getByText('Export Diagram')).toBeVisible({ timeout: 5000 })

    // Look for the Visio export option
    await expect(page.getByText('Export as Visio (.vsdx)')).toBeVisible()
    await expect(page.getByText('Microsoft Visio compatible format')).toBeVisible()
  })
})
