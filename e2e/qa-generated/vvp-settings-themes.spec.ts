import { test, expect } from '@playwright/test'
import { ensureUserProfile } from '../helpers/navigation'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const VISUAL_PROOF_DIR = path.join(PROJECT_ROOT, 'test-results', 'visual-proof')

/**
 * Dismiss any blocking modal (update, changelog, etc.) by hiding overlays via CSS.
 */
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

/**
 * Open the Settings modal by clicking the sidebar cog.
 */
async function openSettings(page: import('@playwright/test').Page): Promise<void> {
  const settingsButton = page.locator('button[title="Settings"]')
  await settingsButton.click({ force: true })
  await expect(page.locator('h2').filter({ hasText: 'Settings' })).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(200)
}

/**
 * Close the Settings modal by clicking the X button.
 */
async function closeSettingsModal(page: import('@playwright/test').Page): Promise<void> {
  const settingsOverlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
  const closeButton = settingsOverlay.locator('button').filter({ has: page.locator('svg') }).first()
  await closeButton.click()
  await expect(settingsOverlay).toBeHidden({ timeout: 3000 })
  await page.waitForTimeout(300)
}

/**
 * Wait for a specific theme class to be applied to the body element.
 */
async function waitForTheme(page: import('@playwright/test').Page, themeId: string): Promise<void> {
  await page.waitForFunction(
    (id: string) => document.body.classList.contains(`theme-${id}`),
    themeId,
    { timeout: 5000 },
  )
  await page.waitForTimeout(400)
}

test.describe('VVP: Settings Modal & Theme Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await ensureUserProfile(page)

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

  test('capture Settings Themes tab with structural assertions', async ({ page }) => {
    await openSettings(page)

    const settingsOverlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    const modalPanel = settingsOverlay.locator('div.relative').first()

    // Structural: Settings modal has exactly 3 tabs
    const tabButtons = settingsOverlay.locator('button').filter({ hasText: /^(Themes|Profile|About)$/ })
    await expect(tabButtons).toHaveCount(3)

    // Structural: 4 theme cards visible with names
    await expect(settingsOverlay.locator('text=Night Sky')).toBeVisible()
    await expect(settingsOverlay.locator('text=Blueprint')).toBeVisible()
    await expect(settingsOverlay.locator('text=Clean Dark')).toBeVisible()
    await expect(settingsOverlay.locator('p').filter({ hasText: /^Light$/ })).toBeVisible()

    // Theme cards show descriptions
    await expect(settingsOverlay.locator('text=twinkling stars')).toBeVisible()
    await expect(settingsOverlay.locator('text=grid lines')).toBeVisible()
    await expect(settingsOverlay.locator('text=no distractions')).toBeVisible()
    await expect(settingsOverlay.locator('text=bright environments')).toBeVisible()

    // Preview swatches exist (4 colored squares, one per theme)
    const swatches = settingsOverlay.locator('.grid.grid-cols-2 .w-8.h-8')
    await expect(swatches).toHaveCount(4)

    // Screenshot
    await modalPanel.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'settings-themes-tab.png'),
    })
  })

  test('capture Settings Profile tab with field assertions', async ({ page }) => {
    await openSettings(page)

    const settingsOverlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    const modalPanel = settingsOverlay.locator('div.relative').first()

    // Switch to Profile tab
    await settingsOverlay.locator('button').filter({ hasText: 'Profile' }).click()
    await page.waitForTimeout(300)

    // Structural: Profile tab has all expected input fields
    await expect(settingsOverlay.locator('input[placeholder="Your name"]')).toBeVisible()
    await expect(settingsOverlay.locator('input[placeholder="e.g. Senior Estimator"]')).toBeVisible()
    await expect(settingsOverlay.locator('input[placeholder="e.g. Multitool"]')).toBeVisible()

    // Photo upload area
    await expect(settingsOverlay.locator('text=Upload photo').or(settingsOverlay.locator('text=Change photo'))).toBeVisible()

    // Field labels: Name, Job Title, Company
    await expect(settingsOverlay.locator('text=Name')).toBeVisible()
    await expect(settingsOverlay.locator('text=Job Title')).toBeVisible()
    await expect(settingsOverlay.locator('text=Company')).toBeVisible()

    // Save button
    await expect(settingsOverlay.locator('button').filter({ hasText: 'Save Profile' })).toBeVisible()

    // Screenshot
    await modalPanel.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'settings-profile-tab.png'),
    })
  })

  test('capture Settings About tab with creator and version', async ({ page }) => {
    await openSettings(page)

    const settingsOverlay = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    const modalPanel = settingsOverlay.locator('div.relative').first()

    // Switch to About tab
    await settingsOverlay.locator('button').filter({ hasText: 'About' }).click()
    await page.waitForTimeout(300)

    // Structural: "Noah Garrett" is displayed
    await expect(settingsOverlay.locator('text=Noah Garrett')).toBeVisible()

    // Structural: Version number is displayed
    await expect(settingsOverlay.locator('text=/Version \\d+\\.\\d+\\.\\d+/')).toBeVisible()

    // "Multitool" heading in about section
    await expect(settingsOverlay.locator('h4').filter({ hasText: 'Multitool' })).toBeVisible()

    // Description text
    await expect(settingsOverlay.locator('text=construction professionals')).toBeVisible()

    // Screenshot
    await modalPanel.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'settings-about-tab.png'),
    })
  })

  test('capture all 4 themes - body class applied and full page screenshots', async ({ page }) => {
    // ── Blueprint ──
    await openSettings(page)
    const overlay1 = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    await overlay1.locator('.grid.grid-cols-2 button').filter({ hasText: 'Blueprint' }).click()
    await waitForTheme(page, 'blueprint')
    // Verify body class
    const bodyClass1 = await page.evaluate(() => document.body.className)
    expect(bodyClass1).toContain('theme-blueprint')
    await closeSettingsModal(page)
    await dismissAnyModal(page)
    await page.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'theme-blueprint.png'),
      fullPage: false,
    })

    // ── Clean Dark ──
    await openSettings(page)
    const overlay2 = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    await overlay2.locator('button').filter({ hasText: 'Themes' }).click()
    await page.waitForTimeout(200)
    await overlay2.locator('.grid.grid-cols-2 button').filter({ hasText: 'Clean Dark' }).click()
    await waitForTheme(page, 'clean-dark')
    const bodyClass2 = await page.evaluate(() => document.body.className)
    expect(bodyClass2).toContain('theme-clean-dark')
    await closeSettingsModal(page)
    await dismissAnyModal(page)
    await page.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'theme-clean-dark.png'),
      fullPage: false,
    })

    // ── Light ──
    await openSettings(page)
    const overlay3 = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    await overlay3.locator('button').filter({ hasText: 'Themes' }).click()
    await page.waitForTimeout(200)
    await overlay3.locator('.grid.grid-cols-2 button').filter({ hasText: 'Light' }).click()
    await waitForTheme(page, 'light')
    const bodyClass3 = await page.evaluate(() => document.body.className)
    expect(bodyClass3).toContain('theme-light')
    await closeSettingsModal(page)
    await dismissAnyModal(page)
    await page.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'theme-light.png'),
      fullPage: false,
    })

    // ── Night Sky (default) ──
    await openSettings(page)
    const overlay4 = page.locator('.fixed.inset-0.z-50').filter({ has: page.locator('h2:text("Settings")') })
    await overlay4.locator('button').filter({ hasText: 'Themes' }).click()
    await page.waitForTimeout(200)
    await overlay4.locator('.grid.grid-cols-2 button').filter({ hasText: 'Night Sky' }).click()
    await waitForTheme(page, 'night-sky')
    const bodyClass4 = await page.evaluate(() => document.body.className)
    expect(bodyClass4).toContain('theme-night-sky')
    await closeSettingsModal(page)
    await dismissAnyModal(page)
    await page.screenshot({
      path: path.join(VISUAL_PROOF_DIR, 'theme-night-sky.png'),
      fullPage: false,
    })
  })
})
