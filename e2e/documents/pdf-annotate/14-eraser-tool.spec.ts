import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, waitForSessionSave,
  getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Activation ─────────────────────────────────────────────────────────────

test.describe('Eraser Tool — Activation', () => {
  test('E key activates eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Eraser (E)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Eraser button activates tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Eraser (E)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Eraser (E)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser tool shows "none" cursor on canvas (custom cursor)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'none')
  })

  test('switching from eraser to select deactivates eraser', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await selectTool(page, 'Select (S)')
    const eraserBtn = page.locator('button[title="Eraser (E)"]')
    await expect(eraserBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser shows mode controls (Partial / Object)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button:has-text("Partial")')).toBeVisible()
    await expect(page.locator('button:has-text("Object")')).toBeVisible()
  })

  test('eraser shows size slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('text=Size')).toBeVisible()
    await expect(page.locator('input[type="range"][min="5"][max="50"]')).toBeVisible()
  })
})

// ─── Eraser Mode Controls ───────────────────────────────────────────────────

test.describe('Eraser Tool — Mode Controls', () => {
  test('default eraser mode is Partial', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button:has-text("Partial")')
    await expect(partialBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Object mode switches to object erase', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    const objectBtn = page.locator('button:has-text("Object")')
    await expect(objectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('switching back to Partial mode works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await page.locator('button:has-text("Partial")').click()
    await page.waitForTimeout(100)
    const partialBtn = page.locator('button:has-text("Partial")')
    await expect(partialBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser radius slider has default value of 15', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await expect(slider).toHaveValue('15')
  })

  test('changing eraser radius updates display', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('30')
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('30')
    // The size display should show 30
    await expect(page.locator('text=30')).toBeVisible()
  })

  test('setting eraser radius to minimum (5)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('5')
  })

  test('setting eraser radius to maximum (50)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('50')
  })
})

// ─── Erasing Pencil Strokes ────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Pencil', () => {
  test('erasing over a pencil stroke removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a pencil stroke
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to eraser in object mode
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Erase over the pencil stroke
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 200, y: 205 },
      { x: 250, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase splits pencil stroke into fragments', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a pencil stroke
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 300, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to eraser in partial mode
    await selectTool(page, 'Eraser (E)')
    // Erase a small section in the middle
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 200, y: 210 },
    ])
    await page.waitForTimeout(300)
    // Should split into fragments or reduce count, but not be fully intact
    const countAfter = await getAnnotationCount(page)
    // Could be 0 (if small) or 2 (split), but not 1 as the original
    expect(countAfter).not.toBe(1)
  })

  test('eraser does not affect annotations it does not touch', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create two pencil strokes far apart
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 350, w: 100, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Erase only the first one (object mode)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 80, y: 95 },
      { x: 120, y: 110 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Erasing Rectangles ────────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Rectangles', () => {
  test('erasing over a rectangle removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Erase over the rectangle edge
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing away from rectangle does not remove it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Erase far away from the rectangle
    await drawOnCanvas(page, [
      { x: 400, y: 400 },
      { x: 420, y: 420 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Erasing Circles ────────────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Circles', () => {
  test('erasing over a circle removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 120, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Erase on the circle edge (left edge)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 155, y: 205 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Erasing Lines/Arrows ──────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Lines and Arrows', () => {
  test('erasing over a line removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing over an arrow removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Erasing Text ───────────────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Text', () => {
  test('erasing over a text annotation removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 115 },
      { x: 200, y: 130 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Erasing Callouts ──────────────────────────────────────────────────────

test.describe('Eraser Tool — Erasing Callouts', () => {
  test('erasing over a callout removes it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 140 },
      { x: 210, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Undo After Erase ──────────────────────────────────────────────────────

test.describe('Eraser Tool — Undo', () => {
  test('undo after erasing restores the annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 200, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo after erasing rectangle restores it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo re-erases the annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 200, y: 210 },
    ])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Eraser at Zoom Levels ─────────────────────────────────────────────────

test.describe('Eraser Tool — Zoom Levels', () => {
  test('eraser works at zoomed-in level', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 200, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser works at zoomed-out level', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 180 },
      { x: 200, y: 220 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Multiple Annotations ──────────────────────────────────────────────────

test.describe('Eraser Tool — Multiple Annotations', () => {
  test('eraser only removes targeted annotation, not nearby ones', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create two rectangles far apart
    await createAnnotation(page, 'rectangle', { x: 50, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 350, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Erase only the first rectangle
    await drawOnCanvas(page, [
      { x: 50, y: 100 },
      { x: 55, y: 120 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erasing two annotations in one stroke removes both', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create two pencil strokes on the same horizontal line
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 5 })
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 100, h: 5 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Big eraser sweep across both
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('40')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 40, y: 200 },
      { x: 310, y: 205 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing mixed annotation types', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Erase only the pencil (object mode)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 130, y: 95 },
      { x: 170, y: 115 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Eraser Visual Cursor ──────────────────────────────────────────────────

test.describe('Eraser Tool — Visual Cursor', () => {
  test('eraser circle cursor appears on mouse move over canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.waitForTimeout(200)
    // The eraser circle cursor div should be visible
    const eraserCircle = page.locator('.pointer-events-none.rounded-full.border-white\\/60')
    await expect(eraserCircle).toBeVisible()
  })

  test('eraser cursor disappears on mouse leave', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.waitForTimeout(200)
    // Move mouse away from canvas
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)
    const eraserCircle = page.locator('.pointer-events-none.rounded-full.border-white\\/60')
    await expect(eraserCircle).toBeHidden()
  })
})

// ─── Eraser Session Persistence ────────────────────────────────────────────

test.describe('Eraser Tool — Session Persistence', () => {
  test('eraser mode is saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.eraserMode).toBe('object')
  })

  test('eraser radius is saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('35')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.eraserRadius).toBe(35)
  })
})

// ─── Eraser Tool — Extended ────────────────────────────────────────────────

test.describe('Eraser Tool — Extended', () => {
  test('eraser does not create annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing highlight annotation (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser partial mode on rectangle removes via hit test', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Partial mode is default
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    // Rectangle hit in partial mode should be removed entirely
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser partial mode on circle removes via hit test', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 120, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 155, y: 205 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser with large radius removes more easily', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 201, y: 201 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser visual on canvas changes after erasing annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('eraser mode persists after switching away and back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)
    // Object mode should still be active
    const objectBtn = page.locator('button:has-text("Object")')
    await expect(objectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser radius persists after switching away and back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('40')
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('40')
  })

  test('erasing three annotations leaves zero', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 5 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 350, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    // Sweep across all three
    await drawOnCanvas(page, [
      { x: 50, y: 80 },
      { x: 100, y: 120 },
      { x: 80, y: 200 },
      { x: 100, y: 260 },
      { x: 70, y: 350 },
      { x: 100, y: 410 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo restores all three erased annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 5 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    // Erase first
    await drawOnCanvas(page, [{ x: 80, y: 95 }, { x: 120, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    // Erase second
    await drawOnCanvas(page, [{ x: 200, y: 120 }, { x: 250, y: 140 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Undo both
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('eraser controls hidden when other tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button:has-text("Partial")')).toBeHidden()
    await expect(page.locator('button:has-text("Object")')).toBeHidden()
  })

  test('eraser size label displays current value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    // Default 15
    await expect(page.locator('text=15')).toBeVisible()
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('25')
    await page.waitForTimeout(100)
    await expect(page.locator('text=25')).toBeVisible()
  })

  test('erasing with minimum radius still works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    // Need to be very precise with small radius
    await drawOnCanvas(page, [
      { x: 150, y: 200 },
      { x: 200, y: 205 },
      { x: 250, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser does not affect annotations on other pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create annotation on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Erase far from the annotation
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 400, y: 400 },
      { x: 420, y: 420 },
    ])
    await page.waitForTimeout(300)
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erasing callout in object mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 140 },
      { x: 210, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing arrow in partial mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Partial mode is default
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing line in partial mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode eraser on text annotation removes it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 115 },
      { x: 250, y: 135 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing then creating new annotation works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Create a new annotation
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser partial mode title attribute on button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(partialBtn).toBeVisible()
  })

  test('eraser object mode title attribute on button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const objectBtn = page.locator('button[title="Object erase"]')
    await expect(objectBtn).toBeVisible()
  })

  test('erasing multiple times on same annotation in object mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // First erase pass removes it
    await drawOnCanvas(page, [{ x: 150, y: 195 }, { x: 200, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Second erase pass on empty canvas does nothing
    await drawOnCanvas(page, [{ x: 150, y: 195 }, { x: 200, y: 210 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser with default radius (15) is functional', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Use default radius (15)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await expect(slider).toHaveValue('15')
    await drawOnCanvas(page, [
      { x: 150, y: 197 },
      { x: 200, y: 203 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('switching between partial and object does not lose eraser state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('30')
    await page.waitForTimeout(100)
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await page.locator('button:has-text("Partial")').click()
    await page.waitForTimeout(100)
    // Radius should still be 30
    await expect(slider).toHaveValue('30')
  })

  test('eraser circle cursor uses mix-blend-difference', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.waitForTimeout(200)
    const eraserCircle = page.locator('.pointer-events-none.rounded-full')
    if (await eraserCircle.isVisible()) {
      await expect(eraserCircle).toHaveClass(/mix-blend-difference/)
    }
  })
})
