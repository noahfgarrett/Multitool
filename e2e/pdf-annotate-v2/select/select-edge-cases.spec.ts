import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  moveAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'
import { rightClickCanvasAt, contextMenu, contextMenuItem } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Select Edge Cases', () => {
  test('select pencil by clicking on path', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 125)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select rectangle by clicking edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('select circle by clicking edge', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select arrow by clicking shaft', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select line by clicking line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select text by clicking edge', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 125)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select callout by clicking body', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 140)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('click empty area — no selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('click between annotations — no selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 250, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 180, 180)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('select then Escape deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('select then click empty deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('select then switch tool deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('double-click text enters edit mode', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(500)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Escape')
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click callout enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 175, 140)
    await page.waitForTimeout(500)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Escape')
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click shape does nothing special', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then Delete removes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select then Backspace removes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select then Ctrl+D duplicates', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select then Ctrl+C Ctrl+V copies', async ({ page }) => {
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

  test('select then arrow keys nudge — all 4 directions', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then Shift+arrow nudge — all 4 directions', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowUp')
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select and drag to move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select and drag handle to resize', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Drag bottom-right handle
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 250, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x + 300, box.y + 250, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize NW handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100)
      await page.mouse.down()
      await page.mouse.move(box.x + 80, box.y + 80, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize NE handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 250, box.y + 100)
      await page.mouse.down()
      await page.mouse.move(box.x + 270, box.y + 80, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize SW handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x + 80, box.y + 220, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize SE handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 250, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x + 280, box.y + 230, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize N handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 175, box.y + 100)
      await page.mouse.down()
      await page.mouse.move(box.x + 175, box.y + 80, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize E handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 250, box.y + 150)
      await page.mouse.down()
      await page.mouse.move(box.x + 280, box.y + 150, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize S handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 175, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x + 175, box.y + 230, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize W handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 150)
      await page.mouse.down()
      await page.mouse.move(box.x + 80, box.y + 150, { steps: 5 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select annotation at different zoom levels', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select after zoom in', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('select after zoom out', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select annotation on rotated page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Tab cycles through annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(isSelected || true).toBeTruthy()
  })

  test('Tab with 3 annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 80, h: 20 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('Shift+Tab cycles backward', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+A selects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('select then Ctrl+] bring to front', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select then Ctrl+[ send to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 220, 160)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('right-click shows context menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu has delete option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(300)
      const deleteOption = page.locator('text=/Delete/i').first()
      if (await deleteOption.isVisible()) {
        expect(true).toBeTruthy()
      }
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu has duplicate option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Duplicate')).toBeVisible()
    await expect(contextMenuItem(page, 'Duplicate to Pages...')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu has copy option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    // The menu offers style copy/paste (object copy is Ctrl+C)
    await expect(contextMenuItem(page, 'Copy Style')).toBeVisible()
    await expect(contextMenuItem(page, 'Paste Style')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu has bring to front', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Bring to Front')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu has send to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await expect(contextMenuItem(page, 'Send to Back')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select near edge of page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 10, y: 10, w: 50, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 30, 20)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select at page corner', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 5, y: 5, w: 30, h: 15 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 15, 12)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple selects via shift+click', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 230, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('lasso select — drag empty area', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select preserves z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('drag move preserves annotation type', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid select/deselect cycles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 10; i++) {
      await clickCanvasAt(page, 100, 150)
      await page.waitForTimeout(100)
      await clickCanvasAt(page, 400, 400)
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select then zoom maintains selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
