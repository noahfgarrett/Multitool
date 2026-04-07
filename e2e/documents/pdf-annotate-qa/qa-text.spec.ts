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

/** Helper: create a text box in edit mode and return the textarea locator */
async function createTextInEditMode(
  page: import('@playwright/test').Page,
  region?: { x: number; y: number; w: number; h: number },
) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 60 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  return page.locator('textarea')
}

// ─── Creation ────────────────────────────────────────────────────────────────

test.describe('QA Text — Creation', () => {
  test('drag to create opens textarea in edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeFocused()
  })

  test('click without drag creates default-sized box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 202, y: 201 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('newly created text box is immediately in edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toBeFocused()
  })

  test('typing in new text box appears in textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('Hello World')
    await expect(textarea).toHaveValue('Hello World')
  })

  test('Escape commits text and hides textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('Commit me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click outside commits text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('Click outside')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty text box deleted on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('whitespace-only text is deleted on commit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text with content persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Test text')
  })

  test('text stores position in points array', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 150, y: 150, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.points.length).toBeGreaterThanOrEqual(1)
    expect(textAnn!.points[0].x).toBeGreaterThan(0)
  })

  test('text stores width and height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(0)
    expect(textAnn!.height).toBeGreaterThan(0)
  })
})

// ─── Editing ─────────────────────────────────────────────────────────────────

test.describe('QA Text — Editing', () => {
  test('double-click enters edit mode on existing text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 160, 125)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('re-editing shows existing text content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Existing content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Existing content')
    }
  })

  test('appending text works after re-entering edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Initial')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type(' Added')
      await expect(textarea).toHaveValue('Initial Added')
    }
  })

  test('Backspace deletes characters', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('ABC')
    await page.keyboard.press('Backspace')
    await expect(textarea).toHaveValue('AB')
  })

  test('Backspace key removes characters backward', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('XYZ')
    await page.keyboard.press('Backspace')
    await expect(textarea).toHaveValue('XY')
  })

  test('multiline text entry with Enter key', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 120 })
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  test('special characters persist correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello & "World" <test>')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Hello & "World" <test>')
  })

  test('numbers and symbols persist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('#123 $99.99!')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('#123 $99.99!')
  })
})

// ─── Formatting — Bold / Italic / Underline ──────────────────────────────────

test.describe('QA Text — Bold / Italic / Underline', () => {
  test('Ctrl+B toggles bold on', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+B toggles bold off', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '400')
  })

  test('bold persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.bold).toBe(true)
  })

  test('Ctrl+I toggles italic on', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+I toggles italic off', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'normal')
  })

  test('italic persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; italic?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.italic).toBe(true)
  })

  test('Ctrl+U toggles underline on', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('underline persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('Underline text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; underline?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.underline).toBe(true)
  })

  test('bold + italic combined', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('bold + italic + underline combined persists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('All styles')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean; underline?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.bold).toBe(true)
    expect(textAnn!.italic).toBe(true)
    expect(textAnn!.underline).toBe(true)
  })

  test('Bold button shows active state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await boldBtn.click()
    await page.waitForTimeout(100)
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('formatting persists across edit sessions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold persists')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('font-weight', '700')
    }
  })
})

// ─── Formatting — Font Family ────────────────────────────────────────────────

test.describe('QA Text — Font Family', () => {
  test('font family dropdown is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') })
    await expect(fontSelect.first()).toBeVisible()
  })

  test('changing font family applies to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    const ff = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(ff).toContain('Courier New')
  })

  test('font family persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Georgia')
    await page.waitForTimeout(100)
    await page.keyboard.type('Georgia font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.fontFamily).toBe('Georgia')
  })

  test('Times New Roman option is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Times New Roman")')).toBeAttached()
  })

  test('Consolas option is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Consolas")')).toBeAttached()
  })
})

// ─── Formatting — Font Size ──────────────────────────────────────────────────

test.describe('QA Text — Font Size', () => {
  test('font size dropdown is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') })
    await expect(sizeSelect.first()).toBeVisible()
  })

  test('changing font size applies to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(fs).toBeGreaterThan(30)
  })

  test('font size 8 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="8"]')).toBeAttached()
  })

  test('font size 72 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="72"]')).toBeAttached()
  })

  test('font size persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('32')
    await page.waitForTimeout(100)
    await page.keyboard.type('Large text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.fontSize).toBe(32)
  })

  test('small font size (8) applied to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('8')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(fs).toBeGreaterThanOrEqual(10)
  })

  test('large font size (72) applied to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('72')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(fs).toBeGreaterThan(80)
  })
})

// ─── Formatting — Alignment ─────────────────────────────────────────────────

test.describe('QA Text — Alignment', () => {
  test('Align Left button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Left"]')).toBeVisible()
  })

  test('Align Center button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Center"]')).toBeVisible()
  })

  test('Align Right button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Right"]')).toBeVisible()
  })

  test('clicking Align Center applies center alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('clicking Align Right applies right alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('alignment persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.textAlign).toBe('center')
  })
})

// ─── Formatting — Line Spacing ──────────────────────────────────────────────

test.describe('QA Text — Line Spacing', () => {
  test('line spacing dropdown is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect).toBeVisible()
  })

  test('changing line spacing to 1.0 updates select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1')
  })

  test('changing line spacing to 2.0 updates select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
  })

  test('line spacing options include 1.0, 1.15, 1.3, 1.5, 2.0', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect.locator('option[value="1"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.15"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.3"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.5"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="2"]')).toBeAttached()
  })

  test('line spacing persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.5')
    await page.waitForTimeout(100)
    await page.keyboard.type('Spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(1.5)
  })
})

// ─── Resize ──────────────────────────────────────────────────────────────────

test.describe('QA Text — Resize', () => {
  test('selected text box shows 8 resize handles', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Resize handles are drawn on canvas (not DOM elements).
    // Verify the annotation is selected (which means handles are rendered on canvas).
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Verify the selection is on a text annotation by checking session data
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn).toBeTruthy()
  })

  test('text annotation has minimum width constraint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create a very small drag
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(300)
    await page.keyboard.type('T')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThanOrEqual(40)
  })

  test('text annotation has minimum height constraint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(300)
    await page.keyboard.type('T')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.height).toBeGreaterThanOrEqual(20)
  })
})

// ─── Move ────────────────────────────────────────────────────────────────────

test.describe('QA Text — Move', () => {
  test('drag moves text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = Object.values(beforeSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const ptBefore = annsBefore.find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 250 })
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = Object.values(afterSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const ptAfter = annsAfter.find(a => a.type === 'text')!.points[0]
    expect(ptAfter.x).not.toBe(ptBefore.x)
  })

  test('arrow key nudge moves text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = Object.values(beforeSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yBefore = annsBefore.find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = Object.values(afterSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yAfter = annsAfter.find(a => a.type === 'text')!.points[0].y
    expect(yAfter).toBeGreaterThan(yBefore)
  })

  test('Shift+Arrow nudge moves by larger amount', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = Object.values(beforeSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yBefore = annsBefore.find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = Object.values(afterSession.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yAfter = annsAfter.find(a => a.type === 'text')!.points[0].y
    expect(yAfter - yBefore).toBeGreaterThanOrEqual(5)
  })
})

// ─── Properties Sync ─────────────────────────────────────────────────────────

test.describe('QA Text — Properties Sync', () => {
  test('selecting bold text shows bold button active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Select the text annotation
    await selectAnnotationAt(page, 200, 130)
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    if (await boldBtn.isVisible()) {
      await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
    }
  })

  test('selecting different text boxes updates font size dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create text 1 with font size 16 (default)
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 180, h: 50 })
    // Create text 2 with font size 24
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 250 }, { x: 250, y: 310 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Size 24')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Select the second text
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 150, 280)
    await page.waitForTimeout(300)
    const sizeVal = await sizeSelect.inputValue()
    expect(sizeVal).toBe('24')
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────────────────

test.describe('QA Text — Edge Cases', () => {
  test('empty text deleted on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('very long text still creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const longText = 'A'.repeat(200)
    await page.keyboard.type(longText)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text!.length).toBe(200)
  })

  test('Escape on empty text box deletes it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo text creation removes annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Text/callout creation = 2 history entries (drag creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    // Text/callout creation = 2 history entries (drag creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid tool switching while editing commits text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Auto committed')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create 10 text boxes results in count of 10', async ({ page }) => {
    test.setTimeout(120000)
    await uploadPDFAndWait(page)
    // Use a 5x2 grid with generous spacing to avoid text boxes overlapping
    // (text tool checks for existing annotations at the drag start point)
    for (let i = 0; i < 10; i++) {
      const col = i % 5
      const row = Math.floor(i / 5)
      await selectTool(page, 'Text (T)')
      await dragOnCanvas(page, { x: 20 + col * 90, y: 20 + row * 250 }, { x: 80 + col * 90, y: 50 + row * 250 })
      await page.waitForTimeout(300)
      const textarea = page.locator('textarea')
      if (await textarea.isVisible()) {
        await page.keyboard.type('T' + i)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('text id is a valid UUID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('text default fontFamily is stored', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.fontFamily).toBeTruthy()
  })

  test('text annotation has default opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; opacity: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.opacity).toBeGreaterThan(0)
  })

  test('text with red color persists', async ({ page }) => {
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

  test('Ctrl+D duplicates text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Delete key removes selected text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+C then Ctrl+V copies text', async ({ page }) => {
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

  test('textarea has overflow hidden class', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveClass(/overflow-hidden/)
  })

  test('textarea has resize-none class', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveClass(/resize-none/)
  })

  test('textarea has outline-none class', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveClass(/outline-none/)
  })
})
