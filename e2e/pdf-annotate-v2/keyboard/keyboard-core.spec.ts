import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, getAnnotationCount, createAnnotation,
  clickCanvasAt, dragOnCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Keyboard Shortcuts Core', () => {
  test('S → select tool', async ({ page }) => {
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Click to select · Ctrl\\+A all/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('P → pencil tool', async ({ page }) => {
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('L → line tool', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift to snap angles/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('A → arrow tool', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift to snap angles/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('R → rectangle tool', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift = constrain, Alt = from center/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('C → circle tool', async ({ page }) => {
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift = constrain, Alt = from center/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('K → cloud tool', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('T → text tool', async ({ page }) => {
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Drag to create text/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('O → callout tool', async ({ page }) => {
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Drag to create callout/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('E → eraser tool', async ({ page }) => {
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('none')
  })

  test('H → highlighter tool', async ({ page }) => {
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('M → measure tool', async ({ page }) => {
    await page.keyboard.press('m')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Click two points/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('X → crop tool', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const hint = page.locator('span.truncate:has-text("Drag to set crop")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+Z → undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z → redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Delete → delete selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace → delete selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+D → duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C / Ctrl+V → copy/paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Arrow keys → nudge 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift+Arrow → nudge 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Escape → deselect', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Click to select · Ctrl\\+A all/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+F → open find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
  })

  test('shortcuts disabled during text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    // Press P (should type 'p', not switch to pencil)
    await page.keyboard.type('p')
    const textarea = page.locator('textarea')
    const value = await textarea.inputValue()
    expect(value).toBe('p')
    await page.keyboard.press('Escape')
  })

  test('Ctrl+B/I/U work during text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('bold')
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+] → bring to front', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ → send to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 220, 160)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
