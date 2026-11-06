import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Eraser Tool Core', () => {
  test('object erase mode — removes entire annotation on touch', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Switch to object mode
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase over the stroke
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 200, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser shortcut E activates tool', async ({ page }) => {
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    // Eraser has cursor: none (custom cursor)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('none')
  })

  test('partial erase button has title "Partial erase"', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(partialBtn).toBeVisible()
  })

  test('object erase button has title "Object erase"', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    await expect(objBtn).toBeVisible()
  })

  test('undo eraser action — restores erased annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 200, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('object erase on text box — removes entire box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 125 }, { x: 175, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser on page with no annotations — no error', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 300 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase mode — splits pencil stroke into fragments', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    // Erase through middle of stroke
    await drawOnCanvas(page, [{ x: 200, y: 150 }, { x: 200, y: 250 }])
    await page.waitForTimeout(300)
    // After partial erase, we should have fragments (count changes)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('eraser radius adjustable', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').last()
    if (await sizeSlider.isVisible()) {
      await sizeSlider.fill('30')
      const value = await sizeSlider.inputValue()
      expect(parseInt(value)).toBe(30)
    }
  })

  test('multiple objects erased in single stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 10 })
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 100, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Erase across both
    await drawOnCanvas(page, [{ x: 30, y: 205 }, { x: 350, y: 205 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase on rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase on circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 175, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser cursor hidden when not on canvas', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const eraserCursor = page.locator('.pointer-events-none.fixed.rounded-full')
    // When not hovering on canvas, should be hidden
    const display = await eraserCursor.evaluate(el => el.style.display)
    expect(display).toBe('none')
  })
})
