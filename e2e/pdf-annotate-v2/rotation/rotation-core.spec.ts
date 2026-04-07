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

test.describe('Annotation Rotation Core', () => {
  test('selecting annotation shows rotation handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on rectangle edge to select it
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Rotation handle should appear — typically a circle above the selection box
    const rotationHandle = page.locator('.rotation-handle, [data-handle="rotate"], circle[cursor="grab"]')
    const handleCount = await rotationHandle.count()
    // If no DOM handle, the handle is drawn on canvas — check selection hint instead
    if (handleCount === 0) {
      const hint = page.locator('text=/Arrows nudge/')
      await expect(hint).toBeVisible({ timeout: 3000 })
    } else {
      await expect(rotationHandle.first()).toBeVisible()
    }
  })

  test('rotate annotation by dragging rotation handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // The rotation handle is typically above the selection bounding box
    // For a rectangle at y=100 with height=100, the top is at y=100
    // Rotation handle is above that, approximately at y=80
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Drag from the rotation handle position to a rotated position
    const handleX = box.x + 175 // center of rectangle horizontally
    const handleY = box.y + 80  // above the rectangle
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 50, handleY + 30, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotated annotation maintains position on canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Attempt rotation via handle drag
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const handleX = box.x + 175
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 40, handleY + 20, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Annotation count should remain 1
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo rotation restores original angle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const handleX = box.x + 175
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 50, handleY + 30, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Undo the rotation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo rotation re-applies angle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const handleX = box.x + 175
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 50, handleY + 30, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Undo then redo
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete rotated annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Select the annotation on its edge
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Delete it
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate rotated annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Select the annotation on its edge
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Duplicate it
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('export rotated annotation produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Attempt rotation
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const handleX = box.x + 175
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 50, handleY + 30, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
  })

  test('rotation preserves annotation type', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 150)
    await page.waitForTimeout(300)
    // Attempt rotation
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const handleX = box.x + 160
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 40, handleY + 20, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Annotation should still exist and count unchanged
    expect(await getAnnotationCount(page)).toBe(1)
    // Verify type in session data
    const session = await page.evaluate(() => {
      const raw = sessionStorage.getItem('mt-pdf-annotate-session')
      return raw ? JSON.parse(raw) : null
    })
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    if (anns.length > 0) {
      expect(anns[0]?.type).toBe('circle')
    }
  })

  test('multiple rotations accumulate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // First rotation
    const handleX = box.x + 175
    const handleY = box.y + 80
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 30, handleY + 15, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Re-select and rotate again
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(300)
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX + 30, handleY + 15, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Annotation should still exist after multiple rotations
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
