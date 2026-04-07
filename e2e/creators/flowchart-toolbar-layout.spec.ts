import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'

async function importNodes(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Import from Text/i }).click()
  const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
  await textarea.fill('START\nProcess Step 1\nIF Decision?\nYES: Path A\nNO: Path B\nEND')
  await page.getByRole('button', { name: /^Import$/i }).click()
  await page.waitForTimeout(500)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'flowchart')
  // Wait for the toolbar to render — use a button unique to the toolbar
  await expect(page.locator('button[title="Toggle Grid"]')).toBeVisible({ timeout: 10000 })
})

test.describe('Flowchart Toolbar & Layout', () => {
  // ── 1. Auto Layout ────────────────────────────────────────

  test('Auto Layout button exists in toolbar', async ({ page }) => {
    const layoutButton = page.locator('button[title="Auto Layout"]')
    await expect(layoutButton).toBeVisible()
  })

  test('Auto Layout dropdown shows TB/LR/BT/RL directions', async ({ page }) => {
    await importNodes(page)

    const layoutButton = page.locator('button[title="Auto Layout"]')
    await layoutButton.click()

    await expect(page.getByText('Top to Bottom')).toBeVisible()
    await expect(page.getByText('Left to Right')).toBeVisible()
    await expect(page.getByText('Bottom to Top')).toBeVisible()
    await expect(page.getByText('Right to Left')).toBeVisible()
  })

  test('clicking a layout direction applies layout and closes dropdown', async ({ page }) => {
    await importNodes(page)

    const layoutButton = page.locator('button[title="Auto Layout"]')
    await layoutButton.click()

    await page.getByText('Left to Right').click()

    // Dropdown should close
    await expect(page.getByText('Top to Bottom')).not.toBeVisible()
  })

  // ── 2. Align & Distribute ─────────────────────────────────

  test('Align button is not visible with no selection', async ({ page }) => {
    await importNodes(page)

    const alignButton = page.locator('button[title="Align & Distribute"]')
    await expect(alignButton).not.toBeVisible()
  })

  // ── 3. Theme Dropdown ─────────────────────────────────────

  test('Theme dropdown is visible in toolbar', async ({ page }) => {
    const themeButton = page.locator('button[title="Theme"]')
    await expect(themeButton).toBeVisible()
  })

  test('Theme dropdown lists all 5 themes', async ({ page }) => {
    const themeButton = page.locator('button[title="Theme"]')
    await themeButton.click()

    // Theme names in the dropdown — use the dropdown items specifically
    const dropdown = page.locator('.absolute.top-full')
    await expect(dropdown.getByText('Classic')).toBeVisible()
    await expect(dropdown.getByText('Professional')).toBeVisible()
    await expect(dropdown.getByText('High Contrast')).toBeVisible()
    await expect(dropdown.getByText('Blueprint')).toBeVisible()
    await expect(dropdown.getByText('Print-Ready')).toBeVisible()
  })

  test('selecting a theme applies it and closes dropdown', async ({ page }) => {
    const themeButton = page.locator('button[title="Theme"]')
    await themeButton.click()

    // Click Blueprint in the dropdown
    const dropdown = page.locator('.absolute.top-full')
    await dropdown.getByText('Blueprint').click()

    // Theme name should show in the toolbar button
    await expect(themeButton).toContainText('Blueprint')
  })

  // ── 4. Dark/Light Mode Toggle ─────────────────────────────

  test('dark/light mode toggle button exists', async ({ page }) => {
    // Default theme is Classic (dark), so title should be "Switch to Light Mode"
    const toggleButton = page.locator('button[title="Switch to Light Mode"]')
    await expect(toggleButton).toBeVisible()
  })

  test('clicking dark/light toggle switches theme', async ({ page }) => {
    const themeButton = page.locator('button[title="Theme"]')
    await expect(themeButton).toContainText('Classic')

    // Click to switch to light mode
    const toggleLight = page.locator('button[title="Switch to Light Mode"]')
    await toggleLight.click()

    // Theme should now be Professional
    await expect(themeButton).toContainText('Professional')

    // Toggle button title should now be "Switch to Dark Mode"
    const toggleDark = page.locator('button[title="Switch to Dark Mode"]')
    await expect(toggleDark).toBeVisible()
  })

  // ── 5. Sketch Mode Toggle ─────────────────────────────────

  test('Sketch Mode button exists and is toggleable', async ({ page }) => {
    const sketchButton = page.locator('button[title="Sketch Mode"]')
    await expect(sketchButton).toBeVisible()

    // Click to activate
    await sketchButton.click()

    // Should have active styling (orange background class)
    await expect(sketchButton).toHaveClass(/14B8A6/)

    // Click again to deactivate
    await sketchButton.click()

    // Should no longer have active styling
    await expect(sketchButton).not.toHaveClass(/14B8A6\/20/)
  })

  // ── 6. Print Button ───────────────────────────────────────

  test('Print button exists in toolbar', async ({ page }) => {
    const printButton = page.locator('button[title="Print"]')
    await expect(printButton).toBeVisible()
  })

  // ── 7. Grid/Snap Toggles ──────────────────────────────────

  test('Toggle Grid button exists and toggles active state', async ({ page }) => {
    const gridButton = page.locator('button[title="Toggle Grid"]')
    await expect(gridButton).toBeVisible()

    // Record initial class
    const classBefore = await gridButton.getAttribute('class')

    // Click to toggle
    await gridButton.click()

    // Class should change (active state toggled)
    const classAfter = await gridButton.getAttribute('class')
    expect(classBefore).not.toEqual(classAfter)
  })

  test('Toggle Snap button exists and toggles active state', async ({ page }) => {
    const snapButton = page.locator('button[title="Toggle Snap"]')
    await expect(snapButton).toBeVisible()

    const classBefore = await snapButton.getAttribute('class')

    await snapButton.click()

    const classAfter = await snapButton.getAttribute('class')
    expect(classBefore).not.toEqual(classAfter)
  })

  // ── 8. Export Modal includes PDF ───────────────────────────

  test('export modal shows Export as PDF after importing nodes', async ({ page }) => {
    await importNodes(page)

    const exportButton = page.locator('button[title="Export"]')
    await exportButton.click()

    await expect(page.getByText('Export Diagram')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Export as PDF')).toBeVisible()
    await expect(page.getByText('Export as PNG').first()).toBeVisible()
    await expect(page.getByText('Export as SVG')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()
    await expect(page.getByText('Copy as PNG')).toBeVisible()
  })

  // ── 9. Find & Replace ─────────────────────────────────────

  test('Ctrl+F opens find overlay', async ({ page }) => {
    await importNodes(page)

    // Press Ctrl+F to open find
    await page.keyboard.press('Control+f')

    // Find input should appear
    const searchInput = page.locator('input[placeholder="Find in diagram..."]')
    await expect(searchInput).toBeVisible({ timeout: 3000 })
  })

  test('Find overlay allows typing to search and shows match count', async ({ page }) => {
    await importNodes(page)

    await page.keyboard.press('Control+f')

    const searchInput = page.locator('input[placeholder="Find in diagram..."]')
    await expect(searchInput).toBeVisible({ timeout: 3000 })

    await searchInput.fill('Process')

    // Should show a non-zero match count (e.g. "1/1" not "0/0")
    await expect(page.locator('text=/[1-9]\\d*\\/[1-9]\\d*/')).toBeVisible({ timeout: 3000 })
  })

  test('Find overlay closes on Escape', async ({ page }) => {
    await importNodes(page)

    await page.keyboard.press('Control+f')

    const searchInput = page.locator('input[placeholder="Find in diagram..."]')
    await expect(searchInput).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('Escape')

    await expect(searchInput).not.toBeVisible()
  })

  // ── 10. Minimap ────────────────────────────────────────────

  test('minimap is visible after importing nodes', async ({ page }) => {
    await importNodes(page)

    // Minimap renders a canvas inside a positioned div (200x150)
    const minimap = page.locator('canvas[style*="width: 200px"]')
    await expect(minimap).toBeVisible({ timeout: 3000 })
  })

  test('minimap is not visible when no nodes exist', async ({ page }) => {
    // On initial load with no nodes, minimap should not be rendered
    const minimap = page.locator('canvas[style*="width: 200px"]')
    await expect(minimap).not.toBeVisible()
  })
})
