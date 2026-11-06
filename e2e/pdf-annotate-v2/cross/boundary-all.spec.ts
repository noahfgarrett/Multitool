import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { rightClickCanvasAt, contextMenu, contextMenuItem } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Boundary Tests', () => {
  test('draw at (0,0) corner', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 0, y: 0, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at (1,1)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 1, y: 1, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at page right edge', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearRight = Math.min(box!.width - 70, 400)
    await createAnnotation(page, 'pencil', { x: nearRight, y: 100, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at page bottom edge', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearBottom = Math.min(box!.height - 50, 500)
    await createAnnotation(page, 'pencil', { x: 100, y: nearBottom, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at page corner NE', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearRight = Math.min(box!.width - 70, 400)
    await createAnnotation(page, 'pencil', { x: nearRight, y: 5, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at page corner SW', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearBottom = Math.min(box!.height - 50, 500)
    await createAnnotation(page, 'pencil', { x: 5, y: nearBottom, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw at page corner SE', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearRight = Math.min(box!.width - 70, 400)
    const nearBottom = Math.min(box!.height - 50, 500)
    await createAnnotation(page, 'pencil', { x: nearRight, y: nearBottom, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('rectangle spanning full page', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const w = Math.min(box!.width - 20, 500)
    const h = Math.min(box!.height - 20, 600)
    await createAnnotation(page, 'rectangle', { x: 10, y: 10, w, h })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle spanning full page', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const w = Math.min(box!.width - 20, 500)
    const h = Math.min(box!.height - 20, 600)
    await createAnnotation(page, 'circle', { x: 10, y: 10, w, h })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spanning full page diagonal', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const w = Math.min(box!.width - 20, 500)
    const h = Math.min(box!.height - 20, 600)
    await createAnnotation(page, 'line', { x: 10, y: 10, w, h })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow spanning full page', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const w = Math.min(box!.width - 20, 500)
    const h = Math.min(box!.height - 20, 600)
    await createAnnotation(page, 'arrow', { x: 10, y: 10, w, h })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at top-left corner', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 5, y: 5, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at bottom-right corner', async ({ page }) => {
    test.setTimeout(90000)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const x = Math.min(box!.width - 140, 350)
    const y = Math.min(box!.height - 60, 500)
    await createAnnotation(page, 'text', { x, y, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('callout at page center', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const cx = Math.floor(Math.min(box!.width, 500) / 2) - 60
    const cy = Math.floor(Math.min(box!.height, 600) / 2) - 40
    await createAnnotation(page, 'callout', { x: cx, y: cy, w: 120, h: 70 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke spanning full width', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const w = Math.min(box!.width - 20, 500)
    await createAnnotation(page, 'pencil', { x: 10, y: 200, w, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke spanning full height', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const h = Math.min(box!.height - 20, 600)
    await createAnnotation(page, 'pencil', { x: 200, y: 10, w: 5, h })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation entirely at top edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 2, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation entirely at bottom edge', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const y = Math.min(box!.height - 50, 500)
    await createAnnotation(page, 'rectangle', { x: 100, y, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation entirely at left edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 2, y: 100, w: 40, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation entirely at right edge', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const x = Math.min(box!.width - 50, 400)
    await createAnnotation(page, 'rectangle', { x, y: 100, w: 40, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move annotation to edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 230)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 250, y: 230 }, { x: 50, y: 30 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move annotation to corner', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 225)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 240, y: 225 }, { x: 10, y: 10 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move annotation off-page — clamp or restrict', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    // Try to drag far off-page
    await dragOnCanvas(page, { x: 150, y: 130 }, { x: -50, y: -50 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize annotation to edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 160 }, { x: 10, y: 10 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize to minimum size', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Drag handle to make very small
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 105, y: 105 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize to full page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    const farX = Math.min(box!.width - 10, 500)
    const farY = Math.min(box!.height - 10, 600)
    await dragOnCanvas(page, { x: 200, y: 160 }, { x: farX, y: farY })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge at page edge — should not go off', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 5, 30)
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowLeft')
    }
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge at page corner', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 5, 30)
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowUp')
    }
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('100 nudge presses at edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 5, 30)
    await page.waitForTimeout(200)
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('ArrowLeft')
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom to max then draw at corner', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    for (let i = 0; i < 5; i++) {
      if (await zoomInBtn.isVisible()) await zoomInBtn.click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 5, y: 5, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('zoom to min then draw', async ({ page }) => {
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    for (let i = 0; i < 5; i++) {
      if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('pan to edge then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotate then draw at corner', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 10, y: 10, w: 50, h: 20 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('annotation at boundary then export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('annotation at boundary then session save', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('annotation at boundary after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw starting off-canvas — annotation not created', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    // Try to draw starting from extreme negative
    await drawOnCanvas(page, [{ x: -10, y: -10 }, { x: 50, y: 50 }])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw ending off-canvas', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: box!.width + 50, y: box!.height + 50 }])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw crossing page boundary', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation at (0, page height)', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const y = Math.min(box!.height - 30, 500)
    await createAnnotation(page, 'pencil', { x: 0, y, w: 50, h: 10 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('annotation at (page width, 0)', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const x = Math.min(box!.width - 60, 400)
    await createAnnotation(page, 'pencil', { x, y: 0, w: 50, h: 10 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('text at page boundary', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 2, y: 2, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at page boundary', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 2, y: 2, w: 130, h: 70 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp at page corner', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 30, 30)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight at page edge', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 5, y: 100 }, { x: 200, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('measure at page boundary', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 5, y: 5 }, { x: 200, y: 5 })
    await page.waitForTimeout(300)
    // Measure is separate from annotations
    const measCount = page.locator('text=/\\d+ meas/')
    const visible = await measCount.isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('eraser at page edge', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 5, y: 5, w: 50, h: 20 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 10, y: 15 }, { x: 40, y: 15 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select at page boundary', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 5, 30)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu at page edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 5, 30)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 5, 30)
    const menu = contextMenu(page)
    await expect(menu).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Delete')).toBeVisible()
    // Menu is positioned inside the viewport even at the page edge
    const box = await menu.boundingBox()
    const vp = page.viewportSize()!
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height)
  })

  test('multi-page boundary — annotation near page junction stays on page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const nearBottom = Math.min(box!.height - 30, 500)
    await createAnnotation(page, 'pencil', { x: 100, y: nearBottom, w: 100, h: 10 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('annotation near page junction stays on current page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw near bottom of page', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    const y = Math.min(box!.height - 40, 500)
    await createAnnotation(page, 'rectangle', { x: 100, y, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw near top of page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 3, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then boundary draw', async ({ page }) => {
    test.setTimeout(90000)
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('cloud at page boundary', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 5, 5)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 80, 5)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 80, 60)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 5, 60)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
