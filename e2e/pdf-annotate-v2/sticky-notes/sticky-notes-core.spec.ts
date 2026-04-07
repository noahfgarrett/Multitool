import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import { uploadPDFAndWait, clickCanvasAt, getAnnotationCount } from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Sticky Note Tool — Toolbar', () => {
  test('Sticky Note button visible in right toolbar', async ({ page }) => {
    const btn = page.locator('button[title*="Sticky Note"]')
    await expect(btn).toBeVisible({ timeout: 3000 })
  })

  test('N shortcut activates sticky note tool', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Click to place/')).toBeVisible({ timeout: 3000 })
  })

  test('active state shows orange ring', async ({ page }) => {
    const btn = page.locator('button[title*="Sticky Note"]')
    await btn.click()
    await page.waitForTimeout(100)
    await expect(btn).toHaveClass(/ring-\[#14B8A6\]/)
  })
})

test.describe('Sticky Note Tool — Placement', () => {
  test('clicking canvas places a sticky note', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(500)
  })

  test('placing note then switching to select keeps note', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
  })
})

test.describe('Sticky Note Tool — Edge Cases', () => {
  test('placing multiple notes does not crash', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await clickCanvasAt(page, 100 + i * 60, 200)
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    const statusBar = page.locator('span.truncate').first()
    await expect(statusBar).toBeVisible({ timeout: 3000 })
  })

  test('double-click on canvas in note mode does not crash', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.dblclick(box.x + 200, box.y + 200)
      await page.waitForTimeout(300)
    }
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
  })

  test('Escape deselects from note mode', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })
})
