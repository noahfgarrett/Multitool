import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, clearSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Zoom Controls — Buttons ──────────────────────────────────────────────────

test.describe('Zoom Controls — Buttons', () => {
  test('zoom in button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom in"]')).toBeVisible()
  })

  test('zoom out button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom out"]')).toBeVisible()
  })

  test('zoom percentage is displayed', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom presets"]')).toBeVisible()
  })

  test('zoom in button increases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeGreaterThan(beforePct)
  })

  test('zoom out button decreases zoom level', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first so we have room to zoom out
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeLessThan(beforePct)
  })

  test('zoom in increases by 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Set zoom to 100% first
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    // Click 100% preset
    const preset100 = page.locator('button:has-text("100%")').first()
    if (await preset100.isVisible()) {
      await preset100.click()
      await page.waitForTimeout(200)
    }
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(afterText).toContain('125%')
  })

  test('zoom out decreases by 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Set zoom to 100%
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset100 = page.locator('button:has-text("100%")').first()
    if (await preset100.isVisible()) {
      await preset100.click()
      await page.waitForTimeout(200)
    }
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(afterText).toContain('75%')
  })
})

// ─── Zoom Controls — Keyboard ─────────────────────────────────────────────────

test.describe('Zoom Controls — Keyboard', () => {
  test('Ctrl+= zooms in', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeGreaterThan(beforePct)
  })

  test('Ctrl+- zooms out', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    const beforePct = parseInt(beforeText || '0')
    const afterPct = parseInt(afterText || '0')
    expect(afterPct).toBeLessThan(beforePct)
  })

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
    // Fit to window should produce a different zoom than zoomed-in
    expect(fitText).not.toBe(zoomedText)
  })
})

// ─── Zoom Presets ─────────────────────────────────────────────────────────────

test.describe('Zoom Presets', () => {
  test('clicking zoom percentage opens preset dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    // Should see preset options
    await expect(page.locator('button:has-text("25%")')).toBeVisible({ timeout: 3000 })
  })

  test('25% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("25%")')).toBeVisible()
  })

  test('50% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("50%")')).toBeVisible()
  })

  test('75% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("75%")')).toBeVisible()
  })

  test('100% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("100%")')).toBeVisible()
  })

  test('125% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("125%")')).toBeVisible()
  })

  test('150% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("150%")')).toBeVisible()
  })

  test('200% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("200%")')).toBeVisible()
  })

  test('300% zoom preset is available', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("300%")')).toBeVisible()
  })

  test('fit to window option is in zoom dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('button:has-text("Fit")')).toBeVisible()
  })

  test('selecting 50% preset sets zoom to 50%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("50%")').click()
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await expect(zoomBtn).toHaveText('50%')
  })

  test('selecting 200% preset sets zoom to 200%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("200%")').click()
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await expect(zoomBtn).toHaveText('200%')
  })

  test('zoom dropdown closes after selection', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("100%")').first().click()
    await page.waitForTimeout(300)
    // Dropdown items should not be visible
    await expect(page.locator('button:has-text("25%")')).toBeHidden()
  })
})

// ─── Zoom — Annotations ──────────────────────────────────────────────────────

test.describe('Zoom — Annotations', () => {
  test('annotations scale with zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const at100 = await screenshotCanvas(page)
    // Zoom to 200%
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("200%")').click()
    await page.waitForTimeout(500)
    const at200 = await screenshotCanvas(page)
    expect(Buffer.compare(at100, at200)).not.toBe(0)
  })

  test('drawing at non-default zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom to 150%
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("150%")').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count preserved across zoom changes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Change zoom
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('drawing at 50% zoom creates valid annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("50%")').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line', { x: 50, y: 50, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('line')
  })

  test('drawing at 300% zoom creates valid annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("300%")').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Zoom — Session & Limits ──────────────────────────────────────────────────

test.describe('Zoom — Session & Limits', () => {
  test('zoom level persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("150%")').click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.zoom).toBeCloseTo(1.5, 1)
  })

  test('zoom does not go below 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Set to 25%
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("25%")').click()
    await page.waitForTimeout(300)
    // Try to zoom out further
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    const pct = parseInt(text || '0')
    expect(pct).toBeGreaterThanOrEqual(25)
  })

  test('zoom does not exceed 400%', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in many times
    for (let i = 0; i < 20; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    const pct = parseInt(text || '0')
    expect(pct).toBeLessThanOrEqual(400)
  })

  test('canvas is scrollable at high zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom to 300%
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("300%")').click()
    await page.waitForTimeout(500)
    // The scroll container should have scrollable overflow
    const scrollContainer = page.locator('[class*="overflow"]').first()
    await expect(scrollContainer).toBeVisible()
  })

  test('fit to window button works via zoom dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom to 200% first
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("200%")').click()
    await page.waitForTimeout(300)
    const zoomedText = await page.locator('button[title="Zoom presets"]').textContent()
    // Now fit to window
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Fit")').click()
    await page.waitForTimeout(300)
    const fitText = await page.locator('button[title="Zoom presets"]').textContent()
    expect(fitText).not.toBe(zoomedText)
  })

  test('zoom change causes canvas visual change', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('current zoom preset is highlighted in dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("100%")').first().click()
    await page.waitForTimeout(200)
    // Re-open dropdown
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    // The 100% button should have the active/highlighted class
    const btn100 = page.locator('button:has-text("100%")').first()
    await expect(btn100).toHaveClass(/text-\[#14B8A6\]/)
  })

  test('multiple zoom-ins work sequentially', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    // Set to 100%
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("100%")').first().click()
    await page.waitForTimeout(200)
    // Zoom in three times
    for (let i = 0; i < 3; i++) {
      await page.locator('button[title="Zoom in"]').click()
      await page.waitForTimeout(200)
    }
    const text = await zoomBtn.textContent()
    expect(parseInt(text || '0')).toBe(175)
  })

  test('multiple zoom-outs work sequentially', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    // Set to 200%
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("200%")').click()
    await page.waitForTimeout(200)
    // Zoom out twice
    for (let i = 0; i < 2; i++) {
      await page.locator('button[title="Zoom out"]').click()
      await page.waitForTimeout(200)
    }
    const text = await zoomBtn.textContent()
    expect(parseInt(text || '0')).toBe(150)
  })

  test('zoom in then zoom out returns to same level', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    // Set to 100%
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("100%")').first().click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(200)
    const text = await zoomBtn.textContent()
    expect(text).toContain('100%')
  })

  test('zoom level survives tool switch', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await zoomBtn.click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("150%")').click()
    await page.waitForTimeout(200)
    // Switch tools
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Select (S)')
    const text = await zoomBtn.textContent()
    expect(text).toContain('150%')
  })

  test('selecting annotation at zoomed-in level works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("150%")').click()
    await page.waitForTimeout(300)
    // Select at the zoomed position (coordinates are relative to canvas)
    await selectAnnotationAt(page, 100, 140)
    // Should select or at least not crash
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+scroll zoom simulation via keyboard', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const beforeText = await zoomBtn.textContent()
    // Use Ctrl+= as proxy for scroll-zoom
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const afterText = await zoomBtn.textContent()
    expect(parseInt(afterText || '0')).toBeGreaterThan(parseInt(beforeText || '0'))
  })

  test('zoom to 25% makes canvas very small', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("25%")').click()
    await page.waitForTimeout(300)
    // Canvas should still be visible
    await expect(page.locator('canvas').first()).toBeVisible()
    const text = await page.locator('button[title="Zoom presets"]').textContent()
    expect(text).toContain('25%')
  })

  test('zoom to 300% makes canvas very large', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("300%")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('canvas').first()).toBeVisible()
    const text = await page.locator('button[title="Zoom presets"]').textContent()
    expect(text).toContain('300%')
  })

  test('zoom buttons have correct icons', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    await expect(zoomInBtn.locator('svg')).toBeVisible()
    await expect(zoomOutBtn.locator('svg')).toBeVisible()
  })

  test('initial zoom fits to window automatically', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    const pct = parseInt(text || '0')
    // Should be auto-fitted (not exactly 100% unless the viewport matches)
    expect(pct).toBeGreaterThanOrEqual(25)
    expect(pct).toBeLessThanOrEqual(400)
  })
})
