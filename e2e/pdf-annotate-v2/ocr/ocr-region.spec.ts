import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, dragOnCanvas, clickCanvasAt, getAnnotationCount } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('OCR Region Tool — Toolbar', () => {
  test('OCR Region Scan button visible in right toolbar', async ({ page }) => {
    await expect(page.locator('button[title="OCR Region Scan"]')).toBeVisible({ timeout: 3000 })
  })

  test('clicking button activates tool with status hint', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Drag to scan text in region/')).toBeVisible({ timeout: 3000 })
  })

  test('active state shows orange ring', async ({ page }) => {
    const btn = page.locator('button[title="OCR Region Scan"]')
    await btn.click()
    await page.waitForTimeout(100)
    await expect(btn).toHaveClass(/ring-\[#14B8A6\]/)
  })

  test('tool does not show properties bar', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    const colorPicker = page.locator('text=/Color|Stroke|Opacity/').first()
    expect(await colorPicker.isVisible().catch(() => false)).toBe(false)
  })

  test('cursor is crosshair', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })
})

test.describe('OCR Region Tool — Scanning', () => {
  test('drawing region triggers OCR scan', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 150 })
    await page.waitForTimeout(500)
    const scanning = page.locator('text=/Scanning region/')
    const resultCopy = page.locator('button').filter({ hasText: 'Copy' })
    const noText = page.locator('text=/No text detected/')
    await expect(scanning.or(resultCopy).or(noText)).toBeVisible({ timeout: 30000 })
  })

  test('tiny region (< 10px) does not trigger scan', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 105, y: 105 })
    await page.waitForTimeout(1000)
    await expect(page.locator('text=/Scanning region/')).not.toBeVisible({ timeout: 2000 })
  })

  test('scan does not create annotations', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await page.waitForTimeout(500)
    if (await scanning.isVisible().catch(() => false)) {
      await expect(scanning).not.toBeVisible({ timeout: 30000 })
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Dismiss button closes result popup', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await page.waitForTimeout(500)
    if (await scanning.isVisible().catch(() => false)) {
      await expect(scanning).not.toBeVisible({ timeout: 30000 })
    }
    const dismiss = page.locator('button').filter({ hasText: 'Dismiss' })
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click()
      await page.waitForTimeout(300)
      await expect(dismiss).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('switching tools clears OCR state', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 400, y: 100 })
    await page.waitForTimeout(500)
    await page.keyboard.press('s')
    await page.waitForTimeout(300)
    await expect(page.locator('button').filter({ hasText: 'Dismiss' })).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('OCR Region Tool — Edge Cases', () => {
  test('rapid tool switch mid-scan does not crash', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 300, y: 200 })
    await page.keyboard.press('s')
    await page.waitForTimeout(50)
    await page.keyboard.press('p')
    await page.waitForTimeout(50)
    await page.keyboard.press('r')
    await page.waitForTimeout(500)
    const statusBar = page.locator('span.truncate').first()
    await expect(statusBar).toBeVisible({ timeout: 3000 })
  })

  test('multiple sequential scans work', async ({ page }) => {
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    const dismiss = page.locator('button').filter({ hasText: 'Dismiss' })
    for (let i = 0; i < 2; i++) {
      await dragOnCanvas(page, { x: 20 + i * 10, y: 20 }, { x: 200 + i * 10, y: 100 })
      const scanning = page.locator('text=/Scanning region/')
      await page.waitForTimeout(500)
      if (await scanning.isVisible().catch(() => false)) {
        await expect(scanning).not.toBeVisible({ timeout: 30000 })
      }
      if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click()
        await page.waitForTimeout(200)
      }
    }
    await expect(page.locator('text=/Drag to scan text in region/')).toBeVisible({ timeout: 3000 })
  })

  test('scan with existing annotations preserves them', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 300 }, { x: 200, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="OCR Region Scan"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 300, y: 100 })
    const scanning = page.locator('text=/Scanning region/')
    await page.waitForTimeout(500)
    if (await scanning.isVisible().catch(() => false)) {
      await expect(scanning).not.toBeVisible({ timeout: 30000 })
    }
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
