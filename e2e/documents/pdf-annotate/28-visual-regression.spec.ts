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
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Empty State Snapshots ───────────────────────────────────────────────────

test.describe('Visual — Empty State', () => {
  test('empty state drop zone matches baseline', async ({ page }) => {
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('pdf-annotate-empty-state.png', { maxDiffPixelRatio: 0.02 })
  })

  test('empty state shows drop zone text', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Annotate with pencil, shapes, text & more')).toBeVisible()
  })

  test('empty state with session banner matches baseline', async ({ page }) => {
    // Create a session then return to empty state
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.waitForTimeout(2000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('pdf-annotate-session-banner.png', { maxDiffPixelRatio: 0.02 })
  })
})

// ─── Loaded PDF Snapshots ────────────────────────────────────────────────────

test.describe('Visual — Loaded PDF', () => {
  test('loaded single-page PDF matches baseline', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('pdf-annotate-single-page-loaded.png', { maxDiffPixelRatio: 0.02 })
  })

  test('loaded multi-page PDF matches baseline', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('pdf-annotate-multi-page-loaded.png', { maxDiffPixelRatio: 0.02 })
  })

  test('PDF canvas renders without blank areas', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    const canvas = page.locator('canvas.pdf-canvas').first()
    await expect(canvas).toBeVisible()
    const canvasScreenshot = await canvas.screenshot()
    expect(canvasScreenshot.length).toBeGreaterThan(1000) // not a blank/tiny image
  })
})

// ─── Toolbar State Snapshots ─────────────────────────────────────────────────

test.describe('Visual — Toolbar States', () => {
  test('select tool active state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toHaveClass(/bg-\[#14B8A6\]/)
    const screenshot = await selectBtn.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-select-active.png', { maxDiffPixelRatio: 0.05 })
  })

  test('pencil tool active state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    // The shapes dropdown button should show active state
    const toolbarRow = page.locator('.border-b.flex-shrink-0').first()
    const screenshot = await toolbarRow.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-pencil-active.png', { maxDiffPixelRatio: 0.05 })
  })

  test('text tool active state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    const toolbarRow = page.locator('.border-b.flex-shrink-0').first()
    const screenshot = await toolbarRow.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-text-active.png', { maxDiffPixelRatio: 0.05 })
  })

  test('highlight tool active state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Highlight (H)')
    const highlightBtn = page.locator('button[title="Highlight (H)"]')
    await expect(highlightBtn).toHaveClass(/bg-\[#14B8A6\]/)
    const screenshot = await highlightBtn.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-highlight-active.png', { maxDiffPixelRatio: 0.05 })
  })

  test('eraser tool active state shows partial/object toggle', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button:has-text("Partial")')).toBeVisible()
    await expect(page.locator('button:has-text("Object")')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
    const screenshot = await propsBar.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-eraser-props.png', { maxDiffPixelRatio: 0.05 })
  })

  test('measure tool active state shows calibration area', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Measure (M)')
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
    const screenshot = await propsBar.screenshot()
    expect(screenshot).toMatchSnapshot('toolbar-measure-props.png', { maxDiffPixelRatio: 0.05 })
  })
})

// ─── Properties Bar Snapshots ────────────────────────────────────────────────

test.describe('Visual — Properties Bar', () => {
  test('properties bar for drawing tools shows color/width/opacity', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('text=/Width/')).toBeVisible()
    await expect(page.locator('text=/Opacity/')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
    const screenshot = await propsBar.screenshot()
    expect(screenshot).toMatchSnapshot('props-bar-rectangle.png', { maxDiffPixelRatio: 0.05 })
  })

  test('properties bar for text tool shows font controls', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    // Font family, size, bold, italic, underline, strikethrough, alignment should be visible
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
    await expect(page.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
    const screenshot = await propsBar.screenshot()
    expect(screenshot).toMatchSnapshot('props-bar-text.png', { maxDiffPixelRatio: 0.05 })
  })

  test('properties bar for select tool with nothing selected shows hint', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Select (S)')
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('properties bar for select tool with shape selected shows shape controls', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Width and opacity controls should be visible
    await expect(page.locator('text=/Width/')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
    const screenshot = await propsBar.screenshot()
    expect(screenshot).toMatchSnapshot('props-bar-shape-selected.png', { maxDiffPixelRatio: 0.05 })
  })
})

// ─── Canvas with Annotations ─────────────────────────────────────────────────

test.describe('Visual — Canvas with Annotations', () => {
  test('canvas with pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 200, h: 80 })
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-pencil-annotation.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas with rectangle annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-rectangle-annotation.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas with circle annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 120, h: 120 })
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-circle-annotation.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas with text annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    // Click away to deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-text-annotation.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas with arrow annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-arrow-annotation.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas with multiple annotation types', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 100, w: 80, h: 80 })
    await createAnnotation(page, 'pencil', { x: 350, y: 100, w: 100, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-multiple-annotations.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Zoom and Rotation Visual ────────────────────────────────────────────────

test.describe('Visual — Zoom Levels', () => {
  test('canvas at zoomed in level', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Zoom in twice (each click = +0.25)
    await page.locator('button[title="Zoom in"]').click()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('canvas-zoomed-in.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas at zoomed out level', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Zoom out twice
    await page.locator('button[title="Zoom out"]').click()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('canvas-zoomed-out.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas after fit to window', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title*="Fit to window"]').click()
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('canvas-fit-to-window.png', { maxDiffPixelRatio: 0.03 })
  })
})

test.describe('Visual — Rotation', () => {
  test('canvas after 90 degree rotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-rotated-90.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas after 180 degree rotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-rotated-180.png', { maxDiffPixelRatio: 0.03 })
  })

  test('canvas after 270 degree rotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 3; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-rotated-270.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Page Navigation Controls ────────────────────────────────────────────────

test.describe('Visual — Page Navigation', () => {
  test('page navigation controls for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Status bar is the bottom compact bar with border-t
    const statusBar = page.locator('.border-t.border-white\\/\\[0\\.06\\].flex-shrink-0').last()
    const screenshot = await statusBar.screenshot()
    expect(screenshot).toMatchSnapshot('page-nav-controls.png', { maxDiffPixelRatio: 0.05 })
  })

  test('single page PDF status bar', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    const statusBar = page.locator('.border-t.border-white\\/\\[0\\.06\\].flex-shrink-0').last()
    const screenshot = await statusBar.screenshot()
    expect(screenshot).toMatchSnapshot('single-page-status-bar.png', { maxDiffPixelRatio: 0.05 })
  })
})

// ─── Thumbnail Sidebar ───────────────────────────────────────────────────────

test.describe('Visual — Thumbnail Sidebar', () => {
  test('thumbnail sidebar open state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(800)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('thumbnail-sidebar-open.png', { maxDiffPixelRatio: 0.03 })
  })

  test('thumbnail sidebar shows page numbers', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(800)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })
})

// ─── Annotation Selection Visual ─────────────────────────────────────────────

test.describe('Visual — Annotation Selection', () => {
  test('selected rectangle shows selection indicators', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 250)
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-selected-rectangle.png', { maxDiffPixelRatio: 0.03 })
  })

  test('selected text annotation shows selection indicators', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 200, h: 50 })
    // Deselect then re-select
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 225)
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-selected-text.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Callout Visual ──────────────────────────────────────────────────────────

test.describe('Visual — Callout', () => {
  test('canvas with callout annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'callout', { x: 100, y: 200, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-callout-annotation.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Line Annotation Visual ─────────────────────────────────────────────────

test.describe('Visual — Line and Arrow', () => {
  test('canvas with line annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(300)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-line-annotation.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Highlight Visual ────────────────────────────────────────────────────────

test.describe('Visual — Highlight', () => {
  test('canvas with highlight annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 400, y: 200 }])
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    const canvas = await screenshotCanvas(page)
    expect(canvas).toMatchSnapshot('canvas-highlight-annotation.png', { maxDiffPixelRatio: 0.03 })
  })
})

// ─── Undo/Redo Button Visual ─────────────────────────────────────────────────

test.describe('Visual — Undo/Redo Buttons', () => {
  test('undo button disabled state when no history', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('undo button enabled after drawing', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeEnabled()
  })

  test('redo button disabled when nothing to redo', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('redo button enabled after undo', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeEnabled()
  })
})

// ─── Zoom Controls Visual ────────────────────────────────────────────────────

test.describe('Visual — Zoom Controls', () => {
  test('zoom in button is visible', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('button[title="Zoom in"]')).toBeVisible()
  })

  test('zoom out button is visible', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('button[title="Zoom out"]')).toBeVisible()
  })

  test('fit to window button is visible', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('button[title*="Fit to window"]')).toBeVisible()
  })
})
