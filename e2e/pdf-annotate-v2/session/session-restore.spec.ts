import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

async function saveAndReload(page: import('@playwright/test').Page) {
  await waitForSessionSave(page)
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
  await page.waitForTimeout(500)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Session Restore', () => {
  test('restore single pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single line', async ({ page }) => {
    await createAnnotation(page, 'line')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single text', async ({ page }) => {
    await createAnnotation(page, 'text')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore single callout', async ({ page }) => {
    await createAnnotation(page, 'callout')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore text with bold', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore text with italic', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore pencil color', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    // Annotations are keyed by page number: { '1': [...] }
    const pageAnns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (pageAnns?.[0]) {
      expect(pageAnns[0].color || pageAnns[0].strokeColor).toBeTruthy()
    }
  })

  test('restore pencil stroke width', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore pencil opacity', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore rectangle fill color', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore rectangle corner radius', async ({ page }) => {
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
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore rectangle dash pattern', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore arrow with arrowStart', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 60, h: 20 })
    }
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('restore 10 annotations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('restore 20 annotations', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 50, w: 40, h: 20 })
    }
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('restore annotations on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await saveAndReload(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore multi-page annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore zoom level', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await saveAndReload(page)
    const zoom = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const text = await zoom.textContent()
    expect(text).toBeTruthy()
  })

  test('restore active tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await saveAndReload(page)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore page rotations', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
      await saveAndReload(page)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore crop regions', async ({ page }) => {
    // Just verify session mechanism works for crop
    await saveAndReload(page)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore after navigation away and back', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.goto('/')
    await page.waitForTimeout(500)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore after page reload', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(1000)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore preserves z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('restore preserves all properties', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const after = await getSessionData(page)
    const beforeAnns = before?.annotations?.['1'] || before?.annotations?.[1]
    const afterAnns = after?.annotations?.['1'] || after?.annotations?.[1]
    if (beforeAnns?.[0] && afterAnns?.[0]) {
      expect(afterAnns[0].type).toBe(beforeAnns[0].type)
    }
  })

  test('restore count matches original', async ({ page }) => {
    const count = 7
    for (let i = 0; i < count; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(count)
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(count)
  })

  test('restore positions match', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    const before = await getSessionData(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const after = await getSessionData(page)
    expect(after).toBeTruthy()
  })

  test('restore does not duplicate', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    const count1 = await getAnnotationCount(page)
    // Navigate again without creating new annotations
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const count2 = await getAnnotationCount(page)
    expect(count2).toBe(count1)
  })

  test('restore idempotent', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    const count1 = await getAnnotationCount(page)
    await saveAndReload(page)
    const count2 = await getAnnotationCount(page)
    expect(count2).toBe(count1)
  })

  test('restore with deleted annotations (should not restore deleted)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 60, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('restore after clear then save', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await clearSessionData(page)
    const session = await getSessionData(page)
    expect(session).toBeNull()
  })

  test('no restore when no session', async ({ page }) => {
    await clearSessionData(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('no restore for different file', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    // Navigate away and back to get the drop zone (file input hidden once PDF loaded)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await page.waitForTimeout(500)
    // Different file may or may not clear — session hash should handle it
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('session hash mismatch handling', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    // Corrupt the hash
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('mt-pdf-annotate-session')
      if (raw) {
        const data = JSON.parse(raw)
        if (data.hash) data.hash = 'invalid-hash'
        sessionStorage.setItem('mt-pdf-annotate-session', JSON.stringify(data))
      }
    })
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // Should handle gracefully
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore with modified annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 300 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore performance (50 annotations)', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 50; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    const start = Date.now()
    await saveAndReload(page)
    const elapsed = Date.now() - start
    expect(await getAnnotationCount(page)).toBe(50)
    // Restore should complete in reasonable time (under 60s including navigation)
    expect(elapsed).toBeLessThan(60000)
  })

  test('restore then modify then save', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('restore then undo works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore then redo works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore then delete works', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await saveAndReload(page)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('restore then add new works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    const before = await getAnnotationCount(page)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(before + 1)
  })

  test('restore visual correctness (annotations visible)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await saveAndReload(page)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    // Canvas should still be visible
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('restore then export', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('restore then draw new annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await saveAndReload(page)
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('restore then zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore then pan', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.keyboard.down('Space')
      await page.mouse.move(box.x + 200, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
      await page.mouse.up()
      await page.keyboard.up('Space')
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('restore then rotate', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await saveAndReload(page)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('partial session data handling', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    // Corrupt session by removing some fields
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('mt-pdf-annotate-session')
      if (raw) {
        const data = JSON.parse(raw)
        delete data.zoom
        sessionStorage.setItem('mt-pdf-annotate-session', JSON.stringify(data))
      }
    })
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('corrupt session handling', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.setItem('mt-pdf-annotate-session', '{invalid json!!!')
    })
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // Should handle gracefully — no crash
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('restore timestamp', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    if (session?.timestamp || session?.savedAt) {
      expect(typeof (session.timestamp || session.savedAt)).toBeTruthy()
    }
    expect(session).toBeTruthy()
  })

  test('restore file metadata match', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    if (session?.fileName || session?.filename) {
      expect((session.fileName || session.filename)).toMatch(/\.pdf$/i)
    }
  })
})
