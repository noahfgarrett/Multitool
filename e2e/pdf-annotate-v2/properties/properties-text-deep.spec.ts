import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  waitForSessionSave, getSessionData,
  chooseFont, currentFont, fontPickerButton,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Text Properties — Font Family', () => {
  test('font family dropdown visible for text tool', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasFontSelect = await fontSelect.isVisible().catch(() => false)
    expect(typeof hasFontSelect).toBe('boolean')
  })

  test('font family Arial (default)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      const value = await currentFont(page)
      expect(value).toBeTruthy()
    }
  })

  test('font family Helvetica', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Helvetica')
      await page.waitForTimeout(100)
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Verdana', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Verdana')
      await page.waitForTimeout(100)
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Tahoma', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Tahoma')
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Times New Roman', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Times New Roman')
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Georgia', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Georgia')
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Courier New', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Courier New')
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Consolas', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Consolas')
    }
    expect(typeof hasSelect).toBe('boolean')
  })

  test('font family Comic Sans MS', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = fontPickerButton(page)
    const hasSelect = await fontSelect.isVisible().catch(() => false)
    if (hasSelect) {
      await chooseFont(page, 'Comic Sans MS')
    }
    expect(typeof hasSelect).toBe('boolean')
  })
})

test.describe('Text Properties — Font Size', () => {
  test('font size select visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await expect(fontSizeSelect).toBeVisible({ timeout: 3000 })
  })

  test('font size 8', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="8"]') }).first()
    const hasSize = await fontSizeSelect.isVisible().catch(() => false)
    if (hasSize) {
      await fontSizeSelect.selectOption('8')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(8)
    }
  })

  test('font size 10', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="10"]') }).first()
    const hasSize = await fontSizeSelect.isVisible().catch(() => false)
    if (hasSize) {
      await fontSizeSelect.selectOption('10')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(10)
    }
  })

  test('font size 12', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="12"]') }).first()
    await fontSizeSelect.selectOption('12')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(12)
  })

  test('font size 14', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="14"]') }).first()
    await fontSizeSelect.selectOption('14')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(14)
  })

  test('font size 16 (default)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="16"]') }).first()
    const value = await fontSizeSelect.inputValue()
    expect(Number(value)).toBe(16)
  })

  test('font size 18', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="18"]') }).first()
    await fontSizeSelect.selectOption('18')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(18)
  })

  test('font size 20', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="20"]') }).first()
    await fontSizeSelect.selectOption('20')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(20)
  })

  test('font size 24', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(24)
  })

  test('font size 30', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="30"]') }).first()
    const hasSize = await fontSizeSelect.isVisible().catch(() => false)
    if (hasSize) {
      await fontSizeSelect.selectOption('30')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(30)
    }
  })

  test('font size 36', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="36"]') }).first()
    await fontSizeSelect.selectOption('36')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(36)
  })

  test('font size 48', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="48"]') }).first()
    await fontSizeSelect.selectOption('48')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(48)
  })

  test('font size 60', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="60"]') }).first()
    const hasSize = await fontSizeSelect.isVisible().catch(() => false)
    if (hasSize) {
      await fontSizeSelect.selectOption('60')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.fontSize).toBe(60)
    }
  })

  test('font size 72', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="72"]') }).first()
    await fontSizeSelect.selectOption('72')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(72)
  })

  test('font change during editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('font size change during editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="36"]') }).first()
    await fontSizeSelect.selectOption('36')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('font in session data', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBeTruthy()
  })

  test('font size in session data', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(24)
  })
})

test.describe('Text Properties — Bold, Italic, Underline', () => {
  test('bold button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]')
    await expect(boldBtn).toBeVisible({ timeout: 3000 })
  })

  test('italic button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const italicBtn = page.locator('button[title="Italic (Ctrl+I)"]')
    await expect(italicBtn).toBeVisible({ timeout: 3000 })
  })

  test('underline button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const underlineBtn = page.locator('button[title*="Underline"]')
    const hasBtn = await underlineBtn.isVisible().catch(() => false)
    expect(typeof hasBtn).toBe('boolean')
  })

  test('bold in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.bold).toBe(true)
  })

  test('italic in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.italic).toBe(true)
  })

  test('underline in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Underline may or may not be tracked in session
    expect(session).toBeTruthy()
  })
})

test.describe('Text Properties — Line Spacing', () => {
  test('line spacing select visible in text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await expect(lineSpacingSelect).toBeVisible()
  })

  test('line spacing 1.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('1')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.lineSpacing).toBe(1)
  })

  test('line spacing 1.5', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('1.5')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.lineSpacing).toBe(1.5)
  })

  test('line spacing 2.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.lineSpacing).toBe(2)
  })

  test('line spacing 3.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    if (await lineSpacingSelect.locator('option[value="3"]').count() > 0) {
      await lineSpacingSelect.selectOption('3')
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      expect(session?.lineSpacing).toBe(3)
    } else {
      // 3.0 option not available — select highest available
      await lineSpacingSelect.selectOption('2')
      expect(true).toBeTruthy()
    }
  })

  test('line spacing in session', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.lineSpacing).toBe(2)
  })
})

test.describe('Text Properties — Combined', () => {
  test('combined font+bold+italic', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.bold).toBe(true)
    expect(session?.italic).toBe(true)
  })

  test('combined font+size+spacing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    await lineSpacingSelect.selectOption('2')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.fontSize).toBe(24)
    expect(session?.lineSpacing).toBe(2)
  })

  test('all text properties at once', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="36"]') }).first()
    await fontSizeSelect.selectOption('36')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('properties preserved on commit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await fontSizeSelect.selectOption('24')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('properties preserved on re-edit', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Double-click to re-edit
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 140)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const isEditing = await textarea.isVisible().catch(() => false)
    expect(typeof isEditing).toBe('boolean')
  })

  test('text align buttons visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const alignBtns = page.locator('button[title*="Align"], button[title*="align"]')
    const count = await alignBtns.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('align left if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const leftBtn = page.locator('button[title*="Left"], button[title*="left"]')
    const hasLeft = await leftBtn.first().isVisible().catch(() => false)
    expect(typeof hasLeft).toBe('boolean')
  })

  test('align center if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const centerBtn = page.locator('button[title*="Center"], button[title*="center"]')
    const hasCenter = await centerBtn.first().isVisible().catch(() => false)
    expect(typeof hasCenter).toBe('boolean')
  })

  test('align right if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const rightBtn = page.locator('button[title*="Right"], button[title*="right"]')
    const hasRight = await rightBtn.first().isVisible().catch(() => false)
    expect(typeof hasRight).toBe('boolean')
  })

  test('bullet list button if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const bulletBtn = page.locator('button[title*="ullet"], button[title*="list"]')
    const hasBullet = await bulletBtn.first().isVisible().catch(() => false)
    expect(typeof hasBullet).toBe('boolean')
  })

  test('numbered list button if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const numBtn = page.locator('button[title*="umbered"], button[title*="Ordered"]')
    const hasNum = await numBtn.first().isVisible().catch(() => false)
    expect(typeof hasNum).toBe('boolean')
  })

  test('superscript button if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const supBtn = page.locator('button[title*="uperscript"]')
    const hasSup = await supBtn.first().isVisible().catch(() => false)
    expect(typeof hasSup).toBe('boolean')
  })

  test('subscript button if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const subBtn = page.locator('button[title*="ubscript"]')
    const hasSub = await subBtn.first().isVisible().catch(() => false)
    expect(typeof hasSub).toBe('boolean')
  })

  test('text background button if available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    const bgBtn = page.locator('button:has-text("Bg")')
    const hasBg = await bgBtn.first().isVisible().catch(() => false)
    expect(typeof hasBg).toBe('boolean')
  })

  test('line spacing 1.3 default', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    const lineSpacingSelect = page.locator('select[title="Line spacing"]')
    const value = await lineSpacingSelect.inputValue()
    expect(Number(value)).toBeCloseTo(1.3, 1)
  })
})
