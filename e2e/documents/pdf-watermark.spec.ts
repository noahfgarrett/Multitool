import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-watermark')
})

test.describe('PDF Watermark Tool', () => {
  test('empty state shows upload area with correct label', async ({ page }) => {
    // The FileDropZone should be visible with the correct label and description
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Add text or image watermarks to your PDF')).toBeVisible()

    // The hidden file input should exist
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('uploading a PDF shows watermark controls panel', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')

    // Wait for the file to load — file info should appear
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Page count and size info should be displayed
    await expect(page.locator('text=/\\d+ pages?/')).toBeVisible()

    // The watermark type selector should be visible with "Text" and "Image" buttons
    await expect(page.getByText('Type')).toBeVisible()
    const textTypeButton = page.locator('button').filter({ hasText: 'Text' }).first()
    const imageTypeButton = page.locator('button').filter({ hasText: 'Image' }).first()
    await expect(textTypeButton).toBeVisible()
    await expect(imageTypeButton).toBeVisible()
  })

  test('text watermark input is pre-filled with CONFIDENTIAL', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The text input should be visible with default value "CONFIDENTIAL"
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await expect(textInput).toBeVisible()
    await expect(textInput).toHaveValue('CONFIDENTIAL')
  })

  test('changing watermark text updates the input value', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Clear and type new text
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('DRAFT')
    await expect(textInput).toHaveValue('DRAFT')
  })

  test('opacity, rotation, and font size sliders are visible', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // These are Slider components with labels
    await expect(page.getByText('Font Size')).toBeVisible()
    await expect(page.getByText('Opacity')).toBeVisible()
    await expect(page.getByText('Rotation')).toBeVisible()
  })

  test('position buttons are visible with all 6 options', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The "Position" label should be visible
    await expect(page.getByText('Position').first()).toBeVisible()

    // All 6 position buttons should exist
    const positions = ['Center', 'Top Left', 'Top Right', 'Bottom Left', 'Bottom Right', 'Tile']
    for (const pos of positions) {
      await expect(page.locator('button').filter({ hasText: pos })).toBeVisible()
    }
  })

  test('selecting a position button highlights it', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // "Center" should be selected by default (has the active bg class)
    const centerButton = page.locator('button').filter({ hasText: 'Center' })
    await expect(centerButton).toHaveClass(/bg-\[#14B8A6\]/)

    // Click "Top Left" to change
    const topLeftButton = page.locator('button').filter({ hasText: 'Top Left' })
    await topLeftButton.click()

    // "Top Left" should now be highlighted
    await expect(topLeftButton).toHaveClass(/bg-\[#14B8A6\]/)
    // "Center" should no longer be highlighted
    await expect(centerButton).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('preview canvas is rendered', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The preview canvas should be present
    const canvases = page.locator('canvas')
    // There should be at least 2 canvases (PDF render canvas + watermark overlay canvas)
    await expect(canvases).toHaveCount(2, { timeout: 10000 })
  })

  test('Apply & Download button exists and is enabled with text watermark', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The "Apply & Download" button should be visible and enabled
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeVisible()
    await expect(applyButton).toBeEnabled()
  })

  test('image watermark mode shows upload button when no image is selected', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Switch to image watermark type
    const imageTypeButton = page.locator('button').filter({ hasText: 'Image' }).first()
    await imageTypeButton.click()

    // Should show "Upload PNG or JPG" button
    await expect(page.getByText('Upload PNG or JPG')).toBeVisible()

    // Apply & Download should be disabled (no image selected)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeDisabled()
  })

  test('color picker is visible in text mode', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // The "Color" label should be visible
    await expect(page.getByText('Color')).toBeVisible()

    // The color input (hex text field) should show the default color
    const colorInput = page.locator('input[type="text"]').filter({ hasText: '' }).last()
    // A color type input should exist (hidden behind the swatch)
    const colorPicker = page.locator('input[type="color"]')
    await expect(colorPicker).toBeAttached()
  })

  test('Load Different PDF button returns to upload state', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible({ timeout: 15000 })

    // Click the "Load Different PDF" button
    const loadDifferentButton = page.getByRole('button', { name: /Load Different PDF/i })
    await expect(loadDifferentButton).toBeVisible()
    await loadDifferentButton.click()

    // Should return to the upload state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })
})
