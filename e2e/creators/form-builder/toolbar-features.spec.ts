import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'form-creator')
  // Wait for the form builder to fully load
  await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })
})

// ── Helpers ──────────────────────────────────────────────────

/** Add an element from the palette by its display name. */
async function addElement(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.locator('button').filter({ hasText: name }).first().click()
  // Wait for the element to appear on the canvas
  await page.waitForTimeout(300)
}

/** Select all elements on the canvas using Ctrl+A. */
async function selectAll(page: import('@playwright/test').Page): Promise<void> {
  // Click the canvas background first to ensure focus is on the canvas (not an input)
  await page.locator('.w-full.h-full.overflow-hidden.relative').first().click({
    position: { x: 10, y: 10 },
  })
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(200)
}

// ── Alignment Toolbar ──────────────────────────────────────────

test.describe('Alignment Toolbar', () => {
  test('alignment buttons are NOT visible with only one element selected', async ({ page }) => {
    // Add a single element
    await addElement(page, 'Text Field')

    // The element is auto-selected — verify alignment buttons do NOT appear
    await expect(page.locator('button[title="Align Left"]')).not.toBeVisible()
    await expect(page.locator('button[title="Align Center"]')).not.toBeVisible()
    await expect(page.locator('button[title="Align Right"]')).not.toBeVisible()
    await expect(page.locator('button[title="Align Top"]')).not.toBeVisible()
    await expect(page.locator('button[title="Align Middle"]')).not.toBeVisible()
    await expect(page.locator('button[title="Align Bottom"]')).not.toBeVisible()
  })

  test('alignment buttons appear when 2+ elements are selected', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all elements via keyboard
    await selectAll(page)

    // All six alignment buttons should now be visible
    await expect(page.locator('button[title="Align Left"]')).toBeVisible()
    await expect(page.locator('button[title="Align Center"]')).toBeVisible()
    await expect(page.locator('button[title="Align Right"]')).toBeVisible()
    await expect(page.locator('button[title="Align Top"]')).toBeVisible()
    await expect(page.locator('button[title="Align Middle"]')).toBeVisible()
    await expect(page.locator('button[title="Align Bottom"]')).toBeVisible()
  })

  test('distribute buttons appear when 3+ elements are selected', async ({ page }) => {
    // Add three elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')
    await addElement(page, 'Date')

    // Select all
    await selectAll(page)

    // Distribute buttons should appear with 3+ selected
    await expect(page.locator('button[title="Distribute Horizontal"]')).toBeVisible()
    await expect(page.locator('button[title="Distribute Vertical"]')).toBeVisible()
  })

  test('distribute buttons do NOT appear when only 2 elements are selected', async ({ page }) => {
    // Add exactly two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Distribute buttons should NOT appear with only 2 selected
    await expect(page.locator('button[title="Distribute Horizontal"]')).not.toBeVisible()
    await expect(page.locator('button[title="Distribute Vertical"]')).not.toBeVisible()
  })

  test('clicking Align Left does not crash and elements remain on canvas', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Click Align Left
    await page.locator('button[title="Align Left"]').click()

    // Elements should still exist on the canvas
    const elements = page.locator('[data-element-id]')
    await expect(elements).toHaveCount(2)
  })

  test('clicking Align Right does not crash and elements remain on canvas', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Click Align Right
    await page.locator('button[title="Align Right"]').click()

    // Elements should still exist on the canvas
    const elements = page.locator('[data-element-id]')
    await expect(elements).toHaveCount(2)
  })

  test('clicking Align Top does not crash and elements remain on canvas', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Label')

    // Select all
    await selectAll(page)

    // Click Align Top
    await page.locator('button[title="Align Top"]').click()

    // Elements should still exist on the canvas
    const elements = page.locator('[data-element-id]')
    await expect(elements).toHaveCount(2)
  })
})

// ── Tab Order Overlay ──────────────────────────────────────────

test.describe('Tab Order Overlay', () => {
  test('Tab Order button exists in the toolbar', async ({ page }) => {
    const tabOrderButton = page.locator('button').filter({ hasText: 'Tab Order' })
    await expect(tabOrderButton).toBeVisible()
  })

  test('Tab Order button toggles active styling on click', async ({ page }) => {
    const tabOrderButton = page.locator('button').filter({ hasText: 'Tab Order' })

    // Initially the button should NOT have the active orange background class
    await expect(tabOrderButton).not.toHaveClass(/bg-\[#F47B20\]/)

    // Click to activate
    await tabOrderButton.click()

    // After clicking, the button should have the active orange background
    await expect(tabOrderButton).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('Tab Order button deactivates on second click', async ({ page }) => {
    const tabOrderButton = page.locator('button').filter({ hasText: 'Tab Order' })

    // Activate
    await tabOrderButton.click()
    await expect(tabOrderButton).toHaveClass(/bg-\[#F47B20\]/)

    // Deactivate
    await tabOrderButton.click()
    await expect(tabOrderButton).not.toHaveClass(/bg-\[#F47B20\]/)
  })

  test('Tab Order overlay shows numbered badges on interactive elements', async ({ page }) => {
    // Add an interactive element (not heading/label/divider/image)
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Activate Tab Order
    const tabOrderButton = page.locator('button').filter({ hasText: 'Tab Order' })
    await tabOrderButton.click()

    // Orange tab-order badges should appear (circles with #F47B20 background)
    // The badges are absolutely positioned divs with orange background
    const badges = page.locator('div[style*="background-color: rgb(244, 123, 32)"]')
    await expect(badges.first()).toBeVisible({ timeout: 3000 })

    // Should have exactly 2 badges (one per interactive element)
    await expect(badges).toHaveCount(2)
  })
})

// ── Print Button ──────────────────────────────────────────────

test.describe('Print Button', () => {
  test('Print button exists in the toolbar', async ({ page }) => {
    const printButton = page.locator('button[title="Print"]')
    await expect(printButton).toBeVisible()
  })

  test('Print button is not disabled', async ({ page }) => {
    const printButton = page.locator('button[title="Print"]')
    await expect(printButton).toBeEnabled()
  })
})

// ── Grouping ──────────────────────────────────────────────────

test.describe('Grouping', () => {
  test('Group button appears when 2+ elements are selected', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // With only 1 selected, Group button should NOT be visible
    await expect(page.locator('button[title="Group (Ctrl+G)"]')).not.toBeVisible()

    // Select all
    await selectAll(page)

    // Group button should now appear
    await expect(page.locator('button[title="Group (Ctrl+G)"]')).toBeVisible()
  })

  test('Ungroup button is NOT visible before grouping', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Group button should be visible but Ungroup should NOT (nothing is grouped yet)
    await expect(page.locator('button[title="Group (Ctrl+G)"]')).toBeVisible()
    await expect(page.locator('button[title="Ungroup (Ctrl+Shift+G)"]')).not.toBeVisible()
  })

  test('clicking Group shows Ungroup button', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Click Group
    await page.locator('button[title="Group (Ctrl+G)"]').click()
    await page.waitForTimeout(200)

    // After grouping, the elements are still selected — Ungroup should appear
    await expect(page.locator('button[title="Ungroup (Ctrl+Shift+G)"]')).toBeVisible()
  })

  test('Ctrl+G keyboard shortcut groups selected elements', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all
    await selectAll(page)

    // Ensure group button is visible (confirms multi-select worked)
    await expect(page.locator('button[title="Group (Ctrl+G)"]')).toBeVisible()

    // Use keyboard shortcut to group
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(200)

    // Ungroup should now appear
    await expect(page.locator('button[title="Ungroup (Ctrl+Shift+G)"]')).toBeVisible()
  })

  test('Ungroup removes grouping and hides Ungroup button', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all and group
    await selectAll(page)
    await page.locator('button[title="Group (Ctrl+G)"]').click()
    await page.waitForTimeout(200)

    // Ungroup should be visible
    await expect(page.locator('button[title="Ungroup (Ctrl+Shift+G)"]')).toBeVisible()

    // Click Ungroup
    await page.locator('button[title="Ungroup (Ctrl+Shift+G)"]').click()
    await page.waitForTimeout(200)

    // After ungrouping, the Ungroup button should disappear
    // (elements are still selected but no longer grouped)
    await expect(page.locator('button[title="Ungroup (Ctrl+Shift+G)"]')).not.toBeVisible()

    // Group button should still be visible since elements are still selected
    await expect(page.locator('button[title="Group (Ctrl+G)"]')).toBeVisible()
  })

  test('elements remain on canvas after grouping and ungrouping', async ({ page }) => {
    // Add two elements
    await addElement(page, 'Text Field')
    await addElement(page, 'Checkbox')

    // Select all and group
    await selectAll(page)
    await page.locator('button[title="Group (Ctrl+G)"]').click()
    await page.waitForTimeout(200)

    // Elements should still exist
    const elements = page.locator('[data-element-id]')
    await expect(elements).toHaveCount(2)

    // Ungroup
    await page.locator('button[title="Ungroup (Ctrl+Shift+G)"]').click()
    await page.waitForTimeout(200)

    // Elements should still exist after ungrouping
    await expect(elements).toHaveCount(2)
  })
})
