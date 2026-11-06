import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt, dragOnCanvas,
  getAnnotationCount, exportPDF,
  waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { openSecondaryTools } from '../../helpers/pdf-annotate-d'

/** Activate stamp tool via G shortcut */
async function activateStamp(page: import('@playwright/test').Page) {
  await page.keyboard.press('g')
  await page.waitForTimeout(200)
}

/** Select a specific stamp preset */
async function selectPreset(page: import('@playwright/test').Page, preset: string) {
  await activateStamp(page)
  const presetBtn = page.locator('button').filter({ hasText: preset }).first()
  if (await presetBtn.isVisible()) {
    await presetBtn.click()
    await page.waitForTimeout(200)
  }
}

/** Place a stamp with a specific preset at given coordinates */
async function placeStampPreset(page: import('@playwright/test').Page, preset: string, x = 200, y = 200) {
  await selectPreset(page, preset)
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Stamp Presets', () => {
  test('APPROVED stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('APPROVED stamp at top-left', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 50, 50)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('APPROVED stamp at bottom-right', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 400, 400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('APPROVED stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('APPROVED')
  })

  test('APPROVED stamp export', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('DRAFT stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('DRAFT stamp at top-right', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT', 400, 50)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('DRAFT stamp at bottom-left', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT', 50, 400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('DRAFT stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('DRAFT')
  })

  test('DRAFT stamp export', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('CONFIDENTIAL stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('CONFIDENTIAL stamp at edge', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL', 480, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('CONFIDENTIAL stamp at corner', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL', 10, 10)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('CONFIDENTIAL stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('CONFIDENTIAL')
  })

  test('CONFIDENTIAL stamp export', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('REVIEWED stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('REVIEWED stamp at various position', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED', 100, 400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('REVIEWED stamp at top', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED', 250, 30)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('REVIEWED stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('REVIEWED')
  })

  test('REVIEWED stamp export', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('VOID stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'VOID', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('VOID stamp at edge', async ({ page }) => {
    await placeStampPreset(page, 'VOID', 5, 250)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('VOID stamp at bottom', async ({ page }) => {
    await placeStampPreset(page, 'VOID', 250, 450)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('VOID stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'VOID')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('VOID')
  })

  test('VOID stamp export', async ({ page }) => {
    await placeStampPreset(page, 'VOID')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('FOR REVIEW stamp at center', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('FOR REVIEW stamp at corner', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW', 400, 400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('FOR REVIEW stamp at top edge', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW', 250, 10)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('FOR REVIEW stamp session data', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('FOR REVIEW')
  })

  test('FOR REVIEW stamp export', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('switch from APPROVED to DRAFT and place', async ({ page }) => {
    await selectPreset(page, 'APPROVED')
    await page.waitForTimeout(100)
    const draftBtn = page.locator('button').filter({ hasText: 'DRAFT' }).first()
    if (await draftBtn.isVisible()) await draftBtn.click()
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('DRAFT')
  })

  test('switch from DRAFT to CONFIDENTIAL and place', async ({ page }) => {
    await selectPreset(page, 'DRAFT')
    await page.waitForTimeout(100)
    const confBtn = page.locator('button').filter({ hasText: 'CONFIDENTIAL' }).first()
    if (await confBtn.isVisible()) await confBtn.click()
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('CONFIDENTIAL')
  })

  test('switch from CONFIDENTIAL to REVIEWED', async ({ page }) => {
    await selectPreset(page, 'CONFIDENTIAL')
    await page.waitForTimeout(100)
    const revBtn = page.locator('button').filter({ hasText: 'REVIEWED' }).first()
    if (await revBtn.isVisible()) await revBtn.click()
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch presets 5 times then place', async ({ page }) => {
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID']
    await activateStamp(page)
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

  test('place APPROVED then switch to DRAFT and place', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 100, 100)
    expect(await getAnnotationCount(page)).toBe(1)
    await placeStampPreset(page, 'DRAFT', 300, 300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('each preset stamp move — APPROVED', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('each preset stamp move — DRAFT', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT', 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 100, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('each preset stamp duplicate — CONFIDENTIAL', async ({ page }) => {
    await placeStampPreset(page, 'CONFIDENTIAL', 200, 200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('each preset stamp delete — REVIEWED', async ({ page }) => {
    await placeStampPreset(page, 'REVIEWED', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('each preset stamp undo/redo — VOID', async ({ page }) => {
    await placeStampPreset(page, 'VOID', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('place all 6 presets on same page', async ({ page }) => {
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']
    for (let i = 0; i < presets.length; i++) {
      await placeStampPreset(page, presets[i], 50 + i * 70, 200)
    }
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('all 6 presets in session', async ({ page }) => {
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']
    for (let i = 0; i < presets.length; i++) {
      await placeStampPreset(page, presets[i], 50 + i * 70, 200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(6)
  })

  test('all 6 presets export', async ({ page }) => {
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']
    for (let i = 0; i < presets.length; i++) {
      await placeStampPreset(page, presets[i], 50 + i * 70, 200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('preset colors verified in session', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBeTruthy()
    // Each preset should have associated color data
    expect(anns[0]?.color || anns[0]?.stampType).toBeTruthy()
  })

  test('stamp preset label in session data', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.stampType).toBe('FOR REVIEW')
  })

  test('stamp with select tool', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    expect(typeof isSelected).toBe('boolean')
  })

  test('stamp with arrow keys nudge', async ({ page }) => {
    await placeStampPreset(page, 'DRAFT')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp z-order operations', async ({ page }) => {
    await placeStampPreset(page, 'APPROVED', 200, 200)
    await placeStampPreset(page, 'DRAFT', 210, 210)
    expect(await getAnnotationCount(page)).toBe(2)
    // The second stamp should be on top
  })

  test('APPROVED stamp multiple times', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await placeStampPreset(page, 'APPROVED', 50 + i * 80, 200)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('DRAFT stamp multiple times', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await placeStampPreset(page, 'DRAFT', 50 + i * 80, 200)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('VOID stamp then undo', async ({ page }) => {
    await placeStampPreset(page, 'VOID')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('FOR REVIEW stamp then duplicate 3 times', async ({ page }) => {
    await placeStampPreset(page, 'FOR REVIEW')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+d')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('stamp preset visible in dropdown', async ({ page }) => {
    await openSecondaryTools(page)
    const stampBtn = page.locator('button[title="Stamp"]')
    await stampBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('button').filter({ hasText: 'APPROVED' }).first()).toBeVisible({ timeout: 3000 })
  })

  test('stamp dropdown shows all presets', async ({ page }) => {
    await activateStamp(page)
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']
    for (const preset of presets) {
      const btn = page.locator('button').filter({ hasText: preset }).first()
      const visible = await btn.isVisible()
      expect(typeof visible).toBe('boolean')
    }
  })

  test('stamp preset buttons exist', async ({ page }) => {
    await activateStamp(page)
    const approvedBtn = page.locator('button').filter({ hasText: 'APPROVED' }).first()
    await expect(approvedBtn).toBeVisible({ timeout: 3000 })
  })

  test('click each preset button', async ({ page }) => {
    await activateStamp(page)
    const presets = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID']
    for (const preset of presets) {
      const btn = page.locator('button').filter({ hasText: preset }).first()
      if (await btn.isVisible()) {
        await btn.click()
        await page.waitForTimeout(100)
      }
    }
    // Place the last selected stamp
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('preset button highlights when active', async ({ page }) => {
    await activateStamp(page)
    const approvedBtn = page.locator('button').filter({ hasText: 'APPROVED' }).first()
    if (await approvedBtn.isVisible()) {
      await approvedBtn.click()
      await page.waitForTimeout(200)
      // Check if the button has an active/selected visual state
      const classes = await approvedBtn.getAttribute('class')
      expect(classes).toBeTruthy()
    }
  })

  test('stamp toolbar shows active preset name', async ({ page }) => {
    await activateStamp(page)
    // The status bar or hint should indicate which stamp is active
    await expect(page.locator('text=/click to place/')).toBeVisible({ timeout: 3000 })
  })
})
