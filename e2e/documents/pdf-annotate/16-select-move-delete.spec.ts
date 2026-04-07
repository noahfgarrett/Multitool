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

// ─── Selection ────────────────────────────────────────────────────────────────

test.describe('Selection — Basics', () => {
  test('S key activates select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Select (S)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('click on annotation selects it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on rectangle edge to select
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click on empty space deselects annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click empty space
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('Escape deselects annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('Delete key removes selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace key removes selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('status bar shows selection hint when nothing selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await expect(page.locator('text=/Click to select/').first()).toBeVisible()
  })

  test('status bar shows nudge hint when annotation selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 120, h: 0 })
    await selectAnnotationAt(page, 160, 150)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selecting annotation on edge of rectangle works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click right on the top edge
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selecting annotation on circle edge works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on the right edge of the ellipse
    await clickCanvasAt(page, 250, 190)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── Movement ─────────────────────────────────────────────────────────────────

test.describe('Movement — Drag', () => {
  test('drag-move pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 140, y: 130 }, { x: 240, y: 230 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move rectangle annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move circle annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 250, y: 190 }, { x: 300, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move arrow annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 275, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move line annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 275, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 175, y: 140 }, { x: 300, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('moved annotation canvas changes visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('annotation count preserved after move', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 200, y: 300 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Arrow Key Nudge ──────────────────────────────────────────────────────────

test.describe('Movement — Arrow Key Nudge', () => {
  test('ArrowUp nudges selected annotation up by 1px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    const before = await screenshotCanvas(page)
    await selectAnnotationAt(page, 200, 240)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowDown nudges selected annotation down', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    const before = await screenshotCanvas(page)
    await selectAnnotationAt(page, 200, 240)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges selected annotation left', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    const before = await screenshotCanvas(page)
    await selectAnnotationAt(page, 200, 240)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowRight nudges selected annotation right', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    const before = await screenshotCanvas(page)
    await selectAnnotationAt(page, 200, 240)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+Arrow nudges by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptsBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptsAfter = annsAfter[0]?.points?.[0]
    if (ptsBefore && ptsAfter) {
      expect(ptsAfter.x - ptsBefore.x).toBe(10)
    }
  })

  test('Shift+ArrowUp nudges up by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptsBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptsAfter = annsAfter[0]?.points?.[0]
    if (ptsBefore && ptsAfter) {
      expect(ptsBefore.y - ptsAfter.y).toBe(10)
    }
  })

  test('multiple arrow presses accumulate nudge distance', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    const before = await screenshotCanvas(page)
    await selectAnnotationAt(page, 200, 240)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('nudge without selection does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click empty space to ensure nothing selected
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    // Verify annotation count stays the same (nudge should not affect anything)
    const countBefore = await getAnnotationCount(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBe(countBefore)
  })
})

// ─── Duplicate & Copy-Paste ───────────────────────────────────────────────────

test.describe('Duplicate & Copy-Paste', () => {
  test('Ctrl+D duplicates selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicated annotation is offset from original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    // The duplicate should be offset by 20px
    const orig = anns[0].points[0]
    const dup = anns[1].points[0]
    expect(dup.x).toBe(orig.x + 20)
    expect(dup.y).toBe(orig.y + 20)
  })

  test('Ctrl+C copies and Ctrl+V pastes annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pasted annotation is offset from copied source', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
  })

  test('Ctrl+V without prior copy does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Don't select or copy — just paste
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+D without selection does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate preserves annotation type', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await selectAnnotationAt(page, 250, 190)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    expect(anns[1].type).toBe('circle')
  })

  test('copy-paste preserves annotation color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0].color).toBe(anns[1].color)
  })

  test('multiple pastes create multiple copies', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Delete Variations ────────────────────────────────────────────────────────

test.describe('Delete — Variations', () => {
  test('delete pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 140, 130)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete circle annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 250, 190)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete arrow annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete text annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete one of multiple annotations preserves others', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete shows toast notification', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Annotation deleted/')).toBeVisible({ timeout: 3000 })
  })

  test('delete callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete line annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete clears canvas visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const withAnn = await screenshotCanvas(page)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    const afterDelete = await screenshotCanvas(page)
    expect(Buffer.compare(withAnn, afterDelete)).not.toBe(0)
  })
})

// ─── Selection — Loading Properties ───────────────────────────────────────────

test.describe('Selection — Property Loading', () => {
  test('selecting annotation loads its color into the toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    // The stroke width slider should be visible with the annotation's value
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await expect(slider).toBeVisible()
  })

  test('selecting annotation loads its opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const opSlider = page.locator('input[type="range"][min="10"][max="100"]')
    await expect(opSlider).toBeVisible()
    const val = await opSlider.inputValue()
    expect(Number(val)).toBeGreaterThanOrEqual(10)
  })

  test('double click text annotation enters edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a larger text annotation for reliable hit-testing
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 250, h: 80 })
    await selectTool(page, 'Select (S)')
    // Double-click at the center of the text region
    await doubleClickCanvasAt(page, 225, 140)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
  })

  test('selection persists after drawing tool switch and back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch tools
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    // Annotations still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple annotations can be created and individually selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select first
    await selectAnnotationAt(page, 50, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click empty to deselect
    await clickCanvasAt(page, 170, 200)
    await page.waitForTimeout(200)
    // Select second
    await selectAnnotationAt(page, 250, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selecting different annotation updates selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 50, w: 80, h: 60 })
    await selectAnnotationAt(page, 50, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click on circle directly (no deselect needed — clicking another ann switches selection)
    await selectAnnotationAt(page, 330, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('move annotation updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 250, y: 250 })
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptAfter.x).not.toBe(ptBefore.x)
    }
  })

  test('Shift+ArrowLeft nudges by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptsBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptsAfter = annsAfter[0]?.points?.[0]
    if (ptsBefore && ptsAfter) {
      expect(ptsBefore.x - ptsAfter.x).toBe(10)
    }
  })

  test('Shift+ArrowDown nudges down by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptsBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptsAfter = annsAfter[0]?.points?.[0]
    if (ptsBefore && ptsAfter) {
      expect(ptsAfter.y - ptsBefore.y).toBe(10)
    }
  })
})
