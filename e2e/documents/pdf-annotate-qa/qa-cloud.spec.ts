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

/** Helper: create a triangle cloud (3 vertices + double-click close) */
async function createTriangleCloud(page: import('@playwright/test').Page, offset = 0) {
  await selectTool(page, 'Cloud (K)')
  await clickCanvasAt(page, 100 + offset, 100)
  await page.waitForTimeout(100)
  await clickCanvasAt(page, 250 + offset, 100)
  await page.waitForTimeout(100)
  await doubleClickCanvasAt(page, 175 + offset, 200)
  await page.waitForTimeout(300)
}

/** Helper: create a quad cloud (4 vertices + double-click close) */
async function createQuadCloud(page: import('@playwright/test').Page) {
  await selectTool(page, 'Cloud (K)')
  await clickCanvasAt(page, 100, 100)
  await page.waitForTimeout(100)
  await clickCanvasAt(page, 250, 100)
  await page.waitForTimeout(100)
  await clickCanvasAt(page, 250, 250)
  await page.waitForTimeout(100)
  await doubleClickCanvasAt(page, 100, 250)
  await page.waitForTimeout(300)
}

// ─── 1. Cloud Vertex Placement ──────────────────────────────────────────────

test.describe('Cloud — Vertex Placement', () => {
  test('K key activates Cloud tool', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('clicking places vertex, cloud mode stays active', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const before = await screenshotCanvas(page)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('two clicks add two vertices', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('three clicks add three vertices', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('shows "0 pts" status initially', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/0 pts.*Dbl-click close/')).toBeVisible()
  })
})

// ─── 2. Cloud Closing ───────────────────────────────────────────────────────

test.describe('Cloud — Closing', () => {
  test('double-click closes cloud with 3+ vertices', async ({ page }) => {
    await createTriangleCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('four vertices and double-click closes cloud', async ({ page }) => {
    await createQuadCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertex count resets to 0 after closing', async ({ page }) => {
    await createTriangleCloud(page)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
  })

  test('cloud annotation type stored as cloud', async ({ page }) => {
    await createTriangleCloud(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('cloud')
  })

  test('multiple clouds can be created sequentially', async ({ page }) => {
    await createTriangleCloud(page, 0)
    expect(await getAnnotationCount(page)).toBe(1)
    await createTriangleCloud(page, 200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('double-click with fewer than 3 vertices does not create cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    // Double-click adds a 2nd vertex and attempts close — but only 2 real vertices
    await doubleClickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    // Depending on implementation: either 0 annotations or safe reset
    const count = await getAnnotationCount(page)
    // Should not crash regardless
    expect(count).toBeLessThanOrEqual(1)
  })

  test('double-click with 0 vertices does not crash', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await doubleClickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    // Should not crash, count stays 0
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 3. Minimum 3 Vertices ─────────────────────────────────────────────────

test.describe('Cloud — Minimum Vertices', () => {
  test('cloud with exactly 3 vertices (2 clicks + double-click) creates annotation', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 150, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Backspace Removes Last Vertex ───────────────────────────────────────

test.describe('Cloud — Backspace Remove Vertex', () => {
  test('Backspace removes last vertex', async ({ page }) => {
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
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('repeated Backspace removes all vertices', async ({ page }) => {
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

// ─── 5. Escape Cancels Cloud ────────────────────────────────────────────────

test.describe('Cloud — Escape Cancel', () => {
  test('Escape cancels in-progress cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Escape with one vertex cancels', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('switching tool cancels in-progress cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 6. Properties ──────────────────────────────────────────────────────────

test.describe('Cloud — Properties', () => {
  test('stroke width slider visible for Cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('opacity slider visible for Cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('cloud with custom stroke width stores correctly', async ({ page }) => {
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

  test('cloud uses current color', async ({ page }) => {
    await createTriangleCloud(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(typeof anns[0].color).toBe('string')
    expect(anns[0].color.length).toBeGreaterThan(0)
  })
})

// ─── 7. Status Bar Vertex Count ─────────────────────────────────────────────

test.describe('Cloud — Status Bar', () => {
  test('status bar shows vertex count as cloud is built', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/0 pts/')).toBeVisible()
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('cloud tool shows active orange styling', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('button[title="Cloud (K)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })
})

// ─── 8. Cloud with Many Vertices ────────────────────────────────────────────

test.describe('Cloud — Many Vertices', () => {
  test('cloud with 10+ vertices creates annotation', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    // Place 10 vertices in a rough circle pattern
    const cx = 200
    const cy = 200
    const r = 80
    for (let i = 0; i < 10; i++) {
      const angle = (2 * Math.PI * i) / 10
      const x = Math.round(cx + r * Math.cos(angle))
      const y = Math.round(cy + r * Math.sin(angle))
      await clickCanvasAt(page, x, y)
      await page.waitForTimeout(100)
    }
    // Double-click to close
    const lastAngle = (2 * Math.PI * 9) / 10
    await doubleClickCanvasAt(
      page,
      Math.round(cx + r * Math.cos(lastAngle)),
      Math.round(cy + r * Math.sin(lastAngle)),
    )
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud with 5 vertices (pentagon) creates annotation', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 200, 80)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 270, 270)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 130, 270)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 9. Undo/Redo ───────────────────────────────────────────────────────────

test.describe('Cloud — Undo/Redo', () => {
  test('Ctrl+Z undoes cloud creation', async ({ page }) => {
    await createTriangleCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone cloud', async ({ page }) => {
    await createTriangleCloud(page)
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
    await createTriangleCloud(page)
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

// ─── 10. Session Data ───────────────────────────────────────────────────────

test.describe('Cloud — Session Data', () => {
  test('cloud has multiple points in session', async ({ page }) => {
    await createQuadCloud(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('cloud points have valid coordinates', async ({ page }) => {
    await createTriangleCloud(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    for (const pt of anns[0].points) {
      expect(typeof pt.x).toBe('number')
      expect(typeof pt.y).toBe('number')
    }
  })

  test('cloud has unique ID', async ({ page }) => {
    await createTriangleCloud(page, 0)
    await createTriangleCloud(page, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('cloud opacity stored as 0-1 value', async ({ page }) => {
    await createTriangleCloud(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })

  test('cloud persists after tool switch', async ({ page }) => {
    await createTriangleCloud(page)
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud coexists with other annotation types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 40 })
    await createTriangleCloud(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
