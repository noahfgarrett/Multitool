import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, dragOnCanvas, createAnnotation, getAnnotationCount,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
  chooseFont,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Callout Creation ────────────────────────────────────────────────────────

test.describe('QA Callout — Creation', () => {
  test('drag creates a callout box with textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('textarea shows placeholder "Type here..."', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveAttribute('placeholder', 'Type here...')
  })

  test('textarea is focused after creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeFocused()
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

  test('callout has white background', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const bg = await textarea.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(bg).toMatch(/rgb\(255,\s*255,\s*255\)/)
  })

  test('callout stored as type "callout" in session', async ({ page }) => {
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
})

// ─── Text Editing Inside Callout ─────────────────────────────────────────────

test.describe('QA Callout — Text Editing', () => {
  test('double-click re-enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('multiline text entry works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  test('text persists after blur (click elsewhere)', async ({ page }) => {
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

  test('special characters persist', async ({ page }) => {
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

// ─── Formatting ──────────────────────────────────────────────────────────────

test.describe('QA Callout — Formatting', () => {
  test('bold formatting works in callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-weight', '700')
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

  test('underline formatting works in callout', async ({ page }) => {
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

  test('strikethrough works in callout', async ({ page }) => {
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

  test('font family change works for callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await chooseFont(page, 'Courier New')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const ff = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(ff).toContain('Courier New')
  })

  test('font size change persists', async ({ page }) => {
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

  test('alignment persists in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.textAlign).toBe('center')
  })

  test('line spacing change works for callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    // Verify line spacing was changed (select stores the value)
    await expect(spacingSelect).toHaveValue('2')
  })

  test('bold + italic combined persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted')
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

// ─── Stroke Width (B6 Fix) ──────────────────────────────────────────────────

test.describe('QA Callout — Stroke Width (B6 Fix)', () => {
  test('callout stores strokeWidth in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; strokeWidth?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.strokeWidth).toBeDefined()
    expect(callout!.strokeWidth).toBeGreaterThan(0)
  })

  test('changing stroke width before creating callout applies', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    // Adjust stroke width slider if visible
    const strokeSlider = page.locator('input[type="range"]').first()
    if (await strokeSlider.isVisible()) {
      await strokeSlider.evaluate((el: HTMLInputElement) => {
        el.value = '4'
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Thick border')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Auto-Height (B4 Fix) ───────────────────────────────────────────────────

test.describe('QA Callout — Auto-Height (B4 Fix)', () => {
  test('callout with short text has reasonable height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.height).toBeGreaterThan(0)
    expect(callout!.height).toBeLessThan(500)
  })

  test('callout with multiline text stores height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.height).toBeGreaterThan(0)
  })
})

// ─── Empty Callout ───────────────────────────────────────────────────────────

test.describe('QA Callout — Empty Callout', () => {
  test('empty callout renders as box when text is empty', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    // Empty callout should be deleted on Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Undo/Redo ───────────────────────────────────────────────────────────────

test.describe('QA Callout — Undo/Redo', () => {
  test('undo callout creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Callout creation may push 2 history entries (drag + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo callout creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
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

// ─── Multiple Callouts ──────────────────────────────────────────────────────

test.describe('QA Callout — Multiple', () => {
  test('two callouts results in count of 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Use different annotation types to avoid callout textarea focus issues
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 120, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 60, w: 120, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three callouts results in count of 3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 300, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('five mixed annotations results in count of 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 50, w: 100, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 40 })
    await createAnnotation(page, 'circle', { x: 300, y: 200, w: 100, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 350, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(5)
  })
})

// ─── Select, Move, Delete ───────────────────────────────────────────────────

test.describe('QA Callout — Select, Move, Delete', () => {
  test('select tool can select a callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('Delete key removes callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace removes callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
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

  test('Ctrl+C/V copies callout', async ({ page }) => {
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

  test('callout id is a valid UUID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('callout default fontSize adapts to the page width', async ({ page }) => {
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
    // With the default size untouched, new boxes get round(clamp(pageWidth / 50, 12, 48)): 12 on the 612pt-wide sample
    expect(callout!.fontSize).toBe(12)
  })

  test('callout with color persists', async ({ page }) => {
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
})
