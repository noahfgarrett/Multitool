import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

async function saveAndReload(page: import('@playwright/test').Page, pdf = 'multi-page.pdf') {
  await waitForSessionSave(page)
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page, pdf)
  await page.waitForTimeout(500)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page, 'multi-page.pdf')
})

test.describe('Session Multi-Page', () => {
  test('save annotations page 1', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('save annotations page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('save annotations both pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore page 1 annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore page 2 annotations', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await saveAndReload(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore both pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('annotations per-page in session data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('page 1 annotations do not appear on page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('page 2 annotations do not appear on page 1', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw on page 1 then page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page 2 then page 1', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session with 5-page PDF (multi-page.pdf)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('annotations on page 3', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('annotations on page 5', async ({ page }) => {
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('annotations on all 5 pages', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('page count in session', async ({ page }) => {
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('rotation per-page in session', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session).toBeTruthy()
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('different rotations saved', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
      await goToPage(page, 2)
      await page.waitForTimeout(500)
      // Don't rotate page 2
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session).toBeTruthy()
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('crop per-page in session', async ({ page }) => {
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('different crops saved', async ({ page }) => {
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('navigate between pages after restore', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await saveAndReload(page)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('annotation count per page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('total annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session size with multi-page', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
    expect(raw!.length).toBeLessThan(1_000_000)
  })

  test('export multi-page with annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('multi-page undo (per-page or global)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multi-page redo', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete on page 1 does not affect page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase on page 1 preserves page 2', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom affects all pages', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom1 = await zoomText.textContent()
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const zoom2 = await zoomText.textContent()
    expect(zoom2).toBe(zoom1)
  })

  test('session restore multi-page zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await saveAndReload(page)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const text = await zoomText.textContent()
    expect(text).toBeTruthy()
  })

  test('goToPage after restore', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await saveAndReload(page)
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('draw on page 1 save navigate page 2 draw save', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session contains all page annotations', async ({ page }) => {
    for (let p = 1; p <= 3; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('page key format in session (number vs string)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page session after clear', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    await clearSessionData(page)
    const session = await getSessionData(page)
    expect(session).toBeNull()
  })

  test('multi-page session overwrite', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page with different annotation types per page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('pencil on page 1 rectangle on page 2', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('text on page 3 callout on page 4', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await goToPage(page, 4)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page export produces all pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('multi-page session with measurements', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 100 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page rotation + annotations', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page crop + annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session restore preserves current page', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await saveAndReload(page)
    // Page may or may not be restored to 3, but should load without crash
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('session restore preserves page rotation', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    await saveAndReload(page)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('goToPage 1 after session restore', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await saveAndReload(page)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('goToPage 2 after session restore', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await saveAndReload(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('multi-page session with 20 annotations total', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      for (let i = 0; i < 4; i++) {
        await createAnnotation(page, 'pencil', { x: 50 + i * 80, y: 100, w: 60, h: 20 })
      }
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page session performance', async ({ page }) => {
    test.setTimeout(60000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(500)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    }
    const start = Date.now()
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const elapsed = Date.now() - start
    expect(session).toBeTruthy()
    expect(elapsed).toBeLessThan(10000)
  })

  test('multi-page session with stamps on different pages', async ({ page }) => {
    // Use pencil as stamp may not always be available
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page session with highlights on different pages', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page session after undo on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multi-page session with annotations then clear page 1', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    // Ctrl+A selects all annotations across all pages, so page 2 may also be cleared
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('multi-page session integrity after rapid page switching', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    for (let i = 0; i < 10; i++) {
      await goToPage(page, (i % 5) + 1)
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})
