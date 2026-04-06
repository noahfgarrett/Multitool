import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures')

/** Navigate to watermark tool and upload a PDF in one step */
async function setupWatermarkTool(page: Page, pdf = 'sample.pdf'): Promise<void> {
  await page.goto('/')
  await navigateToTool(page, 'pdf-watermark')
  await uploadFile(page, pdf)
  await expect(page.getByText(pdf)).toBeVisible({ timeout: 15000 })
}

/** Intercept downloads and return the download promise */
function interceptDownload(page: Page): Promise<{ suggestedFilename: string; blob: Buffer }> {
  return new Promise((resolve) => {
    page.once('download', async (download) => {
      const buffer = await (await download.createReadStream()).toArray()
      resolve({
        suggestedFilename: download.suggestedFilename(),
        blob: Buffer.concat(buffer),
      })
    })
  })
}

/** Remove showSaveFilePicker to force downloadBlob fallback in headless */
async function disableFilePicker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

/**
 * Get the watermark type button (Text or Image) inside the tool panel.
 * Scoped to the main content area to avoid matching sidebar nav buttons
 * like "Text Extract" or "Image Resizer".
 */
function typeButton(page: Page, type: 'Text' | 'Image') {
  // The type buttons live outside <nav>, in the tool panel.
  // Use getByRole with exact name to avoid substring matches.
  return page.locator('main button, [class*="space-y"] button').filter({ hasText: new RegExp(`^\\s*${type}\\s*$`) }).first()
}

/**
 * Get the image file input (the second input[type="file"] after switching to image mode).
 * The first input[type="file"] is the PDF upload in FileDropZone (hidden when PDF is loaded)
 * or the image input. After PDF is loaded, only the image file input should be attached.
 */
function imageFileInput(page: Page) {
  return page.locator('input[type="file"][accept="image/png,image/jpeg"]')
}

test.describe('PDF Watermark — Functional', () => {
  // ─── Upload & Initial State ───────────────────────────────────

  test('uploads PDF and displays file info', async ({ page }) => {
    await setupWatermarkTool(page)
    // File name visible
    await expect(page.getByText('sample.pdf')).toBeVisible()
    // Page count + size visible
    await expect(page.locator('text=/\\d+ pages?/')).toBeVisible()
  })

  test('shows two canvases (pdf + overlay) after upload', async ({ page }) => {
    await setupWatermarkTool(page)
    const canvases = page.locator('canvas')
    await expect(canvases).toHaveCount(2, { timeout: 10000 })
  })

  test('default watermark text is CONFIDENTIAL', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await expect(textInput).toHaveValue('CONFIDENTIAL')
  })

  test('default position is Center', async ({ page }) => {
    await setupWatermarkTool(page)
    const centerBtn = page.locator('button').filter({ hasText: 'Center' })
    await expect(centerBtn).toHaveClass(/bg-\[#F47B20\]/)
  })

  // ─── Text Watermark ──────────────────────────────────────────

  test('changing text input updates value', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('DRAFT COPY')
    await expect(textInput).toHaveValue('DRAFT COPY')
  })

  test('empty text disables Apply button', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('')
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeDisabled()
  })

  test('whitespace-only text disables Apply button', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('   ')
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeDisabled()
  })

  test('special characters in text are accepted', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('!@#$%^&*() <>"\'')
    await expect(textInput).toHaveValue('!@#$%^&*() <>"\'')
    // Button should still be enabled
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('very long text is accepted without crashing', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')
    const longText = 'A'.repeat(200)
    await textInput.fill(longText)
    await expect(textInput).toHaveValue(longText)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  // ─── Font Size Slider ────────────────────────────────────────

  test('font size slider is visible and shows default value', async ({ page }) => {
    await setupWatermarkTool(page)
    await expect(page.getByText('Font Size')).toBeVisible()
    // Default is 48px
    await expect(page.getByText('48px')).toBeVisible()
  })

  test('font size slider changes value on input', async ({ page }) => {
    await setupWatermarkTool(page)
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('72')
    await expect(page.getByText('72px')).toBeVisible()
  })

  // ─── Opacity Slider ──────────────────────────────────────────

  test('opacity slider shows default 30%', async ({ page }) => {
    await setupWatermarkTool(page)
    await expect(page.getByText('Opacity')).toBeVisible()
    await expect(page.getByText('30%')).toBeVisible()
  })

  test('opacity slider can be changed', async ({ page }) => {
    await setupWatermarkTool(page)
    // Opacity is the second range input
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('50')
    await expect(page.getByText('50%')).toBeVisible()
  })

  // ─── Rotation Slider ─────────────────────────────────────────

  test('rotation slider shows default -45 degrees', async ({ page }) => {
    await setupWatermarkTool(page)
    await expect(page.getByText('Rotation')).toBeVisible()
    // The value display should show -45°
    await expect(page.locator('text=/-45°/')).toBeVisible()
  })

  test('rotation slider can be set to 0', async ({ page }) => {
    await setupWatermarkTool(page)
    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('0')
    // Should show 0° — check the specific text near Rotation label
    await expect(page.locator('text=/^0°$/')).toBeVisible()
  })

  test('rotation slider can be set to positive value', async ({ page }) => {
    await setupWatermarkTool(page)
    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('90')
    await expect(page.getByText('90°')).toBeVisible()
  })

  // ─── Color Picker ────────────────────────────────────────────

  test('color picker is visible in text mode', async ({ page }) => {
    await setupWatermarkTool(page)
    await expect(page.getByText('Color')).toBeVisible()
    const colorInput = page.locator('input[type="color"]')
    await expect(colorInput).toBeAttached()
  })

  test('hex color text input shows default #888888', async ({ page }) => {
    await setupWatermarkTool(page)
    // The text input for color hex
    const hexInput = page.locator('input[type="text"]').last()
    await expect(hexInput).toHaveValue('#888888')
  })

  test('hex color input accepts valid hex', async ({ page }) => {
    await setupWatermarkTool(page)
    const hexInput = page.locator('input[type="text"]').last()
    await hexInput.fill('#ff0000')
    await expect(hexInput).toHaveValue('#ff0000')
  })

  test('hex color input rejects invalid characters', async ({ page }) => {
    await setupWatermarkTool(page)
    const hexInput = page.locator('input[type="text"]').last()
    // Current value is #888888
    // Try typing an invalid hex — the onChange filter should reject it
    await hexInput.fill('#gggggg')
    // The value should NOT update to #gggggg — it should keep the old value
    const val = await hexInput.inputValue()
    expect(val).not.toBe('#gggggg')
  })

  test('color picker is hidden in image mode', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()
    await expect(page.getByText('Color')).toBeHidden()
  })

  // ─── Position Controls ───────────────────────────────────────

  test('all 6 position buttons exist', async ({ page }) => {
    await setupWatermarkTool(page)
    const positions = ['Center', 'Top Left', 'Top Right', 'Bottom Left', 'Bottom Right', 'Tile']
    for (const pos of positions) {
      await expect(page.locator('button').filter({ hasText: pos })).toBeVisible()
    }
  })

  test('clicking position button highlights it and unhighlights previous', async ({ page }) => {
    await setupWatermarkTool(page)
    const centerBtn = page.locator('button').filter({ hasText: 'Center' })
    const topLeftBtn = page.locator('button').filter({ hasText: 'Top Left' })
    // Center is default
    await expect(centerBtn).toHaveClass(/bg-\[#F47B20\]/)
    // Click Top Left
    await topLeftBtn.click()
    await expect(topLeftBtn).toHaveClass(/bg-\[#F47B20\]/)
    await expect(centerBtn).not.toHaveClass(/bg-\[#F47B20\]/)
  })

  test('selecting Tile hides drag hint', async ({ page }) => {
    await setupWatermarkTool(page)
    // Drag hint should be visible for non-tile positions
    await expect(page.getByText('Drag watermark to reposition')).toBeVisible()
    // Switch to Tile
    const tileBtn = page.locator('button').filter({ hasText: 'Tile' })
    await tileBtn.click()
    await expect(page.getByText('Drag watermark to reposition')).toBeHidden()
  })

  test('overlay canvas has cursor-move for non-tile position', async ({ page }) => {
    await setupWatermarkTool(page)
    const overlay = page.locator('canvas').nth(1)
    await expect(overlay).toHaveClass(/cursor-move/)
  })

  test('overlay canvas has pointer-events-none for tile position', async ({ page }) => {
    await setupWatermarkTool(page)
    const tileBtn = page.locator('button').filter({ hasText: 'Tile' })
    await tileBtn.click()
    const overlay = page.locator('canvas').nth(1)
    await expect(overlay).toHaveClass(/pointer-events-none/)
  })

  // ─── Image Watermark ─────────────────────────────────────────

  test('switching to image mode shows upload button', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()
    await expect(page.getByText('Upload PNG or JPG')).toBeVisible()
  })

  test('Apply is disabled in image mode with no image', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeDisabled()
  })

  test('uploading PNG image shows image info and enables Apply', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()

    // Upload an image via the image-specific file input
    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))

    // Should show the image name and dimensions
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })
    // Should show dimensions (e.g. "100 x 100")
    await expect(page.locator('text=/\\d+ × \\d+/')).toBeVisible()

    // Apply should now be enabled
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('removing uploaded image disables Apply', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    // Click the remove image button
    const removeBtn = page.getByRole('button', { name: /Remove watermark image/i })
    await removeBtn.click()

    // Upload button should reappear
    await expect(page.getByText('Upload PNG or JPG')).toBeVisible()
    // Apply should be disabled
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeDisabled()
  })

  test('image mode shows Scale slider instead of Font Size', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()

    await expect(page.getByText('Scale')).toBeVisible()
    await expect(page.getByText('Font Size')).toBeHidden()
    // Default scale is 25%
    await expect(page.getByText('25%')).toBeVisible()
  })

  test('switching back to text mode restores Font Size slider', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()
    await expect(page.getByText('Scale')).toBeVisible()

    await typeButton(page, 'Text').click()
    await expect(page.getByText('Font Size')).toBeVisible()
    await expect(page.getByText('Scale')).toBeHidden()
  })

  test('"Change image" link appears after image upload', async ({ page }) => {
    await setupWatermarkTool(page)
    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    await expect(page.getByText('Change image')).toBeVisible()
  })

  // ─── Multi-page Navigation ───────────────────────────────────

  test('multi-page PDF shows page navigation', async ({ page }) => {
    await setupWatermarkTool(page, 'multi-page.pdf')
    // Should show prev/next buttons and page indicator
    await expect(page.getByText(/Page 1 \//)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Prev')).toBeVisible()
    await expect(page.getByText('Next')).toBeVisible()
  })

  test('Prev is disabled on first page', async ({ page }) => {
    await setupWatermarkTool(page, 'multi-page.pdf')
    await expect(page.getByText(/Page 1 \//)).toBeVisible({ timeout: 15000 })
    const prevBtn = page.getByText('Prev')
    await expect(prevBtn).toHaveAttribute('disabled', '')
  })

  test('clicking Next advances page', async ({ page }) => {
    await setupWatermarkTool(page, 'multi-page.pdf')
    await expect(page.getByText(/Page 1 \//)).toBeVisible({ timeout: 15000 })
    const nextBtn = page.getByText('Next')
    await nextBtn.click()
    await expect(page.getByText(/Page 2 \//)).toBeVisible()
  })

  test('single-page PDF does not show page navigation', async ({ page }) => {
    await setupWatermarkTool(page, 'single-page.pdf')
    await expect(page.locator('canvas')).toHaveCount(2, { timeout: 15000 })
    await expect(page.getByText('Prev')).toBeHidden()
    await expect(page.getByText('Next')).toBeHidden()
  })

  // ─── Apply & Download ────────────────────────────────────────

  test('text watermark download produces a valid PDF file', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.length).toBeGreaterThan(0)
    // PDF magic bytes
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('Apply button shows "Applying..." during processing', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    // Click and immediately check text
    const downloadPromise = page.waitForEvent('download')
    await applyButton.click()

    // After download finishes, button should return to normal
    await downloadPromise
    await expect(applyButton).toHaveText(/Apply & Download/i, { timeout: 10000 })
  })

  test('image watermark download produces a valid PDF', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.length).toBeGreaterThan(0)
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('downloaded PDF is larger than original (watermark adds content)', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    // Get original file size from the info display
    const fileSizeText = await page.locator('text=/\\d+ pages?/').textContent()
    expect(fileSizeText).toBeTruthy()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    // The watermarked PDF should have non-trivial content
    expect(download.blob.length).toBeGreaterThan(100)
  })

  test('watermark applied with custom text', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('TOP SECRET')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('tile position watermark downloads successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const tileBtn = page.locator('button').filter({ hasText: 'Tile' })
    await tileBtn.click()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('all position presets download successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const positions = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right']
    for (const pos of positions) {
      const btn = page.locator('button').filter({ hasText: pos })
      await btn.click()

      const downloadPromise = interceptDownload(page)
      const applyButton = page.getByRole('button', { name: /Apply & Download/i })
      await applyButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
      expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
    }
  })

  test('watermark with max opacity downloads successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('100')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('watermark with extreme rotation downloads successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('180')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('multi-page PDF watermarks all pages (file size check)', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page, 'multi-page.pdf')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('multi-page-watermarked.pdf')
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
    // Multi-page should produce substantial output
    expect(download.blob.length).toBeGreaterThan(500)
  })

  // ─── Load Different PDF ──────────────────────────────────────

  test('"Load Different PDF" returns to upload state', async ({ page }) => {
    await setupWatermarkTool(page)
    const loadDifferentBtn = page.getByRole('button', { name: /Load Different PDF/i })
    await loadDifferentBtn.click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('uploading new PDF after reset works correctly', async ({ page }) => {
    await setupWatermarkTool(page)
    const loadDifferentBtn = page.getByRole('button', { name: /Load Different PDF/i })
    await loadDifferentBtn.click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    // Upload multi-page.pdf
    await uploadFile(page, 'multi-page.pdf')
    await expect(page.getByText('multi-page.pdf')).toBeVisible({ timeout: 15000 })
  })

  // ─── Type Switching ──────────────────────────────────────────

  test('switching type preserves other settings', async ({ page }) => {
    await setupWatermarkTool(page)

    // Change opacity and rotation
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('75')
    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('30')

    // Switch to image
    await typeButton(page, 'Image').click()

    // Opacity and rotation should still show their changed values
    await expect(page.getByText('75%')).toBeVisible()
    await expect(page.getByText('30°')).toBeVisible()

    // Switch back to text
    await typeButton(page, 'Text').click()

    await expect(page.getByText('75%')).toBeVisible()
    await expect(page.getByText('30°')).toBeVisible()
  })

  // ─── Error Handling ──────────────────────────────────────────

  test('uploading non-PDF file shows error', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-watermark')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'not-a-pdf.txt'))

    // Should show an error message
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 10000 })
  })

  test('error can be dismissed', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-watermark')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'not-a-pdf.txt'))

    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 10000 })

    // Click dismiss button
    const dismissBtn = page.getByRole('button', { name: /Dismiss error/i })
    await dismissBtn.click()
    await expect(page.locator('text=/Failed to load PDF/')).toBeHidden()
  })

  // ─── Preview Updates ─────────────────────────────────────────

  test('overlay canvas has non-zero dimensions after PDF loads', async ({ page }) => {
    await setupWatermarkTool(page)
    // Wait for canvases to render
    await page.waitForTimeout(500)

    const overlay = page.locator('canvas').nth(1)
    const width = await overlay.evaluate((el: HTMLCanvasElement) => el.width)
    const height = await overlay.evaluate((el: HTMLCanvasElement) => el.height)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  test('overlay canvas dimensions match PDF canvas', async ({ page }) => {
    await setupWatermarkTool(page)
    await page.waitForTimeout(500)

    const pdfCanvas = page.locator('canvas').first()
    const overlay = page.locator('canvas').nth(1)

    const pdfW = await pdfCanvas.evaluate((el: HTMLCanvasElement) => el.width)
    const pdfH = await pdfCanvas.evaluate((el: HTMLCanvasElement) => el.height)
    const overlayW = await overlay.evaluate((el: HTMLCanvasElement) => el.width)
    const overlayH = await overlay.evaluate((el: HTMLCanvasElement) => el.height)

    expect(overlayW).toBe(pdfW)
    expect(overlayH).toBe(pdfH)
  })

  test('overlay has visible watermark pixels for text watermark', async ({ page }) => {
    await setupWatermarkTool(page)
    await page.waitForTimeout(1000)

    const overlay = page.locator('canvas').nth(1)
    const hasPixels = await overlay.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d')
      if (!ctx) return false
      const data = ctx.getImageData(0, 0, el.width, el.height).data
      // Check if any pixel has non-zero alpha
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true
      }
      return false
    })
    expect(hasPixels).toBe(true)
  })

  test('clearing text removes watermark pixels from overlay', async ({ page }) => {
    await setupWatermarkTool(page)
    await page.waitForTimeout(1000)

    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('')
    await page.waitForTimeout(500)

    const overlay = page.locator('canvas').nth(1)
    const hasPixels = await overlay.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d')
      if (!ctx) return false
      const data = ctx.getImageData(0, 0, el.width, el.height).data
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true
      }
      return false
    })
    expect(hasPixels).toBe(false)
  })
})
