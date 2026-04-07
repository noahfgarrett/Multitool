import { test, expect } from '@playwright/test'

test.describe('Chaos: Rapid tool switching', () => {
  test('navigate through all 15 tools rapidly via sidebar clicks - no crash', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    const sidebar = page.locator('aside nav')

    // All 15 tool labels in sidebar order (Documents, Images, Files, Creators, Utilities)
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

    // Rapidly click through all tools without waiting for full load
    for (const label of toolLabels) {
      const toolButton = sidebar.locator('button').filter({ hasText: label })
      await toolButton.click()
      // Only a tiny wait to let the click register and state update
      await page.waitForTimeout(100)
    }

    // After rapid switching, wait for the last tool to fully load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify the app is still responsive - the last tool should be active
    await expect(page.locator('header h1')).toHaveText('Data Viewer')

    // The page should not show any error boundary or crash screen
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()

    // The sidebar should still be functional
    await expect(sidebar).toBeVisible()

    // Navigate back to home to confirm full app responsiveness
    const homeButton = sidebar.locator('button').filter({ hasText: 'Home Menu' })
    await homeButton.click()
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 5000 })
  })

  test('rapid back-and-forth between two tools stays stable', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    const sidebar = page.locator('aside nav')
    const qrButton = sidebar.locator('button').filter({ hasText: 'QR Code' })
    const mergeButton = sidebar.locator('button').filter({ hasText: 'PDF Merge' })

    // Rapidly switch back and forth 10 times
    for (let i = 0; i < 10; i++) {
      await qrButton.click()
      await page.waitForTimeout(50)
      await mergeButton.click()
      await page.waitForTimeout(50)
    }

    // Wait for the last tool to fully load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(500)

    // The last clicked tool should be active
    await expect(page.locator('header h1')).toHaveText('PDF Merge')

    // No errors should be visible
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()

    // Tool should be functional - empty state should render
    await expect(page.locator('text=Drop PDF files here')).toBeVisible()
  })

  test('rapid switching between home and tools stays stable', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    const sidebar = page.locator('aside nav')
    const homeButton = sidebar.locator('button').filter({ hasText: 'Home Menu' })

    const toolLabels = ['QR Code', 'Image Resizer', 'File Compressor', 'Dashboard', 'Flow Chart']

    // Switch from home to tool and back rapidly
    for (const label of toolLabels) {
      const toolButton = sidebar.locator('button').filter({ hasText: label })
      await toolButton.click()
      await page.waitForTimeout(80)
      await homeButton.click()
      await page.waitForTimeout(80)
    }

    // End on home - verify welcome screen renders
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 5000 })

    // Sidebar should still work
    const qrButton = sidebar.locator('button').filter({ hasText: 'QR Code' })
    await qrButton.click()
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await expect(page.locator('header h1')).toHaveText('QR Code')
  })
})
