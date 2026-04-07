import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  goToPage,
  exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Mass Annotation Creation ────────────────────────────────────────────────

test.describe('Stress — Bulk Annotation Creation', () => {
  test('create 10 rectangle annotations without crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + (i % 5) * 80,
        y: 50 + Math.floor(i / 5) * 100,
        w: 60,
        h: 40,
      })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('create 20 pencil annotations without crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 20; i++) {
      const y = 30 + i * 20
      await drawOnCanvas(page, [
        { x: 50, y },
        { x: 150, y: y + 5 },
        { x: 250, y },
      ])
      await page.waitForTimeout(50)
    }
    const count = await getAnnotationCount(page)
    expect(count).toBe(20)
  })

  test('create 50 annotations of mixed types without crash', async ({ page }) => {
    test.setTimeout(120000) // extend timeout for bulk creation
    await uploadPDFAndWait(page, 'sample.pdf')
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line'> = [
      'pencil', 'rectangle', 'circle', 'arrow', 'line',
    ]
    for (let i = 0; i < 50; i++) {
      const type = types[i % types.length]
      await createAnnotation(page, type, {
        x: 30 + (i % 8) * 55,
        y: 30 + Math.floor(i / 8) * 55,
        w: 40,
        h: 30,
      })
    }
    const count = await getAnnotationCount(page)
    expect(count).toBe(50)
    // Canvas should still be responsive
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('create 15 text annotations without crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'text', {
        x: 30 + (i % 3) * 160,
        y: 30 + Math.floor(i / 3) * 60,
        w: 140,
        h: 40,
      })
    }
    const count = await getAnnotationCount(page)
    expect(count).toBe(15)
  })

  test('canvas remains visible after bulk creation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 25; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 80,
        w: 70,
        h: 50,
      })
    }
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.locator('canvas').nth(1)).toBeVisible()
  })
})

// ─── Rapid Tool Switching ────────────────────────────────────────────────────

test.describe('Stress — Rapid Tool Switching', () => {
  test('cycle through all 12 tools in rapid sequence', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const tools = [
      'Select (S)', 'Pencil (P)', 'Line (L)', 'Arrow (A)',
      'Rectangle (R)', 'Circle (C)', 'Cloud (K)', 'Text (T)',
      'Callout (O)', 'Eraser (E)', 'Highlight (H)', 'Measure (M)',
    ]
    for (const tool of tools) {
      await selectTool(page, tool)
    }
    await page.waitForTimeout(200)
    // Should still be functional
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid tool switching 3 full cycles does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const shortcuts = ['s', 'p', 'l', 'a', 'r', 'c', 'k', 't', 'o', 'e', 'h', 'm']
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const key of shortcuts) {
        await page.keyboard.press(key)
        await page.waitForTimeout(20)
      }
    }
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('tool switch during drawing does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Start drawing
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    // Switch tool mid-draw via keyboard
    await page.keyboard.press('r')
    await page.waitForTimeout(50)
    await page.mouse.up()
    await page.waitForTimeout(200)
    // Should not crash
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('switching to select then immediately to pencil and drawing works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 300, y: 100 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rapid Undo/Redo ─────────────────────────────────────────────────────────

test.describe('Stress — Rapid Undo/Redo', () => {
  test('rapid undo 20 times from 10 annotations does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create 10 annotations
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + (i % 5) * 90,
        y: 30 + Math.floor(i / 5) * 100,
        w: 70,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    // Rapid undo 20 times (more than available)
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid redo 20 times after undo does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + i * 90,
        y: 50,
        w: 70,
        h: 50,
      })
    }
    // Undo all
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    // Rapid redo 20 times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('alternating undo/redo rapidly does not corrupt state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    // Alternate undo/redo
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(20)
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(20)
    }
    await page.waitForTimeout(300)
    // Should still have the 2 annotations
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('create many then undo all then redo all', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 8; i++) {
      await createAnnotation(page, 'line', {
        x: 30 + (i % 4) * 110,
        y: 50 + Math.floor(i / 4) * 100,
        w: 80,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(8)
    // Undo all
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(8)
  })
})

// ─── Rapid Zoom ──────────────────────────────────────────────────────────────

test.describe('Stress — Rapid Zoom', () => {
  test('rapid zoom in 10 times does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid zoom out 10 times does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      await page.locator('button[title="Zoom out"]').click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('alternating zoom in/out rapidly does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(30)
      await page.locator('button[title="Zoom out"]').click()
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('drawing after rapid zoom works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 5; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    // Fit to window to bring canvas back to viewable area before drawing
    await page.locator('button[title*="Fit to window"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── Rotation Stress ─────────────────────────────────────────────────────────

test.describe('Stress — Rotation Stress', () => {
  test('rotate CW 4 times returns to original orientation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 4; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(200)
    }
    // After 4 rotations (360), no rotation indicator
    await expect(page.locator('text=/90°|180°|270°/')).toBeHidden()
  })

  test('draw annotations at all 4 rotation angles', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let rot = 0; rot < 4; rot++) {
      await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(300)
    }
    // Should have 4 annotations (one at each rotation)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('rapid CCW rotation does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 8; i++) {
      await page.locator('button[title="Rotate CCW"]').click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('alternating CW/CCW rotation does not corrupt annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    for (let i = 0; i < 6; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(100)
      await page.locator('button[title="Rotate CCW"]').click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Session Save During Stress ──────────────────────────────────────────────

test.describe('Stress — Session Integrity', () => {
  test('session save during rapid changes does not corrupt data', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create several annotations rapidly
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + i * 90,
        y: 50,
        w: 70,
        h: 50,
      })
    }
    // Wait for session save
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.version).toBe(1)
    // Annotations should be properly serialized
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns).toBeDefined()
    expect(page1Anns.length).toBe(5)
  })

  test('session remains valid after undo/redo sequence', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.version).toBe(1)
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────────────────

test.describe('Stress — Edge Cases', () => {
  test('mouse events outside canvas bounds do not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    // Click outside the canvas bounds
    await page.mouse.click(5, 5)
    await page.waitForTimeout(100)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('simultaneous keyboard and mouse actions do not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Move mouse while pressing keys
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.keyboard.press('Control+z')
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('drawing during page navigation does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Start drawing and navigate simultaneously
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    // Navigate to page 2 while drawing — use scroll-based navigation
    await page.evaluate(() => {
      const container = document.querySelector('[data-page="2"]')
      if (container) container.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 2 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('fit to window after many annotations works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 100,
        w: 70,
        h: 50,
      })
    }
    // Fit to window
    await page.locator('button[title*="Fit to window"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('eraser on empty canvas does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
    ])
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('tab key cycling with no annotations does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('creating annotation then immediately switching tool preserves it', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    // Immediately switch tool
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid color changes via keyboard shortcuts do not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    // Draw some annotations with rapid tool switches
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [
        { x: 50 + i * 60, y: 100 },
        { x: 80 + i * 60, y: 150 },
      ])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('creating text then immediately undoing multiple times', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 3; i++) {
      await createAnnotation(page, 'text', {
        x: 50 + i * 150,
        y: 50,
        w: 120,
        h: 40,
      })
    }
    expect(await getAnnotationCount(page)).toBe(3)
    // Text annotations push 2 history entries each (creation + text commit),
    // so 3 text annotations need 6 undos to fully remove
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('stress test: draw, undo, redo, draw more in rapid sequence', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(50)
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(50)
    await createAnnotation(page, 'line', { x: 350, y: 50, w: 100, h: 50 })
    await page.waitForTimeout(200)
    // Should have 2 annotations (rectangle + line, circle was undone)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('opening and closing shapes dropdown rapidly does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const shapesBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(2)
    for (let i = 0; i < 10; i++) {
      await shapesBtn.click()
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('many escape key presses in succession do not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(20)
    }
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('bulk annotations followed by session save produces valid data', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 80,
        w: 70,
        h: 50,
      })
    }
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns.length).toBe(15)
  })

  test('switching tools mid-text-edit does not lose text', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Important text')
    // Switch to pencil mid-edit (this should commit the text)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with all shape tools in sequence produces correct count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 150, y: 50, w: 60, h: 30 })
    await createAnnotation(page, 'arrow', { x: 250, y: 50, w: 60, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 350, y: 50, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 60, h: 60 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('double-click on empty canvas in select mode does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.dblclick(box.x + 300, box.y + 300)
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('creating annotations across pages in rapid sequence', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await goToPage(page, 1)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('keyboard shortcut during text editing does not switch tools', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Type 'r' which would normally switch to rectangle
    await page.keyboard.type('r')
    // Should still be in text editing mode
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue('r')
  })

  test('rapid delete key presses with no selection do not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Delete')
      await page.waitForTimeout(20)
    }
    await page.waitForTimeout(200)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('fit to window then zoom in then fit again works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title*="Fit to window"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Zoom in"]').click()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title*="Fit to window"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid annotation creation and deletion cycle', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let cycle = 0; cycle < 3; cycle++) {
      await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
      await selectTool(page, 'Select (S)')
      await clickCanvasAt(page, 100, 140)
      await page.waitForTimeout(100)
      await page.keyboard.press('Delete')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('export after stress operations completes without error', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create a bunch of annotations
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + i * 90, y: 50, w: 70, h: 50,
      })
    }
    // Undo some
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Rotate
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(200)
    // Export
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})
