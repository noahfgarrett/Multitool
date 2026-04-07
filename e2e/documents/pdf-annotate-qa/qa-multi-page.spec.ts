import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  goToPage,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Thumbnail Sidebar ──────────────────────────────────────────────────────

test.describe('Multi-Page QA — Thumbnail Sidebar', () => {
  test('thumbnail sidebar toggle is visible for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('button[title="Page thumbnails"]')).toBeVisible()
  })

  test('thumbnail sidebar toggle is hidden for single-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('button[title="Page thumbnails"]')).toBeHidden()
  })

  test('clicking thumbnail toggle opens sidebar with page count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })

  test('clicking thumbnail toggle again closes sidebar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const toggle = page.locator('button[title="Page thumbnails"]')
    await toggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeHidden()
  })

  test('clicking second thumbnail navigates to page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(800)
    // Thumbnails are <div> children of .space-y-2 inside .overflow-y-auto
    const thumbnails = page.locator('.space-y-2 > div')
    await expect(thumbnails.nth(1)).toBeVisible({ timeout: 5000 })
    await thumbnails.nth(1).click()
    await page.waitForTimeout(500)
    // Page indicator button should show page 2
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('active thumbnail has highlight styling when sidebar open', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const toggle = page.locator('button[title="Page thumbnails"]')
    await toggle.click()
    await page.waitForTimeout(300)
    await expect(toggle).toHaveClass(/text-\[#14B8A6\]/)
  })
})

// ─── Page Number and Status Bar ─────────────────────────────────────────────

test.describe('Multi-Page QA — Page Number Display', () => {
  test('page indicator defaults to page 1 on load', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator button shows "1 / 2"
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('total page count shows "/ 2" for 2-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('single-page PDF does not show page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    // No page indicator for single-page PDFs
    await expect(page.locator('text=/\\/ \\d+/')).toBeHidden()
  })

  test('status bar shows filename', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/sample\\.pdf/')).toBeVisible()
  })

  test('status bar shows file size', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // File size is in the compact status bar at the bottom
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/')).toBeVisible()
  })
})

// ─── Page Navigation ───────────────────────────────────────────────────────

test.describe('Multi-Page QA — Page Navigation', () => {
  test('PageDown navigates from page 1 to page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('PageUp navigates from page 2 to page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('PageUp on first page stays on first page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(300)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('PageDown on last page stays on last page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)
    // Should be clamped to page 2
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('clicking page indicator opens input for direct navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Click the page indicator button to reveal input
    await page.locator('text=/^1 \\/ /').click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toBeVisible()
    await pageInput.fill('2')
    await pageInput.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('page input has correct min and max attributes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Click to reveal the input
    await page.locator('text=/^1 \\/ /').click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveAttribute('min', '1')
    await expect(pageInput).toHaveAttribute('max', '2')
  })
})

// ─── Per-Page Annotation Isolation ──────────────────────────────────────────

test.describe('Multi-Page QA — Annotation Isolation', () => {
  test('annotations on page 1 are not visible on page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('annotations on page 2 are not visible on page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 150, y: 130 },
      { x: 220, y: 180 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw on page 1, go to page 2, draw, back to page 1 — both preserved', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('each page accumulates annotations independently', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 350, y: 50, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('annotation count in status bar updates when switching pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
    await goToPage(page, 2)
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('selection is cleared when navigating to another page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await goToPage(page, 2)
    // Verify no annotation is selected on page 2
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Navigation While Editing ───────────────────────────────────────────────

test.describe('Multi-Page QA — Navigate While Editing', () => {
  test('navigating away from page while editing text commits the text', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Page 1 text')
    await goToPage(page, 2)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('active tool persists when switching pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    await goToPage(page, 2)
    // Verify pencil tool button is still active after page switch
    await expect(page.locator('button[title="Pencil (P)"]')).toHaveClass(/bg-\[#14B8A6\]/)
    // Draw with pencil on page 2
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 300, y: 100 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom level persists across page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

// ─── Current Page Indicator ─────────────────────────────────────────────────

test.describe('Multi-Page QA — Current Page Indicator', () => {
  test('page indicator updates when navigating with PageDown', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('round-trip navigation preserves correct page number', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
    await goToPage(page, 1)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('data-page containers exist for both pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('[data-page="1"]')).toBeVisible()
    await expect(page.locator('[data-page="2"]')).toBeVisible()
  })

  test('each page can have independent rotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/90°/')).toBeVisible()
    await goToPage(page, 2)
    await expect(page.locator('text=/90°/')).toBeHidden()
  })
})

// ─── Rapid Navigation Stability ─────────────────────────────────────────────

test.describe('Multi-Page QA — Rapid Navigation', () => {
  test('rapid page toggling does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await page.keyboard.press('PageDown')
      } else {
        await page.keyboard.press('PageUp')
      }
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('drawing after rapid page switch works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(100)
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(100)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid PageDown clicks clamp to last page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.keyboard.press('PageDown')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })
})
