// e2e/images/bg-remove.spec.ts
import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Background Remover tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside nav')).toBeVisible({ timeout: 10000 })
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Background Remover' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('Background Remover')
  })

  test('empty state shows upload area', async ({ page }) => {
    await expect(page.locator('text=Drop an image here')).toBeVisible()
    await expect(page.locator('text=PNG, JPEG, WebP, GIF, or BMP')).toBeVisible()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif,image/bmp')
  })

  test('upload shows workspace canvas and tool palette', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByTestId('bg-workspace-canvas')).toBeVisible({ timeout: 5000 })
    for (const id of ['wand', 'picker', 'erase', 'restore']) {
      await expect(page.getByTestId(`tool-${id}`)).toBeVisible()
    }
    await expect(page.locator('text=Tolerance')).toBeVisible()
    await expect(page.locator('text=Edge softness')).toBeVisible()
    await expect(page.locator('text=Defringe')).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeVisible()
    await expect(page.getByText('Original', { exact: true }).first()).toBeVisible()
    await expect(page.locator('text=Load different image')).toBeVisible()
  })

  test('color picker adds a background-color sample', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByTestId('bg-workspace-canvas')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tool-picker').click()
    await page.getByTestId('bg-workspace-canvas').click()
    await expect(page.getByTestId('sample-swatch').first()).toBeVisible({ timeout: 3000 })
    const undo = page.locator('button').filter({ hasText: 'Undo' })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect(page.getByTestId('sample-swatch')).toHaveCount(0)
  })

  test('magic wand click enables undo (records a seed)', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    const canvas = page.getByTestId('bg-workspace-canvas')
    await expect(canvas).toBeVisible({ timeout: 5000 })
    await canvas.click()
    await expect(page.locator('button').filter({ hasText: 'Undo' })).toBeEnabled({ timeout: 3000 })
  })

  test('download produces a PNG file', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    const canvas = page.getByTestId('bg-workspace-canvas')
    await expect(canvas).toBeVisible({ timeout: 5000 })
    await canvas.click()
    const downloadPromise = page.waitForEvent('download')
    await page.locator('button').filter({ hasText: 'Download PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/-nobg\.png$/)
  })
})
