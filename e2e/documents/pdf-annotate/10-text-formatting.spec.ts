import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, waitForSessionSave,
  getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

/** Helper: create a text box in edit mode and return the textarea locator */
async function createTextInEditMode(page: import('@playwright/test').Page, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 60 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  return page.locator('textarea')
}

// ─── Bold ───────────────────────────────────────────────────────────────────

test.describe('Text Formatting — Bold', () => {
  test('Bold button is visible when text tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
  })

  test('clicking Bold button toggles bold styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Bold (Ctrl+B)"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+B toggles bold during editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+B toggles bold off when already bold', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
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

  test('Bold button shows active state when bold is on', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await boldBtn.click()
    await page.waitForTimeout(100)
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
  })
})

// ─── Italic ─────────────────────────────────────────────────────────────────

test.describe('Text Formatting — Italic', () => {
  test('Italic button is visible when text tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible()
  })

  test('clicking Italic button toggles italic styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Italic (Ctrl+I)"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+I toggles italic during editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+I toggles italic off when already italic', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
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
})

// ─── Underline ──────────────────────────────────────────────────────────────

test.describe('Text Formatting — Underline', () => {
  test('Underline button is visible when text tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Underline (Ctrl+U)"]')).toBeVisible()
  })

  test('clicking Underline button toggles underline', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Underline (Ctrl+U)"]').click()
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('Ctrl+U toggles underline during editing', async ({ page }) => {
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
})

// ─── Strikethrough ──────────────────────────────────────────────────────────

test.describe('Text Formatting — Strikethrough', () => {
  test('Strikethrough button is visible when text tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Strikethrough (Ctrl+Shift+X)"]')).toBeVisible()
  })

  test('clicking Strikethrough button toggles strikethrough', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Strikethrough (Ctrl+Shift+X)"]').click()
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('Ctrl+Shift+X toggles strikethrough during editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('strikethrough persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await page.keyboard.type('Struck text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; strikethrough?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.strikethrough).toBe(true)
  })
})

// ─── Combined Formatting ────────────────────────────────────────────────────

test.describe('Text Formatting — Combined', () => {
  test('bold + italic applied together', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('bold + italic persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.bold).toBe(true)
    expect(textAnn!.italic).toBe(true)
  })

  test('bold + underline + strikethrough all active', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
    expect(td).toContain('line-through')
  })

  test('formatting persists across edit sessions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold persists')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('font-weight', '700')
    }
  })
})

// ─── Font Family ────────────────────────────────────────────────────────────

test.describe('Text Formatting — Font Family', () => {
  test('font family dropdown is visible for text tool', async ({ page }) => {
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

  test('font family change persists in session data', async ({ page }) => {
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

  test('Times New Roman font option is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Times New Roman")')).toBeAttached()
  })

  test('Consolas font option is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Consolas")')).toBeAttached()
  })
})

// ─── Font Size ──────────────────────────────────────────────────────────────

test.describe('Text Formatting — Font Size', () => {
  test('font size dropdown is visible for text tool', async ({ page }) => {
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
    // Font size is in annotation-space (no RENDER_SCALE); zoom handled via CSS transform
    expect(fs).toBeCloseTo(24, 0)
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
})

// ─── Text Alignment ─────────────────────────────────────────────────────────

test.describe('Text Formatting — Alignment', () => {
  test('Align Left button is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Left"]')).toBeVisible()
  })

  test('Align Center button is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Center"]')).toBeVisible()
  })

  test('Align Right button is visible for text tool', async ({ page }) => {
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

// ─── Line Spacing ───────────────────────────────────────────────────────────

test.describe('Text Formatting — Line Spacing', () => {
  test('line spacing dropdown is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect).toBeVisible()
  })

  test('changing line spacing to 1.0 updates textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1')
  })

  test('changing line spacing to 2.0 updates textarea', async ({ page }) => {
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

// ─── Background Highlight ──────────────────────────────────────────────────

test.describe('Text Formatting — Background Highlight', () => {
  test('background highlight button is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Text background highlight"]')).toBeVisible()
  })

  test('clicking background highlight button toggles it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('toggling background highlight off removes active state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).not.toHaveClass(/text-\[#14B8A6\]/)
  })
})

// ─── Format Controls Visibility ─────────────────────────────────────────────

test.describe('Text Formatting — Controls Visibility', () => {
  test('format controls visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
  })

  test('format controls visible for Callout tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
  })

  test('format controls hidden for Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Highlight tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })

  test('format controls hidden for Measure tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
  })
})

// ─── Font Size Extended ─────────────────────────────────────────────────────

test.describe('Text Formatting — Font Size Extended', () => {
  test('font size 9 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="9"]')).toBeAttached()
  })

  test('font size 10 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="10"]')).toBeAttached()
  })

  test('font size 11 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="11"]')).toBeAttached()
  })

  test('font size 12 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="12"]')).toBeAttached()
  })

  test('font size 48 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="48"]')).toBeAttached()
  })

  test('font size 64 is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="64"]')).toBeAttached()
  })

  test('small font size (8) applied to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('8')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    // Font size is in annotation-space (no RENDER_SCALE)
    expect(fs).toBeCloseTo(8, 0)
  })

  test('large font size (72) applied to textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('72')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    // Font size is in annotation-space (no RENDER_SCALE)
    expect(fs).toBeCloseTo(72, 0)
  })
})
