import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt, dragOnCanvas,
  getAnnotationCount, exportPDF, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { openSecondaryTools } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// Helper: activate stamp tool and place a stamp on the canvas
async function placeStamp(page: import('@playwright/test').Page, x = 200, y = 200) {
  // Activate stamp tool via keyboard shortcut (G) to avoid dropdown toggle
  await page.keyboard.press('g')
  await page.waitForTimeout(200)
  // Click on canvas to place the default stamp preset
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(300)
}

test.describe('Stamp Tool Core', () => {
  test('stamp button visible in toolbar', async ({ page }) => {
    await openSecondaryTools(page)
    const stampBtn = page.locator('button[title="Stamp"]')
    await expect(stampBtn).toBeVisible({ timeout: 3000 })
  })

  test('G shortcut activates stamp tool', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(100)
    // Status bar should show the active stamp preset label and "click to place"
    await expect(page.locator('text=/click to place/')).toBeVisible({ timeout: 3000 })
  })

  test('stamp dropdown shows preset stamps', async ({ page }) => {
    await openSecondaryTools(page)
    const stampBtn = page.locator('button[title="Stamp"]')
    await stampBtn.click()
    await page.waitForTimeout(300)
    // When stamp tool is active, presets appear in the properties bar (top)
    // and/or in the sidebar dropdown. Check for APPROVED in either location.
    const approvedBtn = page.locator('button').filter({ hasText: 'APPROVED' }).first()
    await expect(approvedBtn).toBeVisible({ timeout: 3000 })
  })

  test('place stamp on canvas', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp appears in annotation count', async ({ page }) => {
    await placeStamp(page, 150, 150)
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
    await placeStamp(page, 300, 300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp type is stored in session', async ({ page }) => {
    await placeStamp(page)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('stamp')
    expect(anns[0]?.stampType).toBeTruthy()
  })

  test('move stamp annotation', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete stamp with Delete key', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo stamp placement', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate stamp with Ctrl+D', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple stamps on page', async ({ page }) => {
    await placeStamp(page, 100, 100)
    await placeStamp(page, 250, 250)
    await placeStamp(page, 350, 150)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('select different stamp preset', async ({ page }) => {
    // Activate stamp tool via keyboard shortcut
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    // Click on DRAFT preset in the properties bar
    const draftPreset = page.locator('button').filter({ hasText: 'DRAFT' }).first()
    if (await draftPreset.isVisible()) {
      await draftPreset.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(300)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
      expect(anns[0]?.stampType).toBe('DRAFT')
    }
  })

  test('export PDF with stamp annotation', async ({ page }) => {
    await placeStamp(page)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
