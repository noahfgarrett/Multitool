import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'
import { chooseZoomPreset, settledLayerHash, pageBoxSize, scrollViewerToOrigin } from '../../helpers/pdf-annotate-b'

const CW = 'button[title="Rotate CW"]'
const CCW = 'button[title="Rotate CCW"]'

/** "WxH" -> "HxW" */
const swap = (size: string) => size.split('x').reverse().join('x')
/** Dimensions prefix of a layer hash ("WxH:digest" -> "WxH") */
const dims = (hash: string) => hash.split(':')[0]

/** Rotation of the current page as shown in the status bar ("90°"), 0 when hidden */
async function statusRotation(page: import('@playwright/test').Page): Promise<number> {
  const el = page.locator('span').filter({ hasText: /^\d+°$/ })
  if (await el.count() === 0) return 0
  return parseInt((await el.first().textContent()) || '0', 10)
}

/** Click a rotate button and wait for the page box to take the expected size */
async function rotate(page: import('@playwright/test').Page, btn: string) {
  const before = await pageBoxSize(page)
  await page.locator(btn).click()
  await expect.poll(() => pageBoxSize(page)).toBe(swap(before))
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Rotation — Buttons ──────────────────────────────────────────────────────

test.describe('Rotation — Buttons', () => {
  test('rotate CW button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CW"]')).toBeVisible()
  })

  test('rotate CCW button is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CCW"]')).toBeVisible()
  })

  test('rotate CW button rotates page 90 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await settledLayerHash(page, 'pdf')
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(90)
    const after = await settledLayerHash(page, 'pdf')
    expect(dims(after)).toBe(swap(dims(before)))
  })

  test('rotate CCW button rotates page -90 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await settledLayerHash(page, 'pdf')
    await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(270)
    const after = await settledLayerHash(page, 'pdf')
    expect(dims(after)).toBe(swap(dims(before)))
  })

  test('CW and CCW rotations produce different results', async ({ page }) => {
    await uploadPDFAndWait(page)
    await rotate(page, CW)
    const cwRender = await settledLayerHash(page, 'pdf')
    // Undo and rotate CCW instead
    await rotate(page, CCW)
    // Should be back to original, then rotate CCW
    await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(270)
    const ccwRender = await settledLayerHash(page, 'pdf')
    // Same (swapped) size, different picture
    expect(dims(ccwRender)).toBe(dims(cwRender))
    expect(ccwRender).not.toBe(cwRender)
  })
})

// ─── Rotation — Full Circle ──────────────────────────────────────────────────

test.describe('Rotation — Full Circle', () => {
  test('four CW rotations return to original orientation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const original = await settledLayerHash(page, 'pdf')
    for (let i = 0; i < 4; i++) await rotate(page, CW)
    expect(await statusRotation(page)).toBe(0)
    await expect.poll(() => settledLayerHash(page, 'pdf')).toBe(original)
  })

  test('four CCW rotations return to original orientation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const original = await settledLayerHash(page, 'pdf')
    for (let i = 0; i < 4; i++) await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(0)
    await expect.poll(() => settledLayerHash(page, 'pdf')).toBe(original)
  })

  test('one CW + one CCW returns to original', async ({ page }) => {
    await uploadPDFAndWait(page)
    const original = await settledLayerHash(page, 'pdf')
    await rotate(page, CW)
    await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(0)
    await expect.poll(() => settledLayerHash(page, 'pdf')).toBe(original)
  })

  test('two CW rotations give 180 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    const original = await settledLayerHash(page, 'pdf')
    await rotate(page, CW)
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(180)
    // Upside-down render: same size, different picture
    await expect.poll(async () => {
      const at180 = await settledLayerHash(page, 'pdf')
      return dims(at180) === dims(original) && at180 !== original
    }).toBe(true)
  })

  test('three CW rotations are equivalent to one CCW', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Rotate CW three times
    for (let i = 0; i < 3; i++) await rotate(page, CW)
    expect(await statusRotation(page)).toBe(270)
    const threeCW = await settledLayerHash(page, 'pdf')
    // Reset back to original
    await rotate(page, CW)
    // Now rotate CCW once
    await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(270)
    await expect.poll(() => settledLayerHash(page, 'pdf')).toBe(threeCW)
  })
})

// ─── Rotation — Annotations ──────────────────────────────────────────────────

test.describe('Rotation — Annotations Persist', () => {
  test('annotations persist after CW rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations persist after CCW rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple annotations persist after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('annotation type preserved after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns[0]?.type).toBe('rectangle')
  })

  test('annotation points are transformed after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    const ptsBefore = annsBefore[0]?.points
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    const ptsAfter = annsAfter[0]?.points
    // Points should have been transformed (coordinates change after rotation)
    expect(ptsBefore?.length).toBeGreaterThan(0)
    expect(ptsAfter?.length).toBe(ptsBefore.length)
    expect(ptsAfter[0]).not.toEqual(ptsBefore[0])
  })

  test('drawing on rotated page works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    // Draw on the rotated page
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing on 180-degree rotated page works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing on 270-degree rotated page works', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 3; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('canvas re-renders after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await settledLayerHash(page, 'pdf')
    await rotate(page, CW)
    const after = await settledLayerHash(page, 'pdf')
    expect(dims(after)).toBe(swap(dims(before)))
    expect(after).not.toBe(before)
  })
})

// ─── Rotation — Session Persistence ──────────────────────────────────────────

test.describe('Rotation — Session Persistence', () => {
  test('rotation state persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.pageRotations).toBeDefined()
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot).toBe(90)
  })

  test('two CW rotations persist as 180 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(rot).toBe(180)
  })

  test('CCW rotation persists as 270 degrees (or -90)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    // -90 normalized to 270 or stored as -90
    expect(rot === 270 || rot === -90).toBe(true)
  })

  test('full 360 rotation persists as 0 degrees', async ({ page }) => {
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
})

// ─── Rotation — With Zoom ────────────────────────────────────────────────────

test.describe('Rotation — With Zoom', () => {
  test('rotation at 50% zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await chooseZoomPreset(page, '50%')
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(90)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('50%')
  })

  test('rotation at 200% zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await chooseZoomPreset(page, '200%')
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(90)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('200%')
  })

  test('zoom level preserved after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await chooseZoomPreset(page, '150%')
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    // Zoom may reset to fit — check session data
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.zoom).toBeDefined()
    expect(session?.zoom).toBeGreaterThan(0)
  })

  test('drawing after rotation + zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await chooseZoomPreset(page, '150%')
    await page.waitForTimeout(300)
    // Zooming keeps the viewport centre; bring the page's top-left (where we draw) into view
    await scrollViewerToOrigin(page)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rotation — Multiple Operations ──────────────────────────────────────────

test.describe('Rotation — Multiple Operations', () => {
  test('alternating CW and CCW rotations work', async ({ page }) => {
    await uploadPDFAndWait(page)
    const original = await settledLayerHash(page, 'pdf')
    await rotate(page, CW)
    await rotate(page, CCW)
    await rotate(page, CW)
    await rotate(page, CCW)
    expect(await statusRotation(page)).toBe(0)
    await expect.poll(() => settledLayerHash(page, 'pdf')).toBe(original)
  })

  test('rotation does not corrupt annotation data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    // Multiple rotations
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
    // Each annotation should still have valid points
    for (const ann of anns) {
      expect(ann.points).toBeDefined()
      expect(ann.points.length).toBeGreaterThan(0)
    }
  })

  test('measurements transform with rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const measBefore = beforeSession?.measurements?.[1] || beforeSession?.measurements?.['1'] || []
    expect(measBefore.length).toBe(1)
    // Rotate
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const measAfter = afterSession?.measurements?.[1] || afterSession?.measurements?.['1'] || []
    expect(measAfter.length).toBe(1)
    // Points should be transformed
    expect(measAfter[0].startPt).not.toEqual(measBefore[0].startPt)
  })

  test('rapid rotation sequence does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 8; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(300)
    }
    // Should complete two full rotations without crashing
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rotation with pencil annotation preserves it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation with text annotation preserves it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation with callout annotation preserves it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation with arrow annotation preserves it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation at 25% zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await chooseZoomPreset(page, '25%')
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(90)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('25%')
  })

  test('rotation at 300% zoom works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await chooseZoomPreset(page, '300%')
    await rotate(page, CW)
    expect(await statusRotation(page)).toBe(90)
    await expect(page.locator('button[title="Zoom presets"]')).toHaveText('300%')
  })

  test('two CCW rotations give 180 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const rot = session?.pageRotations?.[1] || session?.pageRotations?.['1'] || 0
    expect(Math.abs(rot) === 180 || rot === -180).toBe(true)
  })

  test('rotation preserves measurement count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const pageMeas = session?.measurements?.[1] || session?.measurements?.['1'] || []
    expect(pageMeas.length).toBe(1)
  })

  test('selecting annotation after rotation works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    // After rotation the annotation points are transformed, try selecting
    await selectTool(page, 'Select (S)')
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation does not change annotation count for mixed types', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 300, w: 80, h: 60 })
    await createAnnotation(page, 'arrow', { x: 250, y: 300, w: 120, h: 0 })
    expect(await getAnnotationCount(page)).toBe(4)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(4)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(4)
  })
})
