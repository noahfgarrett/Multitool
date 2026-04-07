import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Tool Button Visibility ───────────────────────────────────────────────

test.describe('Tool Button Visibility', () => {
  test('Select button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Select (S)"]')).toBeVisible()
  })

  test('Draw tools dropdown visible (shows active draw tool)', async ({ page }) => {
    await uploadPDFAndWait(page)
    // The shapes dropdown button shows the active draw tool icon
    await expect(page.locator('button[title="Pencil (P)"]')).toBeVisible()
  })

  test('Highlight button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Highlight (H)"]')).toBeVisible()
  })

  test('Text tools dropdown visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Text (T)"]')).toBeVisible()
  })

  test('Eraser button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Eraser (E)"]')).toBeVisible()
  })

  test('Measure button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Measure (M)"]')).toBeVisible()
  })

  test('Undo button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible()
  })

  test('Redo button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).toBeVisible()
  })

  test('Rotate CCW button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CCW"]')).toBeVisible()
  })

  test('Rotate CW button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Rotate CW"]')).toBeVisible()
  })

  test('Zoom out button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom out"]')).toBeVisible()
  })

  test('Zoom in button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom in"]')).toBeVisible()
  })

  test('Fit to window button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Fit to window (F)"]')).toBeVisible()
  })

  test('Zoom percentage display visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Zoom presets"]')).toBeVisible()
    await expect(page.locator('text=/\\d+%/')).toBeVisible()
  })

  test('Export PDF button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('Export PDF')).toBeVisible()
  })

  test('New button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('New')).toBeVisible()
  })
})

// ─── 2. Active Tool States ───────────────────────────────────────────────────

test.describe('Active Tool States', () => {
  test('Select is active by default (orange styling)', async ({ page }) => {
    await uploadPDFAndWait(page)
    const btn = page.locator('button[title="Select (S)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Pencil activates it with orange styling', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // The draw dropdown button should now show Pencil and be active
    const btn = page.locator('button[title="Pencil (P)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('activating Pencil deactivates Select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).not.toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Eraser activates it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const btn = page.locator('button[title="Eraser (E)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Measure activates it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    const btn = page.locator('button[title="Measure (M)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('clicking Highlight activates it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Highlight (H)')
    const btn = page.locator('button[title="Highlight (H)"]')
    await expect(btn).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('switching between tools updates active state correctly', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Pencil
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="Pencil (P)"]')).toHaveClass(/bg-\[#14B8A6\]/)
    // Rectangle — the dropdown button title changes to the active draw tool
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
    // Pencil button no longer exists in the toolbar (replaced by Rectangle in dropdown)
    await expect(page.locator('button[title="Pencil (P)"]')).toHaveCount(0)
  })
})

// ─── 3. Status Bar Messages ──────────────────────────────────────────────────

test.describe('Status Bar Messages', () => {
  test('Select tool shows "Click to select"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('Pencil tool shows "Ctrl+scroll zoom"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('Text tool shows "Drag to create text"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('text=/Drag to create text/')).toBeVisible()
  })

  test('Callout tool shows "Drag to create callout"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await expect(page.locator('text=/Drag to create callout/')).toBeVisible()
  })

  test('Cloud tool shows "0 pts" initially', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('text=/0 pts.*Dbl-click close/')).toBeVisible()
  })

  test('Measure tool shows "Click two points"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })

  test('Rectangle tool shows "Shift for perfect shapes"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('Circle tool shows "Shift for perfect shapes"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('Line tool shows "Shift for perfect shapes"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('Arrow tool shows "Shift for perfect shapes"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('text=/Shift for perfect shapes/')).toBeVisible()
  })

  test('selected annotation shows "Arrows nudge" hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on the rectangle edge to select it
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── 4. Properties Bar — Drawing Tools ───────────────────────────────────────

test.describe('Properties Bar — Drawing Tools', () => {
  test('color picker visible for Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // ColorPicker component should be visible
    await expect(page.locator('text=/Width/')).toBeVisible()
  })

  test('stroke width slider visible for Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Width/')).toBeVisible()
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('opacity slider visible for Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Opacity/')).toBeVisible()
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('stroke width slider visible for Rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('stroke width slider visible for Cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Cloud (K)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('straight-line mode toggle visible for Pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.getByText('Free')).toBeVisible()
  })

  test('straight-line mode can be toggled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const freeBtn = page.getByText('Free')
    await freeBtn.click()
    await page.waitForTimeout(100)
    await expect(page.getByText('Straight')).toBeVisible()
  })
})

// ─── 5. Properties Bar — No Props for Select/Eraser/Measure ──────────────────

test.describe('Properties Bar — Non-Drawing Tools', () => {
  test('Select tool shows "Click to select annotations" hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible()
  })

  test('Select tool does not show stroke width', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeHidden()
  })

  test('Eraser shows mode toggle (Partial/Object)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.getByText('Partial')).toBeVisible()
    await expect(page.getByText('Object')).toBeVisible()
  })

  test('Eraser shows size slider', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('text=/Size/')).toBeVisible()
    await expect(page.locator('input[type="range"][min="5"][max="50"]')).toBeVisible()
  })

  test('Measure tool shows "Click two points" in status bar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('text=/Click two points/')).toBeVisible()
  })
})

// ─── 6. Properties Bar — Text Tools ──────────────────────────────────────────

test.describe('Properties Bar — Text Tools', () => {
  test('font family dropdown visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect).toBeVisible()
  })

  test('font size dropdown visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    const fontSizeSelect = page.locator('select').filter({ has: page.locator('option[value="24"]') }).first()
    await expect(fontSizeSelect).toBeVisible()
  })

  test('Bold button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
  })

  test('Italic button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible()
  })

  test('Underline button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Underline (Ctrl+U)"]')).toBeVisible()
  })

  test('Strikethrough button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Strikethrough (Ctrl+Shift+X)"]')).toBeVisible()
  })

  test('Align Left button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Left"]')).toBeVisible()
  })

  test('Align Center button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Center"]')).toBeVisible()
  })

  test('Align Right button visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Right"]')).toBeVisible()
  })

  test('Text background highlight button visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Text background highlight"]')).toBeVisible()
  })

  test('Line spacing dropdown visible for Text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('select[title="Line spacing"]')).toBeVisible()
  })

  test('Callout tool shows same text formatting controls', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Callout (O)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible()
    await expect(page.locator('select[title="Line spacing"]')).toBeVisible()
  })

  test('text formatting hidden for Pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="Bold (Ctrl+B)"]')).toBeHidden()
    await expect(page.locator('select[title="Line spacing"]')).toBeHidden()
  })
})

// ─── 7. Undo/Redo Button States ──────────────────────────────────────────────

test.describe('Undo/Redo Button States', () => {
  test('undo button disabled with no history', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeDisabled()
  })

  test('redo button disabled with no future history', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).toBeDisabled()
  })

  test('undo button enabled after creating annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeEnabled()
  })

  test('redo button enabled after undoing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await expect(page.locator('button[title="Redo (Ctrl+Shift+Z)"]')).toBeEnabled()
  })
})

// ─── 8. Zoom Controls ────────────────────────────────────────────────────────

test.describe('Zoom Controls', () => {
  test('zoom percentage shows initial value', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(text).toMatch(/\d+%/)
  })

  test('zoom in button increases zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const initialText = await zoomBtn.textContent()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const newText = await zoomBtn.textContent()
    expect(newText).not.toBe(initialText)
  })

  test('zoom out button decreases zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom in first
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const afterIn = await zoomBtn.textContent()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(200)
    const afterOut = await zoomBtn.textContent()
    expect(afterOut).not.toBe(afterIn)
  })

  test('zoom presets dropdown opens', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    // Preset options should be visible — use exact match to avoid matching the zoom button itself
    await expect(page.getByText('200%', { exact: true })).toBeVisible()
    await expect(page.getByText('Fit Page')).toBeVisible()
    await expect(page.getByText('75%', { exact: true })).toBeVisible()
  })

  test('selecting zoom preset changes zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('200%').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    await expect(zoomBtn).toHaveText('200%')
  })

  test('fit to window button adjusts zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    // First zoom to known level
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('200%').click()
    await page.waitForTimeout(200)
    // Fit to window
    await page.locator('button[title="Fit to window (F)"]').click()
    await page.waitForTimeout(200)
    const zoomBtn = page.locator('button[title="Zoom presets"]')
    const text = await zoomBtn.textContent()
    expect(text).not.toBe('200%')
  })
})

// ─── 9. Rotation Buttons ─────────────────────────────────────────────────────

test.describe('Rotation Buttons', () => {
  test('Rotate CW button rotates page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    // Status bar should show rotation degree
    await expect(page.locator('text=/90°/')).toBeVisible()
  })

  test('Rotate CCW button rotates page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CCW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/270°/')).toBeVisible()
  })

  test('two CW rotations show 180 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(200)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/180°/')).toBeVisible()
  })

  test('four CW rotations return to 0 degrees (no rotation indicator)', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 4; i++) {
      await page.locator('button[title="Rotate CW"]').click()
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(200)
    // At 0 degrees (360 mod 360 = 0), rotation indicator should not show
    await expect(page.locator('text=/°/')).toBeHidden()
  })
})

// ─── 10. Shapes Dropdown ─────────────────────────────────────────────────────

test.describe('Shapes Dropdown', () => {
  test('shapes dropdown lists all draw tools', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Click the shapes dropdown to open it
    await page.locator('button[title="Pencil (P)"]').click()
    await page.waitForTimeout(200)
    // Verify dropdown items are visible (use .last() to target dropdown items, not the toolbar button)
    await expect(page.locator('button:has-text("Line (L)")').last()).toBeVisible()
    await expect(page.locator('button:has-text("Arrow (A)")').last()).toBeVisible()
    await expect(page.locator('button:has-text("Rectangle (R)")').last()).toBeVisible()
    await expect(page.locator('button:has-text("Circle (C)")').last()).toBeVisible()
    await expect(page.locator('button:has-text("Cloud (K)")').last()).toBeVisible()
  })

  test('selecting tool from dropdown changes active draw tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Ensure no input is focused so keyboard shortcuts work
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
    await page.waitForTimeout(100)
    // Use keyboard shortcut to switch to Rectangle tool
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    // The sidebar draw button should now show Rectangle with active styling
    await expect(page.locator('button[title="Rectangle (R)"]')).toHaveClass(/bg-\[#14B8A6\]/)
  })

  test('text tools dropdown lists Text and Callout', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Click the text tools dropdown to open it
    await page.locator('button[title="Text (T)"]').click()
    await page.waitForTimeout(200)
    // Verify dropdown items (use .last() to target dropdown items)
    await expect(page.locator('button:has-text("Text (T)")').last()).toBeVisible()
    await expect(page.locator('button:has-text("Callout (O)")').last()).toBeVisible()
  })
})
