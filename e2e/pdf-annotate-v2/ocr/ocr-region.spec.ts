import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, dragOnCanvas, clickCanvasAt, getAnnotationCount } from '../../helpers/pdf-annotate'
import { clickSecondaryTool, openSecondaryTools, blockTesseractCdn } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('OCR Region Tool — Toolbar', () => {
  test('OCR Region Scan button visible in right toolbar', async ({ page }) => {
    await openSecondaryTools(page)
    await expect(page.locator('button[title="OCR Region Scan"]')).toBeVisible({ timeout: 3000 })
  })

  test('clicking button activates tool with status hint', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Drag to scan text in region/')).toBeVisible({ timeout: 3000 })
  })

  test('active state shows teal ring', async ({ page }) => {
    await openSecondaryTools(page)
    const btn = page.locator('button[title="OCR Region Scan"]')
    await btn.click()
    await page.waitForTimeout(100)
    await expect(btn).toHaveClass(/ring-\[#14B8A6\]/)
  })

  test('tool does not show properties bar', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    const colorPicker = page.locator('text=/Color|Stroke|Opacity/').first()
    expect(await colorPicker.isVisible().catch(() => false)).toBe(false)
  })

  test('cursor is crosshair', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.active-canvas').first()
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })
})

test.describe('OCR Region Tool — Scanning', () => {
  test('drawing region triggers OCR scan', async ({ page }) => {
    await blockTesseractCdn(page)
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 150 })
    await expect(page.locator('text=/Scanning region/')).toBeVisible({ timeout: 5000 })
  })

  test('tiny region (< 10px) does not trigger scan', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 105, y: 105 })
    await page.waitForTimeout(1000)
    await expect(page.locator('text=/Scanning region/')).not.toBeVisible({ timeout: 2000 })
  })

  test('scan does not create annotations', async ({ page }) => {
    await blockTesseractCdn(page)
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await expect(scanning).toBeVisible({ timeout: 5000 })
    // With the Tesseract CDN blocked the scan finishes on the error path
    await expect(scanning).toBeHidden({ timeout: 15000 })
    await expect(page.locator('text=OCR scan failed')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // Needs internet: region OCR only runs Tesseract, whose language data is fetched from cdn.jsdelivr.net
  test.fixme('Dismiss button closes result popup', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    const dismiss = page.locator('button').filter({ hasText: 'Dismiss' })
    await expect(dismiss).toBeVisible({ timeout: 30000 })
    await dismiss.click()
    await expect(dismiss).not.toBeVisible({ timeout: 3000 })
  })

  // App bug: an in-flight scan still shows its result popup after switching tools
  // (PdfAnnotateTool.tsx: the clear effect at ~2946 runs only on tool change; the async
  // completion at ~5116 sets ocrRegionResult without checking the tool is still ocrRegion)
  test.fixme('switching tools clears OCR state', async ({ page }) => {
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await expect(scanning).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('s')
    await expect(page.locator('text=/Click to select/')).toBeVisible()
    await expect(scanning).toBeHidden()
    // Wait past the scan's completion: no result popup may appear for the old tool
    await page.waitForTimeout(5000)
    await expect(page.locator('button').filter({ hasText: 'Dismiss' })).not.toBeVisible()
  })
})

test.describe('OCR Region Tool — Edge Cases', () => {
  test('rapid tool switch mid-scan does not crash', async ({ page }) => {
    await blockTesseractCdn(page)
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 300, y: 200 })
    await page.keyboard.press('s')
    await page.waitForTimeout(50)
    await page.keyboard.press('p')
    await page.waitForTimeout(50)
    await page.keyboard.press('r')
    // Ends on the rectangle tool with the scan popup gone
    await expect(page.locator('text=/Shift = constrain, Alt = from center/')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=/Scanning region/')).toBeHidden()
    await expect(page.locator('canvas.active-canvas').first()).toHaveCSS('cursor', 'crosshair')
  })

  test('multiple sequential scans work', async ({ page }) => {
    await blockTesseractCdn(page)
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    const scanning = page.locator('text=/Scanning region/')
    for (let i = 0; i < 2; i++) {
      await dragOnCanvas(page, { x: 20 + i * 10, y: 20 }, { x: 200 + i * 10, y: 100 })
      await expect(scanning).toBeVisible({ timeout: 5000 })
      await expect(scanning).toBeHidden({ timeout: 15000 })
    }
    // Tool stays active between scans
    await expect(page.locator('text=/Drag to scan text in region/')).toBeVisible({ timeout: 3000 })
  })

  test('scan with existing annotations preserves them', async ({ page }) => {
    await blockTesseractCdn(page)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 300 }, { x: 200, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await clickSecondaryTool(page, 'OCR Region Scan')
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 300, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await expect(scanning).toBeVisible({ timeout: 5000 })
    await expect(scanning).toBeHidden({ timeout: 15000 })
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
