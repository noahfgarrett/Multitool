import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'

test.describe('QR Code tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to QR Code tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'QR Code' }).click()
    await waitForToolLoad(page)

    // Verify we are on the QR Code tool
    await expect(page.locator('header h1')).toHaveText('QR Code')
  })

  test('empty state shows input tabs (Text, URL, Email, WiFi)', async ({ page }) => {
    // The Tabs component renders 4 input type tabs
    const tabLabels = ['Text', 'URL', 'Email', 'WiFi']
    for (const label of tabLabels) {
      const tab = page.locator('button').filter({ hasText: label }).first()
      await expect(tab).toBeVisible()
    }

    // Text tab should be active by default (has bg-[#14B8A6] styling)
    const textTab = page.locator('button').filter({ hasText: 'Text' }).first()
    await expect(textTab).toHaveCSS('background-color', 'rgb(244, 123, 32)')

    // The empty state placeholder message should be shown (no text entered yet)
    await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()

    // A textarea for text input should be visible
    await expect(page.locator('textarea[placeholder="Enter text..."]')).toBeVisible()

    // Download PNG button should be disabled since there is no input
    const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })
    await expect(downloadBtn).toBeVisible()
    await expect(downloadBtn).toBeDisabled()
  })

  test('text input generates QR canvas', async ({ page }) => {
    // Type text into the textarea
    const textarea = page.locator('textarea[placeholder="Enter text..."]')
    await textarea.fill('Hello Multitool!')

    // The empty state message should disappear
    await expect(page.locator('text=Enter content to generate a QR code')).toBeHidden()

    // A canvas element should now be visible (the QR code)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // The canvas should have dimensions (width > 0)
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).toBeTruthy()
    expect(canvasBox!.width).toBeGreaterThan(0)
    expect(canvasBox!.height).toBeGreaterThan(0)

    // Download PNG button should now be enabled
    const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })
    await expect(downloadBtn).toBeEnabled()

    // Copy button should also be enabled
    const copyBtn = page.locator('button').filter({ hasText: 'Copy' })
    await expect(copyBtn).toBeEnabled()
  })

  test('switching tabs changes the input field', async ({ page }) => {
    // Switch to URL tab
    const urlTab = page.locator('button').filter({ hasText: 'URL' }).first()
    await urlTab.click()

    // URL input should appear with default "https://" value
    const urlInput = page.locator('input[placeholder="https://example.com"]')
    await expect(urlInput).toBeVisible()
    await expect(urlInput).toHaveValue('https://')

    // Switch to Email tab
    const emailTab = page.locator('button').filter({ hasText: 'Email' }).first()
    await emailTab.click()

    // Email input should appear
    const emailInput = page.locator('input[placeholder="user@example.com"]')
    await expect(emailInput).toBeVisible()

    // Switch to WiFi tab
    const wifiTab = page.locator('button').filter({ hasText: 'WiFi' }).first()
    await wifiTab.click()

    // SSID and password fields should appear
    await expect(page.locator('input[placeholder="Network name (SSID)"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible()

    // Encryption type buttons should be visible
    await expect(page.locator('button').filter({ hasText: 'WPA' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'WEP' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'None' })).toBeVisible()
  })

  test('download button triggers download', async ({ page }) => {
    // Enter text so QR code is generated
    const textarea = page.locator('textarea[placeholder="Enter text..."]')
    await textarea.fill('Test download')

    // Wait for canvas to render
    await expect(page.locator('canvas')).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Click download button
    const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })
    await downloadBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('qrcode.png')
  })

  test('error correction level buttons work', async ({ page }) => {
    // The error correction buttons should be visible
    const levels = ['L (7%)', 'M (15%)', 'Q (25%)', 'H (30%)']
    for (const level of levels) {
      await expect(page.locator('button').filter({ hasText: level })).toBeVisible()
    }

    // M should be active by default
    const mButton = page.locator('button').filter({ hasText: 'M (15%)' })
    await expect(mButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')

    // Click H level
    const hButton = page.locator('button').filter({ hasText: 'H (30%)' })
    await hButton.click()
    await expect(hButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')
  })
})
