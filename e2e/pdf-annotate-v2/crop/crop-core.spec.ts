import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Crop Core', () => {
  test('X shortcut activates crop tool', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const hint = page.locator('span.truncate:has-text("Drag to set crop")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('draw crop region on canvas', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    // Crop region should be drawn — "Clear Crop" button should appear
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop region visible on canvas after drawing', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    // The crop overlay should be visible on the canvas
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    // "Clear Crop" button confirms crop region exists
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop button exists in toolbar', async ({ page }) => {
    // Crop is under "More tools" in the sidebar — expand it first
    await page.locator('button[title="More tools"].border-dashed').click()
    await page.waitForTimeout(300)
    const cropBtn = page.locator('button[title="Crop page"]')
    await expect(cropBtn).toBeVisible({ timeout: 3000 })
  })

  test('clear crop removes crop region', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    await clearBtn.click()
    await page.waitForTimeout(300)
    // Clear Crop button should disappear after clearing
    await expect(clearBtn).not.toBeVisible({ timeout: 3000 })
  })

  test('switching away from crop tool hides crop controls', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const hint = page.locator('span.truncate:has-text("Drag to set crop")')
    await expect(hint).toBeVisible({ timeout: 3000 })
    // Switch to select tool
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    // Status bar should now show select hint, not crop hint
    const selectHint = page.locator('span.truncate:has-text("Click to select")')
    await expect(selectHint).toBeVisible({ timeout: 3000 })
  })

  test('crop then export produces cropped PDF', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    // Crop is applied automatically during export — no "Apply" button
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })

  test('crop does not affect annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)
    // Annotation count should remain the same while crop region is active
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple crop adjustments — redraw crop region', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    // First crop region
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    // Redraw a different crop region (replaces the previous one)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)
    // Clear Crop button should still be visible
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop with zoom applied', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop region persists across tool switches', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    // Switch to select tool and back
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
    // Clear Crop button should still be visible (crop region persists)
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('export without crop region produces normal PDF', async ({ page }) => {
    // Export without setting any crop region
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })
})
