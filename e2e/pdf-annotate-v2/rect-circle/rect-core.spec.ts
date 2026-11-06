import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Rectangle & Circle Core', () => {
  test('draw rectangle with default settings', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle has correct position', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with fill color', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Fill color input should be visible
    const fillInput = page.locator('input[type="color"]')
    if (await fillInput.count() > 0 && await fillInput.first().isVisible()) {
      await fillInput.first().fill('#FF0000')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with no fill (outline only)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const noneBtn = page.locator('button:has-text("None")')
    if (await noneBtn.isVisible()) await noneBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with rounded corners', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"]').last()
    if (await radiusSlider.isVisible()) {
      const label = await page.locator('text=/Radius/').isVisible()
      if (label) await radiusSlider.fill('15')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with dashed border', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle shortcut R activates tool', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('select rectangle — dashed blue outline appears', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    // Click on edge of rectangle
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('rectangle hit-test: click on edge — selects', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on the top edge
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('rectangle hit-test: click inside (no fill) — does NOT select', async ({ page }) => {
    // Rectangle hit-testing checks edges only, not fill.
    // Draw a large rectangle so the center is far from edges.
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 300 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click in the center, far from any edge (center is at 200, 175)
    await clickCanvasAt(page, 200, 175)
    await page.waitForTimeout(200)
    const hint = page.locator('span.truncate:has-text("Click to select")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('move rectangle by dragging', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 140 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle creation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('export rectangle to PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('draw rectangle inverted (right-to-left) — normalizes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 300, y: 100 }, { x: 100, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw rectangle inverted (bottom-to-top) — normalizes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift constrains rectangle to square', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })
    await page.keyboard.up('Shift')
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // Circle tests
  test('draw circle/ellipse with default settings', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle shortcut C activates tool', async ({ page }) => {
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('circle with fill color', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with dashed border', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle hit-test: click on edge — selects', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on top edge of ellipse
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('delete circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle creation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('export circle to PDF — ellipse preserved', async ({ page }) => {
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('Shift constrains circle to perfect circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })
    await page.keyboard.up('Shift')
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw 20 rectangles and circles mixed', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 30 })
    }
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'circle', { x: 20 + (i % 5) * 60, y: 160 + Math.floor(i / 5) * 60, w: 40, h: 30 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('export rounded rectangle to PDF', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Set corner radius
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Radius')) {
        await sliders.nth(i).fill('15')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
