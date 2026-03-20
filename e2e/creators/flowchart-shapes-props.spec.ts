import { test, expect, type Page } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'

async function importNodes(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Import from Text/i }).click()
  const textarea = page.locator('textarea[placeholder="Type your flowchart here..."]')
  await textarea.fill('START\nProcess Step 1\nIF Decision?\nYES: Path A\nNO: Path B\nEND')
  await page.getByRole('button', { name: /^Import$/i }).click()
  await page.waitForTimeout(500)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'flowchart')
  await expect(page.getByText('Shapes').first()).toBeVisible({ timeout: 10000 })
})

test.describe('Flowchart — Shape Library New Shapes', () => {
  test('Flowchart category contains new ISO 5807 shapes', async ({ page }) => {
    // Categories start expanded by default — verify the Flowchart shapes are already visible
    const expectedShapes = [
      'Predefined Process',
      'Manual Operation',
      'Manual Input',
      'Delay',
      'On-Page Ref',
      'Off-Page Ref',
      'Stored Data',
    ]

    for (const shapeName of expectedShapes) {
      await expect(page.locator(`button[title="${shapeName}"]`)).toBeVisible({ timeout: 3000 })
    }

    // "Document" label exists in both Flowchart and Misc categories — verify at least one is visible
    await expect(page.locator('button[title="Document"]').first()).toBeVisible({ timeout: 3000 })
  })

  test('Containers category exists with Swim Lane shape', async ({ page }) => {
    // The Containers category button should be visible
    const containersCategory = page.locator('button').filter({ hasText: 'Containers' })
    await expect(containersCategory).toBeVisible()

    // Categories start expanded — Swim Lane tile should already be visible
    await expect(page.locator('button[title="Swim Lane"]')).toBeVisible({ timeout: 3000 })
  })

  test('shape tiles have draggable attribute', async ({ page }) => {
    // Verify tiles in the shape library grid have draggable="true"
    const shapeTiles = page.locator('.grid.grid-cols-2 button')
    const count = await shapeTiles.count()
    expect(count).toBeGreaterThan(0)

    // Check the first tile
    const draggable = await shapeTiles.first().getAttribute('draggable')
    expect(draggable).toBe('true')
  })

  test('total shape count is at least 21', async ({ page }) => {
    // All categories start expanded — count all shape tiles with title attribute
    const allTiles = page.locator('.grid.grid-cols-2 button[title]')
    const totalCount = await allTiles.count()
    expect(totalCount).toBeGreaterThanOrEqual(21)
  })
})

test.describe('Flowchart — Properties Panel', () => {
  test('properties panel shows Bold, Italic, and Alignment buttons when node selected', async ({ page }) => {
    await importNodes(page)

    // The empty state should be gone
    await expect(page.getByText('Start by placing shapes from the left panel')).not.toBeVisible({ timeout: 3000 })

    // The canvas SVG has a foreignObject per node that displays the label text.
    // The foreignObject has pointerEvents="none", but the node <g> group and its
    // <path> handle clicks. We use the text content to locate the foreignObject,
    // then get its parent <g> bounding box to click on the shape path.
    //
    // Alternative approach: find the bounding rect of a visible node path in the
    // canvas SVG and click it using force.
    const canvasSvg = page.locator('svg[role="application"]')
    await expect(canvasSvg).toBeVisible({ timeout: 3000 })

    // Locate a visible node path with an actual fill (not the transparent edge hit-paths)
    // Node paths have fills like "rgba(34,197,94,0.12)" or "rgba(244,123,32,0.08)"
    const visibleNodePath = canvasSvg.locator('g > path[fill]:not([fill="none"])').first()
    await visibleNodePath.click({ force: true, timeout: 5000 })

    // The properties panel should now show text style buttons
    await expect(page.locator('button[title="Bold"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button[title="Italic"]')).toBeVisible({ timeout: 3000 })

    // Alignment buttons
    await expect(page.locator('button[title="Left"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button[title="Center"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button[title="Right"]')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Flowchart — Construction Templates', () => {
  test('Templates dropdown includes construction templates', async ({ page }) => {
    // Open the import text modal
    await page.getByRole('button', { name: /Import from Text/i }).click()
    await expect(page.locator('textarea[placeholder="Type your flowchart here..."]')).toBeVisible({ timeout: 3000 })

    // Open the Templates dropdown
    const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).last()
    await expect(templatesButton).toBeVisible()
    await templatesButton.click()

    // Verify construction templates are listed
    const constructionTemplates = [
      'RFI Workflow',
      'Submittal Process',
      'Building Inspection',
      'Safety Procedure',
      'Permit Acquisition',
    ]

    for (const templateName of constructionTemplates) {
      await expect(page.getByText(templateName, { exact: true }).first()).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Flowchart — Multi-Page Tabs', () => {
  test('page tab bar shows Page 1 and has add page button', async ({ page }) => {
    // The page tab bar should be visible below the canvas
    await expect(page.getByText('Page 1')).toBeVisible({ timeout: 5000 })

    // The "+" button to add a page should exist
    const addPageButton = page.locator('button[title="Add page"]')
    await expect(addPageButton).toBeVisible()
  })

  test('clicking add page creates a new page tab', async ({ page }) => {
    await expect(page.getByText('Page 1')).toBeVisible({ timeout: 5000 })

    const addPageButton = page.locator('button[title="Add page"]')
    await addPageButton.click()

    // Page 2 should now appear
    await expect(page.getByText('Page 2')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Flowchart — Layers Panel', () => {
  test('layers button toggles layer panel visibility', async ({ page }) => {
    // The Layers toggle button should be visible
    const layersButton = page.getByText('Layers', { exact: true }).first()
    await expect(layersButton).toBeVisible({ timeout: 5000 })

    // Click to open the layer panel
    await layersButton.click()

    // The layer panel should show "Default" layer and "Add Layer" button
    await expect(page.getByText('Default')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Add Layer')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Flowchart — Grouping No-Op', () => {
  test('Ctrl+G with nothing selected does not crash', async ({ page }) => {
    await importNodes(page)

    // The empty state should be gone
    await expect(page.getByText('Start by placing shapes from the left panel')).not.toBeVisible({ timeout: 3000 })

    // Click on empty canvas area to deselect everything
    const svgCanvas = page.locator('svg').first()
    await svgCanvas.click({ position: { x: 10, y: 10 } })

    // Press Ctrl+G with nothing selected — should be a no-op, no crash
    await page.keyboard.press('Control+g')

    // The page should still be functional — verify shape library is still visible
    await expect(page.getByText('Shapes').first()).toBeVisible({ timeout: 3000 })
  })
})
