import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFile, uploadFiles } from '../../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-merge')
})

async function expandFirstFile(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button[title="Expand pages"]').click()
  await expect(page.locator('button[title="Collapse pages"]')).toBeVisible()
  await page.locator('[data-uid]').first().waitFor({ state: 'visible', timeout: 10000 })
}

test.describe('Page Rotation', () => {
  test('rotate right button applies 90 degree rotation with badge and CSS transform', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()

    const rotateCwButton = firstPageItem.locator('button[title="Rotate right 90°"]')
    await rotateCwButton.click()

    await expect(firstPageItem.getByText('90°')).toBeVisible()

    const thumbnail = firstPageItem.locator('img')
    await expect(thumbnail).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)')
  })

  test('rotate left applies 270 degree counter-clockwise rotation', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()

    const rotateCcwButton = firstPageItem.locator('button[title="Rotate left 90°"]')
    await rotateCcwButton.click()

    await expect(firstPageItem.getByText('270°')).toBeVisible()

    const thumbnail = firstPageItem.locator('img')
    await expect(thumbnail).toHaveCSS('transform', 'matrix(0, -1, 1, 0, 0, 0)')
  })

  test('four clockwise rotations return to original orientation with no badge', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()

    const rotateCwButton = firstPageItem.locator('button[title="Rotate right 90°"]')

    await rotateCwButton.click()
    await expect(firstPageItem.getByText('90°')).toBeVisible()

    await firstPageItem.hover()
    await rotateCwButton.click()
    await expect(firstPageItem.getByText('180°')).toBeVisible()

    await firstPageItem.hover()
    await rotateCwButton.click()
    await expect(firstPageItem.getByText('270°')).toBeVisible()

    await firstPageItem.hover()
    await rotateCwButton.click()

    await expect(firstPageItem.getByText('90°')).toBeHidden()
    await expect(firstPageItem.getByText('180°')).toBeHidden()
    await expect(firstPageItem.getByText('270°')).toBeHidden()
  })

  test('rotation badge is absent when page has no rotation', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await expect(firstPageItem.getByText('90°')).toBeHidden()
    await expect(firstPageItem.getByText('180°')).toBeHidden()
    await expect(firstPageItem.getByText('270°')).toBeHidden()
  })
})

test.describe('Estimated Output Size', () => {
  test('shows estimated output size after uploading files', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/Estimated output: ~/)).toBeVisible()
  })

  test('estimated size updates when a page is excluded', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const initialEstimate = await page.getByText(/Estimated output: ~/).textContent()

    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()
    await firstPageItem.locator('button[title="Exclude page"]').click()

    const updatedEstimate = await page.getByText(/Estimated output: ~/).textContent()
    expect(updatedEstimate).not.toBe(initialEstimate)
  })

  test('estimated size shown for single file upload', async ({ page }) => {
    await uploadFile(page, 'single-page.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/Estimated output: ~/)).toBeVisible()
  })
})

test.describe('Smart Output Filename', () => {
  test('single file produces name_combined.pdf', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('sample_combined.pdf')).toBeVisible()
  })

  test('two files produces joined names filename', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('sample_single-page.pdf')).toBeVisible()
  })

  test('filename appears next to estimated output size', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/Estimated output: ~/)).toBeVisible()
    await expect(page.getByText('sample_combined.pdf')).toBeVisible()
  })
})

test.describe('Merge Preview Mode', () => {
  test('preview toggle button is visible after upload', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.locator('button[title="Preview merge order"]')).toBeVisible()
  })

  test('clicking preview shows flat grid with position numbers', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await page.locator('button[title="Preview merge order"]').click()

    await expect(page.getByText('#1', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('#2', { exact: true })).toBeVisible()
  })

  test('preview shows source file name on each page tile', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expandFirstFile(page)

    await page.locator('button[title="Preview merge order"]').click()

    await expect(page.getByText('sample.pdf p1')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('sample.pdf p2')).toBeVisible()
  })

  test('toggling preview off returns to file list', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await page.locator('button[title="Preview merge order"]').click()
    await expect(page.getByText('#1', { exact: true })).toBeVisible({ timeout: 5000 })

    await page.locator('button[title="Back to file list"]').click()

    await expect(page.locator('button[title="Expand pages"]')).toBeVisible()
  })

  test('preview button uses active style when toggled on', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await page.locator('button[title="Preview merge order"]').click()

    const activePreviewButton = page.locator('button[title="Back to file list"]')
    await expect(activePreviewButton).toHaveCSS('color', 'rgb(244, 123, 32)')
  })

  test('preview with multiple files shows all pages in merge order', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await page.locator('button[title="Preview merge order"]').click()

    await expect(page.getByText('#1', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('#2', { exact: true })).toBeVisible()
    await expect(page.getByText('#3', { exact: true })).toBeVisible()
  })

  test('preview omits excluded pages', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()
    await firstPageItem.locator('button[title="Exclude page"]').click()

    await page.locator('button[title="Preview merge order"]').click()

    await expect(page.getByText('#1', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('#2', { exact: true })).toBeHidden()
  })
})

test.describe('Page Count Badge Enhancement', () => {
  test('shows normal page count when no pages are excluded', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('2 pages')).toBeVisible()
  })

  test('shows included/total count in orange text when pages are excluded', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()
    await firstPageItem.locator('button[title="Exclude page"]').click()

    await expect(page.getByText('1/2 pages')).toBeVisible()

    const orangeSpan = page.locator('.text-xs.text-white\\/40 span').filter({ hasText: '1/2 pages' })
    await expect(orangeSpan).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('page count reverts to normal after re-including a page', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })
    await expandFirstFile(page)

    const firstPageItem = page.locator('[data-uid]').first()
    await firstPageItem.hover()
    await firstPageItem.locator('button[title="Exclude page"]').click()
    await expect(page.getByText('1/2 pages')).toBeVisible()

    await firstPageItem.hover()
    await firstPageItem.locator('button[title="Include page"]').click()
    await expect(page.getByText('2/2 pages')).toBeVisible()

    const pageSpan = page.locator('.text-xs.text-white\\/40 span').filter({ hasText: '2/2 pages' })
    await expect(pageSpan).not.toHaveClass(/text-\[#14B8A6\]/)
  })

  test('single-page file shows singular page text', async ({ page }) => {
    await uploadFile(page, 'single-page.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('1 page')).toBeVisible()
  })
})
