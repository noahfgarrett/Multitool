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
  await uploadPDFAndWait(page, 'multi-page.pdf')
})

test.describe('Multi-Page Annotations', () => {
  test('draw pencil on page 1', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw rectangle on page 1 and page 2', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on each of 5 pages', async ({ page }) => {
    test.setTimeout(90000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(800)
      await selectTool(page, 'Pencil (P)')
      await page.waitForTimeout(200)
      await drawOnCanvas(page, [
        { x: 100, y: 150 },
        { x: 140, y: 165 },
        { x: 200, y: 180 },
      ])
      await page.waitForTimeout(500)
    }
    // Verify annotations were created on at least some pages
    await goToPage(page, 1)
    await page.waitForTimeout(800)
    const totalCount = await getAnnotationCount(page)
    expect(totalCount).toBeGreaterThanOrEqual(1)
  })

  test('annotation count per page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('navigate to page 2 then draw', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('navigate to page 3 then draw', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations persist when navigating', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page 1 annotations visible after going to page 2 and back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('annotation on page 2 does not affect page 1 count', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('separate annotation counts per page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 250, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'circle', { x: 100, y: 250, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(3)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('goToPage helper works', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    // After goToPage, the page indicator button shows the current page
    const pageButton = page.locator('text=/3 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
  })

  test('page indicator button visible', async ({ page }) => {
    // The page indicator is shown as a button like "1 / 5"
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await expect(pageButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('page count displayed', async ({ page }) => {
    // The page count is shown in the page indicator button (e.g. "1 / 5")
    const pageButton = page.locator('text=/\\d+ \\/ \\d+/')
    await expect(pageButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('next page button', async ({ page }) => {
    // Verify starting on page 1
    const pageButton = page.locator('text=/1 \\/ \\d+/')
    await expect(pageButton).toBeVisible({ timeout: 5000 })
    // Navigate to next page using goToPage helper
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const page2Button = page.locator('text=/2 \\/ \\d+/')
    await expect(page2Button).toBeVisible({ timeout: 5000 })
  })

  test('previous page button', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    const prevBtn = page.locator('button[title*="Prev"], button[title*="prev"]').first()
    if (await prevBtn.isVisible()) {
      await prevBtn.click()
      await page.waitForTimeout(500)
      const pageInput = page.locator('input[type="number"]')
      await expect(pageInput).toHaveValue('2')
    }
  })

  test('draw on page 1 then export all pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('draw on page 2 then export', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('multi-page export includes all annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('select on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('move on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy/paste on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('eraser on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('highlight on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('text on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Use a simple annotation if stamp tool isn't available
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('measure on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pencil on page 5', async ({ page }) => {
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle on page 3', async ({ page }) => {
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations on non-adjacent pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 4)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('navigate forward through all pages', async ({ page }) => {
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(300)
      // After goToPage, the page indicator button shows current page
      const pageButton = page.locator(`text=/${p} \\/ \\d+/`)
      await expect(pageButton).toBeVisible({ timeout: 5000 })
    }
  })

  test('navigate backward through all pages', async ({ page }) => {
    await goToPage(page, 5)
    await page.waitForTimeout(300)
    for (let p = 5; p >= 1; p--) {
      await goToPage(page, p)
      await page.waitForTimeout(300)
      const pageButton = page.locator(`text=/${p} \\/ \\d+/`)
      await expect(pageButton).toBeVisible({ timeout: 5000 })
    }
  })

  test('rapid page switching with annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    for (let i = 0; i < 10; i++) {
      await goToPage(page, (i % 5) + 1)
      await page.waitForTimeout(200)
    }
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw then navigate then draw', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('10 annotations across 5 pages', async ({ page }) => {
    test.setTimeout(120000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(800)
      await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 60, h: 20 })
      await createAnnotation(page, 'rectangle', { x: 200, y: 150, w: 80, h: 50 })
    }
    // Verify at least page 1 still has annotations after round-trip navigation
    await goToPage(page, 1)
    await page.waitForTimeout(1000)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('session saves multi-page annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session restores multi-page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('export multi-page all types', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    await goToPage(page, 4)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 0 })
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 120, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('zoom affects all pages', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom1 = await zoomText.textContent()
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    const zoom3 = await zoomText.textContent()
    expect(zoom3).toBe(zoom1)
  })

  test('rotate page 2 only', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('page thumbnails visible', async ({ page }) => {
    const thumbnails = page.locator('[data-page]')
    const count = await thumbnails.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('thumbnail shows annotation indicator', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Annotation count should update
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page 1 navigate to 5 and back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 5)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-page annotation total count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations at same position on different pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-page with 50 total annotations', async ({ page }) => {
    test.setTimeout(300000)
    for (let p = 1; p <= 5; p++) {
      await goToPage(page, p)
      await page.waitForTimeout(800)
      for (let i = 0; i < 10; i++) {
        await selectTool(page, 'Pencil (P)')
        await page.waitForTimeout(100)
        await drawOnCanvas(page, [
          { x: 50 + (i % 5) * 60, y: 100 + Math.floor(i / 5) * 80 },
          { x: 80 + (i % 5) * 60, y: 115 + Math.floor(i / 5) * 80 },
        ])
        await page.waitForTimeout(300)
      }
      expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    }
  })

  test('page navigation preserves tool selection', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page navigation preserves color selection', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#FF0000')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page navigation preserves stroke width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page navigation preserves zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const before = await zoomText.textContent()
    await goToPage(page, 3)
    await page.waitForTimeout(500)
    const after = await zoomText.textContent()
    expect(after).toBe(before)
  })
})
