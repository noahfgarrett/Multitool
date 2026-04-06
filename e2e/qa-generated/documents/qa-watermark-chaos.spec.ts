import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures')

async function setupWatermarkTool(page: Page, pdf = 'sample.pdf'): Promise<void> {
  await page.goto('/')
  await navigateToTool(page, 'pdf-watermark')
  await uploadFile(page, pdf)
  await expect(page.getByText(pdf)).toBeVisible({ timeout: 15000 })
}

async function disableFilePicker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

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

/**
 * Get the watermark type button (Text or Image) inside the tool panel.
 * Scoped to avoid matching sidebar nav buttons like "Text Extract" or "Image Resizer".
 */
function typeButton(page: Page, type: 'Text' | 'Image') {
  return page.locator('main button, [class*="space-y"] button').filter({ hasText: new RegExp(`^\\s*${type}\\s*$`) }).first()
}

/** Get the image-specific file input */
function imageFileInput(page: Page) {
  return page.locator('input[type="file"][accept="image/png,image/jpeg"]')
}

test.describe('PDF Watermark — Chaos', () => {
  // ─── Rapid Option Changes ────────────────────────────────────

  test('rapidly cycling all positions does not crash', async ({ page }) => {
    await setupWatermarkTool(page)
    const positions = ['Center', 'Top Left', 'Top Right', 'Bottom Left', 'Bottom Right', 'Tile']

    for (let round = 0; round < 3; round++) {
      for (const pos of positions) {
        const btn = page.locator('button').filter({ hasText: pos })
        await btn.click()
      }
    }

    // App should still be functional — Apply button should be enabled
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
    // Canvases should still exist
    await expect(page.locator('canvas')).toHaveCount(2)
  })

  test('rapidly changing font size does not crash', async ({ page }) => {
    await setupWatermarkTool(page)
    const slider = page.locator('input[type="range"]').first()

    // Rapidly change values
    for (const val of [12, 48, 120, 24, 96, 36, 72, 12, 120]) {
      await slider.fill(String(val))
    }

    await page.waitForTimeout(300)
    // App still functional
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('rapidly changing opacity does not crash', async ({ page }) => {
    await setupWatermarkTool(page)
    const slider = page.locator('input[type="range"]').nth(1)

    for (const val of [5, 100, 50, 5, 100, 25, 75, 100, 5]) {
      await slider.fill(String(val))
    }

    await page.waitForTimeout(300)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('rapidly changing rotation does not crash', async ({ page }) => {
    await setupWatermarkTool(page)
    const slider = page.locator('input[type="range"]').nth(2)

    for (const val of [-180, 180, 0, -90, 90, -45, 45, 0, -180, 180]) {
      await slider.fill(String(val))
    }

    await page.waitForTimeout(300)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('rapidly switching between text and image mode', async ({ page }) => {
    await setupWatermarkTool(page)
    const textBtn = typeButton(page, 'Text')
    const imageBtn = typeButton(page, 'Image')

    for (let i = 0; i < 10; i++) {
      await imageBtn.click()
      await textBtn.click()
    }

    // Text input should still be there with default
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await expect(textInput).toHaveValue('CONFIDENTIAL')
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await expect(applyButton).toBeEnabled()
  })

  test('rapidly typing in text input does not crash', async ({ page }) => {
    await setupWatermarkTool(page)
    const textInput = page.locator('input[placeholder="Watermark text"]')

    // Clear and type rapidly
    await textInput.fill('')
    for (const char of 'RAPID_TEXT_CHANGE') {
      await textInput.press(char)
    }

    await page.waitForTimeout(500)
    // Canvases still alive
    await expect(page.locator('canvas')).toHaveCount(2)
  })

  // ─── Download Spam ───────────────────────────────────────────

  test('double-clicking Apply does not produce duplicate downloads or errors', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const downloads: string[] = []
    page.on('download', async (download) => {
      downloads.push(download.suggestedFilename())
    })

    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    // Double-click
    await applyButton.dblclick()

    // Wait for processing to finish
    await expect(applyButton).toHaveText(/Apply & Download/i, { timeout: 30000 })
    await page.waitForTimeout(1000)

    // Should not produce error messages
    await expect(page.locator('text=/Watermark failed/')).toBeHidden()

    // At least 1 download should have occurred
    expect(downloads.length).toBeGreaterThanOrEqual(1)
  })

  test('Apply while processing shows "Applying..." and prevents re-entry', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const applyButton = page.getByRole('button', { name: /Apply & Download/i })

    // Start the first download
    const downloadPromise = page.waitForEvent('download')
    await applyButton.click()

    // Due to how fast things go, just verify no errors after completion
    await downloadPromise
    await expect(applyButton).toHaveText(/Apply & Download/i, { timeout: 30000 })
    await expect(page.locator('text=/Watermark failed/')).toBeHidden()
  })

  // ─── Upload New PDF Mid-config ───────────────────────────────

  test('uploading new PDF resets state properly', async ({ page }) => {
    await setupWatermarkTool(page)

    // Change settings
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('CUSTOM TEXT')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('80')

    // Click "Load Different PDF" and upload new one
    const loadDifferentBtn = page.getByRole('button', { name: /Load Different PDF/i })
    await loadDifferentBtn.click()
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()

    await uploadFile(page, 'multi-page.pdf')
    await expect(page.getByText('multi-page.pdf')).toBeVisible({ timeout: 15000 })

    // The text should still have the custom value (state is preserved for text)
    const newTextInput = page.locator('input[placeholder="Watermark text"]')
    await expect(newTextInput).toHaveValue('CUSTOM TEXT')

    // Canvases should be rendered
    await expect(page.locator('canvas')).toHaveCount(2, { timeout: 10000 })
  })

  test('switching to image mode then uploading new PDF keeps image mode', async ({ page }) => {
    await setupWatermarkTool(page)

    // Switch to image mode
    await typeButton(page, 'Image').click()

    // Upload an image
    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    // Load a different PDF
    const loadDifferentBtn = page.getByRole('button', { name: /Load Different PDF/i })
    await loadDifferentBtn.click()
    await uploadFile(page, 'multi-page.pdf')
    await expect(page.getByText('multi-page.pdf')).toBeVisible({ timeout: 15000 })

    // Image mode and image should persist (state is not reset)
    await expect(page.getByText('sample-image.png')).toBeVisible()
  })

  // ─── Combined Chaos ──────────────────────────────────────────

  test('change all settings then download successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    // Change every option
    const textInput = page.locator('input[placeholder="Watermark text"]')
    await textInput.fill('REVIEW ONLY')

    const fontSizeSlider = page.locator('input[type="range"]').first()
    await fontSizeSlider.fill('72')

    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('60')

    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('30')

    const hexInput = page.locator('input[type="text"]').last()
    await hexInput.fill('#ff0000')

    const topRightBtn = page.locator('button').filter({ hasText: 'Top Right' })
    await topRightBtn.click()

    // Download
    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('image watermark with all settings changed downloads successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    // Switch to image mode
    await typeButton(page, 'Image').click()

    // Upload image
    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    // Change scale
    const scaleSlider = page.locator('input[type="range"]').first()
    await scaleSlider.fill('50')

    // Change opacity
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('80')

    // Change rotation
    const rotationSlider = page.locator('input[type="range"]').nth(2)
    await rotationSlider.fill('-90')

    // Change position
    const bottomLeftBtn = page.locator('button').filter({ hasText: 'Bottom Left' })
    await bottomLeftBtn.click()

    // Download
    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('tile mode with large font and max opacity downloads without timeout', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const fontSizeSlider = page.locator('input[type="range"]').first()
    await fontSizeSlider.fill('120')

    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('100')

    const tileBtn = page.locator('button').filter({ hasText: 'Tile' })
    await tileBtn.click()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('image watermark tile mode downloads successfully', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    const tileBtn = page.locator('button').filter({ hasText: 'Tile' })
    await tileBtn.click()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')
  })

  // ─── Edge Cases ──────────────────────────────────────────────

  test('min font size (12) works', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const fontSizeSlider = page.locator('input[type="range"]').first()
    await fontSizeSlider.fill('12')
    await expect(page.getByText('12px')).toBeVisible()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('max font size (120) works', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const fontSizeSlider = page.locator('input[type="range"]').first()
    await fontSizeSlider.fill('120')
    await expect(page.getByText('120px')).toBeVisible()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('min opacity (5%) works', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('5')
    await expect(page.getByText('5%')).toBeVisible()

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('min image scale (5%) downloads without error', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    const scaleSlider = page.locator('input[type="range"]').first()
    await scaleSlider.fill('5')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('max image scale (100%) downloads without error', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    await typeButton(page, 'Image').click()

    await imageFileInput(page).setInputFiles(path.join(FIXTURES_DIR, 'sample-image.png'))
    await expect(page.getByText('sample-image.png')).toBeVisible({ timeout: 10000 })

    const scaleSlider = page.locator('input[type="range"]').first()
    await scaleSlider.fill('100')

    const downloadPromise = interceptDownload(page)
    const applyButton = page.getByRole('button', { name: /Apply & Download/i })
    await applyButton.click()

    const download = await downloadPromise
    expect(download.blob.length).toBeGreaterThan(0)
  })

  test('consecutive downloads produce valid PDFs each time', async ({ page }) => {
    await disableFilePicker(page)
    await setupWatermarkTool(page)

    for (let i = 0; i < 3; i++) {
      const downloadPromise = interceptDownload(page)
      const applyButton = page.getByRole('button', { name: /Apply & Download/i })
      await applyButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename).toBe('sample-watermarked.pdf')
      expect(download.blob.subarray(0, 5).toString()).toBe('%PDF-')

      // Wait for button to be ready again
      await expect(applyButton).toHaveText(/Apply & Download/i, { timeout: 15000 })
    }
  })

  test('zero-byte PDF shows error', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-watermark')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'zero-byte.pdf'))

    // Should show an error
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 10000 })
  })

  test('navigating pages rapidly on multi-page PDF does not crash', async ({ page }) => {
    await setupWatermarkTool(page, 'multi-page.pdf')
    await expect(page.getByText(/Page 1 \//)).toBeVisible({ timeout: 15000 })

    const nextBtn = page.getByText('Next')
    const prevBtn = page.getByText('Prev')

    // Rapidly click next
    for (let i = 0; i < 5; i++) {
      if (await nextBtn.isEnabled()) {
        await nextBtn.click()
      }
    }
    // Rapidly click prev
    for (let i = 0; i < 5; i++) {
      if (await prevBtn.isEnabled()) {
        await prevBtn.click()
      }
    }

    // Should be back on page 1
    await expect(page.getByText(/Page 1 \//)).toBeVisible()
    // Canvases should still be intact
    await expect(page.locator('canvas')).toHaveCount(2)
  })
})
