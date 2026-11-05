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
  test('empty state shows drop zone text', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.getByText('Annotate with pencil, shapes, text & more')).toBeVisible()
  })

  test('returning to the tool shows the previous-session banner', async ({ page }) => {
    // Create a session then return to empty state
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.waitForTimeout(2000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
  })
})

// ─── Loaded PDF Snapshots ────────────────────────────────────────────────────

test.describe('Visual — Loaded PDF', () => {
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
  })

  test('highlight tool active state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Highlight (H)')
    const highlightBtn = page.locator('button[title="Highlight (H)"]')
    await expect(highlightBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('eraser tool active state shows partial/object toggle', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button:has-text("Partial")')).toBeVisible()
    await expect(page.locator('button:has-text("Object")')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
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
  })

  test('properties bar for text tool shows font controls', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    // Font family, size, bold, italic, underline, strikethrough, alignment should be visible
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
    await expect(page.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible()
    const propsBar = page.locator('.border-b.flex-shrink-0').nth(1)
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
  })
})

// ─── Thumbnail Sidebar ───────────────────────────────────────────────────────

test.describe('Visual — Thumbnail Sidebar', () => {
  test('thumbnail sidebar shows page numbers', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(800)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
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
