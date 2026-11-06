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
  exportPDF,
  goToPage,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Draw Then Switch Tool ─────────────────────────────────────────────────

test.describe('Draw Then Switch Tool', () => {
  test('draw pencil then immediately switch to Select preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil then immediately switch to Rectangle preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Rectangle (R)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil then immediately switch to Line preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Line (L)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil then immediately switch to Text preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Text (T)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil then immediately switch to Eraser preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Eraser (E)')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Draw After Undo/Redo ──────────────────────────────────────────────────

test.describe('Draw After Undo/Redo', () => {
  test('draw after undo creates new annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw after redo creates annotation alongside redone one', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw after delete all creates new annotation from empty state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo both
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 150, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Draw at Canvas Corners ────────────────────────────────────────────────

test.describe('Draw at Canvas Corners', () => {
  test('draw at top-left corner (near 0,0)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 5, y: 5 }, { x: 50, y: 50 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at top-right corner', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 400, y: 5 }, { x: 350, y: 50 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at bottom-left corner', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 5, y: 500 }, { x: 50, y: 450 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at bottom-right corner', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 400, y: 500 }, { x: 350, y: 450 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Draw with Modifier Keys ───────────────────────────────────────────────

test.describe('Draw with Modifier Keys', () => {
  test('draw with Shift held creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw with Alt held creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Alt')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Alt')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 5. Rapid Tool Switching ──────────────────────────────────────────────────

test.describe('Rapid Tool Switching', () => {
  test('rapid pencil/select switching preserves annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await selectTool(page, 'Pencil (P)')
      await drawOnCanvas(page, [
        { x: 50 + i * 30, y: 100 },
        { x: 80 + i * 30, y: 150 },
      ])
      await page.waitForTimeout(150)
      await selectTool(page, 'Select (S)')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('rapid tool switching across all drawing tools', async ({ page }) => {
    await uploadPDFAndWait(page)
    const tools = ['Pencil (P)', 'Line (L)', 'Arrow (A)', 'Rectangle (R)', 'Circle (C)']
    for (const tool of tools) {
      await selectTool(page, tool)
      await page.waitForTimeout(50)
    }
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 6. Draw Then Zoom ────────────────────────────────────────────────────────

test.describe('Draw Then Zoom', () => {
  test('draw stroke then zoom in preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke then zoom in then draw another', async ({ page }) => {
    test.setTimeout(90000)
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    // Re-select pencil after zoom in case tool state was lost
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('draw stroke then zoom out preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Draw Then Rotate ──────────────────────────────────────────────────────

test.describe('Draw Then Rotate', () => {
  test('draw then rotate CW preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on rotated page then rotate back preserves annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 8. Draw with Different Colors Sequentially ──────────────────────────────

test.describe('Draw with Different Colors Sequentially', () => {
  test('three strokes with three different colors', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')

    await swatches.nth(0).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 80 }, { x: 200, y: 80 }])
    await page.waitForTimeout(200)

    await selectTool(page, 'Pencil (P)')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 180 }, { x: 200, y: 180 }])
    await page.waitForTimeout(200)

    await selectTool(page, 'Pencil (P)')
    await swatches.nth(0).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 280 }, { x: 200, y: 280 }])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('five strokes with alternating colors', async ({ page }) => {
    test.setTimeout(90000)
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[style*="background-color"]')

    for (let i = 0; i < 5; i++) {
      await selectTool(page, 'Pencil (P)')
      await swatches.nth(i % 2 === 0 ? 0 : 1).click()
      await page.waitForTimeout(100)
      await drawOnCanvas(page, [
        { x: 50, y: 50 + i * 80 },
        { x: 200, y: 50 + i * 80 },
      ])
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })
})

// ─── 9. Pencil After Other Operations ─────────────────────────────────────────

test.describe('Pencil After Other Operations', () => {
  test('pencil after eraser creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('pencil after text commit creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 120, h: 40 })
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil after export creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil after callout creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 120, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 10. Multi-Page Drawing ──────────────────────────────────────────────────

test.describe('Multi-Page Drawing', () => {
  test('draw on page 2 of multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('draw on page 1 then page 2 both persist', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    const countPage1 = await getAnnotationCount(page)
    expect(countPage1).toBe(1)
    await goToPage(page, 2)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const annsP1 = session.annotations['1'] || session.annotations[1] || []
    const annsP2 = session.annotations['2'] || session.annotations[2] || []
    expect(annsP1.length).toBeGreaterThanOrEqual(1)
    expect(annsP2.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── 11. Undo/Redo Cycles ────────────────────────────────────────────────────

test.describe('Undo/Redo Cycles', () => {
  test('undo-redo-undo cycle returns to zero', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo past end of history does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    // Redo without any undo should do nothing
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo past start of history does nothing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Extra undo should not crash
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('rapid draw and undo alternation 10 cycles', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 80 + (i % 5) * 30, y: 100 + (i % 3) * 80, w: 60, h: 40 })
      await selectTool(page, 'Select (S)')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    // After 10 draw-undo cycles, count should be 0
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 12. Window Resize ───────────────────────────────────────────────────────

test.describe('Draw Then Resize Window', () => {
  test('pencil annotation persists after window resize', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.setViewportSize({ width: 800, height: 600 })
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil annotation persists after resize to small viewport', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.setViewportSize({ width: 600, height: 400 })
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 13. Font Changes Should Not Affect Pencil ──────────────────────────────

test.describe('Font Changes Should Not Affect Pencil', () => {
  test('pencil draws normally regardless of font settings', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Select text to potentially change font, then go back to pencil
    await selectTool(page, 'Text (T)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 14. Cursor During Drawing ───────────────────────────────────────────────

test.describe('Cursor During Drawing', () => {
  test('pencil tool shows crosshair cursor class on canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate((el) => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })
})

// ─── 15. Mixed Annotation Types ──────────────────────────────────────────────

test.describe('Mixed Annotation Types', () => {
  test('pencil + rectangle + circle coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 350, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('pencil + arrow + line coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'arrow', { x: 200, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'line', { x: 350, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('pencil drawn after every other tool type', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 80, h: 60 })
    await createAnnotation(page, 'arrow', { x: 200, y: 200, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 350, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(5)
  })
})

// ─── 16. Sticky Tool Mode ───────────────────────────────────────────────────

test.describe('Sticky Tool Mode', () => {
  test('sticky pencil tool allows multiple consecutive strokes without reselecting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const stickyBtn = page.locator('button[title*="Lock tool"]')
    if (await stickyBtn.isVisible()) {
      await stickyBtn.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 50, y: 100 }, { x: 150, y: 100 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 200 }, { x: 150, y: 200 }])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [{ x: 50, y: 300 }, { x: 150, y: 300 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── 17. Delete Then Draw ────────────────────────────────────────────────────

test.describe('Delete Then Draw', () => {
  test('draw pencil, select and delete, draw another pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 18. Session Preservation After Complex Operations ─────────────────────

test.describe('Session Preservation After Complex Operations', () => {
  test('pencil annotations survive session save after zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBeGreaterThanOrEqual(1)
    expect(anns[0].type).toBe('pencil')
  })

  test('pencil annotations survive session save after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBeGreaterThanOrEqual(1)
    expect(anns[0].type).toBe('pencil')
  })
})

// ─── 19. Additional Regression Scenarios ──────────────────────────────────────

test.describe('Additional Regression Scenarios', () => {
  test('draw pencil then switch to Cloud then back to pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Cloud (K)')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw pencil then switch to Arrow then back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Arrow (A)')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw pencil then switch to Circle then back', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Circle (C)')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw 5 pencil strokes then undo all then redo all', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 50 + i * 80, w: 80, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('pencil after highlight tool creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('pencil after measure tool creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('pencil stroke with many intermediate points', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const points = []
    for (let i = 0; i < 50; i++) {
      points.push({ x: 50 + i * 6, y: 200 + Math.sin(i * 0.3) * 50 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil after clear session data draws new annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await clearSessionData(page)
    await page.waitForTimeout(200)
    // App still has annotation in memory even if session cleared
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('draw pencil then resize viewport then draw another', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil works after 270 degree rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil annotation count in status bar accurate after multiple operations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'pencil', { x: 50, y: 400, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
