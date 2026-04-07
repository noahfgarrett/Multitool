import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, dragOnCanvas, createAnnotation, getAnnotationCount,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Object Mode ─────────────────────────────────────────────────────────────

test.describe('QA Eraser — Object Mode', () => {
  test('object mode erases entire pencil annotation on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 200, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases rectangle on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases circle on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 120, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 195 },
      { x: 155, y: 205 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases line on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases arrow on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 80, y: 200, w: 250, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases text annotation on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 115 },
      { x: 200, y: 130 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object mode erases callout annotation on contact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 140 },
      { x: 210, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser does not affect annotations it does not touch', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 10 })
    await createAnnotation(page, 'pencil', { x: 50, y: 350, w: 100, h: 10 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 80, y: 95 },
      { x: 120, y: 110 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erasing away from annotation does not remove it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 400, y: 400 },
      { x: 420, y: 420 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Eraser Radius ──────────────────────────────────────────────────────────

test.describe('QA Eraser — Radius Slider', () => {
  test('eraser shows size slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('input[type="range"][min="5"][max="50"]')).toBeVisible()
  })

  test('default eraser radius is 15', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await expect(slider).toHaveValue('15')
  })

  test('changing radius to 30 updates slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('30')
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('30')
  })

  test('eraser radius saved in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('35')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.eraserRadius).toBe(35)
  })

  test('minimum radius (5) still erases', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 150, y: 200 },
      { x: 200, y: 205 },
      { x: 250, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('maximum radius (50) erases easily', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
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

  test('radius persists after switching tools and back', async ({ page }) => {
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
})

// ─── Partial vs Object Mode ─────────────────────────────────────────────────

test.describe('QA Eraser — Mode Toggle', () => {
  test('default mode is Partial', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(partialBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Object switches mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    const objectBtn = page.locator('button[title="Object erase"]')
    await expect(objectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('switching back to Partial works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Partial erase"]').click()
    await page.waitForTimeout(100)
    const partialBtn = page.locator('button[title="Partial erase"]')
    await expect(partialBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser mode saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.eraserMode).toBe('object')
  })

  test('mode persists after switching tools and back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)
    const objectBtn = page.locator('button[title="Object erase"]')
    await expect(objectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('switching modes does not lose radius', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('30')
    await page.waitForTimeout(100)
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Partial erase"]').click()
    await page.waitForTimeout(100)
    await expect(slider).toHaveValue('30')
  })
})

// ─── Single Click Erase ─────────────────────────────────────────────────────

test.describe('QA Eraser — Single Click', () => {
  test('single click at annotation position erases it (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    const slider = page.locator('input[type="range"][min="5"][max="50"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    // Single click on the annotation
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 201, y: 201 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Undo After Erase ───────────────────────────────────────────────────────

test.describe('QA Eraser — Undo', () => {
  test('undo after erasing restores pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
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
    await page.locator('button[title="Object erase"]').click()
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

  test('redo after undo re-erases', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 10 })
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
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

  test('eraser does not create annotations on empty canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erasing then creating new annotation works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 140 },
      { x: 110, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Eraser Cursor ──────────────────────────────────────────────────────────

test.describe('QA Eraser — Cursor', () => {
  test('eraser shows "none" cursor on canvas (custom cursor)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'none')
  })

  test('eraser controls hidden when other tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="Partial erase"]')).toBeHidden()
    await expect(page.locator('button[title="Object erase"]')).toBeHidden()
  })
})

// ─── Highlight Erase ────────────────────────────────────────────────────────

test.describe('QA Eraser — Highlight', () => {
  test('erasing highlight annotation works (object mode)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await page.locator('button[title="Object erase"]').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 200, y: 195 },
      { x: 210, y: 210 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
