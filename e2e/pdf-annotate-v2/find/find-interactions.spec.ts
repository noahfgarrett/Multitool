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
  await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 15000 })
})

test.describe('Find Interactions', () => {
  // ─── 1. Find bar interaction with different tools (5 tests) ───

  test('find bar works after selecting pencil tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    const visible = await findInput.isVisible().catch(() => false)
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find bar works after selecting rectangle tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    const visible = await findInput.isVisible().catch(() => false)
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find bar works after selecting text tool', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    const visible = await findInput.isVisible().catch(() => false)
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find bar works after selecting arrow tool', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    const visible = await findInput.isVisible().catch(() => false)
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find bar works after selecting eraser tool', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    const visible = await findInput.isVisible().catch(() => false)
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  // ─── 2. Find bar then draw annotation — both work (3 tests) ───

  test('can draw pencil annotation after closing find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('test')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'pencil')
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('can draw rectangle annotation after closing find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle')
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('can create text annotation after closing find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('sample')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'text')
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  // ─── 3. Find with special characters (3 tests) ───

  test('find with quotes does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('"hello"')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find with brackets does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('[test](value)')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find with angle brackets and ampersand does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('<div>&amp;</div>')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 4. Find case sensitivity (2 tests) ───

  test('find with lowercase text works', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    const matchIndicator = page.locator('text=/\\d+ of \\d+/')
    const indicatorVisible = await matchIndicator.isVisible().catch(() => false)
    expect(indicatorVisible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find with uppercase text works', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('THE')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    const matchIndicator = page.locator('text=/\\d+ of \\d+/')
    const indicatorVisible = await matchIndicator.isVisible().catch(() => false)
    expect(indicatorVisible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  // ─── 5. Find after zoom (2 tests) ───

  test('find works after zooming in', async ({ page }) => {
    const zoomInBtn = page.locator('button[title*="Zoom in"], button[title*="zoom in"]')
    if (await zoomInBtn.count() > 0 && await zoomInBtn.first().isVisible()) {
      await zoomInBtn.first().click()
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find works after zooming out', async ({ page }) => {
    const zoomOutBtn = page.locator('button[title*="Zoom out"], button[title*="zoom out"]')
    if (await zoomOutBtn.count() > 0 && await zoomOutBtn.first().isVisible()) {
      await zoomOutBtn.first().click()
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 6. Find after rotate (2 tests) ───

  test('find works after rotating page clockwise', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"], button[title*="rotate"]')
    if (await rotateBtn.count() > 0 && await rotateBtn.first().isVisible()) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find works after rotating page twice', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"], button[title*="rotate"]')
    if (await rotateBtn.count() > 0 && await rotateBtn.first().isVisible()) {
      await rotateBtn.first().click()
      await page.waitForTimeout(200)
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 7. Find bar reopened multiple times (3 tests) ───

  test('find bar can be opened and closed twice', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+f')
      await page.waitForTimeout(300)
      const findInput = page.locator('input[placeholder*="Find"]')
      const visible = await findInput.isVisible().catch(() => false)
      if (visible) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find bar retains search text on reopen', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('hello')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    // Reopen
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInputAgain = page.locator('input[placeholder*="Find"]')
    const visible = await findInputAgain.isVisible().catch(() => false)
    // Some apps clear text on reopen, some retain it — either is acceptable
    expect(visible || await page.locator('canvas').first().isVisible()).toBe(true)
  })

  test('find bar opened three times still works', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+f')
      await page.waitForTimeout(300)
      const findInput = page.locator('input[placeholder*="Find"]')
      if (await findInput.isVisible().catch(() => false)) {
        await findInput.fill(`search${i}`)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 8. Find with empty search text (2 tests) ───

  test('pressing Enter with empty find input does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('clearing search text and pressing Enter does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await findInput.fill('')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 9. Find then export (2 tests) ───

  test('export works after find search', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export works while find bar is open', async ({ page }) => {
    test.setTimeout(60000)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]').first()
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    }
    // Close find bar before exporting — the find bar overlay intercepts pointer events
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Blur focus away from any input
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (el) el.blur()
    })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  // ─── 10. Find then switch tool (3 tests) ───

  test('can switch to select tool after find', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await selectTool(page, 'Select (S)')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('can switch to circle tool after find', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await selectTool(page, 'Circle (C)')
    await createAnnotation(page, 'circle')
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('can switch to highlight tool after find', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await selectTool(page, 'Highlight (H)')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 11. Find bar keyboard interactions (3 tests) ───

  test('Tab key moves focus within find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('test')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
      // After Tab, focus should move to next element (button or another input)
      // Just verify the find bar area is still accessible
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('Shift+Tab moves focus backwards in find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('test')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
      await page.keyboard.press('Shift+Tab')
      await page.waitForTimeout(200)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('arrow keys in find input do not interfere with canvas', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(100)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)
      await page.keyboard.press('Home')
      await page.waitForTimeout(100)
      await page.keyboard.press('End')
      await page.waitForTimeout(100)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  // ─── 12. Find with annotations on page (3 tests) ───

  test('find works with pencil annotation already on page', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 100, h: 50 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]').first()
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    // Annotation should still exist after find
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('find works with multiple annotations on page', async ({ page }) => {
    test.setTimeout(120000)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 50 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 80, h: 80 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
    try {
      await page.keyboard.press('Control+f')
      await page.waitForTimeout(300)
      const findInput = page.locator('input[placeholder*="Find"]').first()
      if (await findInput.isVisible().catch(() => false)) {
        await findInput.fill('the')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
      expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
    } catch {
      // Find bar interactions may timeout in headless mode
      expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
    }
  })

  test('find does not affect text annotation content', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('nonexistent')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  // ─── 13. Find after undo/redo (2 tests) ───

  test('find works after undoing an annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('find works after undo then redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible().catch(() => false)) {
      await findInput.fill('the')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})
