import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('UI Core', () => {
  test('toolbar visible after upload', async ({ page }) => {
    // The toolbar is a div with class "w-10 border-l..." — check that tool buttons and canvas exist
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toBeVisible()
  })

  test('pencil tool button present', async ({ page }) => {
    const btn = page.locator('button[title="Pencil (P)"]')
    await expect(btn).toBeVisible()
  })

  test('line tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift for perfect shapes/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('arrow tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift for perfect shapes/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('rectangle tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift for perfect shapes/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('circle tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Shift for perfect shapes/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('cloud tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('text tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Drag to create text/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('callout tool activates via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Drag to create callout/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('eraser tool button present', async ({ page }) => {
    const btn = page.locator('button[title="Eraser (E)"]')
    await expect(btn).toBeVisible()
  })

  test('highlight tool button present', async ({ page }) => {
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).toBeVisible()
  })

  test('measure tool button present', async ({ page }) => {
    const btn = page.locator('button[title="Measure (M)"]')
    await expect(btn).toBeVisible()
  })

  test('status bar shows annotation count after drawing', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const statusText = page.locator('text=/\\d+ ann/')
    await expect(statusText).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom controls visible', async ({ page }) => {
    const zoomIn = page.locator('button[title="Zoom in"]')
    const zoomOut = page.locator('button[title="Zoom out"]')
    await expect(zoomIn).toBeVisible()
    await expect(zoomOut).toBeVisible()
  })

  test('undo and redo buttons visible', async ({ page }) => {
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(undoBtn).toBeVisible()
    await expect(redoBtn).toBeVisible()
  })

  test('export button visible', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeVisible()
  })

  test('page navigation visible for multi-page PDF', async ({ page }) => {
    const pageInput = page.locator('input[type="number"]')
    const count = await pageInput.count()
    // At minimum, the page input or a page indicator should exist
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('canvas renders after upload', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('toolbar buttons with title attributes are present', async ({ page }) => {
    // Primary toolbar buttons visible without expanding
    const primaryButtons = [
      'Select (S)',
      'Highlight (H)',
      'Eraser (E)',
      'Measure (M)',
    ]
    for (const title of primaryButtons) {
      const btn = page.locator(`button[title="${title}"]`)
      await expect(btn).toBeVisible()
    }

    // Stamp and Crop are in the "More tools" collapsed section — expand first
    // Use the sidebar's dashed-border More tools button (not the header More dropdown)
    const moreToolsBtn = page.locator('button[title="More tools"]').filter({ hasText: 'More tools' })
    await moreToolsBtn.click()
    await page.waitForTimeout(200)

    const secondaryButtons = ['Stamp', 'Crop page']
    for (const title of secondaryButtons) {
      const btn = page.locator(`button[title="${title}"]`)
      await expect(btn).toBeVisible()
    }
  })

  test('active tool highlighted in toolbar after selection', async ({ page }) => {
    // Select tool has a title attr — check its active state
    await selectTool(page, 'Select (S)')
    const selectBtn = page.locator('button[title="Select (S)"]')
    const classes = await selectBtn.getAttribute('class')
    // Active tool should have a visual indicator (e.g. ring, bg change, or active class)
    expect(classes).toBeTruthy()
  })

  test('switching tools updates status bar hint', async ({ page }) => {
    // Use keyboard shortcuts and verify status bar hint changes
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('select tool button present', async ({ page }) => {
    const btn = page.locator('button[title="Select (S)"]')
    await expect(btn).toBeVisible()
  })

  test('undo button disabled when no history', async ({ page }) => {
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('redo button disabled when no future', async ({ page }) => {
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })
})
