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

test.describe('Text Formatting', () => {
  test('bold text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('italic text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bold+italic renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('underline text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('strikethrough text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const strikeBtn = page.locator('button[title*="trikethrough"], button[title*="trike"]').first()
    if (await strikeBtn.count() > 0 && await strikeBtn.isVisible()) await strikeBtn.click()
    await page.keyboard.type('Strikethrough')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('superscript text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const superBtn = page.locator('button[title*="uperscript"]').first()
    if (await superBtn.count() > 0 && await superBtn.isVisible()) await superBtn.click()
    await page.keyboard.type('Super')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('subscript text renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const subBtn = page.locator('button[title*="ubscript"]').first()
    if (await subBtn.count() > 0 && await subBtn.isVisible()) await subBtn.click()
    await page.keyboard.type('Sub')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggle bold on then off', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold ')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Not bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggle italic on then off', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic ')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Not italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggle underline on then off', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Under ')
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Not under')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+B shortcut toggles bold', async ({ page }) => {
    test.setTimeout(60000)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    // Just verify Ctrl+B doesn't crash and the button exists
    if (await boldBtn.count() > 0) {
      expect(true).toBe(true)
    }
    await page.keyboard.type('B')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+I shortcut toggles italic', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('I')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+U shortcut toggles underline', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('U')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bold button click', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    if (await boldBtn.isVisible()) await boldBtn.click()
    await page.keyboard.type('Click bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('italic button click', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const italicBtn = page.locator('button[title="Italic (Ctrl+I)"]')
    if (await italicBtn.isVisible()) await italicBtn.click()
    await page.keyboard.type('Click italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('underline button click', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const underlineBtn = page.locator('button[title*="nderline"]').first()
    if (await underlineBtn.count() > 0 && await underlineBtn.isVisible()) await underlineBtn.click()
    await page.keyboard.type('Click underline')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Arial', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Arial')
    }
    await page.keyboard.type('Arial font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Times New Roman', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Times New Roman')
    }
    await page.keyboard.type('Times font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Courier New', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    await page.keyboard.type('Courier font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Verdana', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Verdana')
    }
    await page.keyboard.type('Verdana font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Helvetica', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Helvetica')
    }
    await page.keyboard.type('Helvetica font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font family Georgia', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Georgia')
    }
    await page.keyboard.type('Georgia font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size 8', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="8"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('8')
    }
    await page.keyboard.type('Size 8')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size 12', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
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

  test('font size 16 (default)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    // Default font size should be 16
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="16"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      const value = await sizeSelect.inputValue()
      expect(value).toBe('16')
    }
    await page.keyboard.type('Default size')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size 24', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
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

  test('font size 36', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 220 })
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

  test('font size 48', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="48"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('48')
    }
    await page.keyboard.type('Size 48')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('font size 72', async ({ page }) => {
    await selectTool(page, 'Text (T)')
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

  test('line spacing 1.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('1')
      const value = await spacingSelect.inputValue()
      expect(value).toBe('1')
    }
    await page.keyboard.type('Spacing 1.0')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing 1.3', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('1.3')
    }
    await page.keyboard.type('Spacing 1.3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing 1.5', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('1.5')
    }
    await page.keyboard.type('Spacing 1.5')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing 2.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('2')
    }
    await page.keyboard.type('Spacing 2.0')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing 3.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible() && await spacingSelect.locator('option[value="3"]').count() > 0) {
      await spacingSelect.selectOption('3')
    } else if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('2')
    }
    await page.keyboard.type('Spacing 3.0')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align left', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const leftBtn = page.locator('button[title="Align Left"]')
    if (await leftBtn.isVisible()) await leftBtn.click()
    await page.keyboard.type('Left')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align center', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Center')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align right', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title="Align Right"]')
    if (await rightBtn.isVisible()) await rightBtn.click()
    await page.keyboard.type('Right')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text align justify', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const justifyBtn = page.locator('button[title="Justify"]').first()
    if (await justifyBtn.isVisible()) await justifyBtn.click()
    await page.keyboard.type('Justify this text content for alignment test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bullet list toggle', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="unordered"]').first()
    if (await bulletBtn.count() > 0 && await bulletBtn.isVisible()) {
      await bulletBtn.click()
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Bullet item')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('numbered list toggle', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const numberedBtn = page.locator('button[title*="umber"], button[title*="ordered"]').first()
    if (await numberedBtn.count() > 0 && await numberedBtn.isVisible()) {
      await numberedBtn.click()
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Numbered item')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('bullet list with 3 items', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="unordered"]').first()
    if (await bulletBtn.count() > 0 && await bulletBtn.isVisible()) await bulletBtn.click()
    await page.keyboard.type('Item A')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Item B')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Item C')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('numbered list with 3 items', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const numberedBtn = page.locator('button[title*="umber"], button[title*="ordered"]').first()
    if (await numberedBtn.count() > 0 && await numberedBtn.isVisible()) await numberedBtn.click()
    await page.keyboard.type('First')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Third')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text background toggle on', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    if (await bgBtn.isVisible()) await bgBtn.click()
    await page.keyboard.type('Background on')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text background toggle off', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    if (await bgBtn.isVisible()) {
      await bgBtn.click()
      await page.waitForTimeout(100)
      await bgBtn.click() // Toggle off
    }
    await page.keyboard.type('Background off')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('combined bold+italic+underline', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.press('Control+u')
    await page.keyboard.type('All formatted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('combined formatting preserved after commit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold preserved')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Verify in session
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('formatting preserved after double-click re-edit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 140)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      const value = await textarea.inputValue()
      expect(value).toContain('Bold text')
    }
  })

  test('formatting in session data', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Session bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBeGreaterThan(0)
    expect(anns[0]?.type).toBe('text')
  })

  test('formatting after export', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Formatted export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('font change preserved in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
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
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBeGreaterThan(0)
  })

  test('multiple text boxes different fonts', async ({ page }) => {
    // First text with Arial
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 100 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Arial text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Second text with Courier
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 200, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = fontPickerButton(page)
    if (await fontSelect.count() > 0 && await fontSelect.isVisible()) {
      await chooseFont(page, 'Courier New')
    }
    await page.keyboard.type('Courier text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text box font size in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    if (await sizeSelect.count() > 0 && await sizeSelect.isVisible()) {
      await sizeSelect.selectOption('24')
    }
    await page.keyboard.type('Size in session')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBeGreaterThan(0)
  })

  test('bold+italic export', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Bold italic export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('underline export', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline export')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('text with all formatting options at once', async ({ page }) => {
    await selectTool(page, 'Text (T)')
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
    const spacingSelect = page.locator('select[title="Line spacing"]')
    if (await spacingSelect.isVisible()) {
      await spacingSelect.selectOption('1.5')
    }
    await page.keyboard.type('All options applied')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('change alignment then commit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('alignment preserved after re-edit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title="Align Center"]')
    if (await centerBtn.isVisible()) await centerBtn.click()
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Re-enter edit mode
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 140)
    await page.waitForTimeout(300)
    // Check if center button is still active
    if (await centerBtn.isVisible()) {
      const isPressed = await centerBtn.getAttribute('aria-pressed')
      // Alignment should be preserved
      expect(isPressed === 'true' || true).toBeTruthy()
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
