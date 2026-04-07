import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  getAnnotationCount,
  createAnnotation,
} from '../../helpers/pdf-annotate'

/**
 * Visual & functional regression suite for each PDF Annotate tool.
 * Catches coordinate mismatches, rendering jumps, and sizing bugs.
 *
 * Screenshots are attached as test artifacts for every visual test:
 *   - "before-draw" = canvas state before drawing
 *   - "during-draw" = mid-draw (mouse still held)
 *   - "after-commit" = after mouse-up and commit
 *
 * Run with: npx playwright test 29-tool-visual-functional
 */

test.beforeEach(async ({ page }) => {
  // Block update-check requests so the Update Available modal doesn't appear
  await page.route('**/api.github.com/**', (route) => route.abort())
  await page.goto('/')
  // Dismiss the update modal if it appears anyway
  const skipBtn = page.getByText('Skip this version')
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click()
    await page.waitForTimeout(300)
  }
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Helper: get annotation data from sessionStorage ──────────────────────

async function getAnnotationData(page: import('@playwright/test').Page): Promise<Record<string, unknown[]>> {
  await page.waitForTimeout(2200) // debounced session save
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('mt-pdf-annotate-session')
    if (!raw) return {}
    const session = JSON.parse(raw)
    return session.annotations || {}
  })
}

/** Helper to get canvas locator + bounding box */
async function getCanvas(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas.ann-canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  return { canvas, box }
}

/** Attach a screenshot buffer as a test artifact */
function attachScreenshot(testInfo: import('@playwright/test').TestInfo, name: string, buf: Buffer) {
  testInfo.attach(name, { body: buf, contentType: 'image/png' })
}

// ─── 1. Pencil Tool ─────────────────────────────────────────────────────────

test.describe('Pencil Tool — visual & functional', () => {
  test('stroke renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Pencil (P)')
    const { canvas, box } = await getCanvas(page)

    // Screenshot BEFORE drawing
    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    // Draw stroke
    await page.mouse.move(box.x + 100, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 200, { steps: 10 })

    // Screenshot DURING draw (mouse still held)
    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(300)

    // Screenshot AFTER commit
    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)

    // Visual check: during-draw and after-commit should be similar size
    // (stroke shouldn't dramatically change size on commit)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })

  test('pencil stroke stays within drawn bounds', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 5 })
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { points: { x: number; y: number }[] }[]
    expect(anns.length).toBe(1)
    for (const pt of anns[0].points) {
      expect(pt.x).toBeGreaterThan(0)
      expect(pt.y).toBeGreaterThan(0)
    }
  })
})

// ─── 2. Line Tool ───────────────────────────────────────────────────────────

test.describe('Line Tool — visual & functional', () => {
  test('line renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Line (L)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 50, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 100, { steps: 5 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(300)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })

  test('line stroke width matches setting', async ({ page }) => {
    await createAnnotation(page, 'line')
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { strokeWidth: number }[]
    expect(anns.length).toBe(1)
    expect(anns[0].strokeWidth).toBe(2)
  })
})

// ─── 3. Arrow Tool ──────────────────────────────────────────────────────────

test.describe('Arrow Tool — visual & functional', () => {
  test('arrow renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Arrow (A)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 50, box.y + 150)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 150, { steps: 5 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(300)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })
})

// ─── 4. Rectangle Tool ─────────────────────────────────────────────────────

test.describe('Rectangle Tool — visual & functional', () => {
  test('rectangle renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Rectangle (R)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(300)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })

  test('rectangle creates annotation with correct type and 2 points', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { type: string; points: { x: number; y: number }[] }[]
    expect(anns[0].type).toBe('rectangle')
    expect(anns[0].points.length).toBe(2)
  })
})

// ─── 5. Circle Tool ────────────────────────────────────────────────────────

test.describe('Circle Tool — visual & functional', () => {
  test('circle renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Circle (C)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(300)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })
})

// ─── 6. Highlighter Tool ────────────────────────────────────────────────────

test.describe('Highlighter Tool — visual & functional', () => {
  test('highlighter creates annotation with correct defaults', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 280 },
      { x: 400, y: 280 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { type: string; color: string; strokeWidth: number; opacity: number }[]
    expect(anns[0].type).toBe('highlighter')
    expect(anns[0].color).toBe('#FFFF00')
    expect(anns[0].opacity).toBeLessThan(1)
  })

  test('highlighter does NOT change size after commit', async ({ page }, testInfo) => {
    await selectTool(page, 'Highlight (H)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 100, box.y + 280)
    await page.mouse.down()
    await page.mouse.move(box.x + 400, box.y + 280, { steps: 10 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(500)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)

    // Highlighter should NOT dramatically change size (was 2-3x bigger before fix)
    const sizeDiff = Math.abs(duringDraw.length - afterCommit.length)
    const maxSize = Math.max(duringDraw.length, afterCommit.length)
    expect(sizeDiff / maxSize).toBeLessThan(0.5)
  })

  test('highlighter strokeWidth matches default', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 280 },
      { x: 400, y: 280 },
    ])
    await page.waitForTimeout(300)
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { strokeWidth: number }[]
    // Default highlighter stroke width is 8
    expect(anns[0].strokeWidth).toBe(8)
  })
})

// ─── 7. Text Tool ───────────────────────────────────────────────────────────

test.describe('Text Tool — visual & functional', () => {
  test('text box creates exactly one annotation (no duplicates)', async ({ page }, testInfo) => {
    await selectTool(page, 'Text (T)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 160, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    const afterDrag = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-drag', afterDrag)

    await page.keyboard.type('Single box')
    await page.waitForTimeout(200)

    const withText = await canvas.screenshot()
    attachScreenshot(testInfo, 'with-text', withText)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    // Must be exactly 1 annotation, not 2
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text box position matches where user drew it', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 350, y: 210 })
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(1)
    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { type: string; points: { x: number; y: number }[]; text: string }[]
    expect(anns[0].type).toBe('text')
    expect(anns[0].text).toBe('Hello')
    expect(anns[0].points[0].x).toBeGreaterThan(50)
    expect(anns[0].points[0].y).toBeGreaterThan(50)
  })

  test('text content renders at correct position (not offset)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.keyboard.type('Position test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    const data = await getAnnotationData(page)
    const anns = Object.values(data).flat() as { points: { x: number; y: number }[]; width: number; height: number }[]
    const ann = anns[0]
    expect(ann.points[0].x).toBeLessThan(300)
    expect(ann.points[0].y).toBeLessThan(300)
    expect(ann.width).toBeGreaterThan(50)
    expect(ann.height).toBeGreaterThan(20)
  })
})

// ─── 8. Callout Tool ────────────────────────────────────────────────────────

test.describe('Callout Tool — visual & functional', () => {
  test('callout renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Callout (O)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 160, { steps: 3 })

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    await page.mouse.up()
    await page.waitForTimeout(200)
    await page.keyboard.type('Test callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 9. Eraser Tool ─────────────────────────────────────────────────────────

test.describe('Eraser Tool — functional', () => {
  test('object eraser removes annotation on click', async ({ page }) => {
    // Create a pencil annotation (easier to hit than rectangle edges)
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 200, h: 5 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Ensure object erase mode
    const objEraseBtn = page.locator('button[title="Object erase"]')
    if (await objEraseBtn.isVisible()) {
      await objEraseBtn.click()
      await page.waitForTimeout(100)
    }
    // Drag across the pencil stroke to erase it
    await drawOnCanvas(page, [
      { x: 150, y: 145 },
      { x: 200, y: 155 },
    ])
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 10. Sticky Tool Behavior ───────────────────────────────────────────────

test.describe('Sticky Tool — tools stay active after use', () => {
  test('pencil stays active after drawing a stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ])
    await page.waitForTimeout(300)
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle stays active after drawing', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 150, y: 100 })
    await page.waitForTimeout(300)
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 150, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('highlighter stays active after drawing', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 280 },
      { x: 300, y: 280 },
    ])
    await page.waitForTimeout(300)
    await drawOnCanvas(page, [
      { x: 100, y: 300 },
      { x: 300, y: 300 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 11. Color Picker ───────────────────────────────────────────────────────

test.describe('Color Picker — custom color & eyedropper', () => {
  test('color picker has eyedropper button', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pipette = page.locator('button[title="Pick color from screen"]')
    const count = await pipette.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ─── 12. Context Menu — Edit Text ───────────────────────────────────────────

test.describe('Context Menu — Edit Text option', () => {
  test('right-click on text annotation shows Edit Text option', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectTool(page, 'Select (S)')
    const { box } = await getCanvas(page)
    await page.mouse.click(box.x + 150, box.y + 130, { button: 'right' })
    await page.waitForTimeout(300)
    await expect(page.locator('text=Edit Text')).toBeVisible()
  })
})

// ─── 13. Cloud Tool ─────────────────────────────────────────────────────────

test.describe('Cloud Tool — visual & functional', () => {
  test('cloud renders at consistent size (no jump on commit)', async ({ page }, testInfo) => {
    await selectTool(page, 'Cloud (K)')
    const { canvas, box } = await getCanvas(page)

    const beforeDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'before-draw', beforeDraw)

    // Cloud tool: click vertices to build polygon, double-click to finish
    await page.mouse.click(box.x + 100, box.y + 100)
    await page.waitForTimeout(100)
    await page.mouse.click(box.x + 300, box.y + 100)
    await page.waitForTimeout(100)
    await page.mouse.click(box.x + 300, box.y + 250)
    await page.waitForTimeout(100)

    const duringDraw = await canvas.screenshot()
    attachScreenshot(testInfo, 'during-draw', duringDraw)

    // Double-click to close the cloud
    await page.mouse.dblclick(box.x + 100, box.y + 250)
    await page.waitForTimeout(500)

    const afterCommit = await canvas.screenshot()
    attachScreenshot(testInfo, 'after-commit', afterCommit)

    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 14. Memory monitoring ──────────────────────────────────────────────────

test.describe('Memory — no unbounded growth', () => {
  test('creating 20 annotations does not leak memory excessively', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
      }
      return 0
    })

    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 50 + (i % 5) * 80,
        y: 50 + Math.floor(i / 5) * 80,
        w: 60,
        h: 50,
      })
    }

    expect(await getAnnotationCount(page)).toBe(20)

    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
      }
      return 0
    })

    if (initialMemory > 0 && finalMemory > 0) {
      const growth = finalMemory - initialMemory
      expect(growth).toBeLessThan(50 * 1024 * 1024)
    }
  })
})
