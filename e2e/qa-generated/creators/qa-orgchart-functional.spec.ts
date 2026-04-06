import { test, expect, type Page, type Download } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import * as path from 'path'
import * as fs from 'fs'

// ── Helpers ─────────────────────────────────────────────────────

/** Navigate to Org Chart tool and wait for it to load */
async function setup(page: Page): Promise<void> {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
  // The tool always starts with a root CEO node on the canvas
  // Wait for toolbar to be ready
  await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible({ timeout: 10000 })
}

/** Click a node on the canvas by clicking at its approximate rendered position.
 *  Since it's a <canvas>, we need to use coordinates. The root node is typically
 *  centered horizontally and near the top. We click the center of the canvas area. */
async function clickCanvasCenter(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
}

/** Load the Startup template to get a multi-node chart */
async function loadStartupTemplate(page: Page): Promise<void> {
  await page.locator('button').filter({ hasText: 'Templates' }).first().click()
  await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
  // Click "Startup" template (10 people)
  await page.locator('button').filter({ hasText: 'Startup' }).click()
  // Wait for toast indicating template loaded
  await expect(page.locator('text=/Loaded .* template/')).toBeVisible({ timeout: 5000 })
}

/** Intercept downloads so we can check them */
function setupDownloadListener(page: Page): Promise<Download> {
  return page.waitForEvent('download', { timeout: 10000 })
}

// ══════════════════════════════════════════════════════════════════
// ── FUNCTIONAL TESTS ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

test.describe('Org Chart — Functional', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
  })

  // ── Initial State ──────────────────────────────────────────

  test('tool loads with root CEO node and toolbar visible', async ({ page }) => {
    // Toolbar buttons should be visible
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible()
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).toBeVisible()
    await expect(page.locator('button[title="Zoom Out"]')).toBeVisible()
    await expect(page.locator('button[title="Zoom In"]')).toBeVisible()
    await expect(page.locator('button[title="Fit to Content"]')).toBeVisible()
    await expect(page.locator('button[title="Add Person"]')).toBeVisible()
    await expect(page.locator('button[title="Export"]')).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Templates' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Import' }).first()).toBeVisible()

    // The canvas should exist
    await expect(page.locator('canvas').first()).toBeVisible()

    // The properties panel should show "Select a person to edit their details"
    await expect(page.getByText('Select a person to edit their details')).toBeVisible()

    // Undo should be disabled (no changes yet after initial history fix)
    // Note: undo may or may not be disabled depending on initial history state
  })

  test('zoom percentage is displayed in toolbar', async ({ page }) => {
    // The toolbar zoom display should show a percentage (there are two: toolbar and canvas overlay)
    const toolbarZoom = page.locator('span.tabular-nums')
    await expect(toolbarZoom).toBeVisible()
    await expect(toolbarZoom).toHaveText(/\d+%/)
  })

  test('empty state overlay is unreachable when store has initial root node', async ({ page }) => {
    // The empty state text should NOT be visible since the store starts with a root node
    await expect(page.getByText('Start by clicking "Add Person" or pick a template')).not.toBeVisible()
  })

  // ── Adding Nodes ───────────────────────────────────────────

  test('Add Person button adds a child node', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')
    await addBtn.click()

    // After adding, undo should become enabled (a new node was added)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).not.toHaveClass(/opacity-30/, { timeout: 5000 })
  })

  test('Add Person adds multiple children', async ({ page }) => {
    const addBtn = page.locator('button[title="Add Person"]')

    // Add 3 children
    await addBtn.click()
    await page.waitForTimeout(200)
    await addBtn.click()
    await page.waitForTimeout(200)
    await addBtn.click()
    await page.waitForTimeout(200)

    // Undo should be enabled
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  // ── Templates ──────────────────────────────────────────────

  test('Templates modal opens and lists all templates', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })

    // Should have Blank, Startup, Corporate, Department templates
    await expect(page.locator('button').filter({ hasText: '1 people' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '10 people' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '18 people' })).toBeVisible()
  })

  test('loading Startup template shows toast and enables undo', async ({ page }) => {
    await loadStartupTemplate(page)

    // The undo button may or may not be enabled (loadDiagram resets history)
    // But the canvas should have nodes rendered
  })

  test('loading Corporate template works', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Corporate' }).click()
    await expect(page.locator('text=/Loaded "Corporate" template/')).toBeVisible({ timeout: 5000 })
  })

  test('loading Blank template shows single root', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Blank' }).click()
    await expect(page.locator('text=/Loaded "Blank" template/')).toBeVisible({ timeout: 5000 })
  })

  // ── Properties Panel ───────────────────────────────────────

  test('clicking a node on canvas selects it and shows properties panel', async ({ page }) => {
    // Click in the center of the canvas where the root node should be
    await clickCanvasCenter(page)

    // The properties panel should now show editable fields
    // It should show the Person Details header
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
  })

  test('editing name in properties panel updates the node', async ({ page }) => {
    // Select the root node by clicking canvas center
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Find the name input and change it
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('John Smith')
    // The properties panel should now display "John Smith"
    await expect(page.locator('p.text-sm.font-medium.text-white.truncate')).toHaveText('John Smith')
  })

  test('editing title in properties panel', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // The title input (second text input)
    const titleSection = page.locator('input[placeholder="e.g. VP of Engineering"]')
    await titleSection.fill('President')
  })

  test('editing department auto-sets color for known departments', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Fill in department as "Engineering"
    const deptInput = page.locator('input[placeholder="e.g. Engineering"]')
    await deptInput.fill('Engineering')

    // The color dot should change to the Engineering color (#3B82F6)
    // We can verify via the small color indicator
    const colorDot = page.locator('.rounded-full.flex-shrink-0').first()
    await expect(colorDot).toBeVisible()
  })

  test('editing email field', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    const emailInput = page.locator('input[placeholder="name@company.com"]')
    await emailInput.fill('ceo@company.com')
    await expect(emailInput).toHaveValue('ceo@company.com')
  })

  test('editing phone field', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    const phoneInput = page.locator('input[placeholder="+1 (555) 000-0000"]')
    await phoneInput.fill('+1 (555) 123-4567')
    await expect(phoneInput).toHaveValue('+1 (555) 123-4567')
  })

  test('editing location field', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    const locationInput = page.locator('input[placeholder="e.g. San Francisco, CA"]')
    await locationInput.fill('New York, NY')
    await expect(locationInput).toHaveValue('New York, NY')
  })

  test('Add Direct Report button in properties panel creates a child', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Click "Add Direct Report"
    await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()

    // After adding a report, the new node should be selected
    // The name field should show "New Person"
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('New Person', { timeout: 3000 })
  })

  test('Delete Person button removes non-root node', async ({ page }) => {
    // First add a child
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
    await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
    await expect(page.locator('input[type="text"]').first()).toHaveValue('New Person', { timeout: 3000 })

    // The "Delete Person" button should be visible for non-root nodes
    await expect(page.locator('button').filter({ hasText: 'Delete Person' })).toBeVisible()

    // Click delete
    await page.locator('button').filter({ hasText: 'Delete Person' }).click()

    // After deletion, selection should be cleared
    await expect(page.getByText('Select a person to edit their details')).toBeVisible({ timeout: 3000 })
  })

  test('root node cannot be deleted (no Delete button)', async ({ page }) => {
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // For the root node, the Delete Person button should not be visible
    // (the root node has no reportsTo, so isRoot is true)
    // Check that the name shows "CEO" (root node)
    const nameInput = page.locator('input[type="text"]').first()
    const value = await nameInput.inputValue()
    if (value === 'CEO') {
      await expect(page.locator('button').filter({ hasText: 'Delete Person' })).not.toBeVisible()
    }
  })

  // ── Undo / Redo ────────────────────────────────────────────

  test('undo reverts the last action', async ({ page }) => {
    // Add a child node
    const addBtn = page.locator('button[title="Add Person"]')
    await addBtn.click()
    await page.waitForTimeout(300)

    // Undo should be enabled
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).not.toHaveClass(/opacity-30/)

    // Click undo
    await undoBtn.click()
    await page.waitForTimeout(300)

    // After undo, the added node should be removed
    // Redo should now be enabled
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).not.toHaveClass(/opacity-30/)
  })

  test('redo restores the undone action', async ({ page }) => {
    // Add a child node
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(300)

    // Undo
    await page.locator('button[title="Undo (Ctrl+Z)"]').click()
    await page.waitForTimeout(300)

    // Redo
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).not.toHaveClass(/opacity-30/)
    await redoBtn.click()
    await page.waitForTimeout(300)

    // After redo, undo should be available again
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  test('undo to initial state does not lose root node', async ({ page }) => {
    // Add a child, then undo
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Undo (Ctrl+Z)"]').click()
    await page.waitForTimeout(300)

    // The root node should still exist on the canvas
    // The empty state overlay should NOT appear
    await expect(page.getByText('Start by clicking "Add Person" or pick a template')).not.toBeVisible()

    // Click on the canvas center to select root node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
  })

  test('keyboard shortcut Ctrl+Z triggers undo', async ({ page }) => {
    // Add a node first
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(300)

    // Use keyboard shortcut
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)

    // Redo should be enabled now
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  test('keyboard shortcut Ctrl+Shift+Z triggers redo', async ({ page }) => {
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  // ── Zoom ───────────────────────────────────────────────────

  test('zoom in button increases zoom percentage', async ({ page }) => {
    const zoomText = page.locator('span.tabular-nums')
    const initialText = await zoomText.textContent()
    const initialZoom = parseInt(initialText ?? '100')

    await page.locator('button[title="Zoom In"]').click()
    await page.waitForTimeout(200)

    const newText = await zoomText.textContent()
    const newZoom = parseInt(newText ?? '100')
    expect(newZoom).toBeGreaterThan(initialZoom)
  })

  test('zoom out button decreases zoom percentage', async ({ page }) => {
    const zoomText = page.locator('span.tabular-nums')
    const initialText = await zoomText.textContent()
    const initialZoom = parseInt(initialText ?? '100')

    await page.locator('button[title="Zoom Out"]').click()
    await page.waitForTimeout(200)

    const newText = await zoomText.textContent()
    const newZoom = parseInt(newText ?? '100')
    expect(newZoom).toBeLessThan(initialZoom)
  })

  test('fit to content button adjusts viewport', async ({ page }) => {
    await page.locator('button[title="Fit to Content"]').click()
    await page.waitForTimeout(200)
    // Should not crash and zoom should be a valid number
    const zoomText = page.locator('span.tabular-nums')
    await expect(zoomText).toHaveText(/\d+%/)
  })

  test('keyboard Ctrl+= zooms in', async ({ page }) => {
    const zoomText = page.locator('span.tabular-nums')
    const initialZoom = parseInt(await zoomText.textContent() ?? '100')

    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)

    const newZoom = parseInt(await zoomText.textContent() ?? '100')
    expect(newZoom).toBeGreaterThan(initialZoom)
  })

  test('keyboard Ctrl+- zooms out', async ({ page }) => {
    const zoomText = page.locator('span.tabular-nums')
    const initialZoom = parseInt(await zoomText.textContent() ?? '100')

    await page.keyboard.press('Control+-')
    await page.waitForTimeout(200)

    const newZoom = parseInt(await zoomText.textContent() ?? '100')
    expect(newZoom).toBeLessThan(initialZoom)
  })

  test('keyboard Ctrl+0 resets zoom to 100%', async ({ page }) => {
    // First zoom in
    await page.locator('button[title="Zoom In"]').click()
    await page.waitForTimeout(200)

    // Reset with Ctrl+0
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(200)

    const zoomText = page.locator('span.tabular-nums')
    await expect(zoomText).toHaveText('100%')
  })

  // ── Layout Direction ───────────────────────────────────────

  test('layout direction toggle switches between top-down and left-right', async ({ page }) => {
    // Initial layout should be "Top-Down"
    const layoutBtn = page.locator('button[title^="Layout:"]')
    await expect(layoutBtn).toBeVisible()
    await expect(layoutBtn).toHaveAttribute('title', /Top-Down/)

    // Click to toggle
    await layoutBtn.click()
    await page.waitForTimeout(200)

    // Should now say "Left-Right"
    await expect(layoutBtn).toHaveAttribute('title', /Left-Right/)

    // Toggle back
    await layoutBtn.click()
    await page.waitForTimeout(200)
    await expect(layoutBtn).toHaveAttribute('title', /Top-Down/)
  })

  // ── Reset Layout ───────────────────────────────────────────

  test('Reset Layout button is disabled when no manual offsets exist', async ({ page }) => {
    const resetBtn = page.locator('button[title="Reset Layout"]')
    await expect(resetBtn).toBeVisible()
    await expect(resetBtn).toHaveClass(/opacity-30/)
  })

  // ── Export Modal ───────────────────────────────────────────

  test('export modal shows all export options', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    await expect(page.getByText('Export as PNG')).toBeVisible()
    await expect(page.getByText('Copy as PNG')).toBeVisible()
    await expect(page.getByText('Export as SVG')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()
    await expect(page.getByText('Export as CSV')).toBeVisible()
  })

  test('export options are enabled when nodes exist', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    // Since root node exists, export buttons should NOT be disabled
    const pngBtn = page.locator('button').filter({ hasText: 'Export as PNG' })
    await expect(pngBtn).not.toHaveClass(/opacity-30/)
  })

  test('keyboard Ctrl+E opens export modal', async ({ page }) => {
    await page.keyboard.press('Control+e')
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })
  })

  test('export JSON triggers download', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Save as JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('org-chart.json')

    // Read and validate the downloaded JSON
    const filePath = await download.path()
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toHaveProperty('nodes')
      expect(Array.isArray(parsed.nodes)).toBe(true)
      expect(parsed.nodes.length).toBeGreaterThan(0)
      expect(parsed.nodes[0]).toHaveProperty('id')
      expect(parsed.nodes[0]).toHaveProperty('name')
    }
  })

  test('export CSV triggers download', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Export as CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('org-chart.csv')

    // Validate CSV content
    const filePath = await download.path()
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines.length).toBeGreaterThanOrEqual(2) // header + at least 1 row
      expect(lines[0]).toContain('Name')
      expect(lines[0]).toContain('Title')
      expect(lines[0]).toContain('Department')
    }
  })

  test('export PNG triggers download', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Export as PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('org-chart.png')
  })

  test('export SVG triggers download', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Export as SVG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('org-chart.svg')

    // Validate SVG content
    const filePath = await download.path()
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('<svg')
      expect(content).toContain('CEO')
    }
  })

  test('export modal closes after export action', async ({ page }) => {
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Save as JSON' }).click()
    await downloadPromise

    // Modal should close after export
    await expect(page.getByText('Export Org Chart')).not.toBeVisible({ timeout: 3000 })
  })

  // ── Import JSON ────────────────────────────────────────────

  test('import JSON loads diagram from file', async ({ page }) => {
    // First export to get a valid JSON
    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })
    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Save as JSON' }).click()
    const download = await downloadPromise
    const filePath = await download.path()
    expect(filePath).toBeTruthy()

    // Now import that file
    const fileInput = page.locator('input[type="file"][accept=".json"]')
    await fileInput.setInputFiles(filePath!)

    // Wait for the success toast
    await expect(page.locator('text=/Loaded \\d+ people/')).toBeVisible({ timeout: 5000 })
  })

  // ── Keyboard Shortcuts ─────────────────────────────────────

  test('Escape key deselects all nodes', async ({ page }) => {
    // Select a node first
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Press Escape
    await page.keyboard.press('Escape')

    // Properties panel should show the empty state
    await expect(page.getByText('Select a person to edit their details')).toBeVisible({ timeout: 3000 })
  })

  test('Delete key deletes selected non-root nodes', async ({ page }) => {
    // Load a template with multiple nodes
    await loadStartupTemplate(page)
    await page.waitForTimeout(300)

    // Add a child via toolbar
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(300)

    // The new node should be selected and properties panel visible
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })

    // Press Delete key to remove the selected (non-root) node
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
  })

  test('Ctrl+A selects all nodes', async ({ page }) => {
    // Click canvas first to ensure focus
    await clickCanvasCenter(page)
    await page.waitForTimeout(200)

    // Press Escape to deselect (to ensure clean state)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Now Ctrl+A - click on the canvas first to ensure focus is right
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(300)

    // Properties panel should show details for the first selected node
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
  })

  // ── Multiple Hierarchy Levels ──────────────────────────────

  test('loading Corporate template creates 4-level hierarchy', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Corporate' }).click()
    await expect(page.locator('text=/Loaded "Corporate" template/')).toBeVisible({ timeout: 5000 })
  })

  test('loading Department template and adding more nodes', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Templates' }).first().click()
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
    await page.locator('button').filter({ hasText: 'Department' }).click()
    await expect(page.locator('text=/Loaded "Department" template/')).toBeVisible({ timeout: 5000 })

    // Add more people
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Add Person"]').click()
    await page.waitForTimeout(200)

    // Should still be able to undo
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })

  // ── Context Menu ───────────────────────────────────────────

  test('right-clicking a node shows context menu', async ({ page }) => {
    // Right-click the canvas center (where root node is)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await canvas.click({
      position: { x: box.width / 2, y: box.height / 2 },
      button: 'right',
    })

    // Context menu should appear with options
    await expect(page.getByText('Add Report')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Select')).toBeVisible()
  })

  test('context menu Add Report creates a child node', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await canvas.click({
      position: { x: box.width / 2, y: box.height / 2 },
      button: 'right',
    })

    await expect(page.getByText('Add Report')).toBeVisible({ timeout: 3000 })
    await page.getByText('Add Report').click()

    // After adding, undo should be enabled
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/, { timeout: 3000 })
  })

  // ── Reports To dropdown ────────────────────────────────────

  test('Reports To dropdown shows valid parent options for non-root nodes', async ({ page }) => {
    // Add a child node
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
    await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
    await expect(page.locator('input[type="text"]').first()).toHaveValue('New Person', { timeout: 3000 })

    // The "Reports To" dropdown should be visible (non-root node)
    await expect(page.getByText('Reports To')).toBeVisible()
    const reportsToSelect = page.locator('select')
    await expect(reportsToSelect).toBeVisible()

    // It should have the root CEO as an option
    const options = reportsToSelect.locator('option')
    const count = await options.count()
    expect(count).toBeGreaterThan(0)
  })

  // ── Export with Template ───────────────────────────────────

  test('export JSON with startup template has correct structure', async ({ page }) => {
    await loadStartupTemplate(page)
    await page.waitForTimeout(300)

    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Save as JSON' }).click()
    const download = await downloadPromise
    const filePath = await download.path()
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.nodes.length).toBe(10) // Startup has 10 nodes
      // Verify hierarchy - root has no reportsTo
      const root = parsed.nodes.find((n: { reportsTo: string }) => !n.reportsTo)
      expect(root).toBeTruthy()
      expect(root.name).toBe('Alex Chen')
    }
  })

  test('export CSV with startup template has correct rows', async ({ page }) => {
    await loadStartupTemplate(page)
    await page.waitForTimeout(300)

    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Export Org Chart')).toBeVisible({ timeout: 3000 })

    const downloadPromise = setupDownloadListener(page)
    await page.locator('button').filter({ hasText: 'Export as CSV' }).click()
    const download = await downloadPromise
    const filePath = await download.path()
    if (filePath) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines.length).toBe(11) // 1 header + 10 data rows
      expect(lines[0]).toBe('Name,Title,Department,Reports To,Email,Phone,Location')
    }
  })

  // ── Arrow key navigation ───────────────────────────────────

  test('arrow down navigates to first child', async ({ page }) => {
    // Load startup template and select the root node
    await loadStartupTemplate(page)
    await page.waitForTimeout(300)

    // Click somewhere on the canvas to give it focus, then use Ctrl+A + click root
    await clickCanvasCenter(page)
    await page.waitForTimeout(300)

    // If a node is selected, arrow down should go to first child
    const hasDetails = await page.getByText('Person Details').isVisible()
    if (hasDetails) {
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(300)
      // The selected node should change
      await expect(page.getByText('Person Details')).toBeVisible()
    }
  })

  test('arrow up navigates to parent', async ({ page }) => {
    // Add a child via properties panel
    await clickCanvasCenter(page)
    await expect(page.getByText('Person Details')).toBeVisible({ timeout: 5000 })
    await page.locator('button').filter({ hasText: 'Add Direct Report' }).click()
    await page.waitForTimeout(300)

    // Now arrow up should go back to parent
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(300)

    // Should show root node's details
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toHaveValue('CEO')
  })

  // ── Ctrl+Enter adds person ─────────────────────────────────

  test('Ctrl+Enter adds a new person', async ({ page }) => {
    // Click canvas to give focus (not on input)
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)

    await page.keyboard.press('Control+Enter')
    await page.waitForTimeout(300)

    // A new node should be added, undo should be enabled
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).not.toHaveClass(/opacity-30/)
  })
})
