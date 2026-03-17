import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadFiles, uploadFile } from '../../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-merge')
})

test.describe('dnd-kit File Reordering', () => {
  test('each file row has a drag handle with dnd-kit attributes', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    const dragHandles = page.locator('[aria-roledescription="sortable"]')
    await expect(dragHandles).toHaveCount(2)

    const firstHandle = dragHandles.first()
    await expect(firstHandle).toHaveAttribute('role', 'button')
    await expect(firstHandle).toHaveAttribute('tabindex', '0')
  })

  test('drag handle has cursor-grab styling', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const gripHandle = page.locator('.cursor-grab').first()
    await expect(gripHandle).toBeVisible()
  })

  test('file order displays sequential numbers in badges', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    const orderBadges = page.locator('div.w-6.h-6.rounded-md')
    await expect(orderBadges).toHaveCount(2)
    await expect(orderBadges.first()).toHaveText('1')
    await expect(orderBadges.last()).toHaveText('2')
  })

  test('file names appear in upload order before any reorder', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    const fileNames = page.locator('.text-sm.text-white.truncate')
    await expect(fileNames.first()).toHaveText('sample.pdf')
    await expect(fileNames.last()).toHaveText('single-page.pdf')
  })

  test('drag handle is keyboard-focusable', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const handle = page.locator('[aria-roledescription="sortable"]').first()
    await handle.focus()
    await expect(handle).toBeFocused()
  })
})

test.describe('Keyboard Shortcuts', () => {
  test('Escape clears page selection', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const expandButton = page.locator('button[title="Expand pages"]')
    await expandButton.click()
    await expect(page.locator('button[title="Collapse pages"]')).toBeVisible()

    const pageThumb = page.locator('[data-uid]').first()
    await expect(pageThumb).toBeVisible({ timeout: 10000 })
    await pageThumb.click()

    await expect(pageThumb).toHaveClass(/ring-2/)

    await page.keyboard.press('Escape')

    await expect(pageThumb).not.toHaveClass(/ring-2/)
  })

  test('Escape does not interfere when no selection exists', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await page.keyboard.press('Escape')

    await expect(page.getByText('sample.pdf', { exact: true })).toBeVisible()
    await expect(page.getByText('single-page.pdf', { exact: true })).toBeVisible()
  })

  test('keyboard does not trigger shortcuts when typing in input', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    const resSlider = page.locator('input[type="range"]')
    await resSlider.focus()
    await page.keyboard.press('Delete')

    await expect(page.getByText(/2 files/)).toBeVisible()
  })
})

test.describe('Password Modal Structure', () => {
  test('password modal is not visible for non-encrypted PDFs', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Password Protected')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Skip' })).not.toBeVisible()
    await expect(page.locator('input[placeholder="Enter PDF password"]')).not.toBeVisible()
  })

  test('footer hint mentions keyboard shortcuts', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/Drag handle to reorder/)).toBeVisible()
    await expect(page.getByText(/Del to remove file/)).toBeVisible()
  })
})

test.describe('File Row Infrastructure', () => {
  test('each file row has expand toggle, name, page count, and remove button', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.locator('button[title="Expand pages"]')).toBeVisible()
    await expect(page.locator('div.w-6.h-6.rounded-md').first()).toBeVisible()
    await expect(page.getByText('sample.pdf', { exact: true })).toBeVisible()
    await expect(page.locator('text=/\\d+ pages?/')).toBeVisible()
    await expect(page.locator('button[aria-label="Remove sample.pdf"]')).toBeVisible()
  })

  test('file thumbnail renders as a data URI image', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const thumbnail = page.locator('.h-14.w-auto.rounded')
    await expect(thumbnail).toBeVisible()
    const src = await thumbnail.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src!.startsWith('data:')).toBe(true)
  })

  test('toolbar shows file count and total size', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/2 files · /)).toBeVisible()
  })

  test('estimated output size is displayed', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/Estimated output/)).toBeVisible()
  })

  test('smart filename for single file uses _combined suffix', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('sample_combined.pdf')).toBeVisible()
  })

  test('smart filename for multiple files joins names', async ({ page }) => {
    await uploadFiles(page, ['sample.pdf', 'single-page.pdf'])
    await expect(page.getByText(/2 files/)).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('sample_single-page.pdf')).toBeVisible()
  })

  test('memory meter is visible after upload', async ({ page }) => {
    await uploadFile(page, 'sample.pdf')
    await expect(page.getByText(/1 file\b/)).toBeVisible({ timeout: 15000 })

    const memoryMeter = page.locator('[title*="Estimated memory"]')
    await expect(memoryMeter).toBeVisible()
  })
})
