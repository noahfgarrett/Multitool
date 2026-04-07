import { test, expect, type Page } from '@playwright/test'
import { waitForToolLoad, ensureUserProfile } from '../../helpers/navigation'

const BASE_URL = 'http://127.0.0.1:5181'

/** Navigate to QR Code tool */
async function goToQRCode(page: Page): Promise<void> {
  await ensureUserProfile(page)
  // Block GitHub API update check to prevent UpdateModal overlay
  await page.route('**/api.github.com/**', (route) => route.abort())
  await page.addInitScript(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
  await page.goto(BASE_URL)
  await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10_000 })
  const sidebar = page.locator('aside nav')
  await sidebar.locator('button').filter({ hasText: 'QR Code' }).click()
  await waitForToolLoad(page)
  await expect(page.locator('header h1')).toHaveText('QR Code')
}

/**
 * Click a tab in the QR Code input type tabs.
 * Uses exact text matching within the left panel to avoid matching sidebar buttons.
 */
async function clickTab(page: Page, label: string): Promise<void> {
  const tabContainer = page.locator('.w-80 button').filter({ hasText: new RegExp(`^${label}$`) })
  await tabContainer.click()
}

test.describe('QR Code - Chaos Tests', () => {
  // ──────────────────────── RAPID INPUT ────────────────────────

  test.describe('Rapid input changes', () => {
    test('rapid typing in text field does not crash', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')

      // Type character by character rapidly
      for (let i = 0; i < 30; i++) {
        await textarea.pressSequentially(String.fromCharCode(65 + (i % 26)), { delay: 10 })
      }

      // App should still work
      await expect(page.locator('canvas')).toBeVisible()
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })

    test('fill-clear-fill cycle does not break state', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')

      for (let i = 0; i < 10; i++) {
        await textarea.fill(`Iteration ${i}`)
        await textarea.fill('')
      }

      // Final fill
      await textarea.fill('Final value')
      await expect(page.locator('canvas')).toBeVisible()

      // Buttons should be enabled
      await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeEnabled()
    })

    test('rapid URL changes do not crash', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'URL')

      const urlInput = page.locator('input[placeholder="https://example.com"]')

      const urls = [
        'https://google.com',
        'https://example.com/very/long/path/here',
        'https://a.b.c.d.e.f.g.h',
        'https://test.com?q=1&r=2&s=3',
        'https://final.com',
      ]

      for (const url of urls) {
        await urlInput.fill(url)
      }

      await expect(page.locator('canvas')).toBeVisible()
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })
  })

  // ──────────────────────── RAPID TAB + INPUT ────────────────────────

  test.describe('Tab and input chaos', () => {
    test('fill text then switch tabs rapidly', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Some text content here')

      // Rapidly switch through all tabs
      for (let i = 0; i < 3; i++) {
        await clickTab(page, 'URL')
        await clickTab(page, 'Email')
        await clickTab(page, 'WiFi')
        await clickTab(page, 'Text')
      }

      // Text should still be preserved
      await expect(textarea).toHaveValue('Some text content here')
      await expect(page.locator('canvas')).toBeVisible()
    })

    test('fill inputs on every tab then switch back and forth', async ({ page }) => {
      await goToQRCode(page)

      // Fill text
      await page.locator('textarea[placeholder="Enter text..."]').fill('Text input')

      // Fill URL
      await clickTab(page, 'URL')
      await page.locator('input[placeholder="https://example.com"]').fill('https://filled.com')

      // Fill email
      await clickTab(page, 'Email')
      await page.locator('input[placeholder="user@example.com"]').fill('chaos@test.com')

      // Fill WiFi
      await clickTab(page, 'WiFi')
      await page.locator('input[placeholder="Network name (SSID)"]').fill('ChaosNet')
      await page.locator('input[placeholder="Password"]').fill('chaospass')

      // Switch back to text
      await clickTab(page, 'Text')
      await expect(page.locator('textarea[placeholder="Enter text..."]')).toHaveValue('Text input')

      // Switch to URL
      await clickTab(page, 'URL')
      await expect(page.locator('input[placeholder="https://example.com"]')).toHaveValue('https://filled.com')

      // Switch to Email
      await clickTab(page, 'Email')
      await expect(page.locator('input[placeholder="user@example.com"]')).toHaveValue('chaos@test.com')

      // Switch to WiFi
      await clickTab(page, 'WiFi')
      await expect(page.locator('input[placeholder="Network name (SSID)"]')).toHaveValue('ChaosNet')
      await expect(page.locator('input[placeholder="Password"]')).toHaveValue('chaospass')
    })
  })

  // ──────────────────────── RAPID OPTIONS ────────────────────────

  test.describe('Rapid option changes', () => {
    test('spam error correction buttons', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Error correction spam')

      const levels = ['L (7%)', 'M (15%)', 'Q (25%)', 'H (30%)']

      // Click each level multiple times rapidly
      for (let round = 0; round < 5; round++) {
        for (const level of levels) {
          await page.locator('button').filter({ hasText: level }).click()
        }
      }

      // Should end on H
      await expect(page.locator('button').filter({ hasText: 'H (30%)' })).toHaveCSS(
        'background-color',
        'rgb(244, 123, 32)',
      )

      // Canvas should still be visible
      await expect(page.locator('canvas')).toBeVisible()
    })

    test('spam size slider changes', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Size spam')

      const slider = page.locator('input[type="range"]')

      // Rapidly change size values
      const sizes = [100, 200, 300, 400, 500, 600, 150, 250, 350, 450, 550, 300]
      for (const size of sizes) {
        await slider.fill(String(size))
      }

      // Should end at 300
      await expect(page.locator('text=300px')).toBeVisible()
      await expect(page.locator('canvas')).toBeVisible()
    })

    test('change size + error correction + tab rapidly', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Combined chaos')

      const slider = page.locator('input[type="range"]')

      // Round 1: change everything
      await slider.fill('200')
      await page.locator('button').filter({ hasText: 'H (30%)' }).click()
      await clickTab(page, 'URL')
      await page.locator('input[placeholder="https://example.com"]').fill('https://chaos.com')

      // Round 2: change everything again
      await slider.fill('500')
      await page.locator('button').filter({ hasText: 'L (7%)' }).click()
      await clickTab(page, 'Email')
      await page.locator('input[placeholder="user@example.com"]').fill('chaos@rapid.com')

      // Round 3: back to text
      await clickTab(page, 'Text')

      // Should not crash, text should be preserved
      await expect(textarea).toHaveValue('Combined chaos')
      await expect(page.locator('canvas')).toBeVisible()
    })
  })

  // ──────────────────────── DOWNLOAD SPAM ────────────────────────

  test.describe('Download spam', () => {
    test('multiple rapid download clicks do not crash', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('Download spam test')

      await expect(page.locator('canvas')).toBeVisible()

      const downloadBtn = page.locator('button').filter({ hasText: 'Download PNG' })

      // Click download 5 times rapidly
      const downloads: Promise<unknown>[] = []
      for (let i = 0; i < 5; i++) {
        downloads.push(page.waitForEvent('download', { timeout: 5000 }).catch(() => null))
        await downloadBtn.click()
      }

      // At least one download should have succeeded
      const results = await Promise.all(downloads)
      const successCount = results.filter((d) => d !== null).length
      expect(successCount).toBeGreaterThanOrEqual(1)

      // App should still be functional
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })
  })

  // ──────────────────────── WIFI ENCRYPTION SPAM ────────────────────────

  test.describe('WiFi encryption spam', () => {
    test('rapid encryption toggle does not break QR generation', async ({ page }) => {
      await goToQRCode(page)

      await clickTab(page, 'WiFi')

      await page.locator('input[placeholder="Network name (SSID)"]').fill('SpamNet')
      await page.locator('input[placeholder="Password"]').fill('spampass')

      // Rapidly toggle encryption
      for (let i = 0; i < 10; i++) {
        await page.locator('button').filter({ hasText: 'WEP' }).click()
        await page.locator('button').filter({ hasText: 'None' }).click()
        await page.locator('button').filter({ hasText: 'WPA' }).click()
      }

      // Should end on WPA
      await expect(page.locator('button').filter({ hasText: 'WPA' })).toHaveCSS(
        'background-color',
        'rgb(244, 123, 32)',
      )

      await expect(page.locator('canvas')).toBeVisible()
    })
  })

  // ──────────────────────── CLEAR WHILE RENDERING ────────────────────────

  test.describe('Clear during render', () => {
    test('clearing input while QR is generating does not leave stale canvas', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')

      // Type text to trigger generation
      await textarea.fill('This will be cleared immediately')

      // Immediately clear
      await textarea.fill('')

      // Should show empty state
      await expect(page.locator('text=Enter content to generate a QR code')).toBeVisible()
      await expect(page.locator('canvas')).toBeHidden()
    })

    test('fill-clear-fill produces correct final QR', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')

      await textarea.fill('First text')
      await textarea.fill('')
      await textarea.fill('Second text')

      // Canvas should be visible with QR for "Second text"
      await expect(page.locator('canvas')).toBeVisible()
      await expect(page.locator('text=Enter content to generate a QR code')).toBeHidden()
    })
  })

  // ──────────────────────── BOUNDARY VALUES ────────────────────────

  test.describe('Boundary values', () => {
    test('single character input generates QR', async ({ page }) => {
      await goToQRCode(page)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill('A')

      await expect(page.locator('canvas')).toBeVisible()
    })

    test('maximum QR capacity text (large input)', async ({ page }) => {
      await goToQRCode(page)

      // QR code version 40 with L correction can hold ~7089 numeric, ~4296 alphanumeric, ~2953 bytes
      const longText = 'X'.repeat(2000)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill(longText)

      // Set to L correction for maximum capacity
      await page.locator('button').filter({ hasText: 'L (7%)' }).click()

      await page.waitForTimeout(500)

      // Should either show canvas or gracefully handle overflow
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })

    test('text exceeding QR capacity is handled gracefully', async ({ page }) => {
      await goToQRCode(page)

      // Generate text that exceeds max QR capacity at H correction
      const hugeText = 'Z'.repeat(5000)

      const textarea = page.locator('textarea[placeholder="Enter text..."]')
      await textarea.fill(hugeText)

      // Set to H (strictest, lowest capacity)
      await page.locator('button').filter({ hasText: 'H (30%)' }).click()

      await page.waitForTimeout(500)

      // The catch block should clear the canvas
      // App should not crash
      await expect(page.locator('header h1')).toHaveText('QR Code')
    })
  })
})
