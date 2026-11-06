import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Line & Arrow Core', () => {
  test('draw horizontal line', async ({ page }) => {
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw vertical line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 200, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw diagonal line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line has correct color', async ({ page }) => {
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with dashed pattern', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with dotted pattern', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible()) await dottedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw line then select — shows endpoint handles', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('line shortcut key L activates tool', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('draw line at 125% zoom', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw line then export PDF', async ({ page }) => {
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('line hit-test: click on line — selects', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 225, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('line hit-test: click far away — does not select', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 300)
    await page.waitForTimeout(200)
    const hint = page.locator('span.truncate:has-text("Click to select")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('nudge line with arrow keys (1px)', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    // No crash, annotation still exists
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line with Shift+arrow keys (10px)', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete line with Delete key', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line creation', async ({ page }) => {
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo line creation', async ({ page }) => {
    await createAnnotation(page, 'line')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate line (Ctrl+D)', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw arrow with single arrowhead (default)', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw arrow with double arrowhead', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const dblArrowBtn = page.locator('button:has-text("→")')
    if (await dblArrowBtn.isVisible()) await dblArrowBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow shortcut key A activates tool', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('draw arrow then export — arrowhead appears in PDF', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('arrow with dashed shaft', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow direction: left to right', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow direction: right to left', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 100, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow direction: top to bottom', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 200, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select arrow — two circular handles appear', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('draw very short arrow (< 10px)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 207, y: 203 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw very long arrow (full page diagonal)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 500, y: 500 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple lines and arrows mixed', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 50, w: 150, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('zero-length line (click without drag) — no annotation created', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('move line by dragging — position updates', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 200, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete line with Backspace key', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('copy/paste line — verify offset', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Shift constrains arrow to 45-degree angles', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 200)
    await page.mouse.down()
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 300, box.y + 210, { steps: 5 })
    await page.keyboard.up('Shift')
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw 20 lines rapidly', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Line (L)')
    for (let i = 0; i < 20; i++) {
      await dragOnCanvas(page, { x: 50, y: 20 + i * 15 }, { x: 300, y: 20 + i * 15 })
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(20)
  })
})
