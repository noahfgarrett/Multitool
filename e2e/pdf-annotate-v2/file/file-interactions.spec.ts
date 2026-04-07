import { test, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, exportPDF,
  goToPage, waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

test.describe('File Interactions — Initial State Before Upload', () => {
  test('upload drop zone is visible before PDF upload', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('canvas is not visible before PDF upload', async ({ page }) => {
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('file input is attached before PDF upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })
})

test.describe('File Interactions — Upload sample.pdf', () => {
  test('upload sample.pdf shows canvas', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('upload sample.pdf hides drop zone', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('Drop a PDF file here')).toBeHidden()
  })
})

test.describe('File Interactions — Upload multi-page.pdf', () => {
  test('upload multi-page.pdf shows canvas', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('upload multi-page.pdf renders multiple canvases', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const canvases = page.locator('canvas')
    const count = await canvases.count()
    // Multi-page PDF has 2 canvases per page (pdf + annotation)
    expect(count).toBeGreaterThanOrEqual(4)
  })
})

test.describe('File Interactions — Upload Then Annotate Then Re-upload', () => {
  test('annotations are cleared when uploading a new file', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await uploadPDFAndWait(page, 'single-page.pdf')
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('new file name displayed after re-upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible()
  })
})

test.describe('File Interactions — File Name Display', () => {
  test('sample.pdf file name is displayed after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  test('multi-page.pdf file name is displayed after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await expect(page.getByText('multi-page.pdf')).toBeVisible()
  })
})

test.describe('File Interactions — Page Count Display', () => {
  test('page count indicator visible after multi-page upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    // The page indicator is a button showing "1 / N"
    const pageButton = page.locator('button', { hasText: /\d+\s*\/\s*\d+/ })
    await expect(pageButton.first()).toBeVisible({ timeout: 3000 })
  })

  test('page input shows page 1 after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    // The page indicator button shows "1 / N" text
    const pageButton = page.locator('button', { hasText: /\d+\s*\/\s*\d+/ })
    await expect(pageButton.first()).toBeVisible({ timeout: 3000 })
    const text = await pageButton.first().textContent()
    expect(text).toMatch(/^1\s*\//)
  })
})

test.describe('File Interactions — Page Navigation After Upload', () => {
  test('navigate to page 2 after multi-page upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    // After navigation, the page button shows "2 / N"
    const pageButton = page.locator('button', { hasText: /\d+\s*\/\s*\d+/ })
    await expect(pageButton.first()).toBeVisible({ timeout: 3000 })
    const text = await pageButton.first().textContent()
    expect(text).toMatch(/^2\s*\//)
  })

  test('draw on page 2 after navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

test.describe('File Interactions — Upload Then Zoom Then Draw', () => {
  test('zoom in then draw rectangle annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom in then draw pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('File Interactions — Upload Then Rotate Then Draw', () => {
  test('rotate page then draw annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const rotateBtn = page.locator('button[title*="Rotate"]')
    const hasRotate = await rotateBtn.first().isVisible().catch(() => false)
    if (hasRotate) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('rotate page then draw pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    const rotateBtn = page.locator('button[title*="Rotate"]')
    const hasRotate = await rotateBtn.first().isVisible().catch(() => false)
    if (hasRotate) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

test.describe('File Interactions — Upload Then Export Then Draw More', () => {
  test('export then draw more annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('export preserves canvas state for continued drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible()
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

test.describe('File Interactions — Session Persistence', () => {
  test('session data saved after upload and annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.annotations).toBeDefined()
  })

  test('session persists file info after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.file).toBeDefined()
    expect(data.file.fileName).toBe('sample.pdf')
  })
})

test.describe('File Interactions — Toolbar Visible After Upload', () => {
  test('toolbar buttons visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Pencil tool button should be visible
    const pencilBtn = page.locator('button[title="Pencil (P)"]')
    await expect(pencilBtn).toBeVisible()
  })

  test('select tool button visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toBeVisible()
  })

  test('export button visible after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeVisible()
  })
})

test.describe('File Interactions — Canvas Dimensions', () => {
  test('canvas has reasonable width and height', async ({ page }) => {
    await uploadPDFAndWait(page)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(50)
    expect(box!.height).toBeGreaterThan(50)
  })

  test('annotation canvas dimensions match PDF canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    const pdfCanvas = page.locator('canvas').nth(0)
    const annCanvas = page.locator('canvas').nth(1)
    const pdfBox = await pdfCanvas.boundingBox()
    const annBox = await annCanvas.boundingBox()
    expect(pdfBox).toBeTruthy()
    expect(annBox).toBeTruthy()
    // Both canvases should have the same dimensions (or very close)
    expect(Math.abs(pdfBox!.width - annBox!.width)).toBeLessThan(5)
    expect(Math.abs(pdfBox!.height - annBox!.height)).toBeLessThan(5)
  })
})

test.describe('File Interactions — Status Bar Page Info', () => {
  test('status bar shows annotation count after upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    const statusText = page.locator('text=/\\d+ ann/')
    await expect(statusText).toBeVisible({ timeout: 3000 })
  })

  test('status bar updates annotation count after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
  })
})

test.describe('File Interactions — Multiple File Operations', () => {
  test('reload page then re-upload works', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.reload()
    await page.waitForTimeout(1000)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('reset then re-upload then draw works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await uploadPDFAndWait(page, 'single-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('File Interactions — Annotations Across Pages', () => {
  test('annotations on page 1 persist after navigating to page 2 and back', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on multiple pages and verify counts', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

test.describe('File Interactions — Large PDF Behavior', () => {
  test('large PDF loads within timeout and canvas renders', async ({ page }) => {
    const start = Date.now()
    await uploadPDFAndWait(page, 'sample.pdf')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(15000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })
})
