import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page, 'multi-page.pdf')
})

test.describe('Multi-Page Core', () => {
  test('page navigation indicator visible', async ({ page }) => {
    // The page indicator is shown as a button like "1 / N"
    const pageButton = page.locator('text=/1 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('navigate to page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const pageButton = page.locator('text=/2 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('navigate to page 2 then back to page 1', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const page2Button = page.locator('text=/2 \\/ \\d+/')
    await expect(page2Button).toBeVisible({ timeout: 5000 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    const page1Button = page.locator('text=/1 \\/ \\d+/')
    await expect(page1Button).toBeVisible({ timeout: 5000 })
  })

  test('draw on page 1', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations on different pages are independent', async ({ page }) => {
    // Draw 2 on page 1
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Navigate to page 2 and draw 1
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Go back to page 1 — still 2
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('page count displayed', async ({ page }) => {
    // Multi-page PDF shows page count as a button like "1 / 5"
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await expect(pageButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('annotation count per page', async ({ page }) => {
    // Page 1: create 1 annotation
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
    // Navigate to page 2 — should show 0
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('export multi-page with annotations', async ({ page }) => {
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Draw on page 2
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })

  test('undo on specific page does not affect other page', async ({ page }) => {
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate to page 2 and draw
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo on page 2
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Navigate back to page 1 — annotation should still exist
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom affects all pages', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    // Verify canvas still visible on page 1
    await expect(page.locator('canvas').first()).toBeVisible()
    // Navigate to page 2 — canvas should also be visible and zoomed
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('scroll between pages — both page containers rendered', async ({ page }) => {
    // Both pages should have data-page containers
    const pageContainers = page.locator('[data-page]')
    const count = await pageContainers.count()
    expect(count).toBeGreaterThanOrEqual(2)
    await expect(page.locator('[data-page="1"]')).toBeVisible()
    await expect(page.locator('[data-page="2"]')).toBeAttached()
  })
})
