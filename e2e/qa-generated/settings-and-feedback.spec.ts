import { test, expect } from '@playwright/test'
import { ensureUserProfile } from '../helpers/navigation'

/**
 * Helper to dismiss any modal overlay blocking the UI.
 * The update modal or changelog modal can appear on page load if the GitHub
 * API returns a newer version. We hide it via CSS (not DOM removal) to avoid
 * breaking React's virtual DOM reconciliation.
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

test.describe('Settings, Themes, and Feedback', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user profile exists so the profile modal doesn't block
    await ensureUserProfile(page)

    // Block the GitHub update check at the network level to prevent the update modal
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Dismiss any blocking modal (update modal, changelog, etc.)
    await dismissAnyModal(page)
  })

  test('settings cog exists in sidebar', async ({ page }) => {
    const settingsButton = page.locator('aside button[title="Settings"]')
    await expect(settingsButton).toBeVisible()
  })

  test('settings modal opens with tabs', async ({ page }) => {
    // Click the settings cog in the sidebar footer
    const settingsButton = page.locator('aside button[title="Settings"]')
    await settingsButton.click()

    // Verify the modal opens with "Settings" title
    const settingsHeading = page.locator('h2').filter({ hasText: 'Settings' })
    await expect(settingsHeading).toBeVisible({ timeout: 5000 })

    // Verify the three tabs are present
    await expect(page.locator('button').filter({ hasText: 'Themes' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Profile' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'About' })).toBeVisible()
  })

  test('theme options displayed', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('aside button[title="Settings"]')
    await settingsButton.click()
    const settingsHeading = page.locator('h2').filter({ hasText: 'Settings' })
    await expect(settingsHeading).toBeVisible({ timeout: 5000 })

    // Themes tab should be active by default — verify all 4 theme options
    // Scope searches to the Settings modal to avoid matching sidebar text
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal.locator('text=Night Sky')).toBeVisible()
    await expect(modal.locator('text=Blueprint')).toBeVisible()
    await expect(modal.locator('text=Clean Dark')).toBeVisible()
    await expect(modal.locator('p').filter({ hasText: /^Light$/ })).toBeVisible()
  })

  test('about tab shows creator', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('aside button[title="Settings"]')
    await settingsButton.click()
    const settingsHeading = page.locator('h2').filter({ hasText: 'Settings' })
    await expect(settingsHeading).toBeVisible({ timeout: 5000 })

    // Click the About tab
    const aboutTab = page.locator('button').filter({ hasText: 'About' })
    await aboutTab.click()

    // Verify "Noah Garrett" is visible
    await expect(page.locator('text=Noah Garrett')).toBeVisible()
  })

  test('about tab shows version', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('aside button[title="Settings"]')
    await settingsButton.click()
    const settingsHeading = page.locator('h2').filter({ hasText: 'Settings' })
    await expect(settingsHeading).toBeVisible({ timeout: 5000 })

    // Click the About tab
    const aboutTab = page.locator('button').filter({ hasText: 'About' })
    await aboutTab.click()

    // Verify a version string is displayed (e.g. "Version 3.1.0")
    await expect(page.locator('text=/Version \\d+\\.\\d+\\.\\d+/')).toBeVisible()
  })

  test('"Got an Idea?" button on welcome screen', async ({ page }) => {
    // The welcome screen should have the "Got an Idea?" button
    const ideaButton = page.locator('button').filter({ hasText: 'Got an Idea?' })
    await expect(ideaButton).toBeVisible()
  })

  test('idea button opens feedback with enhancement selected', async ({ page }) => {
    // Click the "Got an Idea?" button
    const ideaButton = page.locator('button').filter({ hasText: 'Got an Idea?' })
    await expect(ideaButton).toBeVisible()
    await ideaButton.click()

    // Wait for feedback form to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify the feedback form header is visible
    await expect(page.locator('text=Report a Bug or Share an Idea')).toBeVisible({ timeout: 5000 })

    // The "Enhancement Idea" button should be the selected type
    // When selected, it gets the active styling with blue border class
    const enhancementButton = page.locator('button').filter({ hasText: 'Enhancement Idea' })
    await expect(enhancementButton).toBeVisible()
    // Active enhancement button has 'border-blue-500/30' and 'text-blue-400' classes
    await expect(enhancementButton).toHaveClass(/border-blue-500/)
  })
})
