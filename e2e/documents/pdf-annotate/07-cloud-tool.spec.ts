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

// ─── 1. Cloud Tool Activation ────────────────────────────────────────────────

test.describe('Cloud Tool Activation', () => {
  test('K key activates Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('Cloud tool shows stroke width slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/Width/')).toBeVisible()
  })

  test('Cloud tool shows opacity slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/Opacity/')).toBeVisible()
  })

  test('Cloud tool accessible via shapes dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Open shapes dropdown
    await page.locator('button[title="Pencil (P)"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Cloud (K)")').last().click()
    await page.waitForTimeout(200)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('Cloud shows "0 pts" status initially', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/0 pts.*Dbl-click close/')).toBeVisible()
  })

  test('Cloud tool button shows active orange styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('button[title="Cloud (K)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── 2. Cloud Vertex Placement ───────────────────────────────────────────────

test.describe('Cloud Vertex Placement', () => {
  test('clicking once adds first vertex, cloud mode stays active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    const before = await screenshotCanvas(page)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    // Cloud mode should still be active (status bar shows pts)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    // Canvas should have changed (vertex drawn)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('clicking twice adds two vertices, cloud mode active', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    // Cloud mode should still be active
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('clicking three times adds three vertices', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    // Cloud mode should still be active
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('four vertices and double-click closes cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 250)
    await page.waitForTimeout(100)
    // Double-click to close
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertex count resets to 0 after closing cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    // After closing, status should reset
    await expect(page.locator('text=/0 pts/')).toBeVisible()
  })
})

// ─── 3. Cloud Completion ─────────────────────────────────────────────────────

test.describe('Cloud Completion', () => {
  test('double-click closes cloud and creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    // Create a triangle cloud
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud annotation type is stored correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('cloud')
  })

  test('multiple clouds can be created', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    // First cloud
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 150, 50)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 120)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    // Second cloud
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 275, 300)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cloud with many vertices creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    // Pentagon-like shape
    await clickCanvasAt(page, 200, 80)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 270, 270)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 130, 270)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Cloud Cancellation ───────────────────────────────────────────────────

test.describe('Cloud Cancellation', () => {
  test('Escape cancels in-progress cloud', async ({ page }) => {
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
    // After escape, should reset to 0 pts
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Escape with one vertex cancels cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    // Cloud mode should be active
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('switching tool cancels in-progress cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace removes last vertex', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    // Canvas should change after removing a vertex
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    // Cloud mode should still be active
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('repeated Backspace removes all vertices', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
  })
})

// ─── 5. Cloud Color & Properties ─────────────────────────────────────────────

test.describe('Cloud Color & Properties', () => {
  test('cloud uses current color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
  })

  test('stroke width slider visible for Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('opacity slider visible for Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('cloud with custom stroke width stores correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('7')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(7)
  })

  test('cloud with custom opacity stores correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('55')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.55, 1)
  })
})

// ─── 6. Select & Move Cloud ──────────────────────────────────────────────────

test.describe('Select & Move Cloud', () => {
  test('cloud can be selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    // Click on an edge of the cloud
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('cloud can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    await moveAnnotation(page, { x: 175, y: 100 }, { x: 300, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud can be nudged with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Delete Cloud ─────────────────────────────────────────────────────────

test.describe('Delete Cloud', () => {
  test('selected cloud can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting cloud does not affect other annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create a rectangle first
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 40 })
    // Create a cloud
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 275, 300)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    // Select and delete the cloud
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 275, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 8. Undo/Redo Cloud ──────────────────────────────────────────────────────

test.describe('Undo/Redo Cloud', () => {
  test('Ctrl+Z undoes cloud creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
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

  test('undo deletion restores cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 9. Cloud at Different Zoom Levels ───────────────────────────────────────

test.describe('Cloud at Different Zoom Levels', () => {
  test('cloud works at 125% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 120, 50)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 85, 100)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud works at 50% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('50%', { exact: true }).click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 150, 50)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 120)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Cloud on Rotated Page ───────────────────────────────────────────────

test.describe('Cloud on Rotated Page', () => {
  test('cloud works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 150, 180)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 11. Cloud Persistence ───────────────────────────────────────────────────

test.describe('Cloud Persistence', () => {
  test('cloud persists after tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud saved to session correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('cloud')
  })

  test('cloud coexists with other annotation types', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 130, w: 80, h: 30 })
    // Create cloud
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 275, 300)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── 12. Cloud Duplicate & Copy-Paste ────────────────────────────────────────

test.describe('Cloud Duplicate & Copy-Paste', () => {
  test('Ctrl+D duplicates cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes cloud', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 13. Cloud Session Data ──────────────────────────────────────────────────

test.describe('Cloud Session Data', () => {
  test('cloud has multiple points in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 250)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('cloud points have valid coordinates', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    for (const pt of anns[0].points) {
      expect(typeof pt.x).toBe('number')
      expect(typeof pt.y).toBe('number')
    }
  })

  test('cloud annotation has color property', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].color).toBe('string')
    expect(anns[0].color.length).toBeGreaterThan(0)
  })

  test('cloud has unique ID', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create two clouds
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 150, 50)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 120)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 275, 280)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('cloud opacity stored as 0-1 value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })

  test('cloud annotation count matches status bar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 150, 50)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 120)
    await page.waitForTimeout(300)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 350, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 275, 280)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cloud with minimum vertices (3 via double-click)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    // Double-click adds 3rd vertex and closes
    await doubleClickCanvasAt(page, 150, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
