import { type Page, expect } from '@playwright/test'

/** Map tool IDs to their sidebar labels */
const TOOL_LABELS: Record<string, string> = {
  'pdf-merge': 'PDF Merge',
  'pdf-split': 'PDF Split',
  'pdf-annotate': 'PDF Annotate',
  'pdf-watermark': 'PDF Watermark',
  'text-extract': 'Text Extract',
  'image-resizer': 'Image Resizer',
  'image-bg-remove': 'Background Remover',
  'file-compressor': 'File Compressor',
  'file-converter': 'File Converter',
  'form-creator': 'Form Builder',
  'org-chart': 'Org Chart',
  'dashboard': 'Dashboard',
  'flowchart': 'Flow Chart',
  'qr-code': 'QR Code',
  'json-csv-viewer': 'Data Viewer',
}

/**
 * Ensure user profile exists in localStorage before the app loads.
 * Call this BEFORE page.goto() to prevent the profile modal from blocking tests.
 */
export async function ensureUserProfile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!localStorage.getItem('mt-user-profile')) {
      localStorage.setItem('mt-user-profile', JSON.stringify({ name: 'Test User', email: 'test@test.com', initials: 'TU' }))
    }
  })
}

/** Navigate to a specific tool by its ID via sidebar */
export async function navigateToTool(page: Page, toolId: string) {
  const label = TOOL_LABELS[toolId]
  if (!label) throw new Error(`Unknown tool ID: ${toolId}`)
  // Click the tool button in the sidebar nav
  await page.locator('nav button').filter({ hasText: label }).click()
  await waitForToolLoad(page)
}

/** Navigate home (deselect any tool) */
export async function goHome(page: Page) {
  // Click the home/logo button in the header or sidebar
  const homeButton = page.locator('button').filter({ hasText: 'Multitool' }).first()
  if (await homeButton.isVisible()) {
    await homeButton.click()
  } else {
    // Try the sidebar home button
    await page.locator('[data-testid="home-button"], button:has-text("Home")').first().click()
  }
  await expect(page.locator('h1:has-text("Multitool")')).toBeVisible({ timeout: 5000 })
}

/** Wait for a tool to finish loading (Suspense fallback gone) */
export async function waitForToolLoad(page: Page) {
  // Wait for the loading spinner to disappear
  await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 30000 })
  // Small buffer for rendering
  await page.waitForTimeout(200)
}

/** Navigate to a tool via the welcome screen tool grid */
export async function clickToolCard(page: Page, toolLabel: string) {
  await page.locator('button').filter({ hasText: toolLabel }).first().click()
  await waitForToolLoad(page)
}
