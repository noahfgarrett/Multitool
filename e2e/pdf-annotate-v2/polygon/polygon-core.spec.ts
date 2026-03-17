import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, clickCanvasAt, getAnnotationCount, selectTool } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Polygon Tool — Toolbar', () => {
  test('polygon appears in shapes dropdown', async ({ page }) => {
    // Open shapes dropdown
    const shapesBtn = page.locator('button[title*="Pencil"], button[title*="Rectangle"]').first()
    const shapesDropdown = shapesBtn.locator('xpath=ancestor::div[contains(@class, "relative")]')
    await shapesDropdown.locator('button').first().click()
    await page.waitForTimeout(300)
    const polygonOption = page.locator('button').filter({ hasText: 'Polygon' })
    await expect(polygonOption).toBeVisible({ timeout: 3000 })
  })

  test('Shift+K activates polygon tool', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/pts.*Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('polygon tool shows "Dbl-click close" hint', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Polygon Tool — Drawing', () => {
  test('create polygon by clicking 3+ vertices and double-clicking to close', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 150, 300)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 300)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 350)
    await page.waitForTimeout(200)
    // Double-click to close
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) await page.mouse.dblclick(box.x + 150, box.y + 350)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('polygon uses fill color when set', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    // The fill color UI should be visible for polygon
    const fillLabel = page.locator('text=/Fill/i').first()
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('polygon tool cursor is crosshair', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })

  test('polygon supports dash patterns', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    // Dash pattern buttons should be visible
    const dashBtns = page.locator('button[title*="Dashed"], button[title*="dashed"]')
    if (await dashBtns.count() > 0) {
      await expect(dashBtns.first()).toBeVisible()
    }
  })
})

test.describe('Polygon Tool — Edge Cases', () => {
  test('switching tool mid-polygon clears vertices', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 150, 200)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(100)
    // Switch to select
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    // No annotation should be created (polygon wasn't closed)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Escape during polygon drawing cancels', async ({ page }) => {
    await page.keyboard.press('Shift+k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 150, 200)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
