import { test, expect } from '@playwright/test'

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
  })

  test('sidebar is visible on load', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    // Sidebar should be expanded by default (w-60 class)
    await expect(sidebar).toHaveClass(/w-60/)
    // The sidebar title should be visible when expanded
    await expect(page.locator('aside').locator('text=Multitool')).toBeVisible()
  })

  test('all 5 categories are shown in sidebar', async ({ page }) => {
    const sidebar = page.locator('aside nav')
    const categoryLabels = ['Documents', 'Images', 'Files', 'Creators', 'Utilities']

    for (const label of categoryLabels) {
      const category = sidebar.locator('span').filter({ hasText: label })
      await expect(category).toBeVisible()
    }
  })

  test('clicking a category toggles its tool list', async ({ page }) => {
    const sidebar = page.locator('aside nav')

    // Find the "Documents" category header button
    const documentsCategory = sidebar.locator('button').filter({ hasText: 'Documents' })
    await expect(documentsCategory).toBeVisible()

    // All tools under Documents should be visible initially (categories default to expanded)
    const pdfMergeLink = sidebar.locator('button').filter({ hasText: 'PDF Merge' })
    await expect(pdfMergeLink).toBeVisible()

    // Click the category to collapse it
    await documentsCategory.click()

    // Tools under Documents should now be hidden
    await expect(pdfMergeLink).toBeHidden()

    // Click again to expand
    await documentsCategory.click()

    // Tools should be visible again
    await expect(pdfMergeLink).toBeVisible()
  })

  test('clicking a tool in sidebar activates it', async ({ page }) => {
    const sidebar = page.locator('aside nav')

    // Click on "Image Resizer" in the sidebar
    const toolButton = sidebar.locator('button').filter({ hasText: 'Image Resizer' })
    await expect(toolButton).toBeVisible()
    await toolButton.click()

    // Wait for tool to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(200)

    // Header should update to show the active tool
    await expect(page.locator('header h1')).toHaveText('Image Resizer')

    // The welcome screen should be gone
    await expect(page.locator('h1').filter({ hasText: 'Multitool' }).first()).not.toBeVisible()

    // The tool's empty state should be visible
    await expect(page.locator('text=Drop an image here')).toBeVisible()
  })

  test('active tool gets highlighted styling', async ({ page }) => {
    const sidebar = page.locator('aside nav')

    // Click on "QR Code" tool
    const qrButton = sidebar.locator('button').filter({ hasText: 'QR Code' })
    await qrButton.click()

    // Wait for the tool to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(200)

    // The active tool button should have orange highlight styling
    // Active tool gets class 'bg-[#14B8A6]/15 text-[#14B8A6]'
    await expect(qrButton).toHaveCSS('color', 'rgb(244, 123, 32)')

    // The active indicator bar should be present (a div with bg-[#14B8A6])
    const indicatorBar = qrButton.locator('div.absolute')
    await expect(indicatorBar).toBeVisible()
  })

  test('Home button returns to welcome screen', async ({ page }) => {
    const sidebar = page.locator('aside nav')

    // Navigate to a tool first
    const toolButton = sidebar.locator('button').filter({ hasText: 'File Compressor' })
    await toolButton.click()
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(200)

    // Confirm we are on the tool page
    await expect(page.locator('header h1')).toHaveText('File Compressor')

    // Click the Home Menu button in the sidebar
    const homeButton = sidebar.locator('button').filter({ hasText: 'Home Menu' })
    await expect(homeButton).toBeVisible()
    await homeButton.click()

    // Welcome screen should reappear
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 5000 })

    // Header should show "Welcome"
    await expect(page.locator('header h1')).toHaveText('Welcome')
  })

  test('sidebar collapse toggle works', async ({ page }) => {
    const sidebar = page.locator('aside')

    // Sidebar should start expanded
    await expect(sidebar).toHaveClass(/w-60/)

    // Click the collapse button (has title "Collapse sidebar")
    const collapseButton = page.locator('button[title="Collapse sidebar"]')
    await expect(collapseButton).toBeVisible()
    await collapseButton.click()

    // Sidebar should now be collapsed (w-14)
    await expect(sidebar).toHaveClass(/w-14/)

    // The sidebar title text should be hidden
    await expect(page.locator('aside').locator('text=Multitool')).toBeHidden()

    // Click expand button
    const expandButton = page.locator('button[title="Expand sidebar"]')
    await expect(expandButton).toBeVisible()
    await expandButton.click()

    // Sidebar should be expanded again
    await expect(sidebar).toHaveClass(/w-60/)
  })
})
