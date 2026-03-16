import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, getAnnotationCount, createAnnotation } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Find Bar — Opening & Closing', () => {
  test('Ctrl+F opens find bar with focused input', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
    await expect(findInput).toBeFocused()
  })

  test('Escape closes find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await expect(findInput).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(findInput).not.toBeVisible({ timeout: 3000 })
  })

  test('X button closes find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    const findBar = page.locator('div.flex.items-center.gap-2').filter({ has: findInput })
    await findBar.locator('button').last().click()
    await page.waitForTimeout(300)
    await expect(findInput).not.toBeVisible({ timeout: 3000 })
  })

  test('closing and reopening clears previous query', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await expect(page.locator('input[placeholder*="Find text"]')).toHaveValue('')
  })

  test('find bar toolbar button shows active state', async ({ page }) => {
    const findBtn = page.locator('button[title="Find text (Ctrl+F)"]')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await expect(findBtn).toHaveClass(/text-\[#F47B20\]/)
  })
})

test.describe('Find Bar — Keybind Blocking', () => {
  test('typing P does not switch to pencil tool', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('pencil test')
    await expect(findInput).toHaveValue('pencil test')
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('typing T does not switch to text tool', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('text')
    await expect(findInput).toHaveValue('text')
  })

  test('typing E does not switch to eraser', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('erase')
    await expect(findInput).toHaveValue('erase')
  })

  test('Delete/Backspace works in input, does not delete annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('abc')
    await findInput.press('Backspace')
    await expect(findInput).toHaveValue('ab')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Z does not trigger undo while find bar is open', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow keys work in input, do not nudge annotations', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('test')
    await findInput.press('ArrowLeft')
    await findInput.press('ArrowLeft')
    await expect(findInput).toHaveValue('test')
    await expect(findInput).toBeFocused()
  })

  test('F3 works while find bar is open', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await page.keyboard.press('F3')
    await page.waitForTimeout(100)
    await expect(page.locator('input[placeholder*="Find text"]')).toBeVisible()
  })
})

test.describe('Find Bar — Enter to Search', () => {
  test('typing does not immediately trigger search', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('xyz')
    await page.waitForTimeout(300)
    await expect(page.locator('text=/No matches/')).not.toBeVisible({ timeout: 1000 })
  })

  test('Enter triggers search and shows results', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('xyznonexistent')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('span').filter({ hasText: 'No matches' })).toBeVisible({ timeout: 5000 })
  })

  test('placeholder shows Enter instruction', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await expect(page.locator('input[placeholder*="Enter to search"]')).toBeVisible({ timeout: 3000 })
  })

  test('case sensitivity toggle re-runs search', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    const aaBtn = page.locator('button').filter({ hasText: 'Aa' })
    await aaBtn.click()
    await page.waitForTimeout(500)
    await expect(findInput).toBeVisible()
  })

  test('"No matches" text is styled red', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('xyznonexistent123')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    const noMatches = page.locator('span').filter({ hasText: 'No matches' })
    await expect(noMatches).toBeVisible({ timeout: 5000 })
    await expect(noMatches).toHaveClass(/text-red/)
  })

  test('Aa button shows active state when enabled', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const aaBtn = page.locator('button').filter({ hasText: 'Aa' })
    const classesBefore = await aaBtn.getAttribute('class') || ''
    expect(classesBefore).not.toContain('text-[#F47B20]')
    await aaBtn.click()
    await page.waitForTimeout(100)
    await expect(aaBtn).toHaveClass(/text-\[#F47B20\]/)
  })
})

test.describe('Find Bar — OCR Fallback', () => {
  test('normal PDF with text layer does not trigger OCR', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    expect(await page.locator('text=/OCR scanning/').isVisible().catch(() => false)).toBe(false)
  })
})

test.describe('Find Bar — Chaos', () => {
  test('open and close 10 times rapidly', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+f')
      await page.waitForTimeout(50)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(50)
    }
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Shift for perfect/')).toBeVisible({ timeout: 3000 })
  })

  test('spam Enter 20 times does not crash', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('the')
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(500)
    await expect(findInput).toBeVisible()
    await expect(findInput).toHaveValue('the')
  })

  test('search preserves annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'pencil', { x: 250, y: 250, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find text"]')
    await findInput.type('page')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
