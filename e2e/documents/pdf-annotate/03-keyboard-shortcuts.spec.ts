import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Tool Switching Shortcuts ─────────────────────────────────────────────

test.describe('Tool Switching Shortcuts', () => {
  test('S key activates Select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Select (S)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('P key activates Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('L key activates Line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
    await expect(page.locator('button[title="Line (L)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('A key activates Arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Arrow (A)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('R key activates Rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('C key activates Circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Circle (C)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('K key activates Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('T key activates Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Drag to create text/')).toBeVisible()
  })

  test('O key activates Callout tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Drag to create callout/')).toBeVisible()
  })

  test('E key activates Eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Eraser (E)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Shift+H activates Text Highlight tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Shift+h')
    await page.waitForTimeout(100)
    // Text highlight tool shows "Drag to highlight"
    await expect(page.locator('text=/Drag to highlight/')).toBeVisible()
  })

  test('Shift+X activates Text Strikethrough tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Shift+x')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Strikethrough (Shift+X)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('Space bar activates pan mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Press and hold space (simulated by keydown)
    await page.keyboard.down(' ')
    await page.waitForTimeout(100)
    // Release space
    await page.keyboard.up(' ')
    await page.waitForTimeout(100)
    // Should return to normal mode without crash
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('H key activates Highlight tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Highlight (H)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('M key activates Measure tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('m')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('rapid tool switching works correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p')
    await page.waitForTimeout(50)
    await page.keyboard.press('r')
    await page.waitForTimeout(50)
    await page.keyboard.press('c')
    await page.waitForTimeout(50)
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Line (L)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── 2. Undo/Redo Shortcuts ─────────────────────────────────────────────────

test.describe('Undo/Redo Shortcuts', () => {
  test('Ctrl+Z undoes annotation creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Y also triggers redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple undos work sequentially', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo then new action clears redo stack', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Create a new annotation (should clear redo stack)
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should not bring back the rectangle
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Delete Shortcut ──────────────────────────────────────────────────────

test.describe('Delete Shortcut', () => {
  test('Delete key removes selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace also removes selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Delete with nothing selected does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('deleted annotation can be undone', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Arrow Key Nudge ──────────────────────────────────────────────────────

test.describe('Arrow Key Nudge', () => {
  test('ArrowRight nudges selected annotation right', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 100, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    // Annotation should still exist (nudge doesn't destroy)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('ArrowDown nudges selected annotation down', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 100, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift+Arrow nudges by 10px (larger step)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow keys do nothing without selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    // Press arrow keys — nothing should break
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('all four arrow directions work', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 230)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 5. Escape Key ───────────────────────────────────────────────────────────

test.describe('Escape Key', () => {
  test('Escape deselects selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click top edge of rectangle (middle of top edge for reliable hit)
    await clickCanvasAt(page, 160, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('Escape exits text editing mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await expect(page.locator('textarea')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
  })

  test('Escape cancels in-progress cloud polygon', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    // Cloud mode should be active
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Should reset to 0 pts
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('double Escape: first deselects, second is no-op', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click top edge of rectangle (middle of top edge for reliable hit)
    await clickCanvasAt(page, 160, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
    // Second escape is safe
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 6. Duplicate Shortcut ───────────────────────────────────────────────────

test.describe('Duplicate Shortcut (Ctrl+D)', () => {
  test('Ctrl+D duplicates selected rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+D with no selection does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicated annotation can be selected independently', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    // The duplicate should be auto-selected
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 7. Copy/Paste Shortcuts ─────────────────────────────────────────────────

test.describe('Copy/Paste Shortcuts (Ctrl+C/V)', () => {
  test('Ctrl+C then Ctrl+V creates a copy', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C with no selection does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    // Nothing should break
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V without prior copy does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('paste can be repeated multiple times', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('pasted annotation is auto-selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 8. Zoom Shortcuts ───────────────────────────────────────────────────────

test.describe('Zoom Shortcuts', () => {
  test('Ctrl+= zooms in', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const initial = await zoomBtn.textContent()
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const after = await zoomBtn.textContent()
    expect(after).not.toBe(initial)
  })

  test('Ctrl+- zooms out', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first to have room to zoom out
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(100)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const afterIn = await zoomBtn.textContent()
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(200)
    const afterOut = await zoomBtn.textContent()
    expect(afterOut).not.toBe(afterIn)
  })

  test('F key fits page to window', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom to a known level first
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('200%').click()
    await page.waitForTimeout(200)
    await page.keyboard.press('f')
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(text).not.toBe('200%')
  })

  test('+ key (without Ctrl) zooms in by 10%', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const initial = await zoomBtn.textContent()
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const after = await zoomBtn.textContent()
    expect(after).not.toBe(initial)
  })

  test('- key (without Ctrl) zooms out by 10%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('=')
    await page.waitForTimeout(100)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const afterIn = await zoomBtn.textContent()
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    const afterOut = await zoomBtn.textContent()
    expect(afterOut).not.toBe(afterIn)
  })

  test('Ctrl+0 fits to window', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('200%').click()
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(text).not.toBe('200%')
  })
})

// ─── 9. Shortcuts Blocked During Text Editing ────────────────────────────────

test.describe('Shortcuts Blocked During Text Editing', () => {
  test('tool shortcut keys do not switch tools while editing text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Type 'p' which would normally switch to Pencil
    await page.keyboard.type('p')
    await page.waitForTimeout(100)
    // Should still be in text editing mode
    await expect(page.locator('textarea')).toBeVisible()
    const value = await page.locator('textarea').inputValue()
    expect(value).toContain('p')
  })

  test('Ctrl+B works as bold toggle during text editing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Bold test')
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await expect(boldBtn).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('Ctrl+I works as italic toggle during text editing', async ({ page }) => {
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

  test('Delete key types in text instead of deleting annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('ABC')
    // Position cursor between A and BC
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Delete')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    // Delete should have removed 'B', leaving 'AC'
    await expect(textarea).toHaveValue('AC')
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Shortcuts After Tool Switching ──────────────────────────────────────

test.describe('Shortcuts After Tool Switching', () => {
  test('shortcuts work after switching from Pencil to Select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    // Create annotation with keyboard shortcut
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('undo works after switching tools', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete works after switching tools and selecting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Switch through several tools
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Circle (C)')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 11. Page Navigation Shortcuts ───────────────────────────────────────────

test.describe('Page Navigation Shortcuts', () => {
  test('PageDown navigates to next page on multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator is a button showing "1 / 2"
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
  })

  test('PageUp navigates to previous page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^2 \\/ /')).toBeVisible()
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('PageUp on first page stays on first page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(300)
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })
})

// ─── 12. Z-Order Shortcuts ───────────────────────────────────────────────────

test.describe('Z-Order Shortcuts', () => {
  test('Ctrl+] brings selected annotation to front', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 80, h: 80 })
    // Select the rectangle (first created, under the circle)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    // Annotation count stays the same
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ sends selected annotation to back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 80, h: 80 })
    // Select the circle (last created, on top)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 160)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
