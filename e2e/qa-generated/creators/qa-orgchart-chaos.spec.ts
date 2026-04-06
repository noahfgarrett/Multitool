import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'

// ── Helpers ─────────────────────────────────────────────────────

async function setup(page: Page): Promise<void> {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
  await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible({ timeout: 10000 })
}

async function clickCanvasCenter(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
}

async function loadStartupTemplate(page: Page): Promise<void> {
  await page.locator('button').filter({ hasText: 'Templates' }).first().click()
  await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
  await page.locator('button').filter({ hasText: 'Startup' }).click()
  await expect(page.locator('text=/Loaded .* template/')).toBeVisible({ timeout: 5000 })
}

// ══════════════════════════════════════════════════════════════════
// ── CHAOS TESTS ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

test.describe('Org Chart — Chaos', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
  })

  test('rapid node creation — 20 nodes added quickly', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')

    for (let i = 0; i < 20; i++) {
      await addBtn.click()
      // Minimal wait to let React process
      await page.waitForTimeout(50)
    }

    // App should still be responsive — toolbar buttons should be visible
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible()
    await expect(page.locator('button[title="Zoom In"]')).toBeVisible()

    // Undo should be enabled
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  test('rapid undo after multiple additions', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')

    // Add 10 nodes
    for (let i = 0; i < 10; i++) {
      await addBtn.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)

    // Undo all 10
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    for (let i = 0; i < 10; i++) {
      await undoBtn.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)

    // Should still be functional
    await expect(page.locator('button[title="Add Person"]')).toBeVisible()
  })

  test('rapid undo/redo cycling', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')
    await addBtn.click()
    await page.waitForTimeout(200)

    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')

    // Rapidly cycle undo/redo 15 times
    for (let i = 0; i < 15; i++) {
      await undoBtn.click()
      await page.waitForTimeout(30)
      await redoBtn.click()
      await page.waitForTimeout(30)
    }

    // App should still be responsive
    await expect(page.locator('button[title="Add Person"]')).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('delete while editing properties', async ({ page }) => {
    // Select root and add a child
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
    await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
    await page.waitForTimeout(300)

    // Start editing the name
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Editing This Person')
    await page.waitForTimeout(100)

    // Click on the canvas to blur the input, then press Escape to deselect
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // The node should still be in the chart, no crash
    await expect(page.getByText('Select a person to edit their details')).toBeVisible()
  })

  test('rapid zoom in and out', async ({ page }) => {
    const zoomIn = page.locator('button[title="Zoom In"]')
    const zoomOut = page.locator('button[title="Zoom Out"]')

    // Zoom in 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await zoomIn.click()
      await page.waitForTimeout(30)
    }

    // Zoom out 15 times (should clamp at minimum)
    for (let i = 0; i < 15; i++) {
      await zoomOut.click()
      await page.waitForTimeout(30)
    }

    // App should still be responsive
    await expect(page.locator('canvas').first()).toBeVisible()
    const zoomText = page.locator('span.tabular-nums')
    await expect(zoomText).toHaveText(/\d+%/)
  })

  test('rapid template switching', async ({ page }) => {
    // Load Startup
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Startup' }).click()
    await expect(page.locator('text=/Loaded .* template/')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(200)

    // Switch to Corporate
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Corporate' }).click()
    await expect(page.locator('text=/Loaded "Corporate" template/')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(200)

    // Switch to Department
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Department' }).click()
    await expect(page.locator('text=/Loaded "Department" template/')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(200)

    // Switch to Blank
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Blank' }).click()
    await expect(page.locator('text=/Loaded "Blank" template/')).toBeVisible({ timeout: 5000 })

    // App should still be responsive
    await expect(page.locator('button[title="Add Person"]')).toBeVisible()
  })

  test('export while editing properties', async ({ page }) => {
    // Select a node and start editing
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Half-edited Name')

    // Open export modal while editing
    // Note: Ctrl+E won't work in input field (shortcuts are suppressed in inputs)
    // Use the toolbar button instead
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    // Export should work
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button').filter({ hasText: 'Save as JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('org-chart.json')
  })

  test('deep nesting — 10 levels deep', async ({ page }) => {
    // Select root node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Add 10 levels of direct reports (each child becomes the new selection)
    for (let i = 0; i < 10; i++) {
      await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
      await page.waitForTimeout(200)
      // Verify the new node is selected
      await expect(page.locator('input[type="text"]').first()).toHaveValue('New Person')
    }

    // Should still be functional
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)

    // Navigate up with arrow keys
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(100)
    }

    // Should be back at root
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('CEO')
  })

  test('add many siblings then delete them', async ({ page }) => {
    // Select root node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Add 5 direct reports
    for (let i = 0; i < 5; i++) {
      // Re-select root (arrow up to be safe)
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(100)
      await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
      await page.waitForTimeout(200)
    }

    // Now delete all non-root nodes by pressing Delete repeatedly
    for (let i = 0; i < 5; i++) {
      // The currently selected node should be the last added child
      const deleteBtn = page.locator('button').filter({ hasText: 'Delete Person' })
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
        await page.waitForTimeout(200)
        // After deletion, select the root and navigate to a child if any
        await clickCanvasCenter(page)
        await page.waitForTimeout(200)
        await page.keyboard.press('ArrowDown')
        await page.waitForTimeout(200)
      }
    }

    // App should still function
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('keyboard shortcuts do not fire while typing in input', async ({ page }) => {
    // Select a node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Focus the name input
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.click()
    await nameInput.fill('')

    // Type 'z' which should NOT trigger undo (it's Ctrl+Z, not just 'z')
    await nameInput.type('z')
    await expect(nameInput).toHaveValue('z')

    // Type 'a' which should NOT trigger select-all
    await nameInput.type('a')
    await expect(nameInput).toHaveValue('za')
  })

  test('open and close modals rapidly', async ({ page }) => {
    const exportBtn = page.locator('button[title="Export"]')
    const templatesBtn = page.locator('button').filter({ hasText: 'Templates' }).first()

    // Rapid open/close export modal
    for (let i = 0; i < 5; i++) {
      await exportBtn.click()
      await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    // Rapid open/close templates modal
    for (let i = 0; i < 5; i++) {
      await templatesBtn.click()
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    // App should still function
    await expect(exportBtn).toBeVisible()
    await expect(templatesBtn).toBeVisible()
  })

  test('multiple undo past initial state does not crash', async ({ page }) => {
    // Add a few nodes
    const addBtn = page.locator('button[title="Add Person"]')
    await addBtn.click()
    await page.waitForTimeout(100)
    await addBtn.click()
    await page.waitForTimeout(100)

    // Click canvas to take focus off any input (so shortcuts work)
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(100)

    // Undo way more times than changes made via keyboard (avoids disabled button click issues)
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }

    // App should still be responsive and not crash
    await expect(canvas).toBeVisible()
    await expect(page.locator('button[title="Add Person"]')).toBeVisible()
  })

  test('multiple redo past the end does not crash', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')
    await addBtn.click()
    await page.waitForTimeout(100)

    // Click canvas to take focus off any input
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(100)

    // Undo once via keyboard
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)

    // Redo way more times than possible via keyboard
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(30)
    }

    // App should not crash
    await expect(canvas).toBeVisible()
  })

  test('editing multiple fields then undoing', async ({ page }) => {
    // Select the root node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Edit name
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Modified CEO')
    await page.waitForTimeout(200)

    // Edit title
    const titleInput = page.locator('input[placeholder="e.g. VP of Engineering"]')
    await titleInput.fill('Supreme Leader')
    await page.waitForTimeout(200)

    // Edit department
    const deptInput = page.locator('input[placeholder="e.g. Engineering"]')
    await deptInput.fill('Leadership')
    await page.waitForTimeout(200)

    // Undo multiple times
    // First click canvas to take focus out of inputs (so shortcuts work)
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    // Should have reverted some edits
    // App should still function
    await expect(canvas).toBeVisible()
  })

  test('zoom then add nodes then zoom back', async ({ page }) => {
    // Zoom way in
    const zoomIn = page.locator('button[title="Zoom In"]')
    for (let i = 0; i < 5; i++) {
      await zoomIn.click()
      await page.waitForTimeout(50)
    }

    // Add nodes
    const addBtn = page.locator('button[title="Add Person"]')
    for (let i = 0; i < 3; i++) {
      await addBtn.click()
      await page.waitForTimeout(100)
    }

    // Fit to content
    await page.locator('button[title="Fit to Content"]').click()
    await page.waitForTimeout(300)

    // Should be responsive
    await expect(page.locator('canvas').first()).toBeVisible()
    const zoomText = page.locator('span.tabular-nums')
    await expect(zoomText).toHaveText(/\d+%/)
  })

  test('wheel scroll for zoom does not crash', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    // Simulate wheel events by using mouse wheel
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -100) // zoom in
    await page.waitForTimeout(100)
    await page.mouse.wheel(0, 100) // zoom out
    await page.waitForTimeout(100)

    // App should still function
    await expect(canvas).toBeVisible()
  })

  test('switching layout direction with many nodes', async ({ page }) => {
    // Load corporate template (18 nodes)
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Corporate' }).click()
    await expect(page.locator('text=/Loaded "Corporate" template/')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(300)

    // Toggle layout direction multiple times
    const layoutBtn = page.locator('button[title^="Layout:"]')
    for (let i = 0; i < 6; i++) {
      await layoutBtn.click()
      await page.waitForTimeout(200)
    }

    // Should still be functional
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(layoutBtn).toBeVisible()
  })
})
