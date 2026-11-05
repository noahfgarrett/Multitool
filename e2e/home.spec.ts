import { test, expect } from '@playwright/test'

test.describe('Home / Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the welcome screen to render
    // playwright.config.ts seeds a "Test User" profile, so the hero greets by first name
    await expect(page.locator('h1').filter({ hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 })
  })

  test('hero greets the user by first name', async ({ page }) => {
    const hero = page.locator('main h1').filter({ hasText: 'Welcome back' }).first()
    await expect(hero).toHaveText('Welcome back, Test')
    await expect(hero).toHaveClass(/text-4xl/)
    await expect(page.locator('main').getByText('Select a tool to get started.')).toBeVisible()
  })

  test('5 category sections visible', async ({ page }) => {
    const categoryLabels = ['Documents', 'Images', 'Files', 'Creators', 'Utilities']
    for (const label of categoryLabels) {
      const heading = page.locator('h2').filter({ hasText: label })
      await expect(heading).toBeVisible()
    }
  })

  test('15 tool cards visible on the welcome screen', async ({ page }) => {
    const toolLabels = [
      'PDF Merge',
      'PDF Split',
      'PDF Annotate',
      'PDF Watermark',
      'Text Extract',
      'Image Resizer',
      'Background Remover',
      'File Compressor',
      'File Converter',
      'Form Builder',
      'Org Chart',
      'Dashboard',
      'Flow Chart',
      'QR Code',
      'Data Viewer',
    ]

    for (const label of toolLabels) {
      const card = page.locator('button').filter({ hasText: label }).first()
      await expect(card).toBeVisible()
    }

    // Verify total count of tool cards (buttons inside the grid areas)
    // Each tool card is a button with a tool label <p> inside it
    const toolCards = page.locator('.grid button')
    await expect(toolCards).toHaveCount(15)
  })

  test('clicking a tool card navigates to that tool', async ({ page }) => {
    // Click on "QR Code" tool card
    const qrCard = page.locator('button').filter({ hasText: 'QR Code' }).first()
    await qrCard.click()

    // The loading spinner should appear then disappear
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })

    // Wait for tool to render - the header should show "QR Code"
    const header = page.locator('header h1')
    await expect(header).toHaveText('QR Code')

    // The welcome screen hero should no longer be visible
    await expect(page.locator('h1').filter({ hasText: 'Welcome back' })).toHaveCount(0)

    // The QR code tool should have its input tabs visible
    await expect(page.locator('button').filter({ hasText: 'Text' }).first()).toBeVisible()
  })

  test('clicking a document tool card loads the tool correctly', async ({ page }) => {
    // Click on "PDF Merge" tool card
    const mergeCard = page.locator('button').filter({ hasText: 'PDF Merge' }).first()
    await mergeCard.click()

    // Wait for tool to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })

    // Header should show the tool name
    await expect(page.locator('header h1')).toHaveText('PDF Merge')

    // The PDF Merge tool should show its empty state (file drop zone)
    await expect(page.locator('text=Drop PDF files here')).toBeVisible()
  })
})
