import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'
import { annotationLayerHash, paintedPixelCount } from '../../helpers/pdf-annotate-b'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Z-Order — Drawing Order ──────────────────────────────────────────────────

test.describe('Z-Order — Drawing Order', () => {
  test('first drawn annotation is at index 0 in array', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    expect(anns[0].type).toBe('rectangle')
    expect(anns[1].type).toBe('circle')
  })

  test('later annotations are at higher array indices', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 150, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(3)
    expect(anns[0].type).toBe('rectangle')
    expect(anns[1].type).toBe('circle')
    expect(anns[2].type).toBe('line')
  })

  test('three overlapping annotations all render', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw three overlapping rectangles
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 130, y: 120, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 160, y: 140, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(3)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('overlapping annotations produce different canvas than non-overlapping', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Draw two non-overlapping rectangles
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 50, w: 80, h: 60 })
    const nonOverlap = await annotationLayerHash(page)
    // Undo both
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    // Draw two overlapping rectangles
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 130, y: 120, w: 100, h: 80 })
    const overlap = await annotationLayerHash(page)
    expect(overlap).not.toBe(nonOverlap)
  })
})

// ─── Z-Order — Bring to Front / Send to Back ─────────────────────────────────

test.describe('Z-Order — Bring to Front', () => {
  test('Ctrl+] moves selected annotation to front', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await waitForSessionSave(page)
    // Select the rectangle (first drawn, index 0)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    // The rectangle should now be the last in the array (rendered on top)
    expect(anns[anns.length - 1].type).toBe('rectangle')
  })

  test('Ctrl+[ moves selected annotation to back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Select the circle (last drawn, rendered on top)
    await selectAnnotationAt(page, 230, 150)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    // The circle should now be the first in the array (rendered behind)
    expect(anns[0].type).toBe('circle')
  })

  test('bring to front changes canvas rendering', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 120, h: 80 })
    const before = await annotationLayerHash(page)
    // Select rectangle and bring to front
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    // Deselect to see clean render
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await annotationLayerHash(page)
    expect(after).not.toBe(before)
  })

  test('send to back changes canvas rendering', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 120, h: 80 })
    const before = await annotationLayerHash(page)
    // Select circle and send to back
    await selectAnnotationAt(page, 230, 150)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await annotationLayerHash(page)
    expect(after).not.toBe(before)
  })

  test('bring to front on already-top annotation is no-op', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Select the circle (already on top)
    await selectAnnotationAt(page, 230, 150)
    const before = await annotationLayerHash(page)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    const after = await annotationLayerHash(page)
    expect(after).toBe(before)
  })

  test('send to back on already-bottom annotation is no-op', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Select the rectangle (already at bottom)
    await selectAnnotationAt(page, 100, 100)
    const before = await annotationLayerHash(page)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    const after = await annotationLayerHash(page)
    expect(after).toBe(before)
  })

  test('z-order change without selection does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    // Click empty space to ensure nothing selected
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    const before = await annotationLayerHash(page)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    const after = await annotationLayerHash(page)
    expect(after).toBe(before)
  })
})

// ─── Z-Order — Undo Preservation ──────────────────────────────────────────────

test.describe('Z-Order — With Undo', () => {
  test('undo preserves z-order of remaining annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    // Undo the line
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    expect(anns[0].type).toBe('rectangle')
    expect(anns[1].type).toBe('circle')
  })

  test('undo after bring-to-front restores original z-order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Bring rectangle to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    // Undo the z-order change
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    // Original order should be restored
    expect(anns[0].type).toBe('rectangle')
    expect(anns[1].type).toBe('circle')
  })

  test('annotation count preserved through z-order operations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    // Bring first to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
    // Send last to back
    await selectAnnotationAt(page, 175, 250)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Z-Order — Visual Overlap ─────────────────────────────────────────────────

test.describe('Z-Order — Visual Overlap', () => {
  test('five overlapping annotations all render without glitch', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 80 + i * 20, y: 80 + i * 20, w: 100, h: 80 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('different shape types can overlap without visual issues', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 120, y: 110, w: 120, h: 80 })
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('pencil and shape annotations overlap correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 200, h: 150 })
    expect(await getAnnotationCount(page)).toBe(2)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('text and shape annotations overlap correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 100 })
    await createAnnotation(page, 'text', { x: 110, y: 110, w: 180, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('deleting front annotation reveals back annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 110, y: 110, w: 150, h: 100 })
    const withBoth = await annotationLayerHash(page)
    // Delete the top (second) rectangle
    await selectAnnotationAt(page, 110, 110)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const withOne = await annotationLayerHash(page)
    expect(withOne).not.toBe(withBoth)
  })

  test('arrow and rectangle overlap renders correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 150 })
    await createAnnotation(page, 'arrow', { x: 80, y: 175, w: 250, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('callout overlapping rectangle renders correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 150 })
    await createAnnotation(page, 'callout', { x: 120, y: 120, w: 160, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // The shapes were painted onto the annotation layer
    expect(await paintedPixelCount(page, 'ann')).toBeGreaterThan(0)
  })

  test('bring to front then undo then redo preserves correct order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Bring rectangle to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    // Undo
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    // Redo
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[anns.length - 1].type).toBe('rectangle')
  })

  test('many annotations maintain correct render order', async ({ page }) => {
    await uploadPDFAndWait(page)
    const types: Array<'rectangle' | 'circle' | 'line'> = ['rectangle', 'circle', 'line', 'rectangle', 'circle', 'line']
    for (let i = 0; i < types.length; i++) {
      await createAnnotation(page, types[i], { x: 60 + i * 15, y: 60 + i * 15, w: 80, h: 60 })
    }
    expect(await getAnnotationCount(page)).toBe(6)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(6)
    // Verify order matches creation order
    for (let i = 0; i < types.length; i++) {
      expect(anns[i].type).toBe(types[i])
    }
  })

  test('send to back with three annotations moves to index 0', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    // Select the line (last drawn) and send to back
    await selectAnnotationAt(page, 175, 150)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0].type).toBe('line')
  })

  test('bring to front with three annotations moves to last index', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    // Select the rectangle (first drawn) and bring to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[anns.length - 1].type).toBe('rectangle')
  })

  test('z-order operations are undoable', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeEnabled()
  })

  test('duplicate annotation goes to top of z-order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Select rectangle and duplicate
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(3)
    // Duplicate should be the last element (top of stack)
    expect(anns[2].type).toBe('rectangle')
  })

  test('pasted annotation goes to top of z-order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Copy-paste rectangle
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(3)
    expect(anns[2].type).toBe('rectangle')
  })

  test('new annotation drawn after z-order change goes to top', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Bring rect to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    // Draw new line — should go to the very top
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[anns.length - 1].type).toBe('line')
  })

  test('z-order preserved in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Bring rectangle to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0].type).toBe('circle')
    expect(anns[1].type).toBe('rectangle')
  })
})
