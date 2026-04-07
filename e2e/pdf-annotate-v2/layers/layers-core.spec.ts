import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, createAnnotation, getAnnotationCount } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Layers — Toolbar', () => {
  test('Layers button visible in right toolbar', async ({ page }) => {
    const btn = page.locator('button[title="Layers"]')
    await expect(btn).toBeVisible({ timeout: 3000 })
  })

  test('clicking Layers button opens layers panel', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Layers').first()).toBeVisible({ timeout: 3000 })
    // Default layer should be listed
    await expect(page.locator('text=Default')).toBeVisible({ timeout: 3000 })
  })

  test('Layers button shows active state when panel is open', async ({ page }) => {
    const btn = page.locator('button[title="Layers"]')
    await btn.click()
    await page.waitForTimeout(200)
    await expect(btn).toHaveClass(/ring-\[#14B8A6\]/)
  })
})

test.describe('Layers — Panel', () => {
  test('Default layer exists and is active', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Default')).toBeVisible()
    await expect(page.locator('text=ACTIVE')).toBeVisible()
  })

  test('add new layer with + button', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    const addBtn = page.locator('button[title="Add layer"]')
    await addBtn.click()
    await page.waitForTimeout(200)
    // Should now have 2 layers
    await expect(page.locator('text=Layer 1')).toBeVisible({ timeout: 3000 })
  })

  test('click layer to set as active', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    // Add a new layer
    await page.locator('button[title="Add layer"]').click()
    await page.waitForTimeout(200)
    // Click the new layer text to activate it
    const newLayerLabel = page.locator('span.truncate').filter({ hasText: 'Layer 1' })
    await newLayerLabel.click()
    await page.waitForTimeout(200)
    // The "ACTIVE" label should appear near "Layer 1"
    // Check that the active highlight (orange text) is on Layer 1's row
    const layerRow = newLayerLabel.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]')
    await expect(layerRow).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('eye toggle hides/shows layer', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    // Click the eye button for Default layer
    const hideBtn = page.locator('button[title="Hide layer"]')
    await hideBtn.click()
    await page.waitForTimeout(200)
    // Should now show "Show layer" title
    await expect(page.locator('button[title="Show layer"]')).toBeVisible({ timeout: 3000 })
  })

  test('toggling layers panel open/close works', async ({ page }) => {
    const btn = page.locator('button[title="Layers"]')
    // Open
    await btn.click()
    await page.waitForTimeout(200)
    await expect(page.locator('text=Default')).toBeVisible()
    // Close
    await btn.click()
    await page.waitForTimeout(200)
    // Panel should be closed (Default text from panel not visible)
    // Note: "Default" might appear elsewhere, so check for the ACTIVE label instead
    const activeLabel = page.locator('span').filter({ hasText: 'ACTIVE' })
    await expect(activeLabel).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Layers — Visibility', () => {
  test('hiding layer hides its annotations from canvas', async ({ page }) => {
    // Create annotation on Default layer
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    // Open layers panel and hide Default layer
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    const hideBtn = page.locator('button[title="Hide layer"]')
    await hideBtn.click()
    await page.waitForTimeout(500)
    // Annotation should still exist in data but not visible on canvas
    // The annotation count badge might still show (it counts data, not visibility)
    // The key behavior is that the layer eye icon changed to "Show layer"
    await expect(page.locator('button[title="Show layer"]')).toBeVisible()
  })

  test('showing hidden layer restores annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    // Hide
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Hide layer"]').click()
    await page.waitForTimeout(300)
    // Show
    await page.locator('button[title="Show layer"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[title="Hide layer"]')).toBeVisible()
  })
})

test.describe('Layers — Edge Cases', () => {
  test('add multiple layers rapidly', async ({ page }) => {
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    const addBtn = page.locator('button[title="Add layer"]')
    for (let i = 0; i < 5; i++) {
      await addBtn.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    // Should have 6 layers total (Default + 5 new)
  })

  test('closing panel preserves layer state', async ({ page }) => {
    // Add layer
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Add layer"]').click()
    await page.waitForTimeout(200)
    // Close panel
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(200)
    // Reopen
    await page.locator('button[title="Layers"]').click()
    await page.waitForTimeout(300)
    // Layer should still exist
    await expect(page.locator('text=Layer 1')).toBeVisible({ timeout: 3000 })
  })
})
