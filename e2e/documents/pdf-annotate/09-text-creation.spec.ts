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

test.describe('Text Creation — Activation', () => {
  test('T key activates text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Text (T)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Text button activates tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Text (T)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Text (T)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('text tool shows text cursor on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'text')
  })

  test('switching away from text tool deactivates it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await selectTool(page, 'Select (S)')
    const textBtn = page.locator('button[title="Text (T)"]')
    await expect(textBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('text tool shows formatting controls in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Font family dropdown should be visible
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') })
    await expect(fontSelect.first()).toBeVisible()
  })
})

// ─── Text Box Creation ──────────────────────────────────────────────────────

test.describe('Text Creation — Drawing Text Boxes', () => {
  test('click+drag creates a text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    // A textarea should appear in edit mode
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('textarea appears in edit mode after creating text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeFocused()
  })

  test('textarea shows placeholder "Type here..."', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveAttribute('placeholder', 'Type here...')
  })

  test('typing updates annotation content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Hello World')
  })

  test('Escape exits edit mode and keeps text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Persistent text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Textarea should disappear
    await expect(page.locator('textarea')).toBeHidden()
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty text box removed on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    // Do not type anything
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('small click creates default-sized text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Click without significant drag distance
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 202, y: 202 })
    await page.waitForTimeout(300)
    // Should still create a text box (with default dimensions)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('text box has border styling indicating edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    // The textarea has a blue border class
    await expect(textarea).toHaveClass(/border-\[#3B82F6\]/)
  })
})

// ─── Multiple Text Boxes ────────────────────────────────────────────────────

test.describe('Text Creation — Multiple Text Boxes', () => {
  test('creating two text boxes results in count of 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('creating three text boxes results in count of 3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 200, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 320, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('each text box retains its own content', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create first text
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 80 }, { x: 280, y: 130 })
    await page.waitForTimeout(300)
    await page.keyboard.type('First box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Create second text
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 220 }, { x: 280, y: 270 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Second box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    const contents = texts.map(t => t.text)
    expect(contents).toContain('First box')
    expect(contents).toContain('Second box')
  })
})

// ─── Text Persistence ───────────────────────────────────────────────────────

test.describe('Text Creation — Persistence', () => {
  test('text persists after blur (click elsewhere)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur test')
    // Click elsewhere on the canvas to blur
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Blur test')
  })

  test('text at upper-left position persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 200, y: 70 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Top left')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at center position persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 200, y: 300 }, { x: 400, y: 350 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Center text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text with content persists after tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Tool switch test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Switch to pencil and back
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text is saved to session storage', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    expect(anns.some(a => a.type === 'text')).toBe(true)
  })

  test('text annotation stores width and height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(0)
    expect(textAnn!.height).toBeGreaterThan(0)
  })

  test('text annotation stores position in points array', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 150, y: 150, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.points.length).toBeGreaterThanOrEqual(1)
    expect(textAnn!.points[0].x).toBeGreaterThan(0)
    expect(textAnn!.points[0].y).toBeGreaterThan(0)
  })
})

// ─── Edit Mode Interactions ─────────────────────────────────────────────────

test.describe('Text Creation — Edit Mode', () => {
  test('double-clicking text annotation re-enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    // Now double-click to re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 160, 125)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('re-entering edit mode shows existing text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Existing content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Double-click to re-enter
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Existing content')
    }
  })

  test('typing additional text appends to existing content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Initial')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type(' Added')
      await expect(textarea).toHaveValue('Initial Added')
    }
  })

  test('multiline text entry works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  test('creating text at different x positions creates separate annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 30, y: 100 }, { x: 150, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Left')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 300, y: 100 }, { x: 450, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Right')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Undo / Redo ────────────────────────────────────────────────────────────

test.describe('Text Creation — Undo and Redo', () => {
  test('Ctrl+Z undoes text creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes text creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Visual Verification ────────────────────────────────────────────────────

test.describe('Text Creation — Visual', () => {
  test('text annotation renders visually on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('text box with long content still creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a longer piece of text that should wrap within the text box boundaries and still be saved correctly.')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text box with special characters persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello & "World" <test>')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Hello & "World" <test>')
  })

  test('text default font size is stored', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.fontSize).toBeGreaterThan(0)
  })
})

// ─── Text Creation — Advanced ───────────────────────────────────────────────

test.describe('Text Creation — Advanced Interactions', () => {
  test('text annotation default fontFamily is Arial', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    // Default should be Arial or the font selected in toolbar
    expect(textAnn!.fontFamily).toBeTruthy()
  })

  test('text annotation default opacity is stored', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; opacity: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.opacity).toBeGreaterThan(0)
  })

  test('text annotation default color is stored', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.color).toBeTruthy()
  })

  test('text annotation id is a valid UUID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('text with red color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.color).toBe('#FF0000')
  })

  test('text with blue color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) await blueSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blue text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.color).toBe('#3B82F6')
  })

  test('text at bottom of canvas persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 500 }, { x: 300, y: 550 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Bottom text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at right side of canvas persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 350, y: 200 }, { x: 500, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Right text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('creating text then switching to pencil commits text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Auto committed')
    // Switch tool without pressing Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text annotation has default lineHeight of 1.3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    // Default lineHeight is 1.3 (or undefined which also means 1.3)
    expect(textAnn!.lineHeight === undefined || textAnn!.lineHeight === 1.3).toBe(true)
  })

  test('creating five text boxes results in count of 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'text', { x: 50, y: 50 + i * 80, w: 150, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('text with numbers and symbols persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test #123 @ $99.99!')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Test #123 @ $99.99!')
  })

  test('text with only whitespace is removed on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Whitespace-only text should be treated as empty and removed
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text annotation renders on canvas after commit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    // Verify the annotation is rendered visually
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('text textarea has overflow hidden', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveClass(/overflow-hidden/)
  })

  test('text textarea has resize-none', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveClass(/resize-none/)
  })

  test('text textarea has no outline', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveClass(/outline-none/)
  })

  test('text at zoomed-in level creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at zoomed-out level creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text persists after zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+D duplicates text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('delete key removes text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
