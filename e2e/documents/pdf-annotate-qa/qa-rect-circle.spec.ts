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

// ─── 1. Rectangle Creation ──────────────────────────────────────────────────

test.describe('Rectangle — Creation', () => {
  test('rectangle drag creates annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('R key activates Rectangle tool', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Rectangle shows shift-constraint hint', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple rectangles create multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 310, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('tiny rectangle still created', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large rectangle creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 400, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('wide landscape rectangle creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 400, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall portrait rectangle creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 250, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle type stored correctly', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('rectangle')
  })
})

// ─── 2. Circle (Ellipse) Creation ───────────────────────────────────────────

test.describe('Circle — Creation', () => {
  test('circle drag creates annotation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('C key activates Circle tool', async ({ page }) => {
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Circle (C)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Circle shows shift-constraint hint', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('multiple circles create multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 180, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('tiny circle still created', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('wide ellipse creates annotation', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 350, y: 260 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle type stored correctly', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('circle')
  })
})

// ─── 3. Shift-Constrain ─────────────────────────────────────────────────────

test.describe('Rectangle/Circle — Shift Constrain', () => {
  test('Shift+drag rectangle creates square-like shape', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    const pts = anns[0].points
    const w = Math.abs(pts[1].x - pts[0].x)
    const h = Math.abs(pts[1].y - pts[0].y)
    // Width and height should be equal for a perfect square
    expect(Math.abs(w - h)).toBeLessThanOrEqual(2)
  })

  test('Shift+drag circle creates perfect circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    const pts = anns[0].points
    const w = Math.abs(pts[1].x - pts[0].x)
    const h = Math.abs(pts[1].y - pts[0].y)
    expect(Math.abs(w - h)).toBeLessThanOrEqual(2)
  })
})

// ─── 4. Properties ──────────────────────────────────────────────────────────

test.describe('Rectangle/Circle — Properties', () => {
  test('stroke width slider visible for Rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('opacity slider visible for Rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('opacity slider visible for Circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('rectangle with custom width stores correctly', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('9')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(9)
  })

  test('circle with custom opacity stores correctly', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('45')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.45, 1)
  })

  test('color presets visible for Rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const colorButtons = page.locator('button[style*="background"]')
    const count = await colorButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ─── 5. Hit Testing — Edge-Only Selection ───────────────────────────────────

test.describe('Rectangle/Circle — Hit Testing', () => {
  test('click on rectangle edge selects it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on the left edge
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click on rectangle top edge selects it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click INSIDE rectangle does NOT select (outline-only)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click in the center (interior)
    await clickCanvasAt(page, 175, 150)
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('click on circle edge selects it', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on the right edge of the ellipse
    await clickCanvasAt(page, 250, 190)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click on rectangle bottom edge selects it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click on rectangle right edge selects it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 250, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 6. Undo/Redo ───────────────────────────────────────────────────────────

test.describe('Rectangle/Circle — Undo/Redo', () => {
  test('Ctrl+Z undoes rectangle creation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
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

  test('Ctrl+Z undoes circle creation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
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

  test('undo multiple rectangles in order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 80, h: 60 })
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
})

// ─── 7. Session Data ────────────────────────────────────────────────────────

test.describe('Rectangle/Circle — Session Data', () => {
  test('rectangle has two corner points in session', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('circle has two bounding-box corner points in session', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBe(2)
  })

  test('rectangle and circle have distinct IDs', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 50, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('rectangle persists after tool switch', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle persists after tool switch', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await selectTool(page, 'Pencil (P)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle and circle coexist', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
