import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { fixturePath } from '../../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-merge')
  await page.getByRole('button', { name: 'Grid Stitch' }).click()
  await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible({ timeout: 10000 })
})

async function uploadToGridStitch(page: import('@playwright/test').Page, fileName: string): Promise<void> {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Upload' }).click(),
  ])
  await fileChooser.setFiles(fixturePath(fileName))
  await page.waitForTimeout(2000)
}

async function waitForCellThumbnail(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('img[alt]').first()).toBeVisible({ timeout: 15000 })
}

function selectFirstCell(page: import('@playwright/test').Page): Promise<void> {
  return page.locator('img[alt]').first().click({ force: true })
}

test.describe('Save/Load Grid Configuration', () => {
  test('Save button is disabled when grid has no content', async ({ page }) => {
    const saveButton = page.locator('button[title="Save grid configuration to file"]')
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeDisabled()
  })

  test('Load button is always enabled', async ({ page }) => {
    const loadButton = page.locator('button[title="Load grid configuration from file"]')
    await expect(loadButton).toBeVisible()
    await expect(loadButton).toBeEnabled()
  })

  test('Save button becomes enabled after uploading a file', async ({ page }) => {
    const saveButton = page.locator('button[title="Save grid configuration to file"]')
    await expect(saveButton).toBeDisabled()

    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await expect(saveButton).toBeEnabled()
  })

  test('Save and Load buttons have correct labels', async ({ page }) => {
    const saveButton = page.locator('button[title="Save grid configuration to file"]')
    await expect(saveButton).toContainText('Save')

    const loadButton = page.locator('button[title="Load grid configuration from file"]')
    await expect(loadButton).toContainText('Load')
  })

  test('Save button returns to disabled after clearing all content', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    const saveButton = page.locator('button[title="Save grid configuration to file"]')
    await expect(saveButton).toBeEnabled()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Clear All' }).click()
    await expect(saveButton).toBeDisabled()
  })

  test('Load button triggers a file chooser for JSON files', async ({ page }) => {
    const loadButton = page.locator('button[title="Load grid configuration from file"]')

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      loadButton.click(),
    ])

    expect(fileChooser).toBeTruthy()
  })
})

test.describe('Multi-Page PDF Page Selector', () => {
  test('page selector appears when a multi-page PDF cell is selected', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    const pageIndicator = page.locator('text=/1\\/2/')
    await expect(pageIndicator).toBeVisible({ timeout: 5000 })
  })

  test('page selector is not visible when no cell is selected', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    const pageIndicator = page.locator('text=/1\\/2/')
    await expect(pageIndicator).toBeHidden()
  })

  test('page selector is not shown for single-page PDFs', async ({ page }) => {
    await uploadToGridStitch(page, 'single-page.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    const pageIndicator = page.locator('text=/1\\/1/')
    await expect(pageIndicator).toBeHidden()
  })

  test('clicking next page button advances to page 2', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 5000 })

    const nextButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').last()
    await nextButton.click()

    await expect(page.locator('text=/2\\/2/')).toBeVisible({ timeout: 10000 })
  })

  test('previous page button is disabled on page 1', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 5000 })

    const prevButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').first()
    await expect(prevButton).toBeDisabled()
  })

  test('next page button is disabled on the last page', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 5000 })

    const nextButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').last()
    await nextButton.click()
    await expect(page.locator('text=/2\\/2/')).toBeVisible({ timeout: 10000 })

    await expect(nextButton).toBeDisabled()
  })

  test('previous button becomes enabled after navigating to page 2', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 5000 })

    const prevButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').first()
    const nextButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').last()

    await expect(prevButton).toBeDisabled()
    await nextButton.click()
    await expect(page.locator('text=/2\\/2/')).toBeVisible({ timeout: 10000 })
    await expect(prevButton).toBeEnabled()
  })

  test('navigating back from page 2 shows page 1 again', async ({ page }) => {
    await uploadToGridStitch(page, 'sample.pdf')
    await waitForCellThumbnail(page)

    await selectFirstCell(page)

    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 5000 })

    const prevButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').first()
    const nextButton = page.locator('.absolute.bottom-1\\.5.left-1\\.5 button').last()

    await nextButton.click()
    await expect(page.locator('text=/2\\/2/')).toBeVisible({ timeout: 10000 })

    await prevButton.click()
    await expect(page.locator('text=/1\\/2/')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Overlap Blending Toggle', () => {
  test('Blend button is visible in export options row', async ({ page }) => {
    const blendButton = page.locator('button', { hasText: 'Blend' }).filter({
      has: page.locator('svg'),
    })
    await expect(blendButton).toBeVisible()
  })

  test('Blend button starts in inactive (off) state', async ({ page }) => {
    const blendButton = page.locator('button', { hasText: 'Blend' }).filter({
      has: page.locator('svg'),
    })
    await expect(blendButton).toHaveClass(/text-white\/30/)
    await expect(blendButton).not.toHaveClass(/text-\[#F47B20\]/)
  })

  test('clicking Blend toggles it to active with orange styling', async ({ page }) => {
    const blendButton = page.locator('button', { hasText: 'Blend' }).filter({
      has: page.locator('svg'),
    })
    await blendButton.click()

    await expect(blendButton).toHaveClass(/text-\[#F47B20\]/)
    await expect(blendButton).toHaveClass(/bg-\[#F47B20\]\/20/)
  })

  test('clicking Blend twice returns to inactive state', async ({ page }) => {
    const blendButton = page.locator('button', { hasText: 'Blend' }).filter({
      has: page.locator('svg'),
    })
    await blendButton.click()
    await expect(blendButton).toHaveClass(/text-\[#F47B20\]/)

    await blendButton.click()
    await expect(blendButton).toHaveClass(/text-white\/30/)
    await expect(blendButton).not.toHaveClass(/text-\[#F47B20\]/)
  })

  test('Blend button has correct tooltip when inactive', async ({ page }) => {
    const blendButton = page.locator('button[title*="Overlap blending off"]')
    await expect(blendButton).toBeVisible()
    await expect(blendButton).toContainText('Blend')
  })

  test('Blend button tooltip updates when activated', async ({ page }) => {
    const blendButton = page.locator('button', { hasText: 'Blend' }).filter({
      has: page.locator('svg'),
    })
    await blendButton.click()

    const activeBlend = page.locator('button[title*="Overlap blending on"]')
    await expect(activeBlend).toBeVisible()
  })
})
