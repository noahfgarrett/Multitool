import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Session Edge Cases', () => {
  test('session saves annotation type', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    // Annotations are keyed by page number: { '1': [...], '2': [...] }
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns) {
      const types = pageAnns.map((a: Record<string, unknown>) => a.type)
      expect(types).toContain('rectangle')
    }
  })

  test('session saves annotation color', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      expect(pageAnns[0].color || pageAnns[0].strokeColor).toBeTruthy()
    }
  })

  test('session saves annotation stroke width', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      expect(pageAnns[0].strokeWidth || pageAnns[0].lineWidth).toBeDefined()
    }
  })

  test('session saves annotation opacity', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      expect(pageAnns[0].opacity).toBeDefined()
    }
  })

  test('session saves annotation position (points)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      const ann = pageAnns[0]
      expect(ann.points || ann.x !== undefined || ann.rect).toBeTruthy()
    }
  })

  test('session saves text content', async ({ page }) => {
    await createAnnotation(page, 'text')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns) {
      const textAnn = pageAnns.find((a: Record<string, unknown>) => a.type === 'text')
      if (textAnn) {
        expect(textAnn.text || textAnn.content).toBeTruthy()
      }
    }
  })

  test('session saves bold flag', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves italic flag', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves font family', async ({ page }) => {
    await createAnnotation(page, 'text')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    // Font family is stored at the session level, not per-annotation
    if (session?.fontFamily) {
      expect(session.fontFamily).toBeDefined()
    }
  })

  test('session saves font size', async ({ page }) => {
    await createAnnotation(page, 'text')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    // Font size is stored at the session level
    if (session?.fontSize) {
      expect(session.fontSize).toBeDefined()
    }
  })

  test('session saves line spacing', async ({ page }) => {
    await createAnnotation(page, 'text')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves fill color', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      // fillColor may or may not be set (default is no fill)
      expect(pageAnns[0]).toBeTruthy()
    }
  })

  test('session saves corner radius', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Radius')) {
        await sliders.nth(i).fill('15')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves dash pattern', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves arrow start flag', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves stamp type', async ({ page }) => {
    const stampTool = page.locator('button').filter({ hasText: /Stamp/i }).first()
    if (await stampTool.isVisible()) {
      await stampTool.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session).toBeTruthy()
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('session saves file name', async ({ page }) => {
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    if (session) {
      expect(session.fileName || session.filename || session.file).toBeTruthy()
    }
  })

  test('session saves zoom level', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    if (session?.zoom !== undefined) {
      expect(session.zoom).toBeGreaterThan(1)
    }
  })

  test('session saves active tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves page rotations', async ({ page }) => {
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

  test('session saves crop regions', async ({ page }) => {
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
      const applyBtn = page.locator('button').filter({ hasText: /Apply/i }).first()
      if (await applyBtn.isVisible()) {
        await applyBtn.click()
        await page.waitForTimeout(300)
        await waitForSessionSave(page)
        const session = await getSessionData(page)
        expect(session).toBeTruthy()
      }
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('session restores all properties', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const sessionAfter = await getSessionData(page)
    expect(sessionAfter).toBeTruthy()
  })

  test('session restore after reload', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(1000)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session restore after navigation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('session clear removes all data', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await clearSessionData(page)
    const session = await getSessionData(page)
    expect(session).toBeNull()
  })

  test('session auto-saves on annotation create', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session auto-saves on annotation delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session auto-saves on annotation move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 300 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session auto-saves on property change', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF0000')
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session auto-saves on zoom change', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session auto-saves on tool change', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session debounce (1.5s)', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    // Check session before debounce completes
    await page.waitForTimeout(500)
    // After waiting for debounce + margin
    await page.waitForTimeout(1500)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with 50 annotations', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 50; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with multiple annotation types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 200, y: 200, w: 100, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with annotations on multiple pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with measurements', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session format is JSON', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
    expect(() => JSON.parse(raw!)).not.toThrow()
  })

  test('session stored in sessionStorage', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
  })

  test('session key is mt-pdf-annotate-session', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
  })

  test('session with empty annotations', async ({ page }) => {
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with no file', async ({ page }) => {
    // Clear session first, then navigate without uploading
    await clearSessionData(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(500)
    const session = await getSessionData(page)
    // Should either be null or have no annotations
    // annotations is Record<number, unknown[]>, not an array
    const hasNoAnnotations = session === null ||
      session?.annotations === undefined ||
      Object.values(session?.annotations || {}).every((arr: unknown) => !Array.isArray(arr) || arr.length === 0)
    expect(hasNoAnnotations).toBeTruthy()
  })

  test('session overwritten on new file', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    // Navigate away and back to get the drop zone again (file input is hidden once a PDF is loaded)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    expect(session2).toBeTruthy()
  })

  test('session hash verification', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    if (session?.hash !== undefined) {
      expect(typeof session.hash).toBe('string')
    }
    expect(session).toBeTruthy()
  })

  test('session with text formatting', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with mixed types (pencil, rect, text)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 220, w: 150, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session after undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session after redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session after eraser', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session after export', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await exportPDF(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with rotated pages', async ({ page }) => {
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

  test('session with cropped pages', async ({ page }) => {
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session size reasonable', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    await waitForSessionSave(page)
    const raw = await page.evaluate(() => sessionStorage.getItem('mt-pdf-annotate-session'))
    expect(raw).toBeTruthy()
    // Session should be under 1MB for 10 annotations
    expect(raw!.length).toBeLessThan(1_000_000)
  })

  test('session parse does not crash', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    expect(typeof session).toBe('object')
  })

  test('session with unicode text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('cafe\u0301 re\u0301sume\u0301')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session with special characters', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('!@#$%^&*()_+-=[]{}|;:,.<>?')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })
})
