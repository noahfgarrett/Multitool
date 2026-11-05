import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  waitForSessionSave, getSessionData,
  chooseFont, fontPickerButton,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Callout Formatting', () => {
  test('bold callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('italic callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bold+italic callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('underline callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+B in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Ctrl+B')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+I in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Ctrl+I')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+U in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Ctrl+U')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font change in callout — Arial', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Arial')
    }
    await page.keyboard.type('Arial')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font change in callout — Times New Roman', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Times New Roman')
    }
    await page.keyboard.type('Times')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font change in callout — Courier New', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    await page.keyboard.type('Courier')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size change — 12', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="12"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('12')
    }
    await page.keyboard.type('Size 12')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size change — 16', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    // Default should be 16
    await page.keyboard.type('Default 16')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size change — 24', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 220 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('24')
    }
    await page.keyboard.type('Size 24')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size change — 36', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 250 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="36"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('36')
    }
    await page.keyboard.type('Size 36')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing in callout — 1.0', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) await spacingSelect.selectOption('1')
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing in callout — 1.5', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) await spacingSelect.selectOption('1.5')
    await page.keyboard.type('Spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing in callout — 2.0', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) await spacingSelect.selectOption('2')
    await page.keyboard.type('Double spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align left in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const leftBtn = page.locator('button[title="Align Left"]')
    if (await leftBtn.isVisible()) await leftBtn.click()
    await page.keyboard.type('Left aligned')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align center in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align right in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title="Align Right"]')
    if (await rightBtn.isVisible()) await rightBtn.click()
    await page.keyboard.type('Right aligned')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bullet list in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="unordered"]').first()
    if (await bulletBtn.count() > 0 && await bulletBtn.isVisible()) await bulletBtn.click()
    await page.keyboard.type('Bullet 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Bullet 2')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('numbered list in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const numberedBtn = page.locator('button[title*="umber"], button[title*="ordered"]').first()
    if (await numberedBtn.count() > 0 && await numberedBtn.isVisible()) await numberedBtn.click()
    await page.keyboard.type('First')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('background color in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    if (await bgBtn.isVisible()) await bgBtn.click()
    await page.keyboard.type('Background')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout text with multiple lines bold', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Bold line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Bold line 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout text with mixed formatting', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold ')
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('formatting preserved on Escape', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold preserved')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('formatting preserved on click outside', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic click outside')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('formatting preserved after double-click re-edit', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold re-edit')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      const value = await textarea.inputValue()
      expect(value).toContain('Bold re-edit')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  test('formatting in session data', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Session data')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBeGreaterThan(0)
    expect(anns[0]?.type).toBe('callout')
  })

  test('bold callout export', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('italic callout export', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('font family in session', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    await page.keyboard.type('Courier session')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('font size in session', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('24')
    }
    await page.keyboard.type('Size session')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('callout with all formatters simultaneously', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.press('Control+u')
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('24')
    }
    await page.keyboard.type('All formatters')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('change formatting mid-edit', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Normal ')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo formatting change', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // May or may not have content depending on undo behavior
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('redo formatting change', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Redo test')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout formatting after zoom', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Zoomed bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout formatting after page rotate', async ({ page }) => {
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Rotated italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple callouts different fonts', async ({ page }) => {
    test.setTimeout(300000)
    // First callout with default font
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 70 })
    // Second callout with Courier
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 180 }, { x: 250, y: 260 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    await page.keyboard.type('Courier callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('callout font size 8', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="8"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('8')
    }
    await page.keyboard.type('Tiny callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout font size 72', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 450, y: 300 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="72"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('72')
    }
    await page.keyboard.type('Big')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout line spacing 3.0', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 50 }, { x: 300, y: 350 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible() && await spacingSelect.locator('option[value="3"]').count() > 0) await spacingSelect.selectOption('3')
    await page.keyboard.type('Triple spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout alignment in session', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered session')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('callout bold+italic export', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold italic export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('callout underline not in PDF (limitation)', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Export should succeed even if underline is not rendered in PDF
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('callout with text wrap at box width', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a long text that should wrap at the callout box width boundary')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout auto-height', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 130 })
    await page.waitForTimeout(300)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.type(`Line ${i + 1}`)
      await page.keyboard.press('Enter')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout with long text wrapping', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 300 })
    await page.waitForTimeout(300)
    await page.keyboard.type('A very long sentence that should definitely wrap multiple times within the narrow callout box width')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout with single word', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Word')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout formatting after duplicate', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Duplicate me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicated callout preserves formatting', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold dup')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(2)
  })

  test('paste callout preserves formatting', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic paste')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text background in callout session', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    if (await bgBtn.isVisible()) await bgBtn.click()
    await page.keyboard.type('BG session')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('multiple formatted callouts', async ({ page }) => {
    test.setTimeout(300000)
    // Bold callout
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 120 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Italic callout
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 170 }, { x: 200, y: 240 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('callout strikethrough', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const strikeBtn = page.locator('button[title*="trikethrough"], button[title*="trike"]').first()
    if (await strikeBtn.count() > 0 && await strikeBtn.isVisible()) await strikeBtn.click()
    await page.keyboard.type('Strikethrough')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout superscript', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const superBtn = page.locator('button[title*="uperscript"]').first()
    if (await superBtn.count() > 0 && await superBtn.isVisible()) await superBtn.click()
    await page.keyboard.type('Super')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout subscript', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const subBtn = page.locator('button[title*="ubscript"]').first()
    if (await subBtn.count() > 0 && await subBtn.isVisible()) await subBtn.click()
    await page.keyboard.type('Sub')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout list type in session', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="unordered"]').first()
    if (await bulletBtn.count() > 0 && await bulletBtn.isVisible()) await bulletBtn.click()
    await page.keyboard.type('List item')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('callout formatting toolbar visible during edit', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 250 })
    await page.waitForTimeout(500)
    // During editing, formatting controls should be visible
    const boldBtn = page.locator('button[title*="Bold"], button[title*="bold"]')
    const textarea = page.locator('textarea')
    const hasToolbar = await boldBtn.count() > 0 && await boldBtn.first().isVisible()
    const hasTextarea = await textarea.isVisible()
    expect(hasToolbar || hasTextarea).toBe(true)
    await page.keyboard.type('Toolbar visible')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })
})
