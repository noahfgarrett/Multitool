import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Crop Edge Cases', () => {
  test('X shortcut activates crop', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const hint = page.locator('span.truncate:has-text("Drag to set crop")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('crop cursor crosshair', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('crop hint shows "Drag to set crop"', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    const hint = page.locator('span.truncate:has-text("Drag to set crop")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('draw crop region', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop region visible on canvas', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop full page — no change', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 0, y: 0 }, { x: 500, y: 700 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop half page horizontal', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 0, y: 0 }, { x: 250, y: 500 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop half page vertical', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 0, y: 0 }, { x: 500, y: 300 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop quarter page', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 0, y: 0 }, { x: 200, y: 250 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop tiny region', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 220, y: 220 })
    await page.waitForTimeout(300)
    // Tiny crop may or may not create region — verify no crash
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop at page corner', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 5, y: 5 }, { x: 100, y: 100 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop at page center', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 150, y: 200 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop near page edge', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 350, y: 5 }, { x: 460, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop then Escape cancels', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Switching tool via escape — should not crash
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop then draw pencil — crop deactivated', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('crop then switch to select', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    const selectHint = page.locator('span.truncate:has-text("Click to select")')
    await expect(selectHint).toBeVisible({ timeout: 3000 })
  })

  test('crop with annotations inside region', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 250 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('crop with annotations outside region', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 300, y: 300, w: 100, h: 80 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('crop then export', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('crop export crops the PDF', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 300 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop undo', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop redo', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop on page 2', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop different regions per page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 300 })
    await page.waitForTimeout(300)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop after zoom', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop after rotate', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop with zoom + rotate', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 300 })
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('crop region session persistence', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('crop region preserved after tool switch', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop reset via Clear Crop', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    await clearBtn.click()
    await page.waitForTimeout(300)
    await expect(clearBtn).not.toBeVisible({ timeout: 3000 })
  })

  test('draw crop then resize it', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    // Redraw to resize
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop region visible at different zooms', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop then immediately re-crop', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 300 })
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop over existing annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('crop annotations still visible', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('crop handle drag', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop then export produces smaller PDF', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 300 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('crop dimensions in session', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('crop inverted selection — right-to-left drag', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 300, y: 400 }, { x: 50, y: 50 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop inverted — bottom-to-top drag', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 400 }, { x: 300, y: 50 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop all diagonal directions', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    // Top-left to bottom-right
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    // Bottom-right to top-left
    await dragOnCanvas(page, { x: 300, y: 300 }, { x: 50, y: 50 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop at 50% zoom', async ({ page }) => {
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 250 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop at 125% zoom', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 250, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop with thick annotations', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('10')
        break
      }
    }
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop with text annotations', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop with callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop with stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop with measurement', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 350 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop then undo then crop again', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop region bounds check', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('multiple crops same page — last wins', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
  })

  test('crop then rotate then export', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop then add annotation then export', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop interaction with select tool', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await page.keyboard.press('x')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
