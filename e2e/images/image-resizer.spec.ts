import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Image Resizer tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to Image Resizer tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Image Resizer' }).click()
    await waitForToolLoad(page)

    // Verify we are on the Image Resizer tool
    await expect(page.locator('header h1')).toHaveText('Image Resizer')
  })

  test('empty state shows upload area', async ({ page }) => {
    // The FileDropZone should display its label
    await expect(page.locator('text=Drop an image here')).toBeVisible()

    // The description should show accepted formats
    await expect(page.locator('text=PNG, JPEG, WebP, GIF, or BMP')).toBeVisible()

    // There should be a hidden file input
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif,image/bmp')
  })

  test('upload image shows preview with width/height controls', async ({ page }) => {
    // Upload the sample image fixture
    await uploadFile(page, 'sample-image.png')

    // Wait for the image to load - the controls panel should appear
    // "Original" info section should be visible
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // Width and Height input fields should be visible
    const widthLabel = page.locator('label').filter({ hasText: 'Width' })
    await expect(widthLabel).toBeVisible()
    const heightLabel = page.locator('label').filter({ hasText: 'Height' })
    await expect(heightLabel).toBeVisible()

    // Width and height number inputs should have values > 0
    const widthInput = page.locator('input[type="number"]').first()
    const heightInput = page.locator('input[type="number"]').last()
    const widthVal = await widthInput.inputValue()
    const heightVal = await heightInput.inputValue()
    expect(Number(widthVal)).toBeGreaterThan(0)
    expect(Number(heightVal)).toBeGreaterThan(0)

    // The aspect ratio lock button should be visible
    const lockButton = page.locator('button[aria-label="Unlock aspect ratio"]')
    await expect(lockButton).toBeVisible()

    // Preset size buttons should be visible
    await expect(page.locator('button').filter({ hasText: '50%' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '25%' })).toBeVisible()

    // Format selection buttons should be visible
    await expect(page.locator('button').filter({ hasText: 'PNG' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'JPEG' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'WebP' })).toBeVisible()

    // Resize button should be visible
    await expect(page.locator('button').filter({ hasText: 'Resize' }).first()).toBeVisible()

    // Image preview should be rendered
    const previewImg = page.locator('img[alt="Preview"]')
    await expect(previewImg).toBeVisible()

    // "Load different image" button should be visible
    await expect(page.locator('text=Load different image')).toBeVisible()
  })

  test('aspect ratio lock keeps proportions when changing width', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    const widthInput = page.locator('input[type="number"]').first()
    const heightInput = page.locator('input[type="number"]').last()

    // Record original dimensions
    const originalWidth = Number(await widthInput.inputValue())
    const originalHeight = Number(await heightInput.inputValue())
    const ratio = originalWidth / originalHeight

    // Change width to 100
    await widthInput.fill('100')
    await widthInput.press('Tab')

    // Height should auto-adjust to maintain aspect ratio
    const newHeight = Number(await heightInput.inputValue())
    expect(newHeight).toBe(Math.round(100 / ratio))
  })

  test('resize button processes the image', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // Click the Resize button
    const resizeBtn = page.locator('button').filter({ hasText: 'Resize' }).first()
    await resizeBtn.click()

    // Wait for processing to complete - the output info section should appear
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })

    // Download button should now be enabled
    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await expect(downloadBtn).toBeEnabled()

    // A canvas element should be visible for the preview
    await expect(page.locator('canvas')).toBeVisible()
  })
})
