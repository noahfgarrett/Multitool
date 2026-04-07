import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Background Remover tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to Background Remover tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Background Remover' }).click()
    await waitForToolLoad(page)

    // Verify we are on the Background Remover tool
    await expect(page.locator('header h1')).toHaveText('Background Remover')
  })

  test('empty state shows upload area', async ({ page }) => {
    // The FileDropZone should display its label
    await expect(page.locator('text=Drop an image here')).toBeVisible()

    // The description should show accepted formats
    await expect(page.locator('text=PNG, JPEG, WebP, GIF, or BMP')).toBeVisible()

    // There should be a hidden file input with the correct accept types
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif,image/bmp')
  })

  test('upload image shows canvas preview and color picker controls', async ({ page }) => {
    // Upload the sample image fixture
    await uploadFile(page, 'sample-image.png')

    // Wait for the image to load - the controls panel should appear
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // A source canvas should be visible for the image preview
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()

    // The canvas should have crosshair cursor (isPickingColor starts as true after upload)
    await expect(canvas).toHaveClass(/cursor-crosshair/)

    // The "Click to select the background color" tooltip should be visible
    await expect(page.locator('text=Click to select the background color')).toBeVisible()

    // Target Color section should be visible
    await expect(page.locator('text=Target Color')).toBeVisible()

    // Before picking a color, it should show the instruction text
    await expect(page.locator('text=Click on the image to pick a color')).toBeVisible()

    // Pick Color button should be in "Picking..." state
    await expect(page.locator('button').filter({ hasText: 'Picking...' })).toBeVisible()

    // Tolerance slider should be visible
    await expect(page.locator('text=Tolerance')).toBeVisible()

    // Remove Background button should be disabled (no color selected yet)
    const removeBtn = page.locator('button').filter({ hasText: 'Remove Background' })
    await expect(removeBtn).toBeVisible()
    await expect(removeBtn).toBeDisabled()

    // Download PNG button should be disabled (no output yet)
    const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })
    await expect(downloadBtn).toBeDisabled()

    // "Load different image" link should be visible
    await expect(page.locator('text=Load different image')).toBeVisible()
  })

  test('clicking canvas selects a color for removal', async ({ page }) => {
    // Upload image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // Click on the canvas to pick a color
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 5, y: 5 } })

    // After picking, the color details should appear (R, G, B values)
    await expect(page.locator('text=R:')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=G:')).toBeVisible()
    await expect(page.locator('text=B:')).toBeVisible()

    // The color swatch div should be visible
    const colorSwatch = page.locator('.w-10.h-10.rounded-lg')
    await expect(colorSwatch).toBeVisible()

    // The Pick Color button should now show "Pick Color" (not "Picking...")
    await expect(page.locator('button').filter({ hasText: 'Pick Color' })).toBeVisible()

    // Remove Background button should now be enabled
    const removeBtn = page.locator('button').filter({ hasText: 'Remove Background' })
    await expect(removeBtn).toBeEnabled()
  })
})
