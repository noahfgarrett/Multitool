import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'


/**
 * Navigate to the Image Resizer tool and wait for it to be ready.
 */
async function goToImageResizer(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'LotusWorks Toolkit' })).toBeVisible({ timeout: 10000 })
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

test.describe('Image Resizer — Chaos Tests', () => {
  test.beforeEach(async ({ page }) => {
    await goToImageResizer(page)
  })

  test('rapid dimension changes while not processing', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput, heightInput } = getDimensionInputs(page)

    // Rapidly change dimensions 10 times
    for (let i = 1; i <= 10; i++) {
      await widthInput.fill(String(10 * i))
    }
    await widthInput.press('Tab')

    // Final value should be 100
    await expect(widthInput).toHaveValue('100')
    // Height should match (aspect ratio locked, 1:1)
    await expect(heightInput).toHaveValue('100')

    // Should still be able to resize without errors
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('rapid format toggle does not crash', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const pngBtn = page.locator('button').filter({ hasText: 'PNG' }).first()
    const jpegBtn = page.locator('button').filter({ hasText: 'JPEG' })
    const webpBtn = page.locator('button').filter({ hasText: 'WebP' })

    // Toggle format rapidly 15 times
    for (let i = 0; i < 5; i++) {
      await jpegBtn.click()
      await webpBtn.click()
      await pngBtn.click()
    }

    // Should end on PNG (no quality slider)
    await expect(page.locator('text=Quality')).not.toBeVisible()

    // Resize should still work
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('spam resize button multiple times', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const resizeBtn = getResizeButton(page)

    // Click resize rapidly 5 times
    for (let i = 0; i < 5; i++) {
      await resizeBtn.click()
    }

    // Should eventually produce output without crashing
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 15000 })

    // Canvas should be visible
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('spam download button after resize', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Resize first
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })

    // Spam download button 5 times
    const downloadBtn = page.locator('button').filter({ hasText: 'Download' }).first()
    for (let i = 0; i < 5; i++) {
      await downloadBtn.click()
    }

    // Page should still be responsive — controls are still visible
    await expect(page.locator('text=Original')).toBeVisible()
    await expect(page.locator('text=Output')).toBeVisible()
  })

  test('toggle aspect ratio lock rapidly', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Toggle lock/unlock 10 times
    for (let i = 0; i < 10; i++) {
      const unlockBtn = page.locator('button[aria-label="Unlock aspect ratio"]')
      const lockBtn = page.locator('button[aria-label="Lock aspect ratio"]')

      if (await unlockBtn.isVisible()) {
        await unlockBtn.click()
      } else {
        await lockBtn.click()
      }
    }

    // Should still be on a valid state — either lock or unlock button visible
    const unlockBtn = page.locator('button[aria-label="Unlock aspect ratio"]')
    const lockBtn = page.locator('button[aria-label="Lock aspect ratio"]')
    const isUnlockVisible = await unlockBtn.isVisible()
    const isLockVisible = await lockBtn.isVisible()
    expect(isUnlockVisible || isLockVisible).toBe(true)
  })

  test('change dimensions then immediately resize', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)

    // Fill width and immediately click resize without tabbing
    await widthInput.fill('50')
    await getResizeButton(page).click()

    // Should produce output
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('load different image resets and allows re-upload', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Click "Load different image"
    await page.locator('text=Load different image').click()
    await expect(page.locator('text=Drop an image here')).toBeVisible()

    // Re-upload the same image
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // Should work normally
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('resize then load different image then resize again', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // First resize
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })

    // Load different image (same fixture — just test the flow)
    await page.locator('text=Load different image').click()
    await expect(page.locator('text=Drop an image here')).toBeVisible()

    // Re-upload
    await uploadFile(page, 'sample-image.png')
    await expect(page.locator('text=Original')).toBeVisible({ timeout: 5000 })

    // Resize again
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('preset buttons fire rapidly without breaking state', async ({ page }) => {
    await uploadAndWaitForControls(page)

    const { widthInput } = getDimensionInputs(page)

    // Click all presets rapidly
    await page.locator('button').filter({ hasText: '50%' }).click()
    await page.locator('button').filter({ hasText: '25%' }).click()
    await page.locator('button').filter({ hasText: '1080p' }).click()
    await page.locator('button').filter({ hasText: '720p' }).click()
    await page.locator('button').filter({ hasText: '480p' }).click()

    // Last preset was 480p (width=854)
    await expect(widthInput).toHaveValue('854')

    // Resize should still work
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('resize at minimum dimensions (1x1)', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Unlock aspect ratio for independent control
    await page.locator('button[aria-label="Unlock aspect ratio"]').click()

    const { widthInput, heightInput } = getDimensionInputs(page)
    await widthInput.fill('1')
    await heightInput.fill('1')

    // Should not crash
    await getResizeButton(page).click()
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })
  })

  test('change format while processing does not corrupt output', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Start resize (PNG)
    await getResizeButton(page).click()

    // Quickly switch to JPEG while processing
    await page.locator('button').filter({ hasText: 'JPEG' }).click()

    // Wait for output
    await expect(page.locator('text=Output')).toBeVisible({ timeout: 10000 })

    // Page should still be functional
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('reset during processing returns to clean state', async ({ page }) => {
    await uploadAndWaitForControls(page)

    // Change dimensions
    const { widthInput } = getDimensionInputs(page)
    await widthInput.fill('50')
    await widthInput.press('Tab')

    // Start resize
    await getResizeButton(page).click()

    // Immediately hit reset
    await page.locator('button').filter({ hasText: 'Reset' }).click()

    // Should restore original dimensions
    await expect(widthInput).toHaveValue('100')

    // Page should be in a good state — no errors
    await expect(page.locator('text=Original')).toBeVisible()
  })
})
