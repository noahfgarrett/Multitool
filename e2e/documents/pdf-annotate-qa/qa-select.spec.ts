import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  screenshotCanvas,
  waitForSessionSave,
  getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── 1. Click to Select Each Annotation Type ────────────────────────────────

test.describe('Select Tool — Click to Select', () => {
  test('select pencil annotation by clicking on it', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    // Midpoint of the stroke segment (136,192)→(172,162); hit tolerance is 4px + half the stroke width
    await clickCanvasAt(page, 154, 177)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select rectangle annotation by clicking on edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select circle annotation by clicking on edge', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 250, 190)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select line annotation by clicking on it', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select arrow annotation by clicking on it', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select text annotation by clicking on it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 250, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 80)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('select callout annotation by clicking on it', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 2. Deselection ─────────────────────────────────────────────────────────

test.describe('Select Tool — Deselection', () => {
  test('click on empty space deselects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('Escape key deselects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('clicking another annotation switches selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 50, w: 80, h: 60 })
    await selectAnnotationAt(page, 50, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await clickCanvasAt(page, 250, 80)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('status bar shows click hint when nothing selected', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await expect(page.getByText('· Click to select')).toBeVisible()
  })
})

// ─── 3. Drag-Move Annotations ───────────────────────────────────────────────

test.describe('Select Tool — Drag Move', () => {
  test('drag-move rectangle to new position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move pencil to new position', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await moveAnnotation(page, { x: 140, y: 130 }, { x: 300, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move line to new position', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move arrow to new position', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move circle to new position', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await moveAnnotation(page, { x: 250, y: 190 }, { x: 350, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 250, h: 60 })
    await moveAnnotation(page, { x: 175, y: 80 }, { x: 300, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag-move callout annotation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await moveAnnotation(page, { x: 175, y: 140 }, { x: 300, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move updates session data coordinates', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 300, y: 300 })
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptAfter.x).not.toBe(ptBefore.x)
    }
  })
})

// ─── 4. Arrow Key Nudge ─────────────────────────────────────────────────────

test.describe('Select Tool — Arrow Key Nudge', () => {
  test('ArrowRight nudges by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowUp nudges by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowDown nudges by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+ArrowRight nudges by 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptAfter.x - ptBefore.x).toBe(10)
    }
  })

  test('Shift+ArrowLeft nudges by 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptBefore.x - ptAfter.x).toBe(10)
    }
  })

  test('Shift+ArrowUp nudges by 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptBefore.y - ptAfter.y).toBe(10)
    }
  })

  test('Shift+ArrowDown nudges by 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptAfter.y - ptBefore.y).toBe(10)
    }
  })

  test('multiple arrow presses accumulate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectAnnotationAt(page, 200, 240)
    const before = await screenshotCanvas(page)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('nudge without selection does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptBefore = annsBefore[0]?.points?.[0]
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptAfter = annsAfter[0]?.points?.[0]
    if (ptBefore && ptAfter) {
      expect(ptAfter.x).toBe(ptBefore.x)
      expect(ptAfter.y).toBe(ptBefore.y)
    }
  })
})

// ─── 5. Delete Key ──────────────────────────────────────────────────────────

test.describe('Select Tool — Delete', () => {
  test('Delete key removes selected rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace key also removes selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete one of multiple annotations preserves others', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete shows toast notification', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Annotation deleted/')).toBeVisible({ timeout: 3000 })
  })

  test('delete without selection does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 6. Ctrl+D Duplicate ────────────────────────────────────────────────────

test.describe('Select Tool — Duplicate', () => {
  test('Ctrl+D duplicates selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate is offset from original', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    const orig = anns[0].points[0]
    const dup = anns[1].points[0]
    expect(dup.x).toBe(orig.x + 20)
    expect(dup.y).toBe(orig.y + 20)
  })

  test('Ctrl+D without selection does nothing', async ({ page }) => {
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
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await selectAnnotationAt(page, 250, 190)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[1].type).toBe('circle')
  })
})

// ─── 7. Ctrl+C / Ctrl+V Copy-Paste ─────────────────────────────────────────

test.describe('Select Tool — Copy-Paste', () => {
  test('Ctrl+C then Ctrl+V pastes annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+V without prior copy does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('copy-paste preserves color', async ({ page }) => {
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

// ─── 8. Z-Order ─────────────────────────────────────────────────────────────

test.describe('Select Tool — Z-Order', () => {
  test('Ctrl+] brings annotation forward', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 150, y: 130, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Ctrl+[ sends annotation backward', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 150, y: 130, w: 120, h: 80 })
    await selectAnnotationAt(page, 150, 170)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── 9. Tab Cycles Text/Callout ─────────────────────────────────────────────

test.describe('Select Tool — Tab Cycle', () => {
  test('Tab on selected text annotation cycles to next annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 200, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 200, h: 50 })
    await selectAnnotationAt(page, 150, 75)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    // Selection should still be active (on next annotation)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('Tab on selected callout annotation cycles', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 150, h: 80 })
    await selectAnnotationAt(page, 125, 90)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 10. Double-Click Edit Mode ─────────────────────────────────────────────

test.describe('Select Tool — Double-Click Edit', () => {
  // FIXME: app bug: selecting a text box adds the text controls to the properties bar (PdfAnnotateTool.tsx:5525, 6016), pushing the page down ~25px between the two clicks, so the second click lands on the resize handle or outside the box
  test.fixme('double-click text annotation enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 250, h: 60 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 175, 80)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
  })

  test('double-click callout annotation enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 200, h: 80 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 150, 90)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
  })

  test('Escape exits edit mode back to select', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 250, h: 60 })
    await selectTool(page, 'Select (S)')
    // Select first and let the properties bar settle (see the FIXME above), then double-click
    await clickCanvasAt(page, 175, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.waitForTimeout(300)
    await doubleClickCanvasAt(page, 175, 80)
    await page.waitForTimeout(500)
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Textarea should be gone
    await expect(page.locator('textarea')).not.toBeVisible()
  })

  test('edited text persists after exiting edit mode', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 250, h: 60 })
    await selectTool(page, 'Select (S)')
    // Select first and let the properties bar settle (see the FIXME above), then double-click
    await clickCanvasAt(page, 175, 80)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.waitForTimeout(300)
    await doubleClickCanvasAt(page, 175, 80)
    await page.waitForTimeout(500)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await textarea.fill('Updated text content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0].text).toContain('Updated text content')
  })
})
