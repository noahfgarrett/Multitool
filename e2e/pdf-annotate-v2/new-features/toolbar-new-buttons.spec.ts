import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas,
  clickCanvasAt, createAnnotation,
} from '../../helpers/pdf-annotate'
import { headerMoreButton, headerMoreItem, chooseHeaderMoreItem } from '../../helpers/pdf-annotate-d'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

/** Right-click at a canvas-relative position on the annotation canvas */
async function rightClickOnCanvas(page: import('@playwright/test').Page, x: number, y: number) {
  const canvas = page.locator('canvas.ann-canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found for right-click')
  await page.mouse.click(box.x + x, box.y + y, { button: 'right' })
  await page.waitForTimeout(300)
}

// ── New Toolbar Buttons ──────────────────────────────────────────────────────

test.describe('New Toolbar Buttons', () => {
  // These features now live in the header "More" menu instead of toolbar icon buttons
  test('markups list menu item exists and is clickable', async ({ page }) => {
    await headerMoreButton(page).click()
    const btn = headerMoreItem(page, 'Markups List')
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForTimeout(300)
    // Clicking should open the markups panel (bottom panel with "Markups (N)" header)
    const panel = page.locator('text=/Markups \\(\\d+\\)/')
    await expect(panel.first()).toBeVisible({ timeout: 3000 })
  })

  test('clicking markups list menu item opens panel with Markups text', async ({ page }) => {
    await chooseHeaderMoreItem(page, 'Markups List')
    await page.waitForTimeout(300)
    // The MarkupsList component renders a header with "Markups (N)"
    const header = page.locator('text=/Markups \\(\\d+\\)/')
    await expect(header.first()).toBeVisible({ timeout: 3000 })
  })

  test('tool presets menu item exists', async ({ page }) => {
    await headerMoreButton(page).click()
    await expect(headerMoreItem(page, 'Tool Presets')).toBeVisible()
  })

  test('clicking presets menu item shows Tool Presets panel with empty message', async ({ page }) => {
    // Clear any preexisting presets from localStorage
    await page.evaluate(() => localStorage.removeItem('mt-tool-presets'))
    // Reopen the page to pick up cleared storage
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)
    const panelTitle = page.locator('text=Tool Presets')
    await expect(panelTitle.first()).toBeVisible({ timeout: 3000 })
    const emptyMsg = page.locator('text=No presets saved yet')
    await expect(emptyMsg).toBeVisible({ timeout: 3000 })
  })

  test('compare PDFs menu item exists', async ({ page }) => {
    await headerMoreButton(page).click()
    await expect(headerMoreItem(page, 'Compare PDFs')).toBeVisible()
  })

  test('custom stamp library menu item exists', async ({ page }) => {
    await headerMoreButton(page).click()
    await expect(headerMoreItem(page, 'Stamp Library')).toBeVisible()
  })

  test('bookmarks menu item conditional on PDF bookmarks', async ({ page }) => {
    // sample.pdf has no bookmarks, so the Bookmarks entry is not rendered
    await headerMoreButton(page).click()
    await expect(headerMoreItem(page, 'Tool Presets')).toBeVisible()
    await expect(headerMoreItem(page, 'Bookmarks')).toHaveCount(0)
  })

  test('markups and presets menu items toggle their panels', async ({ page }) => {
    const markupsHeader = page.locator('text=/Markups \\(\\d+\\)/').first()
    await chooseHeaderMoreItem(page, 'Markups List')
    await expect(markupsHeader).toBeVisible({ timeout: 3000 })
    await chooseHeaderMoreItem(page, 'Markups List')
    await expect(markupsHeader).toBeHidden({ timeout: 3000 })

    const emptyPresets = page.locator('text=No presets saved yet')
    await chooseHeaderMoreItem(page, 'Tool Presets')
    await expect(emptyPresets).toBeVisible({ timeout: 3000 })
    await chooseHeaderMoreItem(page, 'Tool Presets')
    await expect(emptyPresets).toBeHidden({ timeout: 3000 })
  })
})

// ── Tool Presets ─────────────────────────────────────────────────────────────

test.describe('Tool Presets', () => {
  test.beforeEach(async ({ page }) => {
    // Clear presets before each test in this group
    await page.evaluate(() => localStorage.removeItem('mt-tool-presets'))
  })

  test('save a preset via prompt and see it appear in list', async ({ page }) => {
    // Set up a dialog handler to auto-fill the preset name
    page.on('dialog', async dialog => {
      await dialog.accept('My Red Rectangle')
    })

    // Select rectangle tool so the preset captures "rectangle" as tool type
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(100)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    // Click the save button
    const saveBtn = page.locator('text=+ Save Current as Preset')
    await saveBtn.click()
    await page.waitForTimeout(300)

    // The preset should now appear in the list
    const presetName = page.locator('text=My Red Rectangle')
    await expect(presetName).toBeVisible({ timeout: 3000 })
  })

  test('preset shows color swatch and tool type', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept('Test Preset')
    })

    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(100)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    const saveBtn = page.locator('text=+ Save Current as Preset')
    await saveBtn.click()
    await page.waitForTimeout(300)

    // Check for color swatch (a small circle with backgroundColor)
    const swatch = page.locator('.w-3.h-3.rounded-full')
    await expect(swatch.first()).toBeVisible({ timeout: 3000 })

    // Check for tool type label
    const toolType = page.locator('text=rectangle')
    await expect(toolType.first()).toBeVisible({ timeout: 3000 })
  })

  test('clicking a preset closes the panel', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept('Clickable Preset')
    })

    await selectTool(page, 'Circle (C)')
    await page.waitForTimeout(100)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    const saveBtn = page.locator('text=+ Save Current as Preset')
    await saveBtn.click()
    await page.waitForTimeout(300)

    // Click the saved preset to apply it
    const preset = page.locator('text=Clickable Preset')
    await preset.click()
    await page.waitForTimeout(300)

    // Panel should be closed — "Tool Presets" header should no longer be visible
    const panelTitle = page.locator('text=Tool Presets')
    await expect(panelTitle).toBeHidden({ timeout: 3000 })
  })

  test('delete a preset removes it from the list', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept('Delete Me')
    })

    await selectTool(page, 'Line (L)')
    await page.waitForTimeout(100)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    const saveBtn = page.locator('text=+ Save Current as Preset')
    await saveBtn.click()
    await page.waitForTimeout(300)

    // Verify the preset exists
    const presetName = page.locator('text=Delete Me')
    await expect(presetName).toBeVisible({ timeout: 3000 })

    // Hover over the preset row to reveal the delete button, then click it
    const presetRow = page.locator('.group').filter({ hasText: 'Delete Me' })
    await presetRow.hover()
    await page.waitForTimeout(200)
    const deleteBtn = presetRow.locator('button').last()
    await deleteBtn.click()
    await page.waitForTimeout(300)

    // Preset should be gone, replaced by "No presets saved yet"
    await expect(presetName).toBeHidden({ timeout: 3000 })
    const emptyMsg = page.locator('text=No presets saved yet')
    await expect(emptyMsg).toBeVisible({ timeout: 3000 })
  })

  test('presets persist after closing and reopening the panel', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept('Persistent Preset')
    })

    await selectTool(page, 'Arrow (A)')
    await page.waitForTimeout(100)

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    const saveBtn = page.locator('text=+ Save Current as Preset')
    await saveBtn.click()
    await page.waitForTimeout(300)

    // Close the panel
    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    // Reopen the panel
    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    // The preset should still be there
    const presetName = page.locator('text=Persistent Preset')
    await expect(presetName).toBeVisible({ timeout: 3000 })
  })

  test('multiple presets can be saved', async ({ page }) => {
    let dialogCount = 0
    const names = ['Preset Alpha', 'Preset Beta', 'Preset Gamma']
    page.on('dialog', async dialog => {
      await dialog.accept(names[dialogCount])
      dialogCount++
    })

    await chooseHeaderMoreItem(page, 'Tool Presets')
    await page.waitForTimeout(300)

    // Save 3 presets with different tools
    const tools = ['Rectangle (R)', 'Circle (C)', 'Arrow (A)']
    for (let i = 0; i < 3; i++) {
      // Close panel, switch tool, reopen
      await chooseHeaderMoreItem(page, 'Tool Presets')
      await page.waitForTimeout(200)
      await selectTool(page, tools[i])
      await page.waitForTimeout(100)
      await chooseHeaderMoreItem(page, 'Tool Presets')
      await page.waitForTimeout(300)

      const saveBtn = page.locator('text=+ Save Current as Preset')
      await saveBtn.click()
      await page.waitForTimeout(300)
    }

    // All 3 should be visible
    for (const name of names) {
      const preset = page.locator(`text=${name}`)
      await expect(preset).toBeVisible({ timeout: 3000 })
    }
  })
})

// ── Batch Markup Context Menu ────────────────────────────────────────────────

test.describe('Batch Markup Context Menu', () => {
  test('right-click annotation shows Duplicate to Pages option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on the rectangle edge to select it
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const dupToPages = page.locator('text=Duplicate to Pages...')
    await expect(dupToPages).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Copy Style and Paste Style options', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const copyStyle = page.locator('text=Copy Style')
    const pasteStyle = page.locator('text=Paste Style')
    await expect(copyStyle).toBeVisible({ timeout: 3000 })
    await expect(pasteStyle).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Add Comment option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const addComment = page.locator('text=Add Comment')
    await expect(addComment).toBeVisible({ timeout: 3000 })
  })

  test('Paste Style is disabled when no style has been copied', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const pasteStyleBtn = page.locator('button:has-text("Paste Style")')
    await expect(pasteStyleBtn).toBeVisible({ timeout: 3000 })
    // Should be disabled because no style has been copied yet
    await expect(pasteStyleBtn).toBeDisabled()
  })
})
