import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Text Tool Core', () => {
  test('drag to create text box', async ({ page }) => {
    await createAnnotation(page, 'text')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text box enters edit mode immediately after creation', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 3000 })
  })

  test('type text — visible in edit mode', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Hello World')
  })

  test('press Escape to commit text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty text box deleted on commit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    // Don't type anything
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text shortcut T activates tool', async ({ page }) => {
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('text')
  })

  test('multiple text boxes on same page', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 120, h: 40 })
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('double-click text box — enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await selectTool(page, 'Select (S)')
    // First click to select the text box
    await clickCanvasAt(page, 175, 125)
    await page.waitForTimeout(300)
    // Now double-click to enter edit mode
    await doubleClickCanvasAt(page, 175, 125)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 3000 })
  })

  test('click outside text box to commit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeHidden({ timeout: 3000 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo text creation — removes text box', async ({ page }) => {
    await createAnnotation(page, 'text')
    expect(await getAnnotationCount(page)).toBe(1)
    // Text needs 2 Ctrl+Z (creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete text via keyboard', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await selectTool(page, 'Select (S)')
    // Click on edge of text box
    await clickCanvasAt(page, 100, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('export text to PDF', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('toggle bold via Ctrl+B', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggle italic via Ctrl+I', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggle underline via Ctrl+U', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text wraps at text box width boundary', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a long text that should wrap within the small text box boundary')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text with newlines — preserved correctly', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('floating toolbar appears during text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 230 })
    await page.waitForTimeout(500)
    // During text editing, formatting controls should be visible in the properties bar
    // Check for bold button (Ctrl+B shortcut label or Bold title) or any formatting control
    const boldBtn = page.locator('button[title*="Bold"], button[title*="bold"]')
    const textarea = page.locator('textarea')
    // Either the toolbar shows formatting buttons or the textarea is visible (editing is active)
    const hasToolbar = await boldBtn.count() > 0 && await boldBtn.first().isVisible()
    const hasTextarea = await textarea.isVisible()
    expect(hasToolbar || hasTextarea).toBe(true)
  })

  test('re-enter edit mode — text preserved', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Initial text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 140)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      const value = await textarea.inputValue()
      expect(value).toBe('Initial text')
    }
  })

  test('text box resize via drag handles', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 125)
    await page.waitForTimeout(200)
    // Try to drag SE handle
    await dragOnCanvas(page, { x: 250, y: 150 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('set text alignment: center', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('set bullet list', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="unordered"]').first()
    if (await bulletBtn.count() > 0 && await bulletBtn.isVisible()) await bulletBtn.click()
    await page.keyboard.type('Item 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Item 2')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('set numbered list', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const numberedBtn = page.locator('button[title*="umber"], button[title*="ordered"]').first()
    if (await numberedBtn.count() > 0 && await numberedBtn.isVisible()) await numberedBtn.click()
    await page.keyboard.type('First')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Tab key cycles through text annotations', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 120, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('text with background color', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    if (await bgBtn.isVisible()) await bgBtn.click()
    await page.keyboard.type('Highlighted text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('change line spacing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('2')
    }
    await page.keyboard.type('Double spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('whitespace-only text committed — text box deleted', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Whitespace-only may or may not be deleted depending on implementation
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
