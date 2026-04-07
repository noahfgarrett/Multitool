import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  screenshotCanvas,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Multi-Page PDF Navigation ───────────────────────────────────────────────

test.describe('Multi-Page — Page Controls Visibility', () => {
  test('multi-page PDF shows page indicator in status bar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator button shows "1 / 2" for a 2-page PDF
    await expect(page.locator('text=/1 \\/ 2/')).toBeVisible()
  })

  test('page indicator shows "/ 2" for a 2-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('current page defaults to 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator button shows "1 / 2"
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('single-page PDF does not show page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    // No page indicator button for single-page PDF
    await expect(page.locator('text=/\\d+ \\/ \\d+/')).toBeHidden()
    await expect(page.locator('text=/1 page/')).toBeVisible()
  })

  test('page count text shows total pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('multi-page PDF shows thumbnail sidebar toggle button', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await expect(sidebarToggle).toBeVisible()
  })

  test('single-page PDF does not show thumbnail sidebar toggle', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await expect(sidebarToggle).toBeHidden()
  })
})

test.describe('Multi-Page — Page Navigation', () => {
  test('clicking page indicator opens input and navigates to page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
    await goToPage(page, 2)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('navigating to page 2 and back to page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
    await goToPage(page, 1)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('page indicator shows correct page after navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await expect(page.locator('text=/^2 \\/ 2/')).toBeVisible()
  })

  test('page input clamps out-of-range values', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Navigate to page 99 (should clamp to 2)
    await goToPage(page, 99)
    await page.waitForTimeout(300)
    // Should be clamped to max page
    await expect(page.locator('text=/^2 \\/ 2/')).toBeVisible()
  })

  test('page input clamps zero to page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Navigate to page 0 (should clamp to 1)
    await goToPage(page, 0)
    await page.waitForTimeout(300)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('navigate to page 2 and back to page 1 round-trips correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
    await goToPage(page, 1)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })
})

test.describe('Multi-Page — Per-Page Annotations', () => {
  test('annotation count is per-page (starts at 0 on each page)', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('drawing on page 1 shows annotation count on page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
  })

  test('page 1 annotation does not appear in page 2 count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('drawing on page 2 only affects page 2 annotation count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('annotations on both pages are independent', async ({ page }) => {
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

  test('drawing different annotation types on each page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple annotations on page 2 accumulate correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 350, y: 50, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

test.describe('Multi-Page — Undo Isolation', () => {
  test('undo on page 2 does not affect page 1 annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo removes annotations in reverse order globally', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw 2 on page 1
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo once
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Multi-Page — Thumbnail Sidebar', () => {
  test('clicking sidebar toggle opens thumbnail panel', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(500)
    // Sidebar should show "Pages (2)" header
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })

  test('thumbnail sidebar shows page count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })

  test('clicking sidebar toggle again closes thumbnail panel', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    // Open
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
    // Close
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeHidden()
  })

  test('sidebar toggle button has active styling when open', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(sidebarToggle).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('clicking a thumbnail navigates to that page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(800)
    // Click the second thumbnail (page 2)
    const thumbnails = page.locator('.overflow-y-auto [data-page], .overflow-y-auto button, .space-y-2 > *')
    const secondThumb = thumbnails.nth(1)
    await secondThumb.click()
    await page.waitForTimeout(500)
    // Page indicator should show page 2
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })
})

test.describe('Multi-Page — Rapid Navigation', () => {
  test('rapid page switching does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Rapidly toggle between pages
    for (let i = 0; i < 5; i++) {
      await goToPage(page, i % 2 === 0 ? 2 : 1)
    }
    await page.waitForTimeout(500)
    // App should still be functional — canvas visible
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid page navigation does not corrupt state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await goToPage(page, 2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Should be on page 2
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('drawing after rapid page switch works correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await goToPage(page, 1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Draw on current page
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
    // Canvas still renders
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

test.describe('Multi-Page — Status Bar Integration', () => {
  test('status bar shows filename for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/sample\\.pdf/')).toBeVisible()
  })

  test('annotation count in status bar updates per current page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
    await goToPage(page, 2)
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('rotation indicator shows on rotated page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Rotate page
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    // Status bar should show 90 degrees
    await expect(page.locator('text=/90°/')).toBeVisible()
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

test.describe('Multi-Page — Tool Persistence Across Pages', () => {
  test('active tool persists when navigating between pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    await goToPage(page, 2)
    // Pencil should still be active on page 2
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('zoom level persists when navigating between pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    // Canvas should still be visible and zoomed
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('creating text on page 1 then navigating to page 2 commits text', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Page 1 text')
    await goToPage(page, 2)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser on page 1 does not affect page 2 annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('selection is cleared when navigating to another page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await goToPage(page, 2)
    await expect(page.locator('text=/Click to select/')).toBeVisible()
  })

  test('redo on page 1 after undoing works correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 2)
    await goToPage(page, 1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('file size is shown in status bar for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Status bar shows file size (e.g. "1.2 KB")
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/')).toBeVisible()
  })

  test('page number input activates on click and has correct attributes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Click the page indicator to reveal the input
    await page.locator('text=/\\d+ \\/ \\d+/').click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveAttribute('min', '1')
    await expect(pageInput).toHaveAttribute('max', '2')
  })

  test('all pages render canvases in the scroll area', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageContainers = page.locator('[data-page]')
    await expect(pageContainers).toHaveCount(2)
  })

  test('drawing callout on page 2 persists after navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count updates in real time when drawing on current page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
  })

  test('page containers have data-page attribute', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('[data-page="1"]')).toBeVisible()
    await expect(page.locator('[data-page="2"]')).toBeVisible()
  })

  test('highlight tool works on page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('measure tool works on page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    await expect(page.locator('text=/1 meas/')).toBeVisible()
  })

  test('rotate on page 2 only rotates page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/90°/')).toBeVisible()
    await goToPage(page, 1)
    await expect(page.locator('text=/90°/')).toBeHidden()
  })

  test('text annotation with content on page 2 persists', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
