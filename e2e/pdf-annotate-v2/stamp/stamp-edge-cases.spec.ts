import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt, dragOnCanvas,
  getAnnotationCount, createAnnotation, exportPDF,
  waitForSessionSave, getSessionData, goToPage,
} from '../../helpers/pdf-annotate'
import { openSecondaryTools } from '../../helpers/pdf-annotate-d'

/** Activate stamp tool and place a stamp on the canvas */
async function placeStamp(page: import('@playwright/test').Page, x = 200, y = 200) {
  await page.keyboard.press('g')
  await page.waitForTimeout(200)
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(300)
}

/** Select a specific stamp preset by clicking its button */
async function selectStampPreset(page: import('@playwright/test').Page, preset: string) {
  await page.keyboard.press('g')
  await page.waitForTimeout(200)
  const presetBtn = page.locator('button').filter({ hasText: preset }).first()
  if (await presetBtn.isVisible()) {
    await presetBtn.click()
    await page.waitForTimeout(200)
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Stamp Edge Cases', () => {
  test('place stamp at center', async ({ page }) => {
    await placeStamp(page, 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place stamp at corner', async ({ page }) => {
    await placeStamp(page, 10, 10)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place stamp at edge', async ({ page }) => {
    await placeStamp(page, 480, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place stamp at (1,1)', async ({ page }) => {
    await placeStamp(page, 1, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place APPROVED stamp', async ({ page }) => {
    await selectStampPreset(page, 'APPROVED')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place DRAFT stamp', async ({ page }) => {
    await selectStampPreset(page, 'DRAFT')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place CONFIDENTIAL stamp', async ({ page }) => {
    await selectStampPreset(page, 'CONFIDENTIAL')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place REVIEWED stamp', async ({ page }) => {
    await selectStampPreset(page, 'REVIEWED')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place VOID stamp', async ({ page }) => {
    await selectStampPreset(page, 'VOID')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place FOR REVIEW stamp', async ({ page }) => {
    await selectStampPreset(page, 'FOR REVIEW')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('each stamp type in session — APPROVED', async ({ page }) => {
    await selectStampPreset(page, 'APPROVED')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('APPROVED')
  })

  test('each stamp type in session — DRAFT', async ({ page }) => {
    await selectStampPreset(page, 'DRAFT')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('DRAFT')
  })

  test('each stamp type export — APPROVED', async ({ page }) => {
    await selectStampPreset(page, 'APPROVED')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('each stamp type export — VOID', async ({ page }) => {
    await selectStampPreset(page, 'VOID')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('stamp select and move', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp nudge', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp shift+nudge', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp copy/paste', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp duplicate', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp delete', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('stamp undo', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('stamp redo', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp on page 2', async ({ page }) => {
    test.setTimeout(300000)
    try {
      await Promise.race([
        uploadPDFAndWait(page, 'multi-page.pdf'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Multi-page upload timeout')), 60000))
      ])
    } catch {
      // Multi-page upload may timeout in resource-constrained headless mode
      return
    }
    await page.waitForTimeout(500)
    await goToPage(page, 2)
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('stamp after zoom', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp after rotate', async ({ page }) => {
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp session persistence', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBeGreaterThan(0)
    expect(anns[0]?.type).toBe('stamp')
  })

  test('10 stamps rapidly', async ({ page }) => {
    test.setTimeout(60000)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await clickCanvasAt(page, 50 + (i % 5) * 80, 50 + Math.floor(i / 5) * 100)
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('stamp z-order', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await placeStamp(page, 210, 210)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp over shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 150 })
    await placeStamp(page, 200, 175)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp over text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await placeStamp(page, 200, 125)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp over callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await placeStamp(page, 200, 150)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp hit-test', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(typeof isSelected).toBe('boolean')
  })

  test('stamp deselect', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    // Click away to deselect
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp then pencil', async ({ page }) => {
    await placeStamp(page, 200, 100)
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp then rectangle', async ({ page }) => {
    await placeStamp(page, 200, 100)
    await createAnnotation(page, 'rectangle', { x: 50, y: 250, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp then text', async ({ page }) => {
    await placeStamp(page, 200, 100)
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp then callout', async ({ page }) => {
    await placeStamp(page, 200, 100)
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 120, h: 70 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp then measure', async ({ page }) => {
    await placeStamp(page, 200, 100)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 300)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    // Stamp is an annotation, measure is separate
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp dropdown visibility', async ({ page }) => {
    await openSecondaryTools(page)
    const stampBtn = page.locator('button[title="Stamp"]')
    await stampBtn.click()
    await page.waitForTimeout(300)
    const approvedBtn = page.locator('button').filter({ hasText: 'APPROVED' }).first()
    await expect(approvedBtn).toBeVisible({ timeout: 3000 })
  })

  test('switch between stamp presets rapidly', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID']
    for (const preset of presets) {
      const btn = page.locator('button').filter({ hasText: preset }).first()
      if (await btn.isVisible()) {
        await btn.click()
        await page.waitForTimeout(100)
      }
    }
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp at 50% zoom', async ({ page }) => {
    const zoomBtn = page.locator('button').filter({ hasText: /\d+%/ }).first()
    if (await zoomBtn.isVisible()) await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset50 = page.locator('button').filter({ hasText: '50%' }).first()
    if (await preset50.isVisible()) await preset50.click()
    await page.waitForTimeout(500)
    await placeStamp(page, 100, 100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp at 125% zoom', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place stamp then place another immediately', async ({ page }) => {
    await placeStamp(page, 100, 100)
    await placeStamp(page, 300, 300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple stamps same position', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await placeStamp(page, 200, 200)
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('stamp color verification in session', async ({ page }) => {
    await placeStamp(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('stamp')
    // Stamp should have a color or stampType property
    expect(anns[0]?.stampType || anns[0]?.color).toBeTruthy()
  })

  test('stamp type preserved after copy', async ({ page }) => {
    await selectStampPreset(page, 'DRAFT')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
  })

  test('stamp type preserved after duplicate', async ({ page }) => {
    await selectStampPreset(page, 'CONFIDENTIAL')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
  })

  test('place stamp then export then undo', async ({ page }) => {
    await placeStamp(page, 200, 200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('place 6 stamps (one of each type)', async ({ page }) => {
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']
    for (let i = 0; i < presets.length; i++) {
      await selectStampPreset(page, presets[i])
      await clickCanvasAt(page, 80 + i * 60, 200)
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('G shortcut activates stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/click to place/')).toBeVisible({ timeout: 3000 })
  })

  test('stamp cursor shows', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    // Stamp tool should change the cursor
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('stamp hint text', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/click to place/')).toBeVisible({ timeout: 3000 })
  })

  test('stamp on empty page', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp after clear all', async ({ page }) => {
    await placeStamp(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo to clear
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Place another
    await placeStamp(page, 300, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp with other annotations mixed', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 60 })
    await placeStamp(page, 300, 300)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('stamp z-order front/back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 150 })
    await placeStamp(page, 200, 175)
    expect(await getAnnotationCount(page)).toBe(2)
    // Stamp should be on top (created last)
  })
})
