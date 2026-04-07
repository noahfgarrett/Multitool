import { test, expect } from '@playwright/test'
import path from 'path'

const PROOF_DIR = path.resolve('test-results/visual-proof')

/**
 * Dismiss any blocking modal overlay (update modal, changelog, etc.)
 * Uses CSS hiding to avoid breaking React's VDOM.
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
 * Re-show any modals that were hidden by dismissAnyModal.
 */
async function restoreModals(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50').forEach((el) => {
      el.style.display = ''
      el.style.pointerEvents = ''
    })
  })
  await page.waitForTimeout(200)
}

test.describe('VVP: Profile Features & Sidebar Avatar', () => {
  test('1 — sidebar footer with settings cog', async ({ page }) => {
    // Inject profile so the profile modal doesn't block
    await page.addInitScript(() => {
      localStorage.setItem('mt-user-profile', JSON.stringify({
        name: 'Jane Doe', email: 'jane@lotusworks.com', initials: 'JD',
        jobTitle: 'Senior Estimator', company: 'Multitool', photo: '',
      }))
    })

    // Block GitHub update check
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
    await dismissAnyModal(page)

    // Structural assertions: settings cog, version text, user avatar area
    const sidebar = page.locator('aside')
    const settingsBtn = sidebar.locator('button[title="Settings"]')
    await expect(settingsBtn).toBeVisible()

    // Version text in sidebar footer
    const footer = sidebar.locator('.border-t').last()
    await expect(footer.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible()

    // Profile name should appear
    await expect(footer.locator('text=Jane Doe')).toBeVisible()

    // Avatar circle should exist (the 7x7 rounded-full container)
    const avatar = footer.locator('.rounded-full').first()
    await expect(avatar).toBeVisible()

    // Screenshot just the sidebar footer
    await footer.screenshot({ path: path.join(PROOF_DIR, 'sidebar-footer-with-cog.png') })
  })

  test('2 — profile modal on first launch', async ({ page }) => {
    // Clear localStorage to trigger first-launch profile flow
    await page.addInitScript(() => {
      localStorage.removeItem('mt-user-profile')
    })

    // Block GitHub update check
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')

    // The profile setup modal should appear automatically
    const modal = page.locator('h2').filter({ hasText: 'Set Up Your Profile' })
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Structural: verify form fields exist
    await expect(page.locator('#profile-name')).toBeVisible()
    await expect(page.locator('#profile-email')).toBeVisible()
    await expect(page.locator('#profile-initials')).toBeVisible()

    // Avatar preview circle should be visible
    const avatarPreview = page.locator('.rounded-full').filter({ has: page.locator('svg, span') }).first()
    await expect(avatarPreview).toBeVisible()

    // Get Started button should be visible but disabled (no name entered)
    const getStartedBtn = page.locator('button').filter({ hasText: 'Get Started' })
    await expect(getStartedBtn).toBeVisible()
    await expect(getStartedBtn).toBeDisabled()

    // Screenshot the first-launch modal
    await page.screenshot({ path: path.join(PROOF_DIR, 'profile-modal-first-launch.png') })
  })

  test('3 — profile form fields in settings', async ({ page }) => {
    // Set up profile with all fields populated
    await page.addInitScript(() => {
      localStorage.setItem('mt-user-profile', JSON.stringify({
        name: 'Noah Garrett', email: 'noah@lotusworks.com', initials: 'NG',
        jobTitle: 'Lead Engineer', company: 'Multitool', photo: '',
      }))
    })

    // Block GitHub update check
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
    await dismissAnyModal(page)

    // Open settings
    const settingsBtn = page.locator('aside button[title="Settings"]')
    await settingsBtn.click()
    await expect(page.locator('h2').filter({ hasText: 'Settings' })).toBeVisible({ timeout: 5000 })

    // Click the Profile tab
    const profileTab = page.locator('button').filter({ hasText: 'Profile' })
    await profileTab.click()
    await page.waitForTimeout(300)

    // Structural assertions: all profile fields exist in settings
    const modal = page.locator('.fixed.inset-0.z-50').last()

    // Name input
    const nameInput = modal.locator('input[placeholder="Your name"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('Noah Garrett')

    // Job Title input
    const jobTitleInput = modal.locator('input[placeholder="e.g. Senior Estimator"]')
    await expect(jobTitleInput).toBeVisible()
    await expect(jobTitleInput).toHaveValue('Lead Engineer')

    // Company input
    const companyInput = modal.locator('input[placeholder="e.g. Multitool"]')
    await expect(companyInput).toBeVisible()
    await expect(companyInput).toHaveValue('Multitool')

    // Photo upload button
    const uploadBtn = modal.locator('button').filter({ hasText: /Upload photo|Change photo/ })
    await expect(uploadBtn).toBeVisible()

    // Hidden file input for photo
    const fileInput = modal.locator('input[type="file"][accept="image/*"]')
    await expect(fileInput).toHaveCount(1)

    // Photo preview circle (the 16x16 rounded-full)
    const photoCircle = modal.locator('.rounded-full.flex.items-center.justify-center').first()
    await expect(photoCircle).toBeVisible()

    // Save Profile button
    await expect(modal.locator('button').filter({ hasText: 'Save Profile' })).toBeVisible()

    // Screenshot the profile form
    await modal.screenshot({ path: path.join(PROOF_DIR, 'profile-form-fields.png') })
  })

  test('4 — sidebar after profile setup', async ({ page }) => {
    // Clear localStorage to start fresh
    await page.addInitScript(() => {
      localStorage.removeItem('mt-user-profile')
    })

    // Block GitHub update check
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')

    // Wait for the profile setup modal
    const modalTitle = page.locator('h2').filter({ hasText: 'Set Up Your Profile' })
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Fill in the profile form
    await page.locator('#profile-name').fill('Sarah Connor')
    await page.waitForTimeout(200)

    // Initials should auto-generate
    await expect(page.locator('#profile-initials')).toHaveValue('SC')

    await page.locator('#profile-email').fill('sarah@lotusworks.com')

    // Click "Get Started" to save
    const getStartedBtn = page.locator('button').filter({ hasText: 'Get Started' })
    await expect(getStartedBtn).toBeEnabled()
    await getStartedBtn.click()

    // Modal should close
    await expect(modalTitle).toBeHidden({ timeout: 5000 })

    // Wait for the app to settle
    await page.waitForTimeout(500)

    // Dismiss any remaining modals (update modal might show)
    await dismissAnyModal(page)

    // The sidebar footer should now show the profile name
    const sidebar = page.locator('aside')
    const footer = sidebar.locator('.border-t').last()

    // Profile name should appear in the sidebar footer
    await expect(footer.locator('text=Sarah Connor')).toBeVisible()

    // Settings cog should still be there
    await expect(footer.locator('button[title="Settings"]')).toBeVisible()

    // Avatar circle with initials (since no photo, shows User icon)
    const avatar = footer.locator('.rounded-full').first()
    await expect(avatar).toBeVisible()

    // Screenshot the sidebar footer after profile setup
    await footer.screenshot({ path: path.join(PROOF_DIR, 'sidebar-after-profile-setup.png') })
  })
})
