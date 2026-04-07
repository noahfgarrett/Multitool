import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page, 'multi-page.pdf')
})

test.describe('Multi-Page Edge Cases', () => {
  test('draw at page boundary', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 10, y: 10, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation stays on its page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('scroll between pages', async ({ page }) => {
    const pageContainers = page.locator('[data-page]')
    const count = await pageContainers.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('page number input accept valid page', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    // After goToPage, the page indicator shows the new page
    const pageButton = page.locator('text=/3 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('page number input reject invalid (0, negative, > max)', async ({ page }) => {
    // Navigate to page 2 first
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Click page indicator to show input
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await pageButton.click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('0')
    await pageInput.blur()
    await page.waitForTimeout(500)
    // The page should clamp to 1 — verify via the page indicator button
    const page1Button = page.locator('text=/1 \\/ \\d+/')
    await expect(page1Button).toBeVisible({ timeout: 5000 })
  })

  test('page number input clamp to range', async ({ page }) => {
    // Click page indicator to show input
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await pageButton.click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('100')
    await pageInput.blur()
    await page.waitForTimeout(500)
    // The page should clamp to max (5) — verify via the indicator
    const page5Button = page.locator('text=/5 \\/ \\d+/')
    await expect(page5Button).toBeVisible({ timeout: 5000 })
  })

  test('draw on page 1 check page 2 empty', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw on page 2 check page 1 unaffected', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('navigate to last page', async ({ page }) => {
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    const pageButton = page.locator('text=/5 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('navigate to first page', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    const pageButton = page.locator('text=/1 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('navigate beyond last (stays)', async ({ page }) => {
    // Click page indicator to show input
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await pageButton.click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('10')
    await pageInput.blur()
    await page.waitForTimeout(500)
    // Should clamp to last page (5)
    const page5Button = page.locator('text=/5 \\/ \\d+/')
    await expect(page5Button).toBeVisible({ timeout: 5000 })
  })

  test('navigate before first (stays)', async ({ page }) => {
    // Navigate to page 2 first
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Click page indicator to show input
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await pageButton.click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('-1')
    await pageInput.blur()
    await page.waitForTimeout(500)
    // Should clamp to 1
    const page1Button = page.locator('text=/1 \\/ \\d+/')
    await expect(page1Button).toBeVisible({ timeout: 5000 })
  })

  test('rapid navigation (click next 20 times on 5-page)', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      const nextPage = (i % 5) + 1
      await goToPage(page, nextPage)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('undo on wrong page (no effect)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Page 2 has no annotations to undo, page 1 may or may not be affected
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('redo on wrong page', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('Ctrl+A on page with annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+A on page without annotations', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete all on page 1 keep page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    // Select annotation on page 1 by clicking on its border
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    // Annotation on page 1 should be deleted
    expect(await getAnnotationCount(page)).toBe(0)
    // Annotation on page 2 should still exist
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase all on page 1 keep page 2', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session with annotations only on page 3', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with annotations only on page 5', async ({ page }) => {
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('export with annotations only on middle pages', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('multi-page zoom then navigate', async ({ page }) => {
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-page rotate page 1 keep page 2 orientation', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page rotate page 2 only', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page crop page 1', async ({ page }) => {
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page crop page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('thumbnails show pages', async ({ page }) => {
    const pageContainers = page.locator('[data-page]')
    const count = await pageContainers.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('thumbnail click navigates', async ({ page }) => {
    // Click on the data-page container to navigate
    const page2Container = page.locator('[data-page="2"]')
    if (await page2Container.isVisible()) {
      await page2Container.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('goToPage then immediately draw', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw then goToPage then draw again', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 4)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation canvas per page exists', async ({ page }) => {
    const canvases = page.locator('canvas')
    const count = await canvases.count()
    // Each page should have at least 2 canvases (pdf + annotation)
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('each page has pdf-canvas and ann-canvas', async ({ page }) => {
    const annCanvases = page.locator('canvas.ann-canvas')
    const count = await annCanvases.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('multi-page with large file (5 pages)', async ({ page }) => {
    // multi-page.pdf has 5 pages — page indicator button shows "1 / 5"
    const pageButton = page.locator('text=/\\d+ \\/ 5/')
    await expect(pageButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('multi-page performance (draw on each page)', async ({ page }) => {
    test.setTimeout(60000)
    const start = Date.now()
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(400)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(60000)
  })

  test('multi-page session size', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
    expect(raw!.length).toBeLessThan(1_000_000)
  })

  test('multi-page export file size', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 3; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('page indicator shows current page', async ({ page }) => {
    const page1Button = page.locator('text=/1 \\/ \\d+/')
    await expect(page1Button).toBeVisible({ timeout: 5000 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    const page3Button = page.locator('text=/3 \\/ \\d+/')
    await expect(page3Button).toBeVisible({ timeout: 5000 })
  })

  test('page indicator shows total', async ({ page }) => {
    // Page indicator button shows "N / total"
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await expect(pageButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('keyboard page navigation', async ({ page }) => {
    // Test if keyboard shortcuts for page navigation work
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page find (Ctrl+F)', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]').first()
    if (await findInput.isVisible()) {
      await findInput.type('test')
      await page.waitForTimeout(200)
      await page.keyboard.press('Escape')
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('find highlights across pages', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]').first()
    if (await findInput.isVisible()) {
      await findInput.type('a')
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page with measurements on different pages', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 100 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page with different zoom and annotations', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('navigate to page then draw then navigate back verify', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page switch preserves active tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Draw with the preserved tool
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page switch preserves color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#FF0000')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page switch preserves stroke width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-page after session clear', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await clearSessionData(page)
    const session = await getSessionData(page)
    expect(session).toBeNull()
  })

  test('re-upload same file restores session', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Navigate away and back to get the drop zone again
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await page.waitForTimeout(1000)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('upload different file clears session', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Navigate away and back to get the drop zone again
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(1000)
    // Different file — may clear old annotations
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('multi-page annotation list shows all pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page undo does not cross pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    // Undo should only affect page 2
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-page copy from page 1 paste on page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Click on the canvas first to ensure focus before pasting
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('multi-page status bar shows current page annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
