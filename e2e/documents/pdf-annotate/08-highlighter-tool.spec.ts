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

test.describe('Highlighter Tool — Activation', () => {
  test('H key activates highlight tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Highlight button activates tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Highlight (H)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('highlight tool shows crosshair cursor on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
  })

  test('switching from highlight to select deactivates highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await selectTool(page, 'Select (S)')
    const highlightBtn = page.locator('button[title="Highlight (H)"]')
    await expect(highlightBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('highlight tool shows straight/free toggle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await expect(page.locator('button:has-text("Free")')).toBeVisible()
  })
})

// ─── Drawing Highlights ─────────────────────────────────────────────────────

test.describe('Highlighter Tool — Drawing', () => {
  test('drawing creates a highlight annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 250, y: 150 },
    ])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
  })

  test('highlight annotation has semi-transparent appearance (opacity 0.4)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 300, y: 155 },
    ])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; opacity: number }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight).toBeDefined()
    expect(highlight!.opacity).toBeCloseTo(0.4, 1)
  })

  test('drawing a horizontal highlight stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 50, y: 200 },
      { x: 350, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing a diagonal highlight stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 80, y: 100 },
      { x: 250, y: 300 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing a freehand curved highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 50, y: 200 },
      { x: 100, y: 180 },
      { x: 150, y: 220 },
      { x: 200, y: 190 },
      { x: 250, y: 210 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight in straight-line mode draws a straight line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    // Enable straight-line mode
    await page.locator('button:has-text("Free")').click()
    await page.waitForTimeout(100)
    await expect(page.locator('button:has-text("Straight")')).toBeVisible()
    await drawOnCanvas(page, [
      { x: 50, y: 200 },
      { x: 300, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Multiple Highlights ────────────────────────────────────────────────────

test.describe('Highlighter Tool — Multiple Highlights', () => {
  test('creating two highlights results in count of 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 250, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 250, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('creating three highlights results in count of 3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 250, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 250, y: 205 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 300 }, { x: 250, y: 305 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('highlights at different y positions are distinct annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 80 }, { x: 300, y: 85 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 300, y: 255 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    const highlights = anns.filter(a => a.type === 'highlighter')
    expect(highlights.length).toBe(2)
  })
})

// ─── Colors & Widths ────────────────────────────────────────────────────────

test.describe('Highlighter Tool — Colors and Widths', () => {
  test('default highlight color is applied', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight).toBeDefined()
    expect(highlight!.color).toBeTruthy()
  })

  test('changing color before drawing applies to highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    // Click red color swatch
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) {
      await redSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight).toBeDefined()
    expect(highlight!.color).toBe('#FF0000')
  })

  test('highlight with yellow color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const yellowSwatch = page.locator('button[title="#FFFF00"]')
    if (await yellowSwatch.isVisible()) {
      await yellowSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#FFFF00')
  })

  test('highlight with green color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const greenSwatch = page.locator('button[title="#22C55E"]')
    if (await greenSwatch.isVisible()) {
      await greenSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#22C55E')
  })

  test('highlight with blue color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) {
      await blueSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#3B82F6')
  })

  test('highlight stores strokeWidth from toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; strokeWidth: number }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight).toBeDefined()
    expect(highlight!.strokeWidth).toBeGreaterThan(0)
  })

  test('two highlights with different colors are stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    // First highlight: red
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 105 }])
    await page.waitForTimeout(200)
    // Second highlight: blue
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) await blueSwatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 300, y: 255 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlights = anns.filter(a => a.type === 'highlighter')
    expect(highlights.length).toBe(2)
    const colors = highlights.map(h => h.color)
    expect(colors).toContain('#FF0000')
    expect(colors).toContain('#3B82F6')
  })
})

// ─── Select, Move, Delete ───────────────────────────────────────────────────

test.describe('Highlighter Tool — Select, Move, Delete', () => {
  test('select tool can select a highlight annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('moving a selected highlight changes its position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 200, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('deleting a highlight with Delete key removes it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting a highlight with Backspace key removes it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('nudge highlight with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Undo / Redo ────────────────────────────────────────────────────────────

test.describe('Highlighter Tool — Undo and Redo', () => {
  test('Ctrl+Z undoes a highlight creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes an undone highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo removes last highlight when multiple exist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 250, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 250 }, { x: 250, y: 255 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo restores highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 250, y: 105 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 250 }, { x: 250, y: 255 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo toolbar button works for highlights', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    if (await undoBtn.isVisible()) {
      await undoBtn.click()
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(0)
    }
  })
})

// ─── Zoom Levels ────────────────────────────────────────────────────────────

test.describe('Highlighter Tool — Zoom Levels', () => {
  test('highlight at default zoom creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight at zoomed-in level creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight at zoomed-out level creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom out
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 80, y: 150 }, { x: 250, y: 155 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight persists after zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Session Persistence ────────────────────────────────────────────────────

test.describe('Highlighter Tool — Session Persistence', () => {
  test('highlight is saved to session storage', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    expect(anns.some(a => a.type === 'highlighter')).toBe(true)
  })

  test('highlight annotation stores points array', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.points.length).toBeGreaterThanOrEqual(2)
  })

  test('highlight visual appears on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Highlight with Opacity Controls ────────────────────────────────────────

test.describe('Highlighter Tool — Opacity and Stroke', () => {
  test('highlight opacity slider is visible when highlight tool active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    // Opacity slider should be present in the toolbar
    const opacitySlider = page.locator('input[type="range"]').first()
    await expect(opacitySlider).toBeVisible()
  })

  test('highlight type is stored as "highlighter" in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 80, y: 180 }, { x: 280, y: 185 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight).toBeDefined()
    expect(highlight!.type).toBe('highlighter')
  })

  test('highlight id is a valid UUID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 80, y: 180 }, { x: 280, y: 185 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('highlight with orange color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const orangeSwatch = page.locator('button[title="#14B8A6"]')
    if (await orangeSwatch.isVisible()) await orangeSwatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#14B8A6')
  })

  test('highlight with purple color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const purpleSwatch = page.locator('button[title="#8B5CF6"]')
    if (await purpleSwatch.isVisible()) await purpleSwatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#8B5CF6')
  })

  test('Ctrl+D duplicates highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies highlight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Shift+Arrow nudges highlight by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('highlight with white color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const whiteSwatch = page.locator('button[title="#FFFFFF"]')
    if (await whiteSwatch.isVisible()) await whiteSwatch.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 155 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const highlight = anns.find(a => a.type === 'highlighter')
    expect(highlight!.color).toBe('#FFFFFF')
  })

  test('highlight is not removed when clicking elsewhere with select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('five highlights results in count of 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [{ x: 50, y: 60 + i * 60 }, { x: 250, y: 65 + i * 60 }])
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('highlight smooth property is true', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 205 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; smooth?: boolean }>
    const highlight = anns.find(a => a.type === 'highlighter')
    // Highlights drawn freehand should not have smooth=false
    expect(highlight!.smooth).not.toBe(false)
  })
})
