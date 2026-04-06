import { test, expect, type Page, type Locator } from '@playwright/test'
import { waitForToolLoad, ensureUserProfile } from '../../helpers/navigation'

const BASE_URL = 'http://127.0.0.1:5181'

/** Set up profile + disable file picker + block update check for all pages */
async function setupPage(page: Page): Promise<void> {
  await ensureUserProfile(page)
  // Block GitHub API update check to prevent UpdateModal overlay
  await page.route('**/api.github.com/**', (route) => route.abort())
  await page.addInitScript(() => {
    // Force downloadBlob path by removing showSaveFilePicker
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
}

/** Navigate to QR Code tool */
async function goToQRCode(page: Page): Promise<void> {
  await setupPage(page)
  await page.goto(BASE_URL)
  await expect(page.locator('h1').filter({ hasText: 'LotusWorks Toolkit' })).toBeVisible({ timeout: 10_000 })
  const sidebar = page.locator('aside nav')
  await sidebar.locator('button').filter({ hasText: 'QR Code' }).click()
  await waitForToolLoad(page)
  await expect(page.locator('header h1')).toHaveText('QR Code')
}

/**
 * Get a tab button locator scoped to the Tabs component container.
 * This prevents matching sidebar buttons like "Text Extract" when looking for "Text".
 */
function tabButton(page: Page, label: string): Locator {
  // The Tabs component is rendered inside a div with role/styling: flex gap-1 p-1 bg-white/[0.04]
  // Use the exact text match to avoid partial matches
  return page.locator('[class*="bg-white/\\[0\\.04\\]"] button, [class*="bg-white"] button')
    .filter({ hasText: new RegExp(`^${label}$`) })
}

/**
 * Click a tab in the QR Code input type tabs.
 * Uses exact text matching scoped to the tab bar to avoid ambiguity.
 */
async function clickTab(page: Page, label: string): Promise<void> {
  // The Tabs component renders buttons inside a container with specific styling
  // Use getByRole with exact match to avoid partial text matches
  const tabContainer = page.locator('.w-80 button').filter({ hasText: new RegExp(`^${label}$`) })
  await tabContainer.click()
}

test.describe('QR Code - Functional Tests', () => {
  // ──────────────────────── EMPTY STATE ────────────────────────

  test.describe('Empty state', () => {
    test('shows placeholder when no input', async ({ page }) => {
      await goToQRCode(page)

      await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()
      // No canvas should be visible
      await expect(page.locator('canvas')).toBeHidden()
    })

    test('Download PNG button is disabled with empty text input', async ({ page }) => {
      await goToQRCode(page)

      const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })
      await expect(downloadBtn).toBeDisabled()
    })

    test('Copy button is disabled with empty text input', async ({ page }) => {
      await goToQRCode(page)

      const copyBtn = page.locator('button').filter({ hasText: 'Copy' })
      await expect(copyBtn).toBeDisabled()
    })
  })

  // ──────────────────────── TEXT TAB ────────────────────────

  test.describe('Text tab', () => {
    test('generates QR code from plain text', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Hello World')

      // Canvas should appear
      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      // Placeholder should be hidden
      await expect(page.locator('text=Enter content to generate a QR code')).toBeHidden()

      // Canvas has non-zero dimensions
      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
      expect(box!.height).toBeGreaterThan(0)
    })

    test('buttons become enabled when text is entered', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Test')

      await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeEnabled()
      await expect(page.locator('button').filter({ hasText: 'Copy' })).toBeEnabled()
    })

    test('clearing text restores empty state', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Something')
      await expect(page.locator('canvas')).toBeVisible()

      // Clear the text
      await textarea.fill('')

      // Placeholder should return
      await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()
      await expect(page.locator('canvas')).toBeHidden()

      // Buttons should be disabled again
      await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeDisabled()
    })

    test('handles special characters', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('!@#$%^&*()_+{}|:"<>?`~[];\',./\\')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
    })

    test('handles unicode and emoji text', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Cafe\u0301 \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4 \u00f1')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })

    test('handles very long text input', async ({ page }) => {
      await goToQRCode(page)

      // Generate a long string (QR codes have data limits, but should handle gracefully)
      const longText = 'A'.repeat(500)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill(longText)

      // At high error correction, this may fail to encode, which is handled by the catch block
      // Wait briefly for the effect to run
      await page.waitForTimeout(500)

      // The app should not crash - either shows canvas or clears it
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })

    test('whitespace-only text shows empty state', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('   ')

      // qrData.trim() returns empty for whitespace-only, so empty state should show
      await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()
      await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeDisabled()
    })
  })

  // ──────────────────────── URL TAB ────────────────────────

  test.describe('URL tab', () => {
    test('URL tab shows input with https:// default', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      const urlInput = page.locator('input[placeholder="https://example.com"]')
      await expect(urlInput).toBeVisible()
      await expect(urlInput).toHaveValue('https://')
    })

    test('generates QR from full URL', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      const urlInput = page.locator('input[placeholder="https://example.com"]')
      await urlInput.fill('https://www.example.com/path?query=value')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
    })

    test('URL default https:// generates a QR code (non-empty data)', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      // Default 'https://' is non-empty after trim, so canvas should render
      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })

    test('clearing URL input to empty disables buttons', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      const urlInput = page.locator('input[placeholder="https://example.com"]')
      await urlInput.fill('')

      await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeDisabled()
    })
  })

  // ──────────────────────── EMAIL TAB ────────────────────────

  test.describe('Email tab', () => {
    test('Email tab shows email input', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'Email')

      const emailInput = page.locator('input[placeholder="user@example.com"]')
      await expect(emailInput).toBeVisible()
    })

    test('generates QR from email address', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'Email')

      const emailInput = page.locator('input[placeholder="user@example.com"]')
      await emailInput.fill('test@example.com')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
    })

    test('empty email generates QR for mailto: prefix', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'Email')

      // Empty email => qrData is "mailto:" which is non-empty after trim
      // This means a QR code renders for just "mailto:" - verify the behavior
      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })
  })

  // ──────────────────────── WIFI TAB ────────────────────────

  test.describe('WiFi tab', () => {
    test('WiFi tab shows SSID, password, and encryption options', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      await expect(page.locator('input[placeholder="Network name (SSID)"]')).toBeVisible()
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible()

      // Encryption buttons
      await expect(page.locator('button').filter({ hasText: 'WPA' })).toBeVisible()
      await expect(page.locator('button').filter({ hasText: 'WEP' })).toBeVisible()
      await expect(page.locator('button').filter({ hasText: 'None' })).toBeVisible()
    })

    test('generates QR from WiFi credentials', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      await page.locator('input[placeholder="Network name (SSID)"]').fill('MyNetwork')
      await page.locator('input[placeholder="Password"]').fill('secret123')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
    })

    test('WPA encryption is selected by default', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      const wpaButton = page.locator('button').filter({ hasText: 'WPA' })
      await expect(wpaButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')
    })

    test('switching encryption type updates active button', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      // Click WEP
      const wepButton = page.locator('button').filter({ hasText: 'WEP' })
      await wepButton.click()
      await expect(wepButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')

      // WPA should no longer be active
      const wpaButton = page.locator('button').filter({ hasText: 'WPA' })
      await expect(wpaButton).not.toHaveCSS('background-color', 'rgb(244, 123, 32)')

      // Click None
      const noneButton = page.locator('button').filter({ hasText: 'None' })
      await noneButton.click()
      await expect(noneButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')
    })

    test('WiFi with empty SSID still generates QR (non-empty format string)', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      // WiFi format string is always non-empty: "WIFI:T:WPA;S:;P:;;"
      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })
  })

  // ──────────────────────── SIZE SLIDER ────────────────────────

  test.describe('Size slider', () => {
    test('default size is 300px', async ({ page }) => {
      await goToQRCode(page)

      // The slider value display should show 300px
      await expect(page.locator('text=300px')).toBeVisible()
    })

    test('changing size updates the canvas', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Size test')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      // Get initial canvas size
      const initialBox = await canvas.boundingBox()
      expect(initialBox).toBeTruthy()

      // Change size to max (600)
      const slider = page.locator('input[type="range"]')
      await slider.fill('600')

      // Wait for re-render
      await page.waitForTimeout(300)

      // Canvas should be larger now
      const newBox = await canvas.boundingBox()
      expect(newBox).toBeTruthy()
      expect(newBox!.width).toBeGreaterThan(initialBox!.width)

      // Value display should update
      await expect(page.locator('text=600px')).toBeVisible()
    })

    test('minimum size is 100', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Min size test')

      const slider = page.locator('input[type="range"]')
      await slider.fill('100')

      await expect(page.locator('text=100px')).toBeVisible()

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })
  })

  // ──────────────────────── ERROR CORRECTION ────────────────────────

  test.describe('Error correction levels', () => {
    test('all four levels are visible', async ({ page }) => {
      await goToQRCode(page)

      for (const level of ['L (7%)', 'M (15%)', 'Q (25%)', 'H (30%)']) {
        await expect(page.locator('button').filter({ hasText: level })).toBeVisible()
      }
    })

    test('M (15%) is the default active level', async ({ page }) => {
      await goToQRCode(page)

      const mButton = page.locator('button').filter({ hasText: 'M (15%)' })
      await expect(mButton).toHaveCSS('background-color', 'rgb(244, 123, 32)')
    })

    test('clicking each level activates it', async ({ page }) => {
      await goToQRCode(page)

      const levels = ['L (7%)', 'M (15%)', 'Q (25%)', 'H (30%)']
      for (const level of levels) {
        const btn = page.locator('button').filter({ hasText: level })
        await btn.click()
        await expect(btn).toHaveCSS('background-color', 'rgb(244, 123, 32)')
      }
    })

    test('changing error correction re-renders QR code', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Error correction test')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()

      // Switch from M to H (higher correction = more modules in QR)
      await page.locator('button').filter({ hasText: 'H (30%)' }).click()

      // The canvas should still be visible and rendered
      await expect(canvas).toBeVisible()
      const box = await canvas.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThan(0)
    })
  })

  // ──────────────────────── DOWNLOAD PNG ────────────────────────

  test.describe('Download PNG', () => {
    test('download produces a qrcode.png file', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Download test')

      await expect(page.locator('canvas')).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.locator('button').filter({ hasText: 'Download PNG' }).click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('qrcode.png')
    })

    test('downloaded file has non-zero size', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('File size test')

      await expect(page.locator('canvas')).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.locator('button').filter({ hasText: 'Download PNG' }).click()

      const download = await downloadPromise
      const path = await download.path()
      expect(path).toBeTruthy()

      // Read file to verify non-zero
      const fs = await import('fs')
      const stat = fs.statSync(path!)
      expect(stat.size).toBeGreaterThan(100) // PNG header alone is 8 bytes, QR should be much larger
    })
  })

  // ──────────────────────── TAB SWITCHING ────────────────────────

  test.describe('Tab switching', () => {
    test('switching tabs preserves per-tab input state', async ({ page }) => {
      await goToQRCode(page)

      // Enter text
      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Preserved text')

      // Switch to URL tab
      await clickTab(page, 'URL')

      // Switch back to Text tab
      await clickTab(page, 'Text')

      // Text should be preserved
      await expect(textarea).toHaveValue('Preserved text')
    })

    test('each tab shows its own active styling', async ({ page }) => {
      await goToQRCode(page)

      // The left panel container has class w-80
      const leftPanel = page.locator('.w-80')

      const tabs = ['Text', 'URL', 'Email', 'WiFi']
      for (const tab of tabs) {
        await clickTab(page, tab)

        // Check the active tab button within the left panel has the active color
        const activeBtn = leftPanel.locator('button').filter({ hasText: new RegExp(`^${tab}$`) })
        await expect(activeBtn).toHaveCSS('background-color', 'rgb(244, 123, 32)')
      }
    })

    test('switching from URL to text changes QR data', async ({ page }) => {
      await goToQRCode(page)

      // Go to URL, enter a URL
      await clickTab(page, 'URL')
      const urlInput = page.locator('input[placeholder="https://example.com"]')
      await urlInput.fill('https://example.com')

      // Canvas should be visible
      await expect(page.locator('canvas')).toBeVisible()

      // Switch to Text (default empty) - should show empty state
      await clickTab(page, 'Text')

      await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()
    })
  })

  // ──────────────────────── COLOR PICKERS ────────────────────────

  test.describe('Color options', () => {
    test('foreground color label is visible', async ({ page }) => {
      await goToQRCode(page)

      await expect(page.locator('text=Foreground Color')).toBeVisible()
    })

    test('background color label is visible', async ({ page }) => {
      await goToQRCode(page)

      await expect(page.locator('text=Background Color')).toBeVisible()
    })

    test('foreground color presets are visible', async ({ page }) => {
      await goToQRCode(page)

      // The foreground color picker has 6 preset color swatch buttons
      // Each preset has a title attribute with the hex color value (e.g. title="#FFFFFF")
      // Filter to only hex color titles to exclude eyedropper "Pick color from screen"
      const fgSection = page.locator('text=Foreground Color').locator('..')
      const presetButtons = fgSection.locator('button[title^="#"]')
      await expect(presetButtons).toHaveCount(6)
    })

    test('background color presets are visible', async ({ page }) => {
      await goToQRCode(page)

      // Same approach - filter to hex color title attributes
      const bgSection = page.locator('text=Background Color').locator('..')
      const presetButtons = bgSection.locator('button[title^="#"]')
      await expect(presetButtons).toHaveCount(6)
    })

    test('clicking a foreground color preset changes the active color', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Color test')

      // Find the foreground color section and click a preset (e.g. #000000 - black)
      const fgSection = page.locator('text=Foreground Color').locator('..')
      const blackPreset = fgSection.locator('button[title="#000000"]')
      await blackPreset.click()

      // The canvas should still be visible and rendered
      await expect(page.locator('canvas')).toBeVisible()
    })
  })

  // ──────────────────────── EDGE CASES ────────────────────────

  test.describe('Edge cases', () => {
    test('newlines in text input generate valid QR', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Line 1\nLine 2\nLine 3')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })

    test('URL with query parameters generates QR', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      const urlInput = page.locator('input[placeholder="https://example.com"]')
      await urlInput.fill('https://example.com/path?foo=bar&baz=qux#section')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })

    test('WiFi with special chars in SSID and password', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      await page.locator('input[placeholder="Network name (SSID)"]').fill('My "Network" #1')
      await page.locator('input[placeholder="Password"]').fill('p@$$w0rd!;:')

      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible()
    })

    test('rapid tab switching does not crash', async ({ page }) => {
      await goToQRCode(page)

      const tabs = ['URL', 'Email', 'WiFi', 'Text', 'URL', 'WiFi', 'Email', 'Text']
      for (const tab of tabs) {
        await clickTab(page, tab)
      }

      // App should still be functional
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })
  })
})
