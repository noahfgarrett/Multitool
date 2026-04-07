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
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  resetWithConfirm,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Session Auto-Save ───────────────────────────────────────────────────────

test.describe('Session — Auto-Save Basics', () => {
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

  test('session data contains file metadata', async ({ page }) => {
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
    // Annotations record should have page 1 entry
    expect(data.annotations).toBeDefined()
  })

  test('session saves within ~2 seconds of change (1.5s debounce + margin)', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Wait less than debounce — session may not yet be saved
    await page.waitForTimeout(500)
    const earlyData = await getSessionData(page)
    // Wait for full debounce
    await page.waitForTimeout(1500)
    const lateData = await getSessionData(page)
    expect(lateData).not.toBeNull()
  })
})

test.describe('Session — Stored Data Fields', () => {
  test('session contains annotations record', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.annotations).toBeDefined()
    expect(typeof data.annotations).toBe('object')
  })

  test('session annotations contain the drawn annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    // Page 1 annotations should have at least 1 entry
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns).toBeDefined()
    expect(page1Anns.length).toBeGreaterThanOrEqual(1)
  })

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

  test('session contains color', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.color).toBe('string')
    expect(data.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('session contains fontSize', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.fontSize).toBe('number')
    expect(data.fontSize).toBeGreaterThan(0)
  })

  test('session contains fontFamily', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.fontFamily).toBe('string')
    expect(data.fontFamily.length).toBeGreaterThan(0)
  })

  test('session contains strokeWidth', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.strokeWidth).toBe('number')
  })

  test('session contains opacity', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.opacity).toBe('number')
  })

  test('session contains activeTool', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.activeTool).toBe('string')
    expect(data.activeTool).toBe('select') // default
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

  test('session contains textAlign', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.textAlign).toBe('string')
  })

  test('session contains lineSpacing', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.lineSpacing).toBe('number')
  })

  test('session contains eraserRadius', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.eraserRadius).toBe('number')
  })

  test('session contains eraserMode', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.eraserMode).toBe('string')
  })

  test('session contains pageRotations', async ({ page }) => {
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

  test('session contains measurements', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.measurements).toBe('object')
  })

  test('session contains scrollTop and scrollLeft', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.scrollTop).toBe('number')
    expect(typeof data.scrollLeft).toBe('number')
  })

  test('session contains textBgColor', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    // textBgColor defaults to null
    expect(data.textBgColor === null || typeof data.textBgColor === 'string').toBe(true)
  })

  test('session contains activeHighlight', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.activeHighlight).toBe('string')
  })

  test('session contains activeDraw', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.activeDraw).toBe('string')
  })

  test('session contains activeText', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(typeof data.activeText).toBe('string')
  })
})

test.describe('Session — State Changes Persist', () => {
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
    // pageRotations should have entry for page 1 = 90
    const rot = data.pageRotations['1'] || data.pageRotations[1]
    expect(rot).toBe(90)
  })

  test('changing zoom updates session zoom', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Zoom in
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.zoom).toBeGreaterThan(1.0)
  })

  test('bold toggle persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    // Toggle bold
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.bold).toBe(true)
  })

  test('italic toggle persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.italic).toBe(true)
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

  test('font size change persists to session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.fontSize).toBe(24)
  })
})

test.describe('Session — Restore Flow', () => {
  test('session restore banner appears when session exists and no PDF loaded', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Navigate away and back to trigger empty state
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    // Banner should show the previous session
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
  })

  test('restore banner shows filename from previous session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/sample\\.pdf/')).toBeVisible({ timeout: 5000 })
  })

  test('dismissing restore banner clears session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await expect(page.locator('text=/Previous session found/')).toBeVisible({ timeout: 5000 })
    // Click dismiss button (X button with aria-label)
    await page.locator('button[aria-label="Dismiss session banner"]').click()
    await page.waitForTimeout(300)
    // Banner should be gone
    await expect(page.locator('text=/Previous session found/')).toBeHidden()
    // Session should be cleared
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })

  test('re-uploading same file restores annotations from session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    // Reload to simulate re-uploading
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    // Re-upload the same file
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    // Annotations should be restored
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session restore preserves zoom level', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Zoom in
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const originalData = await getSessionData(page)
    const originalZoom = originalData.zoom
    // Reload and re-upload
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
    // Reload and re-upload
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.waitForTimeout(500)
    // Rotation indicator should show 90 degrees
    await expect(page.locator('text=/90°/')).toBeVisible()
  })
})

test.describe('Session — Clear and Reset', () => {
  test('New button clears all annotations and session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Click "New" button — this triggers a native confirm dialog
    await resetWithConfirm(page)
    // Should return to empty state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    // Session should be cleared
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })

  test('clearing session manually results in null getSessionData', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    expect(await getSessionData(page)).not.toBeNull()
    await clearSessionData(page)
    expect(await getSessionData(page)).toBeNull()
  })

  test('empty session returns null from getSessionData', async ({ page }) => {
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })
})

test.describe('Session — Edge Cases', () => {
  test('session version is always 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.version).toBe(1)
  })

  test('multiple rapid changes only save final state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Make multiple rapid changes
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 350, y: 50, w: 80, h: 50 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns.length).toBe(3)
  })

  test('session persists after tool switch and return', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Switch to another tool and back
    await navigateToTool(page, 'pdf-merge')
    await page.waitForTimeout(500)
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(500)
    // Session data should still exist
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('uploading a different file does not restore previous session', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Reload and upload a different file
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'single-page.pdf')
    await page.waitForTimeout(500)
    // Annotations should not be restored (file mismatch)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('session save after zoom change updates zoom field', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const data1 = await getSessionData(page)
    const initialZoom = data1.zoom
    // Zoom in
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data2 = await getSessionData(page)
    expect(data2.zoom).not.toBe(initialZoom)
    expect(data2.zoom).toBeGreaterThan(initialZoom)
  })

  test('session save after stroke width change', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    // Adjust stroke width via slider
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('10')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.strokeWidth).toBe(10)
  })

  test('session save after opacity change', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    // Find the opacity slider (second range input)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('50')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.opacity).toBe(50)
  })

  test('session contains underline flag after toggling', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.underline).toBe(true)
  })

  test('session correctly tracks eraser mode changes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Eraser (E)')
    // Switch to object mode
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.eraserMode).toBe('object')
  })

  test('session correctly tracks eraser radius changes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Eraser (E)')
    const sizeSlider = page.locator('input[type="range"]').first()
    await sizeSlider.fill('30')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.eraserRadius).toBe(30)
  })

  test('session text align persists correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.textAlign).toBe('center')
  })

  test('session line spacing persists correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.lineSpacing).toBe(2)
  })

  test('session save handles multiple pages of annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Navigate to page 2
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    const page2Anns = data.annotations['2'] || data.annotations[2]
    expect(page1Anns.length).toBe(1)
    expect(page2Anns.length).toBe(1)
  })

  test('re-uploading same file after session restore preserves tool settings', async ({ page }) => {
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
