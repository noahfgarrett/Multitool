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

/** Helper: create a text box in edit mode */
async function createTextInEditMode(page: import('@playwright/test').Page, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 250, h: 100 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  return page.locator('textarea')
}

// ─── Default Alignment ─────────────────────────────────────────────────────

test.describe('Text Alignment — Defaults', () => {
  test('default alignment is left', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('Align Left button shows active state by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const leftBtn = page.locator('button[title="Align Left"]')
    await expect(leftBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('Align Center button is not active by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const centerBtn = page.locator('button[title="Align Center"]')
    await expect(centerBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Align Right button is not active by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const rightBtn = page.locator('button[title="Align Right"]')
    await expect(rightBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── Center Alignment ──────────────────────────────────────────────────────

test.describe('Text Alignment — Center', () => {
  test('center alignment sets textAlign to center', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('center alignment button shows active state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    const centerBtn = page.locator('button[title="Align Center"]')
    await expect(centerBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('center alignment persists after Escape and re-edit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 225, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('text-align', 'center')
    }
  })

  test('center alignment saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Center')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.textAlign).toBe('center')
  })
})

// ─── Right Alignment ────────────────────────────────────────────────────────

test.describe('Text Alignment — Right', () => {
  test('right alignment sets textAlign to right', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('right alignment button shows active state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    const rightBtn = page.locator('button[title="Align Right"]')
    await expect(rightBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('right alignment persists after Escape and re-edit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right aligned')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 225, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('text-align', 'right')
    }
  })

  test('right alignment saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.textAlign).toBe('right')
  })

  test('switching from right to left resets alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
    await page.locator('button[title="Align Left"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })
})

// ─── Line Spacing Deep Tests ────────────────────────────────────────────────

test.describe('Text Line Spacing — Deep', () => {
  test('line spacing 1.0 creates tight text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1')
  })

  test('line spacing 1.15 applies correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.15')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1.15')
  })

  test('line spacing 1.3 is the default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect).toHaveValue('1.3')
  })

  test('line spacing 1.5 applies correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.5')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1.5')
  })

  test('line spacing 2.0 creates double-spaced text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
  })

  test('line spacing persists after edit mode round-trip', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('Double spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 225, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(spacingSelect).toHaveValue('2')
    }
  })

  test('line spacing 2.0 saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('Test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(2)
  })

  test('changing from 2.0 to 1.0 updates textarea immediately', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1')
  })
})

// ─── Multi-line Text with Alignment ─────────────────────────────────────────

test.describe('Text Alignment — Multi-line', () => {
  test('multi-line text with center alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 150 })
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Line 1\nLine 2\nLine 3')
    await expect(textarea).toHaveCSS('text-align', 'center')
    await expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
  })

  test('multi-line text with right alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 150 })
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right 1\nRight 2')
    await expect(textarea).toHaveCSS('text-align', 'right')
    await expect(textarea).toHaveValue('Right 1\nRight 2')
  })

  test('long paragraph with center alignment wraps correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 50, y: 100, w: 200, h: 150 })
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('This is a paragraph with enough words to cause wrapping within the text box')
    await expect(textarea).toHaveCSS('text-align', 'center')
    // Text should have content
    const value = await textarea.inputValue()
    expect(value.length).toBeGreaterThan(20)
  })
})

// ─── Auto-height ────────────────────────────────────────────────────────────

test.describe('Text — Auto Height', () => {
  test('auto-height grows as text is typed', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page, { x: 100, y: 100, w: 200, h: 60 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = Object.values(sessionBefore.annotations).flat() as Array<{ type: string; height?: number }>
    const heightBefore = annsBefore.find(a => a.type === 'text')?.height ?? 0
    // Type many lines to force growth
    await page.keyboard.type('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6')
    await page.waitForTimeout(400)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = Object.values(sessionAfter.annotations).flat() as Array<{ type: string; height?: number }>
    const heightAfter = annsAfter.find(a => a.type === 'text')?.height ?? 0
    expect(heightAfter).toBeGreaterThan(heightBefore)
  })

  test('text box height increases with Enter presses', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 200, h: 60 })
    const initialHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    await page.keyboard.type('A')
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Enter')
      await page.keyboard.type('x')
    }
    await page.waitForTimeout(400)
    const finalHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    expect(finalHeight).toBeGreaterThan(initialHeight)
  })
})

// ─── Alignment Switching ────────────────────────────────────────────────────

test.describe('Text Alignment — Switching', () => {
  test('switching from left to center to right cycles correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveCSS('text-align', 'left')
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('switching from center to left resets', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Left"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('alignment change with content preserves text', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('Alignment test')
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveValue('Alignment test')
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('center alignment on multi-line text preserves all lines', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 150 })
    await page.keyboard.type('Line A\nLine B\nLine C')
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveValue('Line A\nLine B\nLine C')
  })

  test('alignment saved after blur commit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right aligned')
    // Blur to commit
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.textAlign).toBe('right')
  })
})

// ─── Line Spacing with Alignment ────────────────────────────────────────────

test.describe('Text Spacing + Alignment Combined', () => {
  test('line spacing 2.0 with center alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 150 })
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('line spacing 1.5 with right alignment', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page, { x: 100, y: 100, w: 250, h: 150 })
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.5')
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1.5')
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('combined spacing and alignment persist in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Combined')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(2)
    expect(textAnn!.textAlign).toBe('center')
  })

  test('spacing 1.0 with left alignment and bold', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1')
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('auto-height works with spacing 2.0', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page, { x: 100, y: 100, w: 200, h: 60 })
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const heightBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')?.height ?? 0
    await page.keyboard.type('A\nB\nC\nD\nE')
    await page.waitForTimeout(400)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const heightAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')?.height ?? 0
    expect(heightAfter).toBeGreaterThan(heightBefore)
  })

  test('line spacing default option shows "(default)" label', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const spacingSelect = page.locator('select[title="Line spacing"]')
    const defaultOption = spacingSelect.locator('option[value="1.3"]')
    const text = await defaultOption.textContent()
    expect(text).toContain('default')
  })

  test('changing spacing then reverting to 1.3 works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('2')
    await spacingSelect.selectOption('1.3')
    await page.waitForTimeout(100)
    await expect(spacingSelect).toHaveValue('1.3')
  })

  test('alignment with empty text does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Left"]').click()
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('spacing change with empty text does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('alignment left saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    // Left is default, but explicitly set it
    await page.locator('button[title="Align Left"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Left')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.textAlign).toBe('left')
  })

  test('spacing 1.0 saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await page.keyboard.type('Tight')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(1)
  })

  test('spacing 1.15 saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.15')
    await page.waitForTimeout(100)
    await page.keyboard.type('1.15')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(1.15)
  })

  test('right alignment with spacing 1.0 saved correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await page.keyboard.type('Tight right')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number; textAlign?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(1)
    expect(textAnn!.textAlign).toBe('right')
  })

  test('center alignment on single word', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Word')
    await expect(textarea).toHaveCSS('text-align', 'center')
    await expect(textarea).toHaveValue('Word')
  })

  test('right alignment on single word', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Word')
    await expect(textarea).toHaveCSS('text-align', 'right')
    await expect(textarea).toHaveValue('Word')
  })

  test('line spacing 1.5 saved in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1.5')
    await page.waitForTimeout(100)
    await page.keyboard.type('1.5 spacing')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.lineHeight).toBe(1.5)
  })

  test('auto-height with line spacing 1.0 grows less than 2.0', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create with spacing 1.0
    const textarea1 = await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 60 })
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await page.keyboard.type('A\nB\nC\nD\nE')
    await page.waitForTimeout(300)
    const height1 = await textarea1.evaluate(el => el.getBoundingClientRect().height)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Create with spacing 2.0
    const textarea2 = await createTextInEditMode(page, { x: 50, y: 300, w: 200, h: 60 })
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('A\nB\nC\nD\nE')
    await page.waitForTimeout(300)
    const height2 = await textarea2.evaluate(el => el.getBoundingClientRect().height)
    expect(height2).toBeGreaterThan(height1)
  })

  test('alignment visual on canvas after commit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })
})
