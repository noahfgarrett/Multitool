import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  createAnnotation, getAnnotationCount,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

/** Click the "Markups list" toolbar button to open/toggle the MarkupsList panel */
async function clickMarkupsListButton(page: import('@playwright/test').Page): Promise<void> {
  const btn = page.locator('button[title="Markups list"]')
  await expect(btn).toBeVisible()
  await btn.click()
  await page.waitForTimeout(300)
}

/** Expand the markups panel by clicking the collapsed header bar */
async function expandMarkupsPanel(page: import('@playwright/test').Page): Promise<void> {
  // The header is a <button> containing "Markups" text — click it to toggle collapsed state
  const header = page.locator('button').filter({ hasText: /^Markups \(/ }).first()
  await expect(header).toBeVisible()
  await header.click()
  await page.waitForTimeout(200)
}

// ── Markups List Panel ──────────────────────────────────────────

test.describe('Markups List Panel', () => {
  test('markups list button exists with correct title', async ({ page }) => {
    const btn = page.locator('button[title="Markups list"]')
    await expect(btn).toBeVisible()
    // The button contains a FileSpreadsheet icon (rendered as SVG)
    const svg = btn.locator('svg')
    await expect(svg).toBeVisible()
  })

  test('clicking markups list button opens panel showing Markups header', async ({ page }) => {
    await clickMarkupsListButton(page)
    // The panel renders a header button with "Markups (N)" text
    const header = page.locator('button').filter({ hasText: /^Markups \(/ }).first()
    await expect(header).toBeVisible()
  })

  test('empty markups list shows zero count', async ({ page }) => {
    await clickMarkupsListButton(page)
    // Header should show "Markups (0)"
    const header = page.locator('button').filter({ hasText: 'Markups (0)' }).first()
    await expect(header).toBeVisible()
  })

  test('after drawing an annotation markups count updates', async ({ page }) => {
    await clickMarkupsListButton(page)
    // Verify starts at 0
    const header = page.locator('button').filter({ hasText: /^Markups \(/ }).first()
    await expect(header).toContainText('Markups (0)')

    // Draw a rectangle
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.waitForTimeout(300)

    // Count should now be 1
    await expect(header).toContainText('Markups (1)')
  })

  test('expanded panel has column headers', async ({ page }) => {
    await clickMarkupsListButton(page)
    await expandMarkupsPanel(page)

    // The table should have these column headers
    const table = page.locator('table')
    await expect(table).toBeVisible()
    const headerRow = table.locator('thead tr')
    await expect(headerRow.locator('th').filter({ hasText: 'Type' })).toBeVisible()
    await expect(headerRow.locator('th').filter({ hasText: 'Page' })).toBeVisible()
    await expect(headerRow.locator('th').filter({ hasText: 'Label' })).toBeVisible()
    await expect(headerRow.locator('th').filter({ hasText: 'Color' })).toBeVisible()
    await expect(headerRow.locator('th').filter({ hasText: 'Status' })).toBeVisible()
    await expect(headerRow.locator('th').filter({ hasText: 'Date' })).toBeVisible()
  })

  test('expanded panel has filter dropdowns for Type and Status', async ({ page }) => {
    await clickMarkupsListButton(page)
    await expandMarkupsPanel(page)

    // Type filter dropdown with "All Types" default
    const typeSelect = page.locator('select').filter({ hasText: 'All Types' }).first()
    await expect(typeSelect).toBeVisible()

    // Status filter dropdown with "All Statuses" default
    const statusSelect = page.locator('select').filter({ hasText: 'All Statuses' }).first()
    await expect(statusSelect).toBeVisible()
  })

  test('expanded panel has Export CSV button', async ({ page }) => {
    await clickMarkupsListButton(page)
    await expandMarkupsPanel(page)

    const exportBtn = page.locator('button[title="Export CSV"]')
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toContainText('Export CSV')
  })

  test('clicking annotation row in list selects annotation', async ({ page }) => {
    // Draw a rectangle
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.waitForTimeout(300)

    // Open markups panel and expand it
    await clickMarkupsListButton(page)
    await expandMarkupsPanel(page)

    // Find the table row for the annotation and click it
    const row = page.locator('table tbody tr').first()
    await expect(row).toBeVisible()
    await row.click()
    await page.waitForTimeout(300)

    // The row should now have the selected highlight class (bg-[#14B8A6]/10)
    await expect(row).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('panel can be collapsed and expanded by clicking header', async ({ page }) => {
    await clickMarkupsListButton(page)

    // Panel starts collapsed — table should NOT be visible
    const table = page.locator('table')
    await expect(table).toBeHidden()

    // Expand by clicking header
    await expandMarkupsPanel(page)
    await expect(table).toBeVisible()

    // Collapse again by clicking header
    const header = page.locator('button').filter({ hasText: /^Markups \(/ }).first()
    await header.click()
    await page.waitForTimeout(200)
    await expect(table).toBeHidden()
  })

  test('after deleting all annotations list returns to empty', async ({ page }) => {
    // Draw two annotations
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 120, h: 30 })
    await page.waitForTimeout(300)

    // Open panel
    await clickMarkupsListButton(page)
    const header = page.locator('button').filter({ hasText: /^Markups \(/ }).first()
    await expect(header).toContainText('Markups (2)')

    // Undo both annotations (more reliable than click-to-select-then-delete)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)

    // Header should show 0
    await expect(header).toContainText('Markups (0)')

    // Expand — empty state text should be visible
    await expandMarkupsPanel(page)
    await expect(page.locator('text=No markups found')).toBeVisible()
  })
})

// ── Bookmarks Panel ─────────────────────────────────────────────

test.describe('Bookmarks Panel', () => {
  test('bookmarks button is hidden for PDF without bookmarks', async ({ page }) => {
    // sample.pdf has no bookmarks, so the button should not render at all
    const btn = page.locator('button[title="Bookmarks"]')
    await expect(btn).toBeHidden()
  })

  test('bookmarks button hidden for single-page PDF without bookmarks', async ({ page }) => {
    // Re-upload single-page.pdf which also has no bookmarks
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'single-page.pdf')
    const btn = page.locator('button[title="Bookmarks"]')
    await expect(btn).toBeHidden()
  })

  test('no crash when PDF has no bookmarks', async ({ page }) => {
    // The app should render normally without the bookmarks button
    const btn = page.locator('button[title="Bookmarks"]')
    await expect(btn).toBeHidden()

    // Verify the rest of the toolbar is functional
    const markupsBtn = page.locator('button[title="Markups list"]')
    await expect(markupsBtn).toBeVisible()

    // Verify canvas is still interactive
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bookmarks button does not appear for multi-page PDF without bookmarks', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const btn = page.locator('button[title="Bookmarks"]')
    await expect(btn).toBeHidden()
  })
})
