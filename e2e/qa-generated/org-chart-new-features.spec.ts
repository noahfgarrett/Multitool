import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'

// ── Helpers ─────────────────────────────────────────────────────

/** Ensure user profile exists in localStorage before navigation.
 *  The real storage key is 'lwt-user-profile' (not 'lwt-user-profile'
 *  as set in the Playwright config storageState). Without this, the
 *  UserProfileModal opens on load and blocks all interactions. */
async function ensureProfile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = 'lwt-user-profile'
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        name: 'Test User',
        email: 'test@test.com',
        initials: 'TU',
      }))
    }
  })
}

/** Navigate to Org Chart tool and wait for toolbar ready */
async function setup(page: Page): Promise<void> {
  await ensureProfile(page)
  await page.goto('/')
  // Dismiss any modal (update checker, etc.) that may block the sidebar
  const backdrop = page.locator('.fixed.inset-0 .absolute.inset-0')
  if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backdrop.click()
    await backdrop.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
  }
  await navigateToTool(page, 'org-chart')
  await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible({ timeout: 10000 })
}

// ═══════════════════════════════════════════════════════════════
// ── ORG CHART NEW FEATURES ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

test.describe('Org Chart — New Features', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
  })

  // ── 1. Add Section button exists ──────────────────────────

  test('Add Section button exists in toolbar', async ({ page }) => {
    const addSectionBtn = page.locator('button[title="Add Section"]')
    await expect(addSectionBtn).toBeVisible()
  })

  // ── 2. Add Section creates new root ───────────────────────

  test('Add Section creates a second root node', async ({ page }) => {
    // Initially the chart has 1 root node (CEO)
    // Evaluate in-app store state via the canvas data — we can check by
    // counting root nodes via the properties panel or by verifying undo is
    // now available after clicking Add Section.

    const addSectionBtn = page.locator('button[title="Add Section"]')
    await addSectionBtn.click()

    // After adding a section, undo should become available (a new node was added)
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeEnabled({ timeout: 5000 })

    // The properties panel should show the new node's details since it gets
    // auto-selected. The new section root defaults to "Department Head".
    // Check that the Name input in the properties panel shows "Department Head".
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('Department Head', { timeout: 5000 })
  })

  // ── 3. Versions button exists ─────────────────────────────

  test('Versions button exists in toolbar', async ({ page }) => {
    const versionsBtn = page.locator('button').filter({ hasText: 'Versions' }).first()
    await expect(versionsBtn).toBeVisible()
    // Should have the History icon and "Versions" label
    await expect(versionsBtn).toHaveAttribute('title', 'Version History')
  })

  // ── 4. Save and restore version ───────────────────────────

  test('save a version, make changes, then restore it', async ({ page }) => {
    // Step 1: Open versions panel
    const versionsBtn = page.locator('button').filter({ hasText: 'Versions' }).first()
    await versionsBtn.click()

    // Versions panel should open with "Version History" heading
    await expect(page.getByText('Version History')).toBeVisible({ timeout: 5000 })

    // Step 2: Save current version — the "Save Current" button triggers a
    // window.prompt(). We handle that dialog.
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt')
      await dialog.accept('Test Version 1')
    })
    await page.locator('button').filter({ hasText: 'Save Current' }).click()

    // The saved version should appear in the versions panel
    await expect(page.getByText('Test Version 1')).toBeVisible({ timeout: 5000 })
    // It should show "1 people" (the initial root CEO node)
    await expect(page.getByText('1 people')).toBeVisible({ timeout: 5000 })

    // Step 3: Make a change — add a new person so the chart has 2 nodes
    await page.locator('button[title="Add Person"]').click()
    // Wait for the new node to be selected (properties panel shows New Person)
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('New Person', { timeout: 5000 })

    // Step 4: Restore the saved version — this triggers window.confirm()
    // Hover over the version card to reveal the Restore button
    const versionCard = page.locator('text=Test Version 1').locator('..')
    await versionCard.hover()

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await page.locator('button').filter({ hasText: 'Restore' }).first().click()

    // After restore, the "New Person" input should no longer be visible
    // (selection is cleared after restore, so properties panel shows the
    // "Select a person..." message).
    await expect(page.getByText('Select a person to edit their details')).toBeVisible({ timeout: 5000 })
  })

  // ── 5. Multi-Department template ──────────────────────────

  test('Multi-Department template loads successfully', async ({ page }) => {
    // Open templates modal
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })

    // Select Multi-Department template
    await page.locator('button').filter({ hasText: 'Multi-Department' }).click()

    // Wait for success toast: 'Loaded "Multi-Department" template (15 people)'
    await expect(page.locator('text=/Loaded.*Multi-Department.*template/')).toBeVisible({ timeout: 5000 })

    // The templates modal should close
    await expect(page.locator('button').filter({ hasText: 'Multi-Department' })).toBeHidden({ timeout: 3000 })

    // Canvas should be visible with chart rendered
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})
