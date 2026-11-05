import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, dragOnCanvas, createAnnotation, getAnnotationCount,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

/** A preset entry inside the open zoom dropdown (the toolbar button itself also reads e.g. "100%") */
function zoomPreset(page: import('@playwright/test').Page, label: string) {
  return page.locator('button[title="Zoom presets"] + div').getByRole('button', { name: label, exact: true })
}

/** Zoom keeps the view centred, so page 1's top-left corner can sit under the toolbars; bring it back into view */
async function scrollPageTopIntoView(page: import('@playwright/test').Page) {
  await page.locator('[data-page="1"]').evaluate(el => el.scrollIntoView({ block: 'start', inline: 'start' }))
  await page.waitForTimeout(200)
}

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Zoom In/Out Buttons ────────────────────────────────────────────────────

test.describe('QA Zoom — Buttons', () => {
  test('zoom in button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom in"]')).toBeVisible()
  })

  test('zoom out button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom out"]')).toBeVisible()
  })

  test('zoom in increases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(parseInt(afterText || '0')).toBeGreaterThan(parseInt(beforeText || '0'))
  })

  test('zoom out decreases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first so we have room
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(parseInt(afterText || '0')).toBeLessThan(parseInt(beforeText || '0'))
  })
})

// ─── Zoom Percentage Display ────────────────────────────────────────────────

test.describe('QA Zoom — Percentage Display', () => {
  test('zoom percentage is displayed', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await expect(zoomBtn).toBeVisible()
    const text = await zoomBtn.textContent()
    expect(text).toMatch(/\d+%/)
  })

  test('zoom in updates percentage display', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await expect(zoomBtn).toHaveText('125%')
  })

  test('zoom out updates percentage display', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    await expect(zoomBtn).toHaveText('75%')
  })
})

// ─── Fit to Window ──────────────────────────────────────────────────────────

test.describe('QA Zoom — Fit to Window', () => {
  test('F key fits to window', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const zoomedText = await zoomBtn.textContent()
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const fitText = await zoomBtn.textContent()
    expect(fitText).not.toBe(zoomedText)
  })

  test('Fit option in dropdown works', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '200%').click()
    await page.waitForTimeout(300)
    const zoomedText = await zoomBtn.textContent()
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Fit")').click()
    await page.waitForTimeout(300)
    const fitText = await zoomBtn.textContent()
    expect(fitText).not.toBe(zoomedText)
  })
})

// ─── Rotation ───────────────────────────────────────────────────────────────

test.describe('QA Rotation — CW/CCW', () => {
  test('rotate CW button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CW"]')).toBeVisible()
  })

  test('rotate CCW button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CCW"]')).toBeVisible()
  })

  test('rotate CW changes rotation in session to 90', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot).toBe(90)
  })

  test('rotate CCW changes rotation to 270 or -90', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot === 270 || rot === -90).toBe(true)
  })
})

// ─── Rotate 4 Times Returns to Original ─────────────────────────────────────

test.describe('QA Rotation — Full Circle', () => {
  test('four CW rotations return to original', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 4; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(500)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot % 360).toBe(0)
  })

  test('four CCW rotations return to original', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 4; i++) {
      await page.locator('button[title="Rotate CCW"]').click()
      await page.waitForTimeout(500)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(Math.abs(rot) % 360).toBe(0)
  })

  test('one CW + one CCW returns to original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot % 360).toBe(0)
  })
})

// ─── Annotations at Different Zoom Levels ───────────────────────────────────

test.describe('QA Zoom — Annotations', () => {
  test('annotations visible at 50% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '50%').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations visible at 150% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '150%').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count preserved across zoom changes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('drawing at non-default zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '150%').click()
    await page.waitForTimeout(300)
    await scrollPageTopIntoView(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing at 125% zoom then viewing at 100% has correct annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Set to 100%, zoom in once to 125%
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await scrollPageTopIntoView(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch back to 100%
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(1)
    expect(anns[0].points[0].x).toBeGreaterThan(0)
  })
})

// ─── Zoom Presets ───────────────────────────────────────────────────────────

test.describe('QA Zoom — Presets', () => {
  test('clicking zoom percentage opens preset dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(zoomPreset(page, '25%')).toBeVisible({ timeout: 3000 })
  })

  test('selecting 50% preset sets zoom to 50%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '50%').click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('50%')
  })

  test('selecting 100% preset sets zoom to 100%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('100%')
  })

  test('selecting 200% preset sets zoom to 200%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '200%').click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('200%')
  })

  test('zoom dropdown has 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300% options', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    for (const pct of ['25%', '50%', '75%', '100%', '125%', '150%', '200%', '300%']) {
      await expect(zoomPreset(page, pct)).toBeVisible()
    }
  })

  test('zoom dropdown closes after selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(300)
    await expect(zoomPreset(page, '25%')).toBeHidden()
  })
})

// ─── Zoom Limits ────────────────────────────────────────────────────────────

test.describe('QA Zoom — Limits', () => {
  test('zoom does not go below 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '25%').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(parseInt(text || '0')).toBeGreaterThanOrEqual(25)
  })

  test('zoom does not exceed 400%', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 20; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(parseInt(text || '0')).toBeLessThanOrEqual(400)
  })
})

// ─── Zoom Session Persistence ───────────────────────────────────────────────

test.describe('QA Zoom — Session', () => {
  test('zoom level persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '150%').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.zoom).toBeCloseTo(1.5, 1)
  })

  test('zoom level survives tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    // Switch between tools and verify zoom display stays consistent
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    const beforeText = await zoomBtn.textContent()
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    const afterText = await zoomBtn.textContent()
    // Zoom level should remain the same across tool switches
    expect(afterText).toBe(beforeText)
  })
})

// ─── Rotation — Annotations Persist ─────────────────────────────────────────

test.describe('QA Rotation — Annotations', () => {
  test('annotations persist after CW rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple annotations persist after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('drawing on rotated page works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid rotation does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 8; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(300)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

// ─── Keyboard Zoom ──────────────────────────────────────────────────────────

test.describe('QA Zoom — Keyboard', () => {
  test('Ctrl+= zooms in', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(parseInt(afterText || '0')).toBeGreaterThan(parseInt(beforeText || '0'))
  })

  test('Ctrl+- zooms out', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(parseInt(afterText || '0')).toBeLessThan(parseInt(beforeText || '0'))
  })

  test('zoom in then out returns to same level', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await zoomPreset(page, '100%').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(200)
    await expect(zoomBtn).toHaveText('100%')
  })
})
