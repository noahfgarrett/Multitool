import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Callout Tool Core', () => {
  test('create callout by dragging', async ({ page }) => {
    await createAnnotation(page, 'callout')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout enters edit mode immediately', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 3000 })
  })

  test('callout shortcut O activates tool', async ({ page }) => {
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.active-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(cursor).toBe('crosshair')
  })

  test('callout text editing works', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout move (drag body)', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 140 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo callout creation', async ({ page }) => {
    await createAnnotation(page, 'callout')
    expect(await getAnnotationCount(page)).toBe(1)
    // Callout needs 2 undos (creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('export callout to PDF', async ({ page }) => {
    await createAnnotation(page, 'callout')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('double-click callout — enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 80 })
    await selectTool(page, 'Select (S)')
    // First click to select the callout (click on edge)
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(300)
    // Now double-click on the callout body to enter edit mode
    await doubleClickCanvasAt(page, 100, 140)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 3000 })
  })

  test('empty callout deleted on commit', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    // Don't type anything
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('callout formatting — bold text', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout then pencil — both counted', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 120, h: 70 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
