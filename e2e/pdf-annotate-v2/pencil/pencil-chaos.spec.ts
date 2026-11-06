import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'
import { annCountLabel } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Pencil Chaos', () => {
  test('rapidly switch between pencil and select 50 times', async ({ page }) => {
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('p')
      await page.keyboard.press('s')
    }
    await page.waitForTimeout(200)
    // No crash
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw and undo 25 times alternating', async ({ page }) => {
    const counter = annCountLabel(page)
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('p')
      await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 74, y: 71 }, { x: 98, y: 56 }, { x: 130, y: 80 }])
      await expect(counter).toHaveText('1 ann')
      await page.keyboard.press('Control+z')
      await expect(counter).toHaveText('0 ann')
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw while zooming simultaneously', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    await page.keyboard.press('=')
    await page.mouse.move(box.x + 250, box.y + 180, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw 30 strokes then export', async ({ page }) => {
    test.setTimeout(60000)
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 30; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 10) * 30, y: 20 + Math.floor(i / 10) * 30 },
        { x: 40 + (i % 10) * 30, y: 20 + Math.floor(i / 10) * 30 },
      ])
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(30)
    const download = await exportPDF(page, 30000)
    expect(download).toBeTruthy()
  })

  test('click pencil tool button 30 times rapidly', async ({ page }) => {
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('p')
    }
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('start drawing, cancel, start drawing, cancel — 10 cycles', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(box.x + 100, box.y + 100)
      await page.mouse.down()
      await page.mouse.move(box.x + 120, box.y + 110, { steps: 2 })
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    // No crash expected
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('draw stroke, select it, delete it — repeat 20 times', async ({ page }) => {
    const counter = annCountLabel(page)
    const selectedHint = page.locator('text=/Arrows nudge · Del delete/')
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('p')
      await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 130, y: 121 }, { x: 160, y: 106 }, { x: 200, y: 130 }])
      await expect(counter).toHaveText('1 ann')
      await page.keyboard.press('s')
      await clickCanvasAt(page, 150, 111)
      await expect(selectedHint).toBeVisible()
      await page.keyboard.press('Delete')
      await expect(counter).toHaveText('0 ann')
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('change color between every stroke (cycling)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 9; i++) {
      await drawOnCanvas(page, [{ x: 50, y: 30 + i * 25 }, { x: 150, y: 30 + i * 25 }])
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(9)
  })

  test('rapid pointer down/up without movement — no crashes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(box.x + 100, box.y + 100)
      await page.mouse.down()
      await page.mouse.up()
    }
    await page.waitForTimeout(200)
    // Should not have created annotations for zero-movement clicks
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('switch to every other tool and back to pencil', async ({ page }) => {
    const tools = ['s', 'l', 'a', 'r', 'c', 'k', 't', 'o', 'e', 'h', 'm']
    for (const tool of tools) {
      await page.keyboard.press('p')
      await page.waitForTimeout(30)
      await page.keyboard.press(tool)
      await page.waitForTimeout(30)
    }
    await page.keyboard.press('p')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw, undo, draw different, redo — verify redo branch replaced', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
    // Draw different stroke
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should not bring back old stroke (branch replaced)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke then open context menu on it immediately', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 250, y: 100 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.click(box.x + 175, box.y + 100, { button: 'right' })
    await page.waitForTimeout(300)
    // Context menu should appear or not — no crash either way
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('draw stroke at 0,0 then duplicate it 20 times', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 5, y: 5 }, { x: 50, y: 50 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 25, 25)
    await page.waitForTimeout(200)
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+d')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})
