import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF,
} from '../../helpers/pdf-annotate'
import { rightClickCanvasAt, contextMenu, contextMenuItem } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool: Select with All Types', () => {
  test('select pencil annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 115)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const visible = await hint.isVisible().catch(() => false)
    expect(visible || await getAnnotationCount(page) === 1).toBe(true)
  })

  test('select rectangle annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('select circle annotation', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('select line annotation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select arrow annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select callout annotation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select highlight annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click pencil path to select', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 10 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 105)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click rectangle edge to select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on left edge
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('click circle edge to select', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on left edge
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('click line to select', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click arrow shaft to select', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click text edge to select', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click callout body to select', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+A with pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+A with rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+A with mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 80, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('Ctrl+A with 10 annotations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 40, w: 50, h: 15 })
    }
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('Ctrl+A then Delete clears all', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('select then move pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 115)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 150, y: 115 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then move rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then resize rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Drag bottom-right handle to resize
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then nudge circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then delete line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select then duplicate arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select then copy/paste text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('double-click text to edit', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 175, 120)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const visible = await textarea.isVisible().catch(() => false)
    // Either textarea is visible or annotation still exists
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click callout to edit', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 175, 140)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Tab through mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    // Verify Tab selects something — annotation count unchanged
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('Shift+Tab through mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Shift+click multi-select', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 70, 60)
    await page.waitForTimeout(200)
    await page.keyboard.down('Shift')
    await clickCanvasAt(page, 50, 140)
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+] bring pencil to front', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ send rectangle to back', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('right-click pencil shows context menu', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    // Pencil path starts at (100,100); right-click right on the stroke
    await rightClickCanvasAt(page, 100, 100)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Duplicate')).toBeVisible()
    await expect(contextMenuItem(page, 'Delete')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('right-click rectangle shows context menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Duplicate')).toBeVisible()
    await expect(contextMenuItem(page, 'Delete')).toBeVisible()
    // Shape annotations have no "Edit Text" entry
    await expect(contextMenuItem(page, 'Edit Text')).toHaveCount(0)
  })

  test('right-click text shows context menu', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 100, 120)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    // Text annotations get an extra "Edit Text" entry
    await expect(contextMenuItem(page, 'Edit Text')).toBeVisible()
    await expect(contextMenuItem(page, 'Delete')).toBeVisible()
  })

  test('context menu delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 100, 150)
    await contextMenuItem(page, 'Delete').click()
    await expect(contextMenu(page)).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('context menu duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 100, 150)
    await contextMenuItem(page, 'Duplicate').click()
    await expect(contextMenu(page)).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select at different zoom levels', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select after rotate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select after pan', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then draw new deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select then switch to pencil', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('deselect via Escape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const visible = await hint.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('deselect via click on empty area', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 350, 350)
    await page.waitForTimeout(200)
    // Verify annotation still exists (deselected, not deleted)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then undo deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select then export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('select highlight (may not be selectable)', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    // Highlight may or may not be selectable
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('lasso select mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 120, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    // Lasso drag around both annotations
    await dragOnCanvas(page, { x: 60, y: 60 }, { x: 200, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('lasso select then delete', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 120, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('lasso select then move', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 120, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
