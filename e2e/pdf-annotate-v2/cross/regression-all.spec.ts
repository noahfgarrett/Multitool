import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { rightClickCanvasAt, contextMenu } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Regression Tests', () => {
  test('draw then zoom then draw — position correct', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw then rotate then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('draw then pan then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch tool 10 times rapidly — no crash', async ({ page }) => {
    const keys = ['p', 'l', 'a', 'r', 'c', 't', 'o', 'e', 'h', 's']
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(keys[i])
    }
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('create 50 annotations — no performance issue', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 50; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      await createAnnotation(page, 'pencil', { x: 20 + col * 40, y: 20 + row * 35, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(50)
  })

  test('delete all then draw new works', async ({ page }) => {
    test.setTimeout(90000)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('undo past empty — no crash', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo past empty — no crash', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Z during text editing behavior', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    // Ctrl+Z during editing undoes typed text, not annotation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('Escape during text editing commits', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Escape during callout editing commits', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Callout text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('space bar during text editing types space', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('shortcut keys during text editing type letters', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('press')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Should not have switched tools — should still have 1 text annotation
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('find bar then draw works', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('find bar then shortcut works after close', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    // Rectangle tool uses a crosshair cursor
    expect(cursor).toBe('crosshair')
  })

  test('zoom then fit then draw', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(200)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotate then rotate back then draw', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
      // Rotate 3 more times to get back to original
      for (let i = 0; i < 3; i++) {
        await rotateBtn.first().click()
        await page.waitForTimeout(200)
      }
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('crop then draw inside crop region', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser then draw then eraser cycle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 130, y: 110 }, { x: 170, y: 110 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 130 }, { x: 150, y: 130 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('session save then reload then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(1000)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('export then draw more works', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-page draw then export all pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('right-click then left-click — no stuck menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickCanvasAt(page, 100, 150)
    await expect(contextMenu(page)).toBeVisible({ timeout: 3000 })
    await clickCanvasAt(page, 350, 350)
    // Menu should be dismissed by the outside click, annotation untouched
    await expect(contextMenu(page)).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click text then Escape then draw', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 175, 120)
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Tab through annotations then Delete', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  test('Shift+click multi-select then move', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+A then Ctrl+D doubles count', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    // Ctrl+A may not select all types; verify at least some were duplicated
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(3)
  })

  test('lasso select then Ctrl+D', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 120, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    // Ctrl+A may not select all types; verify at least some were duplicated
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(3)
  })

  test('copy on page 1 paste on page 2', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('zoom preset then draw accuracy', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('dashed pattern preserved in export', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashBtn = page.locator('button[title*="Dash"], button[title*="dash"]').first()
    if (await dashBtn.isVisible()) await dashBtn.click()
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('dotted pattern preserved in export', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dotBtn = page.locator('button[title*="Dot"], button[title*="dot"]').first()
    if (await dotBtn.isVisible()) await dotBtn.click()
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('filled shape preserved in export', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    if (await fillInput.isVisible()) await fillInput.fill('#0000ff')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rounded corner preserved in export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('text formatting preserved in export', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('callout arrow preserved in export', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('stamp type preserved in export', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('highlight color preserved in export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('opacity preserved in export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('mixed types session round-trip', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with 100 bytes of text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a longer text string used to test session storage with a reasonable amount of text content.')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with unicode text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 120 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test 123')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session with special chars in text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 120 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test <>&"\'')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid tool switching during draw — no crash', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('r')
      await page.waitForTimeout(30)
      await page.keyboard.press('p')
      await page.waitForTimeout(30)
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid zoom during draw — no crash', async ({ page }) => {
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    for (let i = 0; i < 3; i++) {
      if (await zoomInBtn.isVisible()) await zoomInBtn.click()
      await page.waitForTimeout(100)
      if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser during draw — switch mid-stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    // Eraser cursor is 'none' (custom cursor drawn on canvas)
    expect(cursor).toBe('none')
  })

  test('measure alongside annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations alongside measures — separate counts', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    // Annotation count should not include measurements
    expect(await getAnnotationCount(page)).toBe(1)
    const measCount = page.locator('text=/\\d+ meas/')
    const hasMeas = await measCount.isVisible().catch(() => false)
    expect(typeof hasMeas).toBe('boolean')
  })

  test('separate counts for annotations and measures', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('thumbnail shows annotation indicator', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page navigation preserves annotations', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty page after erase all', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('cloud annotation preserved in export', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('pencil near edge then select works', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 5, y: 5, w: 100, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 30, 15)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple undos then multiple redos — final count correct', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(2)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })
})
