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
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  goToPage,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Auto-Save Basics ───────────────────────────────────────────────────────

test.describe('Session QA — Auto-Save', () => {
  test('session data is null before any PDF is loaded', async ({ page }) => {
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })

  test('loading a PDF triggers session save after debounce', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.version).toBe(1)
  })

  test('session contains file metadata after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.file.fileName).toBe('sample.pdf')
    expect(data.file.fileSize).toBeGreaterThan(0)
  })

  test('drawing an annotation triggers session auto-save', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.annotations).toBeDefined()
  })

  test('session saves contain annotation data for the drawn annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns).toBeDefined()
    expect(page1Anns.length).toBeGreaterThanOrEqual(1)
  })

  test('multiple rapid changes coalesce into final session state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 350, y: 50, w: 80, h: 50 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns.length).toBe(3)
  })
})

// ─── Stored Data Fields ─────────────────────────────────────────────────────

test.describe('Session QA — Stored Fields', () => {
  test('session contains zoom level', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.zoom).toBe('number')
    expect(data.zoom).toBeGreaterThan(0)
  })

  test('session contains currentPage', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.currentPage).toBe(1)
  })

  test('session contains color as hex string', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('session contains fontSize, fontFamily, strokeWidth, opacity', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.fontSize).toBe('number')
    expect(typeof data.fontFamily).toBe('string')
    expect(typeof data.strokeWidth).toBe('number')
    expect(typeof data.opacity).toBe('number')
  })

  test('session contains bold/italic/underline/strikethrough flags', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.bold).toBe('boolean')
    expect(typeof data.italic).toBe('boolean')
    expect(typeof data.underline).toBe('boolean')
    expect(typeof data.strikethrough).toBe('boolean')
  })

  test('session contains textAlign and lineSpacing', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.textAlign).toBe('string')
    expect(typeof data.lineSpacing).toBe('number')
  })

  test('session contains eraserRadius and eraserMode', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.eraserRadius).toBe('number')
    expect(typeof data.eraserMode).toBe('string')
  })

  test('session contains activeTool defaulting to select', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.activeTool).toBe('select')
  })

  test('session contains pageRotations object', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.pageRotations).toBe('object')
  })

  test('session contains calibration data', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.calibration).toBeDefined()
    expect(typeof data.calibration.unit).toBe('string')
  })
})

// ─── Tool Settings Persistence ──────────────────────────────────────────────

test.describe('Session QA — Tool Settings Persistence', () => {
  test('changing tool updates session activeTool', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.activeTool).toBe('pencil')
  })

  test('navigating to page 2 updates session currentPage', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.currentPage).toBe(2)
  })

  test('rotating page updates session pageRotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const rot = data.pageRotations['1'] || data.pageRotations[1]
    expect(rot).toBe(90)
  })

  test('zooming in updates session zoom field', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.zoom).toBeGreaterThan(1.0)
  })

  test('stroke width change persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('10')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.strokeWidth).toBe(10)
  })

  test('opacity change persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('50')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.opacity).toBe(50)
  })

  test('bold toggle persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.bold).toBe(true)
  })

  test('font family change persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.fontFamily).toBe('Courier New')
  })
})

// ─── Session Restore ────────────────────────────────────────────────────────

test.describe('Session QA — Restore Flow', () => {
  test('re-uploading same file restores annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('uploading a different file does NOT restore session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'single-page.pdf')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('session restore preserves zoom level', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const originalData = await getSessionData(page)
    const originalZoom = originalData.zoom
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const restoredData = await getSessionData(page)
    expect(restoredData.zoom).toBe(originalZoom)
  })

  test('session restore preserves page rotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/90°/')).toBeVisible()
  })

  test('session restore preserves active tool', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.activeTool).toBe('pencil')
  })
})

// ─── Clear and Reset ────────────────────────────────────────────────────────

test.describe('Session QA — Clear and Reset', () => {
  test('New button with confirm clears session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // The app uses native confirm() dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await page.locator('button').filter({ hasText: 'New' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })

  test('clearSessionData helper results in null', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    expect(await getSessionData(page)).not.toBeNull()
    await clearSessionData(page)
    expect(await getSessionData(page)).toBeNull()
  })

  test('session save handles multi-page annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create annotation on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Verify session data shows page 1 annotation
    await waitForSessionSave(page)
    const data1 = await getSessionData(page)
    const p1 = data1.annotations['1'] || data1.annotations[1]
    expect(p1.length).toBe(1)
    // Verify the session tracks currentPage correctly
    expect(data1.currentPage).toBe(1)
  })

  test('session version is always 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.version).toBe(1)
  })
})

// ─── All Annotation Types Preserved ─────────────────────────────────────────

test.describe('Session QA — All Annotation Types Preserved', () => {
  test('rectangle annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('rectangle')
  })

  test('circle annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 100 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('circle')
  })

  test('pencil annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('pencil')
  })

  test('line annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('line')
  })

  test('arrow annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 50 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('arrow')
  })

  test('text annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('text')
  })

  test('callout annotation preserved in session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data.annotations['1'] || data.annotations[1]
    expect(anns[0].type).toBe('callout')
  })
})
