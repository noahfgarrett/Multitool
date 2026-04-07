import { test, expect } from '@playwright/test'
import { ensureUserProfile } from '../helpers/navigation'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve relative to repo root (two levels up from e2e/qa-generated/)
const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const PROOF_DIR = path.resolve(__dirname2, '..', '..', 'test-results', 'visual-proof')

/**
 * VVP: "Got an Idea?" button — visual verification and feedback form preselection.
 *
 * Visual checkpoints:
 *   1. welcome-screen-full.png — full hero + tool grid
 *   2. welcome-idea-button.png — tight crop of the button
 *   3. welcome-idea-button-hover.png — button in hover state
 *   4. feedback-enhancement-preselected.png — feedback form with Enhancement selected
 */

/** Dismiss update / changelog modals that may appear on load */
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

test.describe('VVP — Got an Idea? button', () => {
  test.beforeEach(async ({ page }) => {
    await ensureUserProfile(page)

    // Block GitHub update check to prevent modal
    await page.route('**/*api.github.com*/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v0.0.0', body: '', html_url: '', assets: [] }),
    }))

    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
    await dismissAnyModal(page)
  })

  test('idea button visual verification and feedback preselection', async ({ page }) => {
    // ── 1. Full welcome screen screenshot ──
    await page.screenshot({ path: path.join(PROOF_DIR, 'welcome-screen-full.png'), fullPage: true })

    // ── Locate the "Got an Idea?" button ──
    const ideaButton = page.locator('button').filter({ hasText: 'Got an Idea?' })
    await expect(ideaButton).toBeVisible({ timeout: 5000 })

    // ── Structural assertion: button text ──
    await expect(ideaButton).toContainText('Got an Idea?')

    // ── Structural assertion: .btn-idea-shimmer class ──
    const className = await ideaButton.getAttribute('class')
    expect(className).toContain('btn-idea-shimmer')

    // ── Structural assertion: Lightbulb SVG icon inside button ──
    const svgIcon = ideaButton.locator('svg')
    await expect(svgIcon).toBeVisible()
    // Lucide Lightbulb icon has a specific path — just verify SVG is present and rendered
    const svgChildCount = await svgIcon.locator('*').count()
    expect(svgChildCount).toBeGreaterThan(0)

    // ── Structural assertion: positioned top-right (absolute positioning) ──
    // The button uses "absolute top-8 right-0" — verify it's in the top-right area
    const buttonBox = await ideaButton.boundingBox()
    expect(buttonBox).not.toBeNull()
    const viewportSize = page.viewportSize()
    expect(viewportSize).not.toBeNull()
    if (buttonBox && viewportSize) {
      // Button should be in the right half of the viewport
      expect(buttonBox.x + buttonBox.width / 2).toBeGreaterThan(viewportSize.width / 2)
      // Button should be in the top area (within first 200px)
      expect(buttonBox.y).toBeLessThan(200)
    }

    // ── 2. Tight crop screenshot of the idea button ──
    await ideaButton.screenshot({ path: path.join(PROOF_DIR, 'welcome-idea-button.png') })

    // ── 3. Hover state screenshot ──
    await ideaButton.hover()
    await page.waitForTimeout(300) // allow hover transition to settle
    await ideaButton.screenshot({ path: path.join(PROOF_DIR, 'welcome-idea-button-hover.png') })

    // ── 4. Click the button → feedback form ──
    await ideaButton.click()

    // Wait for the feedback form to appear
    const feedbackHeading = page.locator('h2').filter({ hasText: 'Report a Bug or Share an Idea' })
    await expect(feedbackHeading).toBeVisible({ timeout: 10000 })

    // ── Structural assertion: Enhancement Idea type is selected (active) ──
    // When enhancement is selected, the button has blue styling classes
    const enhancementButton = page.locator('button').filter({ hasText: 'Enhancement Idea' })
    await expect(enhancementButton).toBeVisible()

    // The active enhancement button has 'bg-blue-500' and 'border-blue-500' classes
    const enhancementClass = await enhancementButton.getAttribute('class')
    expect(enhancementClass).toContain('bg-blue-500')
    expect(enhancementClass).toContain('border-blue-500')
    expect(enhancementClass).toContain('text-blue-400')

    // Bug Report button should NOT have active styling
    const bugButton = page.locator('button').filter({ hasText: 'Bug Report' })
    await expect(bugButton).toBeVisible()
    const bugClass = await bugButton.getAttribute('class')
    expect(bugClass).not.toContain('bg-red-500')

    // ── 5. Screenshot the feedback form with Enhancement pre-selected ──
    // Capture the type selection area for proof
    const typeSection = page.locator('div').filter({ hasText: /^Type/ }).first()
    // Fall back to a broader screenshot of the form area
    const formArea = page.locator('.max-w-2xl').first()
    await formArea.screenshot({ path: path.join(PROOF_DIR, 'feedback-enhancement-preselected.png') })
  })
})
