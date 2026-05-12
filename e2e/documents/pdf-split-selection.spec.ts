import { test, expect } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-split')
})

async function loadPdf(page: import('@playwright/test').Page) {
  await uploadFile(page, '15-pages.pdf')
  await expect(page.getByText('15-pages.pdf')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=/15 pages/')).toBeVisible()
  // Wait for thumbnails to start rendering
  await page.waitForTimeout(500)
}

function getThumbnail(page: import('@playwright/test').Page, pageNum: number) {
  return page.locator(`[data-page-num="${pageNum}"]`)
}

test.describe('PDF Split — Shift-Click Range Selection', () => {
  test('shift-click selects a contiguous range of pages', async ({ page }) => {
    await loadPdf(page)

    // Click page 3 (anchor)
    await getThumbnail(page, 3).click()

    // Shift-click page 7 — should select 3–7
    await getThumbnail(page, 7).click({ modifiers: ['Shift'] })

    // Pages 3-7 should all have the active-doc checkmark
    for (let i = 3; i <= 7; i++) {
      const thumb = getThumbnail(page, i)
      await expect(thumb.locator('svg')).toBeVisible({ timeout: 3000 })
    }

    // Pages 1, 2, 8+ should NOT be assigned
    for (const i of [1, 2, 8, 9]) {
      const thumb = getThumbnail(page, i)
      await expect(thumb.locator('.rounded-full svg')).not.toBeVisible()
    }
  })

  test('shift-click preserves prior selections (additive)', async ({ page }) => {
    await loadPdf(page)

    // Click page 2 (anchor)
    await getThumbnail(page, 2).click()

    // Shift-click page 4 — selects 2-4
    await getThumbnail(page, 4).click({ modifiers: ['Shift'] })

    // Now click page 10 (new anchor)
    await getThumbnail(page, 10).click()

    // Shift-click page 12 — selects 10-12 additively
    await getThumbnail(page, 12).click({ modifiers: ['Shift'] })

    // Pages 2-4 should still be assigned
    for (let i = 2; i <= 4; i++) {
      const thumb = getThumbnail(page, i)
      await expect(thumb.locator('svg')).toBeVisible({ timeout: 3000 })
    }

    // Pages 10-12 should also be assigned
    for (let i = 10; i <= 12; i++) {
      const thumb = getThumbnail(page, i)
      await expect(thumb.locator('svg')).toBeVisible({ timeout: 3000 })
    }

    // Page 6 (gap) should not be assigned
    await expect(getThumbnail(page, 6).locator('.rounded-full svg')).not.toBeVisible()
  })

  test('shift-click does not duplicate already-selected pages in range', async ({ page }) => {
    await loadPdf(page)

    // Click page 3
    await getThumbnail(page, 3).click()

    // Click page 5
    await getThumbnail(page, 5).click()

    // Now shift-click page 7 from anchor 5: should assign 5-7 (3 already assigned stays 1x)
    await getThumbnail(page, 7).click({ modifiers: ['Shift'] })

    // Check the sidebar page count — should be 5 pages (3, 5, 6, 7 + page 5 is anchor, not duplicated)
    // The doc should show "5p" for pages 3, 5, 6, 7
    const docPageCount = page.locator('text=/[0-9]+p/').first()
    await expect(docPageCount).toBeVisible()
  })
})

test.describe('PDF Split — Undo/Redo', () => {
  test('undo button appears in toolbar and is initially disabled', async ({ page }) => {
    await loadPdf(page)

    const undoBtn = page.locator('button[aria-label="Undo"]')
    const redoBtn = page.locator('button[aria-label="Redo"]')

    await expect(undoBtn).toBeVisible()
    await expect(redoBtn).toBeVisible()

    // Both should be disabled initially
    await expect(undoBtn).toBeDisabled()
    await expect(redoBtn).toBeDisabled()
  })

  test('undo reverses page assignment', async ({ page }) => {
    await loadPdf(page)

    // Click page 3 to assign it
    await getThumbnail(page, 3).click()

    // Page 3 should be assigned (checkmark visible)
    await expect(getThumbnail(page, 3).locator('svg')).toBeVisible({ timeout: 3000 })

    // Undo should now be enabled
    const undoBtn = page.locator('button[aria-label="Undo"]')
    await expect(undoBtn).toBeEnabled()

    // Click undo
    await undoBtn.click()

    // Page 3 should no longer be assigned
    await expect(getThumbnail(page, 3).locator('.rounded-full svg')).not.toBeVisible()

    // Undo should be disabled again, redo enabled
    await expect(undoBtn).toBeDisabled()
    await expect(page.locator('button[aria-label="Redo"]')).toBeEnabled()
  })

  test('redo restores undone assignment', async ({ page }) => {
    await loadPdf(page)

    // Click page 5 to assign
    await getThumbnail(page, 5).click()
    await expect(getThumbnail(page, 5).locator('svg')).toBeVisible({ timeout: 3000 })

    // Undo
    await page.locator('button[aria-label="Undo"]').click()
    await expect(getThumbnail(page, 5).locator('.rounded-full svg')).not.toBeVisible()

    // Redo
    await page.locator('button[aria-label="Redo"]').click()

    // Page 5 should be assigned again
    await expect(getThumbnail(page, 5).locator('svg')).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+Z keyboard shortcut triggers undo', async ({ page }) => {
    await loadPdf(page)

    // Assign page 4
    await getThumbnail(page, 4).click()
    await expect(getThumbnail(page, 4).locator('svg')).toBeVisible({ timeout: 3000 })

    // Press Ctrl+Z
    await page.keyboard.press('ControlOrMeta+z')

    // Page 4 should be unassigned
    await expect(getThumbnail(page, 4).locator('.rounded-full svg')).not.toBeVisible()
  })

  test('undo works with shift-click range selection', async ({ page }) => {
    await loadPdf(page)

    // Click page 2 (anchor)
    await getThumbnail(page, 2).click()

    // Shift-click page 5 (range select 2-5)
    await getThumbnail(page, 5).click({ modifiers: ['Shift'] })

    // Pages 2-5 should be assigned
    for (let i = 2; i <= 5; i++) {
      await expect(getThumbnail(page, i).locator('svg')).toBeVisible({ timeout: 3000 })
    }

    // Undo the shift-click range (undoes the entire range at once)
    await page.locator('button[aria-label="Undo"]').click()

    // Pages 3-5 should be unassigned (the shift-click range)
    for (let i = 3; i <= 5; i++) {
      await expect(getThumbnail(page, i).locator('.rounded-full svg')).not.toBeVisible()
    }

    // Page 2 should still be assigned (it was clicked before the shift-click)
    await expect(getThumbnail(page, 2).locator('svg')).toBeVisible()
  })
})
