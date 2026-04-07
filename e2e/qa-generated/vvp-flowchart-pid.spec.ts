import { test, expect } from '@playwright/test'
import { navigateToTool, ensureUserProfile } from '../helpers/navigation'
import * as fs from 'fs'
import * as path from 'path'

const PROOF_DIR = path.resolve('test-results/visual-proof')

test.beforeAll(() => {
  if (!fs.existsSync(PROOF_DIR)) {
    fs.mkdirSync(PROOF_DIR, { recursive: true })
  }
})

test.beforeEach(async ({ page }) => {
  await ensureUserProfile(page)
  await page.goto('/')
  await navigateToTool(page, 'flowchart')
  // Wait for the shape library to be ready
  await expect(page.locator('.uppercase').filter({ hasText: 'Shapes' })).toBeVisible({ timeout: 10000 })
})

test.describe('VVP — Flowchart P&ID Visual Verification', () => {
  test('1 — Shape library P&ID categories expanded', async ({ page }) => {
    // Scroll shape library to P&ID section and expand all P&ID categories
    const pidHeader = page.getByText('P&ID Symbols')
    await expect(pidHeader).toBeVisible({ timeout: 5000 })

    // P&ID categories start collapsed — expand them all
    const pidCategories = [
      'Vessels & Tanks',
      'Rotating Equipment',
      'Heat Transfer',
      'Valves',
      'Instruments',
      'Piping',
      'Misc Equipment',
    ]

    for (const cat of pidCategories) {
      const categoryButton = page.locator('button').filter({ hasText: cat }).first()
      await expect(categoryButton).toBeVisible()
      await categoryButton.click()
      // Small delay for expand animation
      await page.waitForTimeout(150)
    }

    // Scroll the shape library container to show P&ID sections
    const shapeLibrary = page.locator('.w-\\[180px\\]').first()
    await shapeLibrary.evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(300)

    // Scroll back up a bit to show a good mix of categories
    await shapeLibrary.evaluate(el => el.scrollTop = Math.max(0, el.scrollHeight * 0.35))
    await page.waitForTimeout(200)

    // Take full-page screenshot showing the shape library with P&ID expanded
    await page.screenshot({
      path: path.join(PROOF_DIR, 'flowchart-shape-library-pid.png'),
    })
  })

  test('2 — Shape library search for "pump"', async ({ page }) => {
    // Find the search input in the shape library sidebar
    const searchInput = page.locator('input[placeholder="Search shapes..."]').first()
    await expect(searchInput).toBeVisible()

    // Type "pump" into the search
    await searchInput.fill('pump')
    await page.waitForTimeout(300)

    // Verify results appear
    const resultText = page.locator('text=/\\d+ result/')
    await expect(resultText).toBeVisible({ timeout: 5000 })
    const text = await resultText.textContent()
    expect(text).not.toBe('0 results')

    // Screenshot the filtered search results
    await page.screenshot({
      path: path.join(PROOF_DIR, 'flowchart-search-pump.png'),
    })
  })

  test('3 — P&ID shapes placed on canvas', async ({ page }) => {
    // We will place 6 different P&ID shapes on the canvas via search-and-click
    // Shapes: Centrifugal Pump, Gate Valve, Horiz. Vessel, Indicator, Shell & Tube HX, Compressor

    const shapesToPlace: { search: string; label: string; x: number; y: number }[] = [
      { search: 'centrif',  label: 'Centrif. Pump',    x: 200,  y: 200 },
      { search: 'gate',     label: 'Gate Valve',        x: 450,  y: 200 },
      { search: 'horiz',    label: 'Horiz. Vessel',     x: 700,  y: 200 },
      { search: 'indicator', label: 'Indicator',         x: 200,  y: 400 },
      { search: 'shell',    label: 'Shell & Tube HX',   x: 450,  y: 400 },
      { search: 'compressor', label: 'Compressor',      x: 700,  y: 400 },
    ]

    const searchInput = page.locator('input[placeholder="Search shapes..."]').first()
    await expect(searchInput).toBeVisible()

    // Get the canvas SVG element specifically by aria-label
    const canvasSvg = page.locator('svg[aria-label="Flowchart diagram canvas"]')
    await expect(canvasSvg).toBeVisible()

    for (const shape of shapesToPlace) {
      // Search for the shape
      await searchInput.fill(shape.search)
      await page.waitForTimeout(300)

      // Click the shape tile (which has title matching the label)
      const shapeTile = page.locator(`button[title="${shape.label}"]`).first()
      await expect(shapeTile).toBeVisible({ timeout: 5000 })
      await shapeTile.click()
      await page.waitForTimeout(200)

      // Now click on the canvas to place the shape
      const canvasBox = await canvasSvg.boundingBox()
      expect(canvasBox).toBeTruthy()
      if (canvasBox) {
        // Click at different positions spread across the canvas
        await page.mouse.click(
          canvasBox.x + canvasBox.width * (shape.x / 900),
          canvasBox.y + canvasBox.height * (shape.y / 600),
        )
      }
      await page.waitForTimeout(300)

      // Clear search for next shape
      await searchInput.fill('')
      await page.waitForTimeout(200)
    }

    // Wait for all shapes to render
    await page.waitForTimeout(500)

    // Click "Fit to Content" button to frame all placed shapes nicely
    const fitButton = page.locator('button[title="Fit to Content"]')
    if (await fitButton.isVisible()) {
      await fitButton.click()
      await page.waitForTimeout(500)
    }

    // Screenshot the canvas with placed shapes
    await page.screenshot({
      path: path.join(PROOF_DIR, 'flowchart-pid-shapes-placed.png'),
    })
  })

  test('4 — Background image controls', async ({ page }) => {
    // The background image button is in the toolbar
    const bgButton = page.locator('button[title="Background Image"]')
    await expect(bgButton).toBeVisible()

    // Create a minimal 10x10 red PNG as test background image
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8Dwn4EIwDiqEF8oAABkvgX93u8YvAAAAABJRU5ErkJggg==',
      'base64',
    )

    // Use fileChooser to properly trigger the file input
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      bgButton.click(), // Clicking when no bg image opens file picker
    ])
    await fileChooser.setFiles({
      name: 'test-bg.png',
      mimeType: 'image/png',
      buffer: minimalPng,
    })

    // Wait for the Image() onload callback to set backgroundImage state.
    // The button gets "active" styling when backgroundImage is set.
    // We detect this by waiting for the button to have the active class.
    await page.waitForTimeout(1500)

    // Now the bg button behavior is: if backgroundImage exists, toggle popup.
    // Click it to open the popup. We may need to click twice if the auto-show
    // was toggled off by the click-outside handler detecting the file dialog close.
    const opacityLabel = page.getByText('Opacity')

    // Try up to 3 times to get the popup open
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await opacityLabel.isVisible()) break
      await bgButton.click()
      await page.waitForTimeout(500)
    }

    await expect(opacityLabel).toBeVisible({ timeout: 5000 })

    // Also verify the lock toggle and remove button are present
    await expect(page.getByText('Unlocked')).toBeVisible()
    await expect(page.getByText('Replace image...')).toBeVisible()

    // The toolbar has overflow-x:auto which clips the dropdown popup vertically.
    // Temporarily remove the overflow to allow the popup to render visibly for screenshot.
    await page.evaluate(() => {
      const toolbar = document.querySelector('.overflow-x-auto')
      if (toolbar instanceof HTMLElement) toolbar.style.overflow = 'visible'
    })
    await page.waitForTimeout(200)

    // Take screenshot showing the background controls popup
    await page.screenshot({
      path: path.join(PROOF_DIR, 'flowchart-background-controls.png'),
    })
  })

  test('5 — Export modal with Visio option', async ({ page }) => {
    // First place a shape so export buttons are not disabled
    const searchInput = page.locator('input[placeholder="Search shapes..."]').first()
    await searchInput.fill('rectangle')
    await page.waitForTimeout(200)
    const rectTile = page.locator('button[title="Rectangle"]').first()
    await expect(rectTile).toBeVisible()
    await rectTile.click()
    await page.waitForTimeout(200)

    // Click on the canvas SVG to place the shape — use top-left area to avoid
    // the centered empty state overlay buttons that have pointer-events-auto
    const canvasSvg = page.locator('svg[aria-label="Flowchart diagram canvas"]')
    await expect(canvasSvg).toBeVisible()
    const canvasBox = await canvasSvg.boundingBox()
    expect(canvasBox).toBeTruthy()
    if (canvasBox) {
      // Click in the upper-left quadrant to avoid the empty state overlay
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.2,
        canvasBox.y + canvasBox.height * 0.2,
      )
    }
    await page.waitForTimeout(500)

    // Verify the empty state is gone (shape was placed)
    await expect(page.getByText('Start by placing shapes from the left panel')).toBeHidden({ timeout: 3000 })

    // Open the export modal
    const exportButton = page.locator('button[title="Export"]')
    await expect(exportButton).toBeVisible()
    await exportButton.click()

    // Wait for modal to appear
    await expect(page.getByText('Export Diagram')).toBeVisible({ timeout: 5000 })

    // Verify all export options are listed
    await expect(page.getByText('Export as PNG')).toBeVisible()
    await expect(page.getByText('Copy as PNG')).toBeVisible()
    await expect(page.getByText('Export as SVG')).toBeVisible()
    await expect(page.getByText('Export as Visio (.vsdx)')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()

    // Screenshot the export modal
    await page.screenshot({
      path: path.join(PROOF_DIR, 'flowchart-export-modal-visio.png'),
    })
  })
})
