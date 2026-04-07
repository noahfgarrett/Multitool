import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, moveAnnotation,
  waitForSessionSave, getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Activation ─────────────────────────────────────────────────────────────

test.describe('Callout Tool — Activation', () => {
  test('O key activates callout tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Callout (O)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Callout button activates tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Callout (O)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Callout (O)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('callout tool shows crosshair cursor', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })

  test('switching from callout to select deactivates callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await selectTool(page, 'Select (S)')
    const calloutBtn = page.locator('button[title="Callout (O)"]')
    await expect(calloutBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('callout tool shows text formatting controls', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
  })
})

// ─── Callout Creation ───────────────────────────────────────────────────────

test.describe('Callout Tool — Creation', () => {
  test('drag creates a callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    // Textarea should appear for text entry
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('callout textarea shows placeholder', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveAttribute('placeholder', 'Type here...')
  })

  test('typing in callout works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Callout message')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Callout message')
  })

  test('Escape commits callout with text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Committed callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty callout removed on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('callout has white background in textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const bg = await textarea.evaluate(el => getComputedStyle(el).backgroundColor)
    // white background
    expect(bg).toMatch(/rgb\(255,\s*255,\s*255\)/)
  })

  test('callout default font size is 14', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Size test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const callout = anns.find(a => a.type === 'callout')
    // Default callout font size is 14
    expect(callout!.fontSize).toBe(14)
  })
})

// ─── Callout Data ───────────────────────────────────────────────────────────

test.describe('Callout Tool — Session Data', () => {
  test('callout is saved to session storage', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    expect(anns.some(a => a.type === 'callout')).toBe(true)
  })

  test('callout stores text content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.text).toBe('Callout')
  })

  test('callout stores width and height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.width).toBeGreaterThan(0)
    expect(callout!.height).toBeGreaterThan(0)
  })

  test('callout stores position in points array', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 150, y: 150, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.points.length).toBeGreaterThanOrEqual(1)
  })

  test('callout stores color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.color).toBeTruthy()
  })
})

// ─── Callout Colors ─────────────────────────────────────────────────────────

test.describe('Callout Tool — Colors', () => {
  test('callout with red color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.color).toBe('#FF0000')
  })

  test('callout with blue color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) await blueSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blue callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.color).toBe('#3B82F6')
  })

  test('two callouts with different colors', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Red callout
    await selectTool(page, 'Callout (O)')
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 80 }, { x: 200, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Blue callout
    await selectTool(page, 'Callout (O)')
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) await blueSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 250 }, { x: 200, y: 320 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blue')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Select, Move, Delete ───────────────────────────────────────────────────

test.describe('Callout Tool — Select, Move, Delete', () => {
  test('select tool can select a callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('moving a callout changes its position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('deleting a callout with Delete key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('nudge callout with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Ctrl+D duplicates callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Multiple Callouts ──────────────────────────────────────────────────────

test.describe('Callout Tool — Multiple', () => {
  test('creating two callouts results in count of 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 180, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 180, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('creating three callouts results in count of 3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 70 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 150, h: 70 })
    await createAnnotation(page, 'callout', { x: 50, y: 350, w: 150, h: 70 })
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Callout Formatting ────────────────────────────────────────────────────

test.describe('Callout Tool — Formatting', () => {
  test('bold formatting works in callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-weight', '700')
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.bold).toBe(true)
  })

  test('italic formatting works in callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('font family change works for callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const ff = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(ff).toContain('Courier New')
  })

  test('text alignment works in callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('callout formatting persists in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.bold).toBe(true)
    expect(callout!.italic).toBe(true)
  })
})

// ─── Undo / Redo ────────────────────────────────────────────────────────────

test.describe('Callout Tool — Undo and Redo', () => {
  test('Ctrl+Z undoes callout creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes callout creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo removes last callout when multiple exist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 180, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 180, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo deletion restores callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Visual ─────────────────────────────────────────────────────────────────

test.describe('Callout Tool — Visual', () => {
  test('callout renders visually on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('double-clicking callout re-enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })
})

// ─── Callout — Extended Tests ───────────────────────────────────────────────

test.describe('Callout Tool — Extended', () => {
  test('callout annotation has default lineHeight of 1.3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.lineHeight === undefined || callout!.lineHeight === 1.3).toBe(true)
  })

  test('callout id is a valid UUID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('callout with green color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    const greenSwatch = page.locator('button[title="#22C55E"]')
    if (await greenSwatch.isVisible()) await greenSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Green callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.color).toBe('#22C55E')
  })

  test('callout underline formatting works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('callout strikethrough formatting works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('callout line spacing change works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
  })

  test('callout center alignment works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('text-align', 'center')
    await page.keyboard.type('Centered callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.textAlign).toBe('center')
  })

  test('callout Ctrl+C/V copies', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('callout with multiline text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1\nLine 2\nLine 3')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout text persists after blur', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur callout')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.text).toBe('Blur callout')
  })

  test('callout font size change persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    await page.keyboard.type('Large callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.fontSize).toBe(24)
  })

  test('callout at zoomed-in level', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at zoomed-out level', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 80, y: 80, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout persists after zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout Backspace deletes selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('five callouts results in count of 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'callout', { x: 50, y: 40 + i * 100, w: 150, h: 60 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('callout Shift+Arrow nudges by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('callout with special characters', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Note: $100 & "test"')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.text).toBe('Note: $100 & "test"')
  })
})
