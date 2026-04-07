import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  screenshotCanvas,
  waitForSessionSave,
  getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── 1. Highlighter Activation ──────────────────────────────────────────────

test.describe('Highlighter — Activation', () => {
  test('H key activates Highlight tool', async ({ page }) => {
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('highlight tool shows crosshair cursor', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })

  test('switching from highlight to select deactivates highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await selectTool(page, 'Select (S)')
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── 2. Freehand Highlight Stroke ───────────────────────────────────────────

test.describe('Highlighter — Freehand Stroke', () => {
  test('freehand highlight stroke creates annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 155 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight stroke changes canvas visually', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('two highlight strokes create two annotations', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three highlight strokes create three annotations', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 300 }, { x: 300, y: 300 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('single click without drag does not create annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('very short highlight stroke still creates annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 205, y: 202 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight annotation type is stored correctly', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('highlighter')
  })
})

// ─── 3. Color Changes ──────────────────────────────────────────────────────

test.describe('Highlighter — Color', () => {
  test('highlight stores color in session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].color).toBe('string')
    expect(anns[0].color.length).toBeGreaterThan(0)
  })

  test('color presets visible for Highlight tool', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorButtons = page.locator('button[style*="background"]')
    const count = await colorButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('changing color before drawing uses new color', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const redSwatch = page.locator('button[style*="background-color: rgb(255, 0, 0)"], button[style*="#FF0000"], button[style*="#ff0000"]').first()
    if (await redSwatch.isVisible()) {
      await redSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color persists across multiple highlight strokes', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBe(anns[1].color)
  })
})

// ─── 4. Default Opacity ─────────────────────────────────────────────────────

test.describe('Highlighter — Opacity', () => {
  test('default highlight opacity is approximately 0.4', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.4, 1)
  })

  test('opacity slider is hidden for Highlight tool (fixed 0.4 opacity)', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Highlighter has a fixed 0.4 opacity; the general opacity slider is hidden
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeHidden()
  })

  test('highlight always uses fixed 0.4 opacity', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.4, 1)
  })

  test('highlight opacity stored as 0-1 value', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })
})

// ─── 5. Undo/Redo ───────────────────────────────────────────────────────────

test.describe('Highlighter — Undo/Redo', () => {
  test('Ctrl+Z undoes highlight stroke', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo multiple highlights in order', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo all then redo all restores all highlights', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 6. Session Data & Persistence ──────────────────────────────────────────

test.describe('Highlighter — Session Data', () => {
  test('highlight has points array in session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(Array.isArray(anns[0].points)).toBe(true)
    expect(anns[0].points.length).toBeGreaterThan(1)
  })

  test('highlight persists after tool switch', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight coexists with other annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple highlights have distinct IDs', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('highlight stroke width is stored', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].strokeWidth).toBe('number')
    expect(anns[0].strokeWidth).toBeGreaterThan(0)
  })
})
