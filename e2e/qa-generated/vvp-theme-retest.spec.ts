import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const VISUAL_PROOF_DIR = path.join(PROJECT_ROOT, 'test-results', 'visual-proof')

/** Expected --bg-primary values per theme (from index.css) */
const EXPECTED_BG: Record<string, string> = {
  'night-sky':  '#00171F',
  'blueprint':  '#0A1628',
  'clean-dark': '#111111',
  'light':      '#F5F5F5',
}

/** Dismiss any blocking modal (update, changelog, etc.) */
async function dismissAnyModal(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50').forEach((el) => {
      el.style.display = 'none'
      el.style.pointerEvents = 'none'
    })
  })
  await page.waitForTimeout(200)
}

/** Open the Settings modal */
async function openSettings(page: import('@playwright/test').Page): Promise<void> {
  const settingsButton = page.locator('button[title="Settings"]')
  await settingsButton.click({ force: true })
  await expect(page.locator('h2').filter({ hasText: 'Settings' })).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(200)
}

/** Close the Settings modal */
async function closeSettingsModal(page: import('@playwright/test').Page): Promise<void> {
  const settingsOverlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
  const closeButton = settingsOverlay.locator('button').filter({ has: page.locator('svg') }).first()
  await closeButton.click()
  await expect(settingsOverlay).toBeHidden({ timeout: 3000 })
  await page.waitForTimeout(300)
}

/** Wait for a theme class to be applied to the body */
async function waitForTheme(page: import('@playwright/test').Page, themeId: string): Promise<void> {
  await page.waitForFunction(
    (id: string) => document.body.classList.contains(`theme-${id}`),
    themeId,
    { timeout: 5000 },
  )
  await page.waitForTimeout(400)
}

/** Switch to a theme by name, verify CSS variable, close settings, take full-page screenshot */
async function switchThemeAndCapture(
  page: import('@playwright/test').Page,
  themeId: string,
  themeName: string,
  screenshotName: string,
): Promise<string> {
  await openSettings(page)

  const overlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })

  // Ensure we are on the Themes tab
  await overlay.locator('button').filter({ hasText: 'Themes' }).click()
  await page.waitForTimeout(200)

  // Click the theme card
  await overlay.locator('.grid.grid-cols-2 button').filter({ hasText: themeName }).click()
  await waitForTheme(page, themeId)

  // Verify body class
  const bodyClass = await page.evaluate(() => document.body.className)
  expect(bodyClass).toContain(`theme-${themeId}`)

  // Read the actual computed --bg-primary CSS variable
  const bgPrimary = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--bg-primary').trim(),
  )

  // Close settings and dismiss modals before screenshot
  await closeSettingsModal(page)
  await dismissAnyModal(page)

  // Full-page screenshot
  await page.screenshot({
    path: path.join(VISUAL_PROOF_DIR, screenshotName),
    fullPage: true,
  })

  return bgPrimary
}

test.describe('VVP: Theme Retest — CSS variable verification + visual screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Seed user profile
    await page.addInitScript(() => {
      localStorage.setItem('mt-user-profile', JSON.stringify({
        name: 'QA Tester', email: 'qa@test.com', initials: 'QT',
        jobTitle: '', company: '', photo: '',
      }))
    })

    // Block GitHub API to prevent update modal
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Dismiss any blocking modals
    await dismissAnyModal(page)

    // Ensure visual proof directory exists
    if (!fs.existsSync(VISUAL_PROOF_DIR)) {
      fs.mkdirSync(VISUAL_PROOF_DIR, { recursive: true })
    }
  })

  test('all 4 themes produce distinct --bg-primary values and visually distinct screenshots', async ({ page }) => {
    const results: Record<string, string> = {}

    // Night Sky
    results['night-sky'] = await switchThemeAndCapture(
      page, 'night-sky', 'Night Sky', 'theme-retest-night-sky.png',
    )

    // Blueprint
    results['blueprint'] = await switchThemeAndCapture(
      page, 'blueprint', 'Blueprint', 'theme-retest-blueprint.png',
    )

    // Clean Dark
    results['clean-dark'] = await switchThemeAndCapture(
      page, 'clean-dark', 'Clean Dark', 'theme-retest-clean-dark.png',
    )

    // Light
    results['light'] = await switchThemeAndCapture(
      page, 'light', 'Light', 'theme-retest-light.png',
    )

    // ── Assert each --bg-primary matches expected value ──
    for (const [themeId, expected] of Object.entries(EXPECTED_BG)) {
      const actual = results[themeId]
      // Normalize to uppercase for comparison
      expect(
        actual.toUpperCase(),
        `Theme "${themeId}" --bg-primary should be ${expected}, got "${actual}"`,
      ).toBe(expected.toUpperCase())
    }

    // ── Assert all 4 values are distinct (the core regression check) ──
    const uniqueValues = new Set(Object.values(results).map((v) => v.toUpperCase()))
    expect(
      uniqueValues.size,
      `Expected 4 distinct --bg-primary values but got ${uniqueValues.size}: ${JSON.stringify(Object.values(results))}`,
    ).toBe(4)
  })
})
