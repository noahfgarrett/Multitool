import { test, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Empty State ──────────────────────────────────────────────────────────

test.describe('Empty State', () => {
  test('shows upload drop zone with correct label', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('shows description text', async ({ page }) => {
    await expect(page.getByText('Annotate with pencil, shapes, text & more')).toBeVisible()
  })

  test('file input is attached and accepts PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('no toolbar visible before PDF upload', async ({ page }) => {
    await expect(page.locator('button[title="Select (S)"]')).toBeHidden()
    await expect(page.getByText('Export PDF')).toBeHidden()
  })

  test('no canvas visible before PDF upload', async ({ page }) => {
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})

// ─── 2. Valid PDF Upload ─────────────────────────────────────────────────────

test.describe('Valid PDF Upload', () => {
  test('uploading sample.pdf renders both canvases', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const canvases = page.locator('canvas')
    await expect(canvases.first()).toBeVisible()
    await expect(canvases.nth(1)).toBeVisible()
  })

  test('toolbar becomes visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Select (S)"]')).toBeVisible()
  })

  test('export button visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('status bar shows file name', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  test('status bar shows file size', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // File size is formatted — look for a size pattern like "X KB" or "X.X MB"
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/')).toBeVisible()
  })

  test('status bar shows 0 annotations initially', async ({ page }) => {
    await uploadPDFAndWait(page)
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('select tool is active by default after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('annotation count text format is "N ann"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('annotation canvas is the second canvas element', async ({ page }) => {
    await uploadPDFAndWait(page)
    const canvases = page.locator('canvas')
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('PDF renders with non-zero canvas dimensions', async ({ page }) => {
    await uploadPDFAndWait(page)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('single-page PDF shows file name in status bar', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible()
  })

  test('drop zone disappears after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('Drop a PDF file here')).toBeHidden()
  })
})

// ─── 2b. Upload State Transitions ────────────────────────────────────────────

test.describe('Upload State Transitions', () => {
  test('upload transitions from empty state to loaded state', async ({ page }) => {
    // Verify empty state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    // Upload
    await uploadPDFAndWait(page)
    // Verify loaded state
    await expect(page.getByText('Drop a PDF file here')).toBeHidden()
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('status bar annotation count starts at zero for fresh upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('annotation count increases after creating annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('text=/0 ann/')).toBeVisible()
    await createAnnotation(page, 'rectangle')
    await expect(page.locator('text=/1 ann/')).toBeVisible()
  })

  test('properties bar shows select hint in loaded state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })
})

// ─── 3. Single-Page PDF ──────────────────────────────────────────────────────

test.describe('Single-Page PDF', () => {
  test('single-page PDF does not show page navigation arrows', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('button').filter({ has: page.locator('svg') }).locator('visible=true').filter({ hasText: /Prev|Next/ })).toHaveCount(0)
  })

  test('single-page PDF does not show page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    // Single-page PDFs have no page count indicator in the header
    await expect(page.locator('text=/\\/ \\d+/')).toBeHidden()
  })

  test('no page number input for single-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('input[type="number"][min="1"]')).toBeHidden()
  })

  test('no thumbnail sidebar toggle for single-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('button[title="Page thumbnails"]')).toBeHidden()
  })
})

// ─── 4. Multi-Page PDF ───────────────────────────────────────────────────────

test.describe('Multi-Page PDF', () => {
  test('multi-page PDF shows page count in status bar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // The status bar shows "/ N" for page count
    await expect(page.locator('text=/\\/\\s*\\d+/')).toBeVisible()
  })

  test('multi-page PDF shows page indicator button', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator shows as a clickable button "1 / N"
    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible()
  })

  test('page indicator starts at page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page indicator button shows "1 / N" by default
    await expect(page.locator('text=/^1 \\/ /')).toBeVisible()
  })

  test('page indicator shows correct page count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // sample.pdf has 2 pages, should show "1 / 2"
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('thumbnail sidebar toggle visible for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('button[title="Page thumbnails"]')).toBeVisible()
  })

  test('clicking thumbnail sidebar toggle opens sidebar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Page thumbnails"]').click()
    await page.waitForTimeout(300)
    // Sidebar should show "Pages (N)" header
    await expect(page.locator('text=/Pages \\(/')).toBeVisible()
  })

  test('annotations are per-page (page 1 annotation not on page 2)', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate to page 2 via keyboard
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 5. Invalid File Upload ──────────────────────────────────────────────────

test.describe('Invalid File Upload', () => {
  test('zero-byte PDF shows error message', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = (await import('path')).join(
      (await import('path')).dirname((await import('url')).fileURLToPath(import.meta.url)),
      '..', '..', 'fixtures', 'zero-byte.pdf'
    )
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    // Should show an error message containing "Failed to load PDF"
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 5000 })
  })

  test('non-PDF file shows error message', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = (await import('path')).join(
      (await import('path')).dirname((await import('url')).fileURLToPath(import.meta.url)),
      '..', '..', 'fixtures', 'not-a-pdf.txt'
    )
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 5000 })
  })

  test('error message can be dismissed', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = (await import('path')).join(
      (await import('path')).dirname((await import('url')).fileURLToPath(import.meta.url)),
      '..', '..', 'fixtures', 'zero-byte.pdf'
    )
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 5000 })
    // Dismiss button
    await page.locator('button[aria-label="Dismiss error"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Failed to load PDF/')).toBeHidden()
  })

  test('drop zone remains available after error', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = (await import('path')).join(
      (await import('path')).dirname((await import('url')).fileURLToPath(import.meta.url)),
      '..', '..', 'fixtures', 'zero-byte.pdf'
    )
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    // Drop zone should still be present
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('valid PDF can be uploaded after error', async ({ page }) => {
    // First upload an invalid file
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = (await import('path')).join(
      (await import('path')).dirname((await import('url')).fileURLToPath(import.meta.url)),
      '..', '..', 'fixtures', 'zero-byte.pdf'
    )
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    // Now upload a valid PDF
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

// ─── 6. New/Reset ────────────────────────────────────────────────────────────

test.describe('New/Reset', () => {
  test('New button is visible after PDF upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('New')).toBeVisible()
  })

  test('New button triggers confirm dialog', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Auto-accept the native confirm() dialog
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    // After accepting, should return to empty state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('dismissing confirm dialog cancels reset', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Auto-dismiss the native confirm() dialog
    page.on('dialog', dialog => dialog.dismiss())
    await page.getByText('New').click()
    await page.waitForTimeout(200)
    // Should still show the canvas
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('reset clears all annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    // Upload again
    await uploadPDFAndWait(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('reset returns to drop zone', async ({ page }) => {
    await uploadPDFAndWait(page)
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})

// ─── 7. Session Persistence ──────────────────────────────────────────────────

test.describe('Session Persistence', () => {
  test('session data is saved to sessionStorage after annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.version).toBe(1)
  })

  test('session stores file name', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.file.fileName).toBe('sample.pdf')
  })

  test('session stores file size', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.file.fileSize).toBeGreaterThan(0)
  })

  test('session stores annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageAnns = session.annotations['1'] || session.annotations[1]
    expect(pageAnns.length).toBe(1)
  })

  test('session restore banner appears when session exists', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    // Reset via native confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(300)
    // Manually set session data to simulate previous session
    await page.evaluate(() => {
      const session = {
        version: 1,
        file: { fileName: 'sample.pdf', fileSize: 12345 },
        annotations: {}, measurements: {}, pageRotations: {},
        calibration: { pixelsPerUnit: null, unit: 'in' },
        zoom: 1, scrollTop: 0, scrollLeft: 0, currentPage: 1,
        color: '#FF0000', fontSize: 16, fontFamily: 'Arial',
        strokeWidth: 2, opacity: 100, activeTool: 'select',
        bold: false, italic: false, underline: false, strikethrough: false,
        textAlign: 'left', textBgColor: null, lineSpacing: 1.3,
        eraserRadius: 15, eraserMode: 'partial',
        activeHighlight: 'highlighter', activeDraw: 'pencil', activeText: 'text',
      }
      sessionStorage.setItem('mt-pdf-annotate-session', JSON.stringify(session))
    })
    // Reload the page and navigate to the tool
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
  })

  test('dismiss session banner removes it', async ({ page }) => {
    // Set up session data
    await page.evaluate(() => {
      const session = {
        version: 1,
        file: { fileName: 'test.pdf', fileSize: 100 },
        annotations: {}, measurements: {}, pageRotations: {},
        calibration: { pixelsPerUnit: null, unit: 'in' },
        zoom: 1, scrollTop: 0, scrollLeft: 0, currentPage: 1,
        color: '#FF0000', fontSize: 16, fontFamily: 'Arial',
        strokeWidth: 2, opacity: 100, activeTool: 'select',
        bold: false, italic: false, underline: false, strikethrough: false,
        textAlign: 'left', textBgColor: null, lineSpacing: 1.3,
        eraserRadius: 15, eraserMode: 'partial',
        activeHighlight: 'highlighter', activeDraw: 'pencil', activeText: 'text',
      }
      sessionStorage.setItem('mt-pdf-annotate-session', JSON.stringify(session))
    })
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
    // Dismiss the banner
    await page.locator('button[aria-label="Dismiss session banner"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Previous session found/')).toBeHidden()
  })

  test('session is restored when same file is re-uploaded after page reload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 250, y: 250, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    // Reload the page (session data persists in sessionStorage)
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    // Session banner should appear
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
    // Re-upload the same file — session should restore automatically
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // Session should have restored the annotations
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cleared session data does not show restore banner', async ({ page }) => {
    await clearSessionData(page)
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeHidden()
  })

  test('session stores current tool state', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.activeTool).toBe('pencil')
  })

  test('session stores zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.zoom).toBeGreaterThan(1)
  })

  test('session stores color preference', async ({ page }) => {
    await uploadPDFAndWait(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.color).toBeDefined()
    expect(typeof session.color).toBe('string')
  })
})

// ─── 8. Upload While Working ─────────────────────────────────────────────────

test.describe('New/Reset With Annotations', () => {
  test('New button with annotations shows discard confirm dialog', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    // Auto-dismiss to cancel — verify PDF stays loaded
    page.on('dialog', dialog => dialog.dismiss())
    await page.getByText('New').click()
    await page.waitForTimeout(200)
    // Still shows the PDF since we cancelled
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('accepting New discard returns to drop zone', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    // Should return to the upload drop zone
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('dismissing New keeps current PDF and annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    page.on('dialog', dialog => dialog.dismiss())
    await page.getByText('New').click()
    await page.waitForTimeout(200)
    // Should still show original file with annotation
    await expect(page.getByText('sample.pdf')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('after reset, can upload a new PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle')
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    // Now upload a different file
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
