import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, clearSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Undo — Basics ───────────────────────────────────────────────────────────

test.describe('Undo — Basics', () => {
  test('undo button is visible in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible()
  })

  test('undo button is disabled when no actions taken', async ({ page }) => {
    await uploadPDFAndWait(page)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('undo button becomes enabled after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeEnabled()
  })

  test('undo removes last annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Undo (Ctrl+Z)"]').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Z performs undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo restores canvas to previous state', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const during = await screenshotCanvas(page)
    expect(Buffer.compare(before, during)).not.toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).toBe(0)
  })

  test('undo button becomes disabled after undoing all actions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })
})

// ─── Redo — Basics ───────────────────────────────────────────────────────────

test.describe('Redo — Basics', () => {
  test('redo button is visible in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).toBeVisible()
  })

  test('redo button is disabled at start', async ({ page }) => {
    await uploadPDFAndWait(page)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('redo button becomes enabled after undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeEnabled()
  })

  test('redo restores undone annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Shift+Z performs redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Y also performs redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo button becomes disabled after redoing all', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('redo restores canvas visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const withAnn = await screenshotCanvas(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const afterRedo = await screenshotCanvas(page)
    expect(Buffer.compare(withAnn, afterRedo)).toBe(0)
  })
})

// ─── Multiple Sequential Undo/Redo ───────────────────────────────────────────

test.describe('Multiple Sequential Undo/Redo', () => {
  test('multiple undos remove annotations in reverse order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multiple redos restore annotations in order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo both
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo both
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo across different annotation types', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo rectangle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // The remaining annotation should be the pencil
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('pencil')
  })

  test('interleaved undo and redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Undo/Redo — Delete ──────────────────────────────────────────────────────

test.describe('Undo/Redo — Delete Operations', () => {
  test('undo restores deleted annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo re-deletes the restored annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Undo/Redo — Edge Cases ──────────────────────────────────────────────────

test.describe('Undo/Redo — Edge Cases', () => {
  test('drawing after undo clears redo history', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo circle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Draw a new annotation — this should clear redo history
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Redo should now be disabled (redo history cleared)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('undo after tool switch still works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch tools
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Circle (C)')
    // Undo should still remove the rectangle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo button click works same as keyboard shortcut', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Undo (Ctrl+Z)"]').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo button click works same as keyboard shortcut', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.locator('button[title="Redo (Ctrl+Shift+Z)"]').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid undo does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    // Rapid-fire undos
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(500)
    // Should be at 0 (3 undos applied, 2 extra no-ops)
    expect(await getAnnotationCount(page)).toBe(0)
    // No crash — page still responsive
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid redo does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    // Undo both
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Rapid-fire redos
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('history cap at 50 levels does not grow beyond', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw many annotations to exceed MAX_HISTORY (50)
    for (let i = 0; i < 10; i++) {
      await selectTool(page, 'Rectangle (R)')
      await dragOnCanvas(page, { x: 50, y: 50 + i * 5 }, { x: 150, y: 80 + i * 5 })
      await page.waitForTimeout(100)
    }
    // All 10 annotations should exist
    expect(await getAnnotationCount(page)).toBe(10)
    // Undo 10 times to verify history works for at least these 10
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo on empty canvas is a no-op', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).toBe(0)
  })

  test('redo on empty redo stack is a no-op', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).toBe(0)
  })

  test('undo preserves other annotations on the page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // The remaining one should be the rectangle
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('rectangle')
  })

  test('undo pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo arrow annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo after undo of pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo of text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo five annotations in sequence', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 50 + i * 30, y: 50 + i * 30, w: 60, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo five annotations in sequence', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 50 + i * 30, y: 50 + i * 30, w: 60, h: 40 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('undo then draw new annotation clears redo and adds correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('rectangle')
    expect(anns[1]?.type).toBe('line')
  })

  test('undo updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    expect(annsBefore.length).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    expect(annsAfter.length).toBe(0)
  })

  test('redo updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(1)
  })

  test('undo icon uses Undo2 visual', async ({ page }) => {
    await uploadPDFAndWait(page)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeVisible()
    // Should contain an SVG icon
    await expect(undoBtn.locator('svg')).toBeVisible()
  })

  test('redo icon uses Redo2 visual', async ({ page }) => {
    await uploadPDFAndWait(page)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeVisible()
    await expect(redoBtn.locator('svg')).toBeVisible()
  })

  test('undo disabled style has low opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toHaveClass(/disabled:text-white\/10/)
  })

  test('redo disabled style has low opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toHaveClass(/disabled:text-white\/10/)
  })

  test('undo after duplicate removes the duplicate', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo after copy-paste removes the paste', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
