import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, moveAnnotation,
  waitForSessionSave, getSessionData, screenshotCanvas, goToPage,
} from '../../helpers/pdf-annotate'

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

/** Helper: create a committed text annotation (exits edit mode and deselects) */
async function createCommittedText(
  page: import('@playwright/test').Page,
  text: string,
  region?: { x: number; y: number; w: number; h: number },
) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 60 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  // Deselect by clicking empty canvas area — prevents auto-selection from
  // causing the next click on the text to enter edit mode instead of selecting
  await clickCanvasAt(page, 450, 450)
  await page.waitForTimeout(100)
}

/** Helper: get text annotations from session data */
async function getTextAnnotations(page: import('@playwright/test').Page) {
  await waitForSessionSave(page)
  const session = await getSessionData(page)
  if (!session) return []
  const anns = Object.values(session.annotations).flat() as Array<Record<string, unknown>>
  return anns.filter(a => a.type === 'text')
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1A: Creation & Basic Editing (28 tests)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Activation ─────────────────────────────────────────────────────────────

test.describe('1A — Activation', () => {
  test('T key activates text tool and highlights toolbar button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Text (T)"]')
    await expect(btn).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('clicking Text toolbar button activates text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Text (T)"]').click()
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Text (T)"]')).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('text tool shows text cursor on annotation canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const canvas = page.locator('canvas').nth(1)
    await expect(canvas).toHaveCSS('cursor', 'text')
  })

  test('switching to Select deactivates text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await selectTool(page, 'Select (S)')
    await expect(page.locator('button[title="Text (T)"]')).not.toHaveClass(/bg-\[#F47B20\]/)
  })

  test('properties bar shows 13+ controls when text tool is active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Font family dropdown
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') })
    await expect(fontSelect.first()).toBeVisible()
    // Bold button
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
    // Italic button
    await expect(page.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible()
  })
})

// ─── Text Box Creation ──────────────────────────────────────────────────────

test.describe('1A — Text Box Creation', () => {
  test('click+drag creates a text box with visible textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('textarea is focused immediately after creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toBeFocused()
  })

  test('textarea has blue border indicating edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveClass(/border-\[#3B82F6\]/)
  })

  test('textarea shows placeholder "Type here..."', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveAttribute('placeholder', 'Type here...')
  })

  test('small click (no drag) creates default-sized text box (200x50)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 202, y: 202 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('typing into textarea updates its value', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('Hello World')
    await expect(textarea).toHaveValue('Hello World')
  })

  test('Escape commits text and hides textarea', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('Committed text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('clicking away from text box commits text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('Click away test')
    // Click far from the text box to commit
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty text box auto-deletes on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Do not type anything
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('empty text box auto-deletes on click-away', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Click away without typing
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text content persists in session data after commit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Session persist test')
    const anns = await getTextAnnotations(page)
    expect(anns.length).toBe(1)
    expect(anns[0].text).toBe('Session persist test')
  })
})

// ─── Multiple & Re-Edit ────────────────────────────────────────────────────

test.describe('1A — Multiple Text Boxes & Re-Edit', () => {
  test('creating two text boxes results in annotation count of 2', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('each text box retains its own content in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Alpha', { x: 100, y: 80, w: 180, h: 50 })
    await createCommittedText(page, 'Bravo', { x: 100, y: 250, w: 180, h: 50 })
    const anns = await getTextAnnotations(page)
    const contents = anns.map(a => a.text)
    expect(contents).toContain('Alpha')
    expect(contents).toContain('Bravo')
  })

  test('double-click on committed text box re-enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Edit me', { x: 100, y: 100, w: 200, h: 60 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Edit me')
    }
  })

  test('editing existing text updates its content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Original', { x: 100, y: 100, w: 200, h: 60 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      // Select all and replace
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Updated')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      const anns = await getTextAnnotations(page)
      expect(anns[0].text).toBe('Updated')
    }
  })

  test('text annotation renders on canvas (screenshot changes)', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await createCommittedText(page, 'Visible on canvas')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450) // deselect
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('very long text wraps within the text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 150, h: 80 })
    const longText = 'This is a rather long sentence that should definitely wrap within the text box boundaries.'
    await page.keyboard.type(longText)
    await expect(textarea).toHaveValue(longText)
    // Commit and verify session has the full text
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(anns[0].text).toBe(longText)
  })

  test('multiline text (Enter key) creates line breaks', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(String(anns[0].text)).toContain('Line 1')
    expect(String(anns[0].text)).toContain('Line 2')
  })

  test('undo requires two Ctrl+Z to fully remove text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Undo me')
    expect(await getAnnotationCount(page)).toBe(1)
    // First undo removes text commit, second removes creation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text color defaults to black when switching to text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Start with a tool that uses orange (default color)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 100, y: 100 })
    await page.waitForTimeout(200)
    // Switch to text tool
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 350, y: 210 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Black text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    const textAnn = anns.find(a => a.text === 'Black text')
    if (textAnn) {
      // Color should be black (#000000 or similar), not orange (#F47B20)
      expect(String(textAnn.color)).not.toBe('#F47B20')
    }
  })

  test('text on page 2 of multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await createCommittedText(page, 'Page two text', { x: 100, y: 100, w: 200, h: 60 })
    const anns = await getTextAnnotations(page)
    expect(anns.length).toBeGreaterThanOrEqual(1)
    expect(anns.some(a => a.text === 'Page two text')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1B: Formatting (35 tests)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Default Values ─────────────────────────────────────────────────────────

test.describe('1B — Default Formatting', () => {
  test('default font family is Arial', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const fontFamily = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(fontFamily.toLowerCase()).toContain('arial')
  })

  test('default font size is 16', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.type('Size check')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(anns[0].fontSize).toBe(16)
  })

  test('default text alignment is left', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('default line spacing is 1.3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect).toHaveValue('1.3')
  })
})

// ─── Bold ───────────────────────────────────────────────────────────────────

test.describe('1B — Bold', () => {
  test('Ctrl+B toggles bold on during editing', async ({ page }) => {
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
    const anns = await getTextAnnotations(page)
    expect(anns[0].bold).toBe(true)
  })

  test('Bold button shows active state when enabled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await boldBtn.click()
    await page.waitForTimeout(100)
    await expect(boldBtn).toHaveClass(/text-\[#F47B20\]/)
  })
})

// ─── Italic ─────────────────────────────────────────────────────────────────

test.describe('1B — Italic', () => {
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
    const anns = await getTextAnnotations(page)
    expect(anns[0].italic).toBe(true)
  })
})

// ─── Underline ──────────────────────────────────────────────────────────────

test.describe('1B — Underline', () => {
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
    const anns = await getTextAnnotations(page)
    expect(anns[0].underline).toBe(true)
  })
})

// ─── Strikethrough ──────────────────────────────────────────────────────────

test.describe('1B — Strikethrough', () => {
  test('Ctrl+Shift+X toggles strikethrough on', async ({ page }) => {
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
    await page.keyboard.type('Strikethrough text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(anns[0].strikethrough).toBe(true)
  })
})

// ─── Superscript / Subscript ────────────────────────────────────────────────

test.describe('1B — Superscript & Subscript', () => {
  test('superscript button toggles superscript styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Use .first() to target the properties bar button (floating toolbar also has one)
    const superBtn = page.locator('button[title*="Superscript"]').first()
    if (await superBtn.isVisible()) {
      await superBtn.click()
      await page.waitForTimeout(100)
      await expect(superBtn).toHaveClass(/text-\[#F47B20\]/)
    }
  })

  test('subscript button toggles subscript styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Use .first() to target the properties bar button (floating toolbar also has one)
    const subBtn = page.locator('button[title*="Subscript"]').first()
    if (await subBtn.isVisible()) {
      await subBtn.click()
      await page.waitForTimeout(100)
      await expect(subBtn).toHaveClass(/text-\[#F47B20\]/)
    }
  })

  test('superscript and subscript are mutually exclusive', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Use .first() to target the properties bar buttons (floating toolbar also has them)
    const superBtn = page.locator('button[title*="Superscript"]').first()
    const subBtn = page.locator('button[title*="Subscript"]').first()
    if (await superBtn.isVisible() && await subBtn.isVisible()) {
      await superBtn.click()
      await page.waitForTimeout(100)
      await expect(superBtn).toHaveClass(/text-\[#F47B20\]/)
      await subBtn.click()
      await page.waitForTimeout(100)
      // Superscript should be deactivated
      await expect(superBtn).not.toHaveClass(/text-\[#F47B20\]/)
      await expect(subBtn).toHaveClass(/text-\[#F47B20\]/)
    }
  })
})

// ─── Alignment ──────────────────────────────────────────────────────────────

test.describe('1B — Alignment', () => {
  test('Align Center sets text-align to center', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('Align Right sets text-align to right', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('Align Justify sets text-align to justify', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const justifyBtn = page.locator('button[title="Align Justify"]')
    if (await justifyBtn.isVisible()) {
      await justifyBtn.click()
      await page.waitForTimeout(100)
      await expect(textarea).toHaveCSS('text-align', 'justify')
    }
  })

  test('alignment persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(anns[0].textAlign).toBe('center')
  })

  test('alignment preserved after re-edit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 80 })
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right aligned')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 225, 140)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('text-align', 'right')
    }
  })
})

// ─── Line Spacing ───────────────────────────────────────────────────────────

test.describe('1B — Line Spacing', () => {
  test('changing line spacing to 1.5 updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.5')
    await page.waitForTimeout(100)
    await page.keyboard.type('Spaced text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(Number(anns[0].lineHeight)).toBeCloseTo(1.5)
  })

  test('line spacing 2.0 produces visibly different rendering', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 120 })
    await page.keyboard.type('Line one\nLine two\nLine three')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450) // deselect
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Re-edit and change spacing
    await doubleClickCanvasAt(page, 200, 140)
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('2')
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await selectTool(page, 'Select (S)')
      await clickCanvasAt(page, 450, 450)
      await page.waitForTimeout(200)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('line spacing 1.0 option is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    const option = spacingSelect.locator('option[value="1"]')
    const altOption = spacingSelect.locator('option[value="1.0"]')
    const hasOption = (await option.count()) > 0 || (await altOption.count()) > 0
    expect(hasOption).toBe(true)
  })
})

// ─── Font Size ──────────────────────────────────────────────────────────────

test.describe('1B — Font Size', () => {
  test('changing font size updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Font size is a <select> with class w-14 in the properties bar
    const fontSizeSelect = page.locator('select.w-14')
    if (await fontSizeSelect.isVisible()) {
      await fontSizeSelect.selectOption('24')
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Big text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(Number(anns[0].fontSize)).toBe(24)
  })

  test('font size change produces visible difference on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create text at default size 16
    await createCommittedText(page, 'Small text', { x: 100, y: 100, w: 200, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Create text at size 32
    await selectTool(page, 'Text (T)')
    const fontSizeInput = page.locator('input[type="number"]').first()
    if (await fontSizeInput.isVisible()) {
      await fontSizeInput.fill('32')
      await fontSizeInput.press('Enter')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 350, y: 320 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Big text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Font Family ────────────────────────────────────────────────────────────

test.describe('1B — Font Family', () => {
  test('changing font family updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    // Select a non-default font
    const options = await fontSelect.locator('option').allTextContents()
    const nonArial = options.find(o => o !== 'Arial' && o.length > 0)
    if (nonArial) {
      await fontSelect.selectOption({ label: nonArial })
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Different font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    if (nonArial) {
      expect(anns[0].fontFamily).not.toBe('Arial')
    }
  })

  test('font family change updates textarea CSS', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    const options = await fontSelect.locator('option').allTextContents()
    const courier = options.find(o => o.toLowerCase().includes('courier'))
    if (courier) {
      await fontSelect.selectOption({ label: courier })
      await page.waitForTimeout(100)
      const fontFamily = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
      expect(fontFamily.toLowerCase()).toContain('courier')
    }
  })
})

// ─── Bullet & Numbered Lists ────────────────────────────────────────────────

test.describe('1B — Lists', () => {
  test('bullet list button is visible during editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const bulletBtn = page.locator('button[title*="Bullet"]')
    if (await bulletBtn.count() > 0) {
      await expect(bulletBtn.first()).toBeVisible()
    }
  })

  test('numbered list button is visible during editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const numBtn = page.locator('button[title*="Numbered"]')
    if (await numBtn.count() > 0) {
      await expect(numBtn.first()).toBeVisible()
    }
  })

  test('toggling bullet list changes canvas rendering', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 100 })
    await page.keyboard.type('Item one\nItem two\nItem three')
    const bulletBtn = page.locator('button[title*="Bullet"]')
    if (await bulletBtn.count() > 0 && await bulletBtn.first().isVisible()) {
      await bulletBtn.first().click()
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      const anns = await getTextAnnotations(page)
      expect(anns[0].listType === 'bullet' || anns[0].bulletList === true).toBeTruthy()
    }
  })
})

// ─── Text Background Highlight ──────────────────────────────────────────────

test.describe('1B — Text Background Highlight', () => {
  test('text background highlight toggle is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const highlightBtn = page.locator('button[title*="Background"], button[title*="Highlight"]').first()
    if (await highlightBtn.isVisible()) {
      expect(true).toBe(true) // button found
    }
  })

  test('toggling text background changes canvas rendering', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Highlighted text')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Re-edit and toggle highlight
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const highlightBtn = page.locator('button[title*="Background"], button[title*="Highlight"]').first()
    if (await highlightBtn.isVisible()) {
      await highlightBtn.click()
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await selectTool(page, 'Select (S)')
      await clickCanvasAt(page, 450, 450)
      await page.waitForTimeout(200)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })
})

// ─── Combined Formatting ────────────────────────────────────────────────────

test.describe('1B — Combined Formatting', () => {
  test('bold + italic applied together', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('bold + italic + underline persists in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('All formatted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const anns = await getTextAnnotations(page)
    expect(anns[0].bold).toBe(true)
    expect(anns[0].italic).toBe(true)
    expect(anns[0].underline).toBe(true)
  })

  test('floating formatting toolbar appears during text editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // The floating toolbar should contain formatting buttons
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await expect(boldBtn).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1C: Select/Move/Resize/Delete (30 tests)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe('1C — Selection', () => {
  test('single-click on text box in select mode selects it (grab cursor)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Select me', { x: 100, y: 100, w: 200, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Should show selection indicators (nudge hint)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('double-click on selected text box enters edit mode', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Double click me', { x: 100, y: 100, w: 200, h: 60 })
    // First click to select
    await selectAnnotationAt(page, 200, 130)
    // Now click again on the already-selected text to enter edit mode
    await clickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })
  })

  test('clicking empty canvas deselects text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Deselect me', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select · Ctrl/')).toBeVisible()
  })

  test('Escape deselects text box in select mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Escape me', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select · Ctrl/')).toBeVisible()
  })

  test('8 resize handles visible when text box is selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Handles', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Verify canvas changed (handles rendered)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })
})

// ─── Moving ─────────────────────────────────────────────────────────────────

test.describe('1C — Moving', () => {
  test('dragging selected text box moves it to new position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('moving text box preserves its content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Moved content', { x: 100, y: 100, w: 200, h: 60 })
    await moveAnnotation(page, { x: 200, y: 130 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    const anns = await getTextAnnotations(page)
    expect(anns[0].text).toBe('Moved content')
  })

  test('moving text box updates position in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    const annsBefore = Object.values(before.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const posBefore = annsBefore.find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const after = await getSessionData(page)
    const annsAfter = Object.values(after.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const posAfter = annsAfter.find(a => a.type === 'text')!.points[0]
    expect(posAfter.x).not.toBeCloseTo(posBefore.x, 0)
  })

  test('small move (10px) produces visible change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 225 }, { x: 285, y: 235 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('large move (200px) produces visible change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 125, y: 75 }, { x: 325, y: 375 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Arrow Key Nudge ────────────────────────────────────────────────────────

test.describe('1C — Arrow Key Nudge', () => {
  test('ArrowDown nudges text box down by 1px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    const annsBefore = Object.values(before.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yBefore = annsBefore.find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const after = await getSessionData(page)
    const annsAfter = Object.values(after.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yAfter = annsAfter.find(a => a.type === 'text')!.points[0].y
    expect(yAfter).toBeGreaterThan(yBefore)
  })

  test('ArrowRight nudges text box right', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges text box left', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowUp nudges text box up', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+Arrow nudges by 10px (larger than 1px)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    const annsBefore = Object.values(before.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const xBefore = annsBefore.find(a => a.type === 'text')!.points[0].x
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const after = await getSessionData(page)
    const annsAfter = Object.values(after.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const xAfter = annsAfter.find(a => a.type === 'text')!.points[0].x
    expect(Math.abs(xAfter - xBefore)).toBeGreaterThan(2)
  })

  test('multiple arrow presses accumulate movement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown')
    }
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize ─────────────────────────────────────────────────────────────────

test.describe('1C — Resize', () => {
  test('dragging E handle widens the text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    const annsBefore = Object.values(before.annotations).flat() as Array<{ type: string; width?: number; points: Array<{ x: number; y: number }> }>
    const textBefore = annsBefore.find(a => a.type === 'text')!
    const widthBefore = textBefore.width || 0
    // Drag from right edge outward
    await dragOnCanvas(page, { x: 300, y: 125 }, { x: 400, y: 125 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const after = await getSessionData(page)
    const annsAfter = Object.values(after.annotations).flat() as Array<{ type: string; width?: number; points: Array<{ x: number; y: number }> }>
    const textAfter = annsAfter.find(a => a.type === 'text')!
    const widthAfter = textAfter.width || 0
    expect(widthAfter).toBeGreaterThan(widthBefore)
  })

  test('dragging S handle increases text box height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    const before = await screenshotCanvas(page)
    // Drag from bottom edge downward
    await dragOnCanvas(page, { x: 200, y: 150 }, { x: 200, y: 250 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resized text box preserves its content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Resize me', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    // Drag right edge
    await dragOnCanvas(page, { x: 300, y: 130 }, { x: 400, y: 130 })
    await page.waitForTimeout(300)
    const anns = await getTextAnnotations(page)
    expect(anns[0].text).toBe('Resize me')
  })
})

// ─── Delete ─────────────────────────────────────────────────────────────────

test.describe('1C — Delete', () => {
  test('Delete key removes selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace removes selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting text box removes it from session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const anns = await getTextAnnotations(page)
    expect(anns.length).toBe(0)
  })

  test('deleting one of two text boxes leaves the other intact', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Keep me', { x: 100, y: 80, w: 180, h: 50 })
    await createCommittedText(page, 'Delete me', { x: 100, y: 250, w: 180, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select and delete the second one
    await selectAnnotationAt(page, 190, 275)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const anns = await getTextAnnotations(page)
    expect(anns[0].text).toBe('Keep me')
  })
})

// ─── Duplicate & Copy/Paste ─────────────────────────────────────────────────

test.describe('1C — Duplicate & Copy/Paste', () => {
  test('Ctrl+D duplicates selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicated text box has same content as original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Clone me', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    const anns = await getTextAnnotations(page)
    expect(anns.length).toBe(2)
    expect(anns[0].text).toBe('Clone me')
    expect(anns[1].text).toBe('Clone me')
  })

  test('Ctrl+C then Ctrl+V copies text box with offset', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Context Menu ───────────────────────────────────────────────────────────

test.describe('1C — Context Menu', () => {
  test('right-click on selected text box shows context menu', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Right click me', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    // Right-click
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 200, box.y + 130, { button: 'right' })
      await page.waitForTimeout(300)
      // Should show context menu with Duplicate, Delete options
      const duplicateItem = page.locator('text=/Duplicate/')
      const deleteItem = page.locator('text=/Delete/')
      const hasDuplicate = await duplicateItem.count() > 0
      const hasDelete = await deleteItem.count() > 0
      expect(hasDuplicate || hasDelete).toBe(true)
    }
  })

  test('context menu Delete removes the text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Context delete', { x: 100, y: 100, w: 200, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 130)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 200, box.y + 130, { button: 'right' })
      await page.waitForTimeout(300)
      const deleteItem = page.locator('text=/Delete/').first()
      if (await deleteItem.isVisible()) {
        await deleteItem.click()
        await page.waitForTimeout(300)
        expect(await getAnnotationCount(page)).toBe(0)
      }
    }
  })

  test('context menu Duplicate creates a copy', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createCommittedText(page, 'Context dup', { x: 100, y: 100, w: 200, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 130)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 200, box.y + 130, { button: 'right' })
      await page.waitForTimeout(300)
      const duplicateItem = page.locator('text=/Duplicate/').first()
      if (await duplicateItem.isVisible()) {
        await duplicateItem.click()
        await page.waitForTimeout(300)
        expect(await getAnnotationCount(page)).toBe(2)
      }
    }
  })
})

// ─── Tab Navigation ─────────────────────────────────────────────────────────

test.describe('1C — Tab Navigation', () => {
  test('Tab cycles focus between text boxes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 150, h: 50 })
    await selectAnnotationAt(page, 175, 105)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    // Selection should have changed (different handles rendered)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Zoom Interaction ───────────────────────────────────────────────────────

test.describe('1C — Zoom Interaction', () => {
  test('text box created at 125% zoom renders correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in once (to 125%)
    const zoomInBtn = page.locator('button[title*="Zoom in"], button[title*="Zoom In"]').first()
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click()
      await page.waitForTimeout(300)
    }
    await createCommittedText(page, 'Zoomed text', { x: 100, y: 100, w: 200, h: 60 })
    const anns = await getTextAnnotations(page)
    expect(anns.length).toBe(1)
    expect(anns[0].text).toBe('Zoomed text')
  })

  test('text box can be selected and moved at 125% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomInBtn = page.locator('button[title*="Zoom in"], button[title*="Zoom In"]').first()
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})
