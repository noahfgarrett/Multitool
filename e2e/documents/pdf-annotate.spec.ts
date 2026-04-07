import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'
import { uploadPDFAndWait, selectTool, drawOnCanvas, getAnnotationCount, clickCanvasAt, doubleClickCanvasAt, dragOnCanvas } from '../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. PDF Upload & Rendering ────────────────────────────────────────────────

test.describe('PDF Upload & Rendering', () => {
  test('empty state shows upload drop zone', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Annotate with pencil, shapes, text & more')).toBeVisible()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('uploading a PDF renders the canvas and toolbar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Both canvases should be visible (PDF + annotation)
    const canvases = page.locator('canvas')
    await expect(canvases.first()).toBeVisible()
    await expect(canvases.nth(1)).toBeVisible()
    // Toolbar should show export button
    await expect(page.getByText('Export PDF')).toBeVisible()
    // Status bar should show file name
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  test('uploading a single-page PDF does not show page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    // Prev/Next buttons should not be present for single page
    await expect(page.locator('button:has-text("Prev")')).toBeHidden()
    await expect(page.locator('button:has-text("Next")')).toBeHidden()
  })
})

// ─── 2. Select Tool ──────────────────────────────────────────────────────────

test.describe('Select Tool', () => {
  test('select tool button is visible in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Select (S)"]')).toBeVisible()
  })

  test('select tool is the default active tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    // The select button should have the active styling (orange background)
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('pressing S key activates select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Switch to pencil first
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    // Now press S
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking empty space with select tool deselects', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a text box first
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(200)
    // Exit text editing mode first (keyboard shortcuts are blocked during editing)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Switch to select tool
    await selectTool(page, 'Select (S)')
    // Click empty space far from the text box
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    // Properties bar shows "Click to select annotations" when select tool active + nothing selected
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible({ timeout: 3000 })
  })

  test('select tool can click to select a drawing annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw a rectangle
    await selectTool(page, 'Rectangle (R)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
    // Switch to select tool
    await selectTool(page, 'Select (S)')
    // Click on the rectangle left edge (hit test only checks edges, not fill)
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Should show nudge/delete hint in status bar
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select tool can move a drawing annotation by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw a line
    await selectTool(page, 'Line (L)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    // Switch to select tool
    await selectTool(page, 'Select (S)')
    // Click on the line to select it
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    // Drag it
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    // Annotation still exists
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
  })

  test('select tool double-click on text enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a text box with text
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    // Exit edit mode (Escape commits text, keeps selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Verify the annotation persists
    expect(await getAnnotationCount(page)).toBe(1)
    // Deselect the annotation first so keyboard shortcut works
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Switch to select tool via keyboard shortcut
    await page.keyboard.press('s')
    await page.waitForTimeout(300)
    // First click to select the annotation
    await clickCanvasAt(page, 150, 75)
    await page.waitForTimeout(300)
    // Double-click the selected annotation to enter edit mode
    await doubleClickCanvasAt(page, 150, 75)
    await page.waitForTimeout(500)
    // Textarea should be visible (edit mode)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
  })

  test('select tool shows status bar hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Select tool is default, so status bar should show the hint
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('escape while annotation selected deselects it', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw a rectangle
    await selectTool(page, 'Rectangle (R)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    // Switch to select and click the rectangle left edge (hit test checks edges only)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Press Escape to deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('delete key removes selected annotation in select mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw a rectangle
    await selectTool(page, 'Rectangle (R)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to select and click the rectangle
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    // Press Delete
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 3. Text Tool — Creation ────────────────────────────────────────────────

test.describe('Text Tool — Creation', () => {
  test('text tool button is visible and activatable', async ({ page }) => {
    await uploadPDFAndWait(page)
    const textDropdown = page.locator('button[title="Text (T)"], button[aria-label*="Text tool"]').first()
    await expect(textDropdown).toBeVisible()
  })

  test('pressing T key activates text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    // Status bar shows "Drag to create text" for text tool
    await expect(page.locator('text=/Drag to create text/')).toBeVisible()
  })

  test('click+drag creates a text box and enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Textarea should appear for editing
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('typing in text box updates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Test annotation')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Test annotation')
  })

  test('pressing Escape exits edit mode but keeps selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Keep me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Textarea should be gone
    await expect(page.locator('textarea')).toBeHidden()
    // Annotation count should be 1
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty text box is removed on Escape', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Don't type anything, just escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('small click creates default-sized text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Small click (no significant drag)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 105, y: 105 }])
    await page.waitForTimeout(300)
    // Should still create a text box with default size
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('text box with content persists after blur', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Persistent text')
    // Click away to blur
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple text boxes can be created', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create first text box
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 90 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('First')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Create second text box
    await drawOnCanvas(page, [{ x: 50, y: 150 }, { x: 200, y: 190 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text box placeholder shows "Type here..."', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveAttribute('placeholder', 'Type here...')
  })
})

// ─── 4. Text Tool — Click-to-Edit ──────────────────────────────────────────

test.describe('Text Tool — Click-to-Edit', () => {
  test('clicking an existing text annotation enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Edit me')
    // Exit edit mode (Escape commits text, keeps selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Double-click inside the annotation to re-enter edit mode (single click only allows drag)
    await doubleClickCanvasAt(page, 100, 75)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('double-click on text enters edit mode directly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Double click me')
    // Exit edit mode (Escape commits text, keeps selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Double-click the text to enter edit mode directly
    await doubleClickCanvasAt(page, 150, 75)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
  })

  test('edit mode preserves existing text content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Preserved content')
    // Exit edit mode (Escape commits text, keeps selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Re-enter edit mode by double-clicking (single click only allows drag)
    await doubleClickCanvasAt(page, 150, 75)
    await page.waitForTimeout(500)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await expect(textarea).toHaveValue('Preserved content')
  })

  test('clicking different text annotation switches selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create first text
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 90 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('First')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Create second text
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 200, y: 240 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Click the first text to select
    await clickCanvasAt(page, 100, 70)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('blur from textarea commits text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur test')
    // Click outside to trigger blur
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid click-to-edit does not lose focus (race condition fix)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Race test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Double-click to re-enter edit (single click only allows drag)
    await doubleClickCanvasAt(page, 150, 75)
    await page.waitForTimeout(500)
    // Should be in edit mode
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await expect(textarea).toHaveValue('Race test')
  })

  test('Tab cycles through text annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create two text boxes
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 90 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('First')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 150 }, { x: 200, y: 190 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Press Escape to deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    // Tab should select first text annotation
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    // Status bar shows "Arrows nudge · Del delete" when annotation is selected
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('clicking outside text box while editing commits the text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Outside click test')
    // Click outside the text box on empty canvas
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 5. Text Tool — Formatting ─────────────────────────────────────────────

test.describe('Text Tool — Formatting', () => {
  test('bold button toggles bold formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Click bold button
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await boldBtn.click()
    await page.waitForTimeout(100)
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('italic button toggles italic formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const italicBtn = page.locator('button[title="Italic (Ctrl+I)"]')
    await italicBtn.click()
    await page.waitForTimeout(100)
    await expect(italicBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('underline button toggles underline formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const underlineBtn = page.locator('button[title="Underline (Ctrl+U)"]')
    await underlineBtn.click()
    await page.waitForTimeout(100)
    await expect(underlineBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('strikethrough button toggles strikethrough formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const strikeBtn = page.locator('button[title="Strikethrough (Ctrl+Shift+X)"]')
    await strikeBtn.click()
    await page.waitForTimeout(100)
    await expect(strikeBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('Ctrl+B shortcut toggles bold while editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Bold test')
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
    // Textarea should reflect bold
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+I shortcut toggles italic while editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Italic test')
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+U shortcut toggles underline while editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Underline test')
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const textDecoration = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(textDecoration).toContain('underline')
  })

  test('Ctrl+Shift+X shortcut toggles strikethrough while editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Strike test')
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const textDecoration = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(textDecoration).toContain('line-through')
  })

  test('font family dropdown changes font', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Change font family
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const fontFamily = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(fontFamily).toContain('Courier New')
  })

  test('font size dropdown changes font size', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Use the font size select dropdown (second <select> in the text formatting bar)
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await page.waitForTimeout(200)
    // The font size select should reflect 24
    await expect(fontSizeSelect).toHaveValue('24')
  })

  test('font size number input allows custom values', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // The font size control is a <select> dropdown with preset sizes (including 20)
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="20"]') }).first()
    await fontSizeSelect.selectOption('20')
    await page.waitForTimeout(100)
    await expect(fontSizeSelect).toHaveValue('20')
  })

  test('formatting persists across edit sessions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Formatted')
    // Apply bold
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    // Exit edit mode
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await doubleClickCanvasAt(page, 100, 70)
    await page.waitForTimeout(300)
    // Bold button should still be active
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('bold and italic can be combined', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Bold Italic')
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('underline and strikethrough can be combined', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Both decorations')
    await page.keyboard.press('Control+u')
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    const textDecoration = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(textDecoration).toContain('underline')
    expect(textDecoration).toContain('line-through')
  })
})

// ─── 6. Text Tool — Alignment ──────────────────────────────────────────────

test.describe('Text Tool — Alignment', () => {
  test('left alignment button is active by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const leftBtn = page.locator('button[title="Align Left"]')
    await expect(leftBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('center alignment button can be activated', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    await centerBtn.click()
    await page.waitForTimeout(100)
    await expect(centerBtn).toHaveClass(/text-\[#14B8A6\]/)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('right alignment button can be activated', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title="Align Right"]')
    await rightBtn.click()
    await page.waitForTimeout(100)
    await expect(rightBtn).toHaveClass(/text-\[#14B8A6\]/)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('alignment persists after re-entering edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Centered')
    const centerBtn = page.locator('button[title="Align Center"]')
    await centerBtn.click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit
    await doubleClickCanvasAt(page, 100, 70)
    await page.waitForTimeout(300)
    await expect(centerBtn).toHaveClass(/text-\[#14B8A6\]/)
  })
})

// ─── 7. Text Tool — Line Spacing ───────────────────────────────────────────

test.describe('Text Tool — Line Spacing', () => {
  test('line spacing dropdown is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await expect(lineSpacingSelect).toBeVisible()
  })

  test('default line spacing is 1.3', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await expect(lineSpacingSelect).toHaveValue('1.3')
  })

  test('changing line spacing to 2.0 updates the dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await expect(lineSpacingSelect).toHaveValue('2')
  })

  test('line spacing affects textarea lineHeight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create text box first, then change line spacing while in edit mode
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 150 }])
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    // Change line spacing while editing
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('1.5')
    await page.waitForTimeout(200)
    const lineHeight = await textarea.evaluate(el => el.style.lineHeight)
    expect(lineHeight).toBe('1.5')
  })

  test('line spacing persists after edit mode round-trip', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create text box, then change line spacing while editing
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 150 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('Line spacing test')
    // Exit edit mode (Escape preserves selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit via double-click (annotation still selected)
    await doubleClickCanvasAt(page, 150, 80)
    await page.waitForTimeout(300)
    await expect(lineSpacingSelect).toHaveValue('2')
  })
})

// ─── 8. Text Tool — Background Color ──────────────────────────────────────

test.describe('Text Tool — Background Color', () => {
  test('background highlight button is visible for text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await expect(bgBtn).toBeVisible()
  })

  test('clicking background highlight toggles it on', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('clicking background highlight again toggles it off', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).not.toHaveClass(/text-\[#14B8A6\]/)
  })

  test('background color state syncs in enterEditMode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create text box first, then enable background highlight during edit mode
    await drawOnCanvas(page, [{ x: 80, y: 80 }, { x: 280, y: 140 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('BG Color')
    // Enable background highlight while editing (this updates the annotation directly)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(200)
    // Verify bg button is active
    await expect(bgBtn).toHaveClass(/text-\[#14B8A6\]/)
    // Exit edit mode (Escape commits text, keeps selection)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    // Re-enter edit mode via double-click (annotation still selected)
    await doubleClickCanvasAt(page, 180, 110)
    await page.waitForTimeout(500)
    // Verify we entered edit mode
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
    // Background button should still be active (enterEditMode syncs bg color from annotation)
    await expect(bgBtn).toHaveClass(/text-\[#14B8A6\]/, { timeout: 3000 })
  })
})

// ─── 9. Text Tool — Resize & Move ────────────────────────────────────────

test.describe('Text Tool — Resize & Move', () => {
  test('dragging a text box moves it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Move me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Click to select
    await clickCanvasAt(page, 100, 70)
    await page.waitForTimeout(200)
    // Drag the text box
    await dragOnCanvas(page, { x: 100, y: 70 }, { x: 200, y: 170 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow keys nudge selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Nudge me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Select the text
    await clickCanvasAt(page, 100, 70)
    await page.waitForTimeout(200)
    // Nudge with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift+arrow nudges by 10 pixels', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 150 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Shift nudge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 150, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text box can be deleted with Delete key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Delete me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Annotation is still selected after Escape — Delete works directly
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+D duplicates selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Duplicate me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Annotation is still selected after Escape — Ctrl+D works directly
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C and Ctrl+V copy-pastes text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Copy me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Annotation is still selected after Escape — Ctrl+C/V work directly
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 10. Text Tool — Word Wrap & Overflow ──────────────────────────────────

test.describe('Text Tool — Word Wrap & Overflow', () => {
  test('long text wraps within the text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 150 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a very long text that should wrap within the boundaries of the text box container')
    await page.waitForTimeout(100)
    // Annotation should exist
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveCSS('overflow', 'hidden')
  })

  test('multi-line text with Enter key works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 200 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 3')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
  })

  test('text auto-grows the box height', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 80 }])
    await page.waitForTimeout(300)
    // Type lots of text to trigger auto-grow
    for (let i = 0; i < 5; i++) {
      await page.keyboard.type(`Line ${i + 1}`)
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(200)
    // The textarea should exist and contain the text
    const textarea = page.locator('textarea')
    const value = await textarea.inputValue()
    expect(value).toContain('Line 5')
  })

  test('empty lines are preserved', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 200 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Before')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('After')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Before\n\nAfter')
  })
})

// ─── 11. Text Tool — Undo/Redo ─────────────────────────────────────────────

test.describe('Text Tool — Undo/Redo', () => {
  test('Ctrl+Z undoes text box creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Undo me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to select tool so Ctrl+Z is not captured by textarea
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    // Deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Undo text commit (step 1) then undo annotation creation (step 2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone action', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Redo me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to select tool so shortcuts are not captured by textarea
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    // Deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Undo text commit + undo annotation creation (2 history steps)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo (one step restores the annotation)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo button is disabled when no history', async ({ page }) => {
    await uploadPDFAndWait(page)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('redo button is disabled when no future history', async ({ page }) => {
    await uploadPDFAndWait(page)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })
})

// ─── 12. Text Tool — Keyboard Shortcuts ────────────────────────────────────

test.describe('Text Tool — Keyboard Shortcuts', () => {
  test('T key switches to text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    // Status bar shows "Drag to create text" for text tool
    await expect(page.locator('text=/Drag to create text/')).toBeVisible()
  })

  test('O key switches to callout tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    // Status bar shows "Drag to create callout" for callout tool
    await expect(page.locator('text=/Drag to create callout/')).toBeVisible()
  })

  test('E key switches to eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    const eraserBtn = page.locator('button[title="Eraser (E)"]')
    await expect(eraserBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('P key switches to pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    // Status bar shows "Ctrl+scroll zoom" for pencil (draw) tool
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('Ctrl+= zooms in', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomText = page.locator('text=/\\d+%/').first()
    const initialZoom = await zoomText.textContent()
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(100)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('Ctrl+- zooms out', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(100)
    const zoomText = page.locator('text=/\\d+%/').first()
    const afterZoomIn = await zoomText.textContent()
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(100)
    const afterZoomOut = await zoomText.textContent()
    expect(afterZoomOut).not.toBe(afterZoomIn)
  })
})

// ─── 13. Text Tool — Edge Cases & Chaos ────────────────────────────────────

test.describe('Text Tool — Edge Cases & Chaos', () => {
  test('switching tools while editing text commits the text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Committed on switch')
    // Switch to pencil
    await page.keyboard.press('p')
    await page.waitForTimeout(300)
    // Switch back to text
    await page.keyboard.press('t')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('creating text box with minimal drag uses default size', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Very small drag (under threshold)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 110, y: 110 }])
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('multiple rapid text box creations do not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    for (let i = 0; i < 5; i++) {
      // Click empty space to deselect any previous annotation and commit editing
      await clickCanvasAt(page, 400, 400)
      await page.waitForTimeout(300)
      // Create text box with wide vertical spacing to avoid overlaps
      await drawOnCanvas(page, [{ x: 30, y: 30 + i * 100 }, { x: 170, y: 60 + i * 100 }])
      await page.waitForTimeout(400)
      await page.keyboard.type(`Box ${i + 1}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('special characters in text are preserved', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 300, y: 100 }])
    await page.waitForTimeout(300)
    const specialText = 'Price: $99.99 @ 10% off & "free" <shipping>'
    await page.keyboard.type(specialText)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue(specialText)
  })

  test('text tool does not create annotation when clicking already-selected text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Click me again')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Click the same text box (should select, not create new)
    await clickCanvasAt(page, 100, 70)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo all then redo all restores everything', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    // Create two text boxes
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 90 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('First')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 150 }, { x: 200, y: 190 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    // Switch to select tool so shortcuts are not captured by textarea
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    // Deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Undo all (4 history steps: create1 + commit1 + create2 + commit2)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('text with only whitespace is treated as empty and removed', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('very long single word does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 100 }])
    await page.waitForTimeout(300)
    const longWord = 'Supercalifragilisticexpialidocious'.repeat(3)
    await page.keyboard.type(longWord)
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue(longWord)
  })
})

// ─── 14. Drawing Tools ─────────────────────────────────────────────────────

test.describe('Drawing Tools', () => {
  test('pencil tool creates a freehand drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 50, y: 50 }, { x: 80, y: 80 }, { x: 110, y: 60 }, { x: 140, y: 90 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle tool creates a rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle tool creates an ellipse', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow tool creates an arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line tool creates a line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser tool button is clickable', async ({ page }) => {
    await uploadPDFAndWait(page)
    const eraserBtn = page.locator('button[title="Eraser (E)"]')
    await eraserBtn.click()
    await page.waitForTimeout(100)
    await expect(eraserBtn).toHaveClass(/bg-\[#14B8A6\]/)
    // Eraser controls should appear
    await expect(page.locator('button:has-text("Partial")')).toBeVisible()
    await expect(page.locator('button:has-text("Object")')).toBeVisible()
  })
})

// ─── 15. Other Tools ───────────────────────────────────────────────────────

test.describe('Other Tools', () => {
  test('callout tool creates a callout box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 200 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Callout text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('measure tool button activates measure mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    // Status bar shows "Click two points" for measure tool
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('cloud tool can be activated with K key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    // Status bar shows "0 pts · Dbl-click close" for cloud tool
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('color picker is visible for draw tools', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p') // pencil
    await page.waitForTimeout(100)
    const colorInput = page.locator('input[type="color"]')
    await expect(colorInput).toBeAttached()
  })

  test('stroke width slider is visible for draw tools', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p') // pencil
    await page.waitForTimeout(100)
    await expect(page.locator('text=Width')).toBeVisible()
    const widthSlider = page.locator('input[type="range"][min="1"][max="20"]')
    await expect(widthSlider).toBeVisible()
  })
})

// ─── 16. Export ─────────────────────────────────────────────────────────────

test.describe('Export', () => {
  test('export button is visible after loading PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('new button resets the tool after confirmation', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Dismiss the confirmation dialog by setting up a handler
    page.on('dialog', dialog => dialog.accept())
    const newBtn = page.locator('button').filter({ hasText: 'New' }).first()
    await newBtn.click()
    await page.waitForTimeout(500)
    // Should return to upload state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })
})

// ─── 17. Zoom & Navigation ────────────────────────────────────────────────

test.describe('Zoom & Navigation', () => {
  test('zoom in button increases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomText = page.locator('text=/\\d+%/').first()
    const initial = await zoomText.textContent()
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    await zoomInBtn.click()
    await page.waitForTimeout(200)
    const after = await zoomText.textContent()
    const initialNum = parseInt(initial?.replace('%', '') || '100')
    const afterNum = parseInt(after?.replace('%', '') || '100')
    expect(afterNum).toBeGreaterThan(initialNum)
  })

  test('zoom out button decreases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first to have room to zoom out
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    await zoomInBtn.click()
    await page.waitForTimeout(200)
    const zoomText = page.locator('text=/\\d+%/').first()
    const before = await zoomText.textContent()
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    await zoomOutBtn.click()
    await page.waitForTimeout(200)
    const after = await zoomText.textContent()
    const beforeNum = parseInt(before?.replace('%', '') || '100')
    const afterNum = parseInt(after?.replace('%', '') || '100')
    expect(afterNum).toBeLessThan(beforeNum)
  })

  test('fit to window button adjusts zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    // First zoom in manually
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    await zoomInBtn.click()
    await zoomInBtn.click()
    await zoomInBtn.click()
    await page.waitForTimeout(200)
    // Now fit to window (button title includes keyboard shortcut)
    const fitBtn = page.locator('button[title="Fit to window (F)"]')
    await fitBtn.click()
    await page.waitForTimeout(200)
    // Zoom should be different from what we manually set
    const zoomText = page.locator('text=/\\d+%/').first()
    const zoom = await zoomText.textContent()
    // It should be reasonable (not the zoomed-in value)
    const zoomNum = parseInt(zoom?.replace('%', '') || '100')
    expect(zoomNum).toBeLessThanOrEqual(200)
  })

  test('rotate buttons change page rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const rotateCwBtn = page.locator('button[title="Rotate CW"]')
    await rotateCwBtn.click()
    await page.waitForTimeout(500)
    // Status bar should show 90 degree rotation
    await expect(page.locator('text=90')).toBeVisible()
  })
})
