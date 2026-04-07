import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'


/**
 * Navigate to the Image Resizer tool and wait for it to be ready.
 */
async function goToImageResizer(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
  const sidebar = page.locator('aside nav')
  await sidebar.locator('button').filter({ hasText: 'Image Resizer' }).click()
  await waitForToolLoad(page)
  await expect(page.locator('header h1')).toHaveText('Image Resizer')
}

/**
 * Upload the sample image and wait for controls to appear.
 */
async function uploadAndWaitForControls(page: import('@playwright/test').Page) {
  await uploadFile(page, 'sample-image.png')
  await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })
}

/**
 * Get the width and height inputs.
 */
function getDimensionInputs(page: import('@playwright/test').Page) {
  const widthInput = page.locator('input[type="number"]').first()
  const heightInput = page.locator('input[type="number"]').last()
  return { widthInput, heightInput }
}

/**
 * Get the Resize action button (exact match to avoid matching "Image Resizer" sidebar).
 */
function getResizeButton(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: 'Resize', exact: true })
}

/**
 * Click resize and wait for output info.
 */
async function resizeAndWaitForOutput(page: import('@playwright/test').Page) {
  await getResizeButton(page).click()
  await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
}

test.describe('Image Resizer — Functional QA', () => {
  test.beforeEach(async ({ page }) => {
    await goToImageResizer(page)
  })

  // ─── Upload & Preview ──────────────────────────────────────────

  test('upload single image — preview displays', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Image preview should be visible
    const previewImg = page.locator('img[alt="Preview"]')
    await expect(previewImg).toBeVisible()

    // The image should have a src (data URL)
    const src = await previewImg.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src!.startsWith('data:image/')).toBe(true)
  })

  test('original dimensions display correctly for 100x100 image', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Should show "100 x 100px"
    await expect(page.locator('text=100 x 100px')).toBeVisible()

    const { widthInput, heightInput } = getDimensionInputs(page)
    await expect(widthInput).toHaveValue('100')
    await expect(heightInput).toHaveValue('100')
  })

  // ─── Resize by Width (aspect ratio maintained) ─────────────────

  test('resize by width — aspect ratio maintained', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Change width to 50 — height should also become 50 (100x100 is 1:1)
    await widthInput.fill('50')
    await widthInput.press('Tab')

    await expect(heightInput).toHaveValue('50')
  })

  // ─── Resize by Height ──────────────────────────────────────────

  test('resize by height — aspect ratio maintained', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Change height to 50 — width should also become 50
    await heightInput.fill('50')
    await heightInput.press('Tab')

    await expect(widthInput).toHaveValue('50')
  })

  // ─── Resize by Both (custom dimensions) ────────────────────────

  test('resize by both dimensions — unlock aspect ratio', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Unlock aspect ratio
    const unlockBtn = page.locator('button[aria-label="Unlock aspect ratio"]')
    await unlockBtn.click()

    // Now "Lock aspect ratio" button should appear
    await expect(page.locator('button[aria-label="Lock aspect ratio"]')).toBeVisible()

    // Set custom dimensions
    await widthInput.fill('200')
    await heightInput.fill('50')

    // Verify they stayed independent
    await expect(widthInput).toHaveValue('200')
    await expect(heightInput).toHaveValue('50')
  })

  // ─── Output Format: PNG ────────────────────────────────────────

  test('output format — PNG selected by default', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // PNG button should be highlighted (active)
    const pngBtn = page.locator('button').filter({ hasText: 'PNG' }).first()
    // Active state has bg-[#14B8A6] class
    await expect(pngBtn).toHaveCSS('background-color', 'rgb(244, 123, 32)')
  })

  test('output format — switch to JPEG', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const jpegBtn = page.locator('button').filter({ hasText: 'JPEG' })
    await jpegBtn.click()

    // JPEG should now be active
    await expect(jpegBtn).toHaveCSS('background-color', 'rgb(244, 123, 32)')

    // Quality slider should appear (not visible for PNG)
    await expect(page.locator('text=Quality')).toBeVisible()
  })

  test('output format — switch to WebP', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const webpBtn = page.locator('button').filter({ hasText: 'WebP' })
    await webpBtn.click()

    // WebP should now be active
    await expect(webpBtn).toHaveCSS('background-color', 'rgb(244, 123, 32)')

    // Quality slider should appear
    await expect(page.locator('text=Quality')).toBeVisible()
  })

  // ─── Quality/Compression Slider ────────────────────────────────

  test('quality slider visible for JPEG, hidden for PNG', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Default is PNG — no quality slider
    await expect(page.locator('text=Quality')).not.toBeVisible()

    // Switch to JPEG
    await page.locator('button').filter({ hasText: 'JPEG' }).click()
    await expect(page.locator('text=Quality')).toBeVisible()

    // Switch back to PNG
    await page.locator('button').filter({ hasText: 'PNG' }).first().click()
    await expect(page.locator('text=Quality')).not.toBeVisible()
  })

  test('quality slider default value is 90', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Switch to JPEG to show quality slider
    await page.locator('button').filter({ hasText: 'JPEG' }).click()

    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()

    // Default quality is 90 (aligned with step=5)
    await expect(slider).toHaveValue('90')

    // The displayed value should show 90%
    await expect(page.locator('text=90%')).toBeVisible()
  })

  // ─── Resize & Download ─────────────────────────────────────────

  test('resize button produces output blob', async ({ page }) => {
    await uploadAndWaitForControls(page)
    await resizeAndWaitForOutput(page)

    // Canvas preview should be visible
    await expect(page.locator('canvas')).toBeVisible()

    // Download button should be enabled
    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await expect(downloadBtn).toBeEnabled()
  })

  test('download button triggers file download', async ({ page }) => {
    await uploadAndWaitForControls(page)
    await resizeAndWaitForOutput(page)

    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await downloadBtn.click()
    const download = await downloadPromise

    // Filename should include dimensions and extension
    const filename = download.suggestedFilename()
    expect(filename).toContain('100x100')
    expect(filename).toContain('.png')
  })

  test('download with JPEG format has .jpg extension', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Switch to JPEG
    await page.locator('button').filter({ hasText: 'JPEG' }).click()

    await resizeAndWaitForOutput(page)

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Download' }).first().click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.jpg')
  })

  test('download with WebP format has .webp extension', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Switch to WebP
    await page.locator('button').filter({ hasText: 'WebP' }).click()

    await resizeAndWaitForOutput(page)

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Download' }).first().click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.webp')
  })

  test('download after resizing to custom size has correct filename', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('50')
    await widthInput.press('Tab')

    await resizeAndWaitForOutput(page)

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Download' }).first().click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('50x50')
  })

  // ─── Reset / Clear ─────────────────────────────────────────────

  test('reset button restores original dimensions', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Change dimensions
    await widthInput.fill('50')
    await widthInput.press('Tab')
    await expect(heightInput).toHaveValue('50')

    // Resize first
    await resizeAndWaitForOutput(page)

    // Click Reset
    await page.locator('button').filter({ hasText: 'Reset' }).click()

    // Dimensions should be restored to 100 x 100
    await expect(widthInput).toHaveValue('100')
    await expect(heightInput).toHaveValue('100')

    // Output blob should be cleared (download disabled)
    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await expect(downloadBtn).toBeDisabled()
  })

  test('load different image button resets to upload state', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Click "Load different image"
    await page.locator('text=Load different image').click()

    // Should return to the upload/drop zone state
    await expect(page.locator('text=Drop an image here')).toBeVisible()
  })

  // ─── Aspect Ratio Lock/Unlock Toggle ───────────────────────────

  test('aspect ratio toggle — lock to unlock and back', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Initially locked — "Unlock aspect ratio" button visible
    const unlockBtn = page.locator('button[aria-label="Unlock aspect ratio"]')
    await expect(unlockBtn).toBeVisible()

    // Click to unlock
    await unlockBtn.click()
    const lockBtn = page.locator('button[aria-label="Lock aspect ratio"]')
    await expect(lockBtn).toBeVisible()

    // Click to lock again
    await lockBtn.click()
    await expect(page.locator('button[aria-label="Unlock aspect ratio"]')).toBeVisible()
  })

  test('unlocked aspect ratio allows independent width/height changes', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Unlock aspect ratio
    await page.locator('button[aria-label="Unlock aspect ratio"]').click()

    // Change width only
    await widthInput.fill('200')
    await widthInput.press('Tab')

    // Height should NOT have changed
    await expect(heightInput).toHaveValue('100')

    // Change height only
    await heightInput.fill('300')
    await heightInput.press('Tab')

    // Width should NOT have changed
    await expect(widthInput).toHaveValue('200')
  })

  // ─── Preset Size Buttons ───────────────────────────────────────

  test('preset buttons — 50% halves width', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    await page.locator('button').filter({ hasText: '50%' }).click()

    await expect(widthInput).toHaveValue('50')
    await expect(heightInput).toHaveValue('50') // 1:1 ratio
  })

  test('preset buttons — 25% quarters width', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    await page.locator('button').filter({ hasText: '25%' }).click()

    await expect(widthInput).toHaveValue('25')
    await expect(heightInput).toHaveValue('25') // 1:1 ratio
  })

  test('preset buttons — 1080p sets width to 1920', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    await page.locator('button').filter({ hasText: '1080p' }).click()

    await expect(widthInput).toHaveValue('1920')
    // Height should adjust based on aspect ratio: 1920 / (100/100) = 1920
    await expect(heightInput).toHaveValue('1920')
  })

  test('preset buttons — 720p sets width to 1280', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)

    await page.locator('button').filter({ hasText: '720p' }).click()

    await expect(widthInput).toHaveValue('1280')
  })

  test('preset buttons — 480p sets width to 854', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)

    await page.locator('button').filter({ hasText: '480p' }).click()

    await expect(widthInput).toHaveValue('854')
  })

  // ─── Output Info Section ───────────────────────────────────────

  test('output info shows file size', async ({ page }) => {
    await uploadAndWaitForControls(page)
    await resizeAndWaitForOutput(page)

    // Output section should have a size value (e.g., "1.2 KB")
    const outputSection = page.locator('text=Output').locator('..')
    // Check it contains a file size pattern (number + unit)
    await expect(outputSection).toContainText(/\d+(\.\d+)?\s*(B|KB|MB)/)
  })

  test('output info shows dimensions after resize', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('50')
    await widthInput.press('Tab')

    await resizeAndWaitForOutput(page)

    // Output section should show "50 x 50px"
    await expect(page.locator('text=50 x 50px')).toBeVisible()
  })

  // ─── Resize with Different Formats Produces Valid Output ───────

  test('resize to PNG produces valid output', async ({ page }) => {
    await uploadAndWaitForControls(page)
    await resizeAndWaitForOutput(page)

    // Canvas should be present
    await expect(page.locator('canvas')).toBeVisible()

    // Download and verify filename
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Download' }).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })

  test('resize to JPEG produces valid output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    await page.locator('button').filter({ hasText: 'JPEG' }).click()
    await resizeAndWaitForOutput(page)

    await expect(page.locator('canvas')).toBeVisible()
  })

  test('resize to WebP produces valid output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    await page.locator('button').filter({ hasText: 'WebP' }).click()
    await resizeAndWaitForOutput(page)

    await expect(page.locator('canvas')).toBeVisible()
  })

  // ─── Edge Cases ────────────────────────────────────────────────

  test('width of 0 does not produce output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('0')
    await widthInput.press('Tab')

    // Resize button should not produce output for invalid dims
    await getResizeButton(page).click()

    // Should NOT show output (width <= 0 guard)
    await page.waitForTimeout(1000)
    await expect(page.locator('text=Output')).not.toBeVisible()
  })

  test('negative width does not produce output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('-50')
    await widthInput.press('Tab')

    await getResizeButton(page).click()

    await page.waitForTimeout(1000)
    await expect(page.locator('text=Output')).not.toBeVisible()
  })

  test('extremely large dimensions — resize still works', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)
    // Unlock aspect ratio to avoid computing huge height
    await page.locator('button[aria-label="Unlock aspect ratio"]').click()

    await widthInput.fill('4000')
    await widthInput.press('Tab')

    // Should not crash the resize
    await resizeAndWaitForOutput(page)
    await expect(page.locator('canvas')).toBeVisible()
  })

  // ─── Download Button State ─────────────────────────────────────

  test('download button disabled before resize', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await expect(downloadBtn).toBeDisabled()
  })

  test('download button enabled after resize', async ({ page }) => {
    await uploadAndWaitForControls(page)
    await resizeAndWaitForOutput(page)

    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    await expect(downloadBtn).toBeEnabled()
  })

  // ─── Re-resize after changing dimensions ───────────────────────

  test('re-resize with new dimensions updates output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // First resize at original 100x100
    await resizeAndWaitForOutput(page)
    await expect(page.locator('text=100 x 100px').nth(1)).toBeVisible()

    // Change width to 50
    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('50')
    await widthInput.press('Tab')

    // Resize again
    await getResizeButton(page).click()
    await expect(page.locator('text=50 x 50px')).toBeVisible({ timeout: 10000 })
  })

  // ─── Format Change After Resize ────────────────────────────────

  test('changing format after resize — re-resize produces correct format', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Resize as PNG
    await resizeAndWaitForOutput(page)

    // Switch to JPEG
    await page.locator('button').filter({ hasText: 'JPEG' }).click()

    // Resize again
    await getResizeButton(page).click()
    // Wait for re-processing
    await page.waitForTimeout(500)

    // Download should produce .jpg
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Download' }).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.jpg')
  })
})
