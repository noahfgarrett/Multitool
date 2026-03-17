import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'form-creator')
  // Wait for the form builder to fully load
  await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })
})

/**
 * Helper: click an element button in the palette to add it to the canvas.
 * After adding, the element is auto-selected and the properties panel shows its properties.
 */
async function addElement(page: import('@playwright/test').Page, label: string): Promise<void> {
  // The palette is on the left (w-[220px] container with "Elements" header)
  const palette = page.locator('.w-\\[220px\\]')
  const paletteButton = palette.locator('button').filter({ hasText: label }).first()
  await paletteButton.click()
  // Wait for the empty state to disappear (element was added)
  await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 5000 })
  // Small buffer for React state to settle and properties panel to render
  await page.waitForTimeout(200)
}

// ── Properties Panel: Empty State ──────────────────────────────

test.describe('Properties Panel — empty state', () => {
  test('shows empty message when no element is selected', async ({ page }) => {
    // Before adding any element, the properties panel should show the empty message
    await expect(page.getByText('Select an element to edit its properties')).toBeVisible()
  })

  test('shows "Properties" header when an element is selected', async ({ page }) => {
    await addElement(page, 'Text Field')
    // The properties panel header should say "Properties"
    await expect(page.getByText('Properties')).toBeVisible()
  })
})

// ── Number Field Properties ────────────────────────────────────

test.describe('Properties Panel — Number Field', () => {
  test('shows Number Format section when number element is added', async ({ page }) => {
    await addElement(page, 'Number')

    // The "NUMBER FORMAT" section label should be visible
    await expect(page.getByText('Number Format')).toBeVisible()
  })

  test('Number Format section contains prefix dropdown with options', async ({ page }) => {
    await addElement(page, 'Number')

    // The prefix label should exist
    await expect(page.getByText('Prefix')).toBeVisible()

    // Find the prefix select dropdown — it contains "None" as default option
    const prefixSelect = page.locator('select').filter({ hasText: 'None' })
    await expect(prefixSelect).toBeVisible()

    // Verify it has the expected options
    const options = prefixSelect.locator('option')
    await expect(options).toHaveCount(6)
  })

  test('Number Format section contains Min and Max inputs', async ({ page }) => {
    await addElement(page, 'Number')

    // Look for the "Min" and "Max" labels in the Number Format section
    await expect(page.getByText('Min')).toBeVisible()
    await expect(page.getByText('Max')).toBeVisible()
  })

  test('Number Format section contains Decimals input', async ({ page }) => {
    await addElement(page, 'Number')

    // The Decimals label should be visible
    await expect(page.getByText('Decimals')).toBeVisible()
  })

  test('changing prefix to $ updates the dropdown value', async ({ page }) => {
    await addElement(page, 'Number')

    // Find the prefix select dropdown
    const prefixSelect = page.locator('select').filter({ hasText: 'None' })
    await expect(prefixSelect).toBeVisible()

    // Change prefix to "$"
    await prefixSelect.selectOption('$')

    // Verify the selected value changed
    await expect(prefixSelect).toHaveValue('$')
  })
})

// ── Table Properties ───────────────────────────────────────────

test.describe('Properties Panel — Table', () => {
  test('shows Table section when table element is added', async ({ page }) => {
    await addElement(page, 'Table')

    // The "TABLE" section label should be visible in the properties panel
    // Use a more specific locator to avoid matching the palette button
    const propertiesPanel = page.locator('.w-\\[260px\\]')
    await expect(propertiesPanel.getByText('Table', { exact: true })).toBeVisible()
  })

  test('Table section contains Rows and Cols inputs', async ({ page }) => {
    await addElement(page, 'Table')

    // Look for Rows and Cols labels in the properties panel
    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Rows')).toBeVisible()
    await expect(propertiesPanel.getByText('Cols')).toBeVisible()
  })

  test('Table section has default 3 rows and 4 columns', async ({ page }) => {
    await addElement(page, 'Table')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()

    // Rows input should have value 3
    const rowsInput = propertiesPanel.locator('input[type="number"]').first()
    // Find the input next to "Rows" label — the Rows input is in the Table section grid
    // After Position (X, Y) and Size (W, H), the Table section has Rows and Cols
    // Let's find inputs by their neighboring label text
    const rowsContainer = propertiesPanel.locator('div').filter({ hasText: /^Rows$/ }).first()
    await expect(rowsContainer.locator('input[type="number"]')).toHaveValue('3')

    const colsContainer = propertiesPanel.locator('div').filter({ hasText: /^Cols$/ }).first()
    await expect(colsContainer.locator('input[type="number"]')).toHaveValue('4')
  })

  test('Table section has header inputs for each column', async ({ page }) => {
    await addElement(page, 'Table')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()

    // The "Headers" label should be visible
    await expect(propertiesPanel.getByText('Headers')).toBeVisible()

    // Default table has 4 columns, so there should be 4 header inputs with placeholder "Column N"
    const headerInputs = propertiesPanel.locator('input[placeholder^="Column"]')
    await expect(headerInputs).toHaveCount(4)
  })
})

// ── Calculated Field Formula ───────────────────────────────────

test.describe('Properties Panel — Calculated Field', () => {
  test('shows Formula section when calculated element is added', async ({ page }) => {
    await addElement(page, 'Calculated')

    // The "FORMULA" section label should be visible
    await expect(page.getByText('Formula')).toBeVisible()
  })

  test('Formula section has a monospace formula input', async ({ page }) => {
    await addElement(page, 'Calculated')

    // The formula input has placeholder "=SUM({Field 1}, {Field 2})" and font-mono class
    const formulaInput = page.locator('input[placeholder*="SUM"]')
    await expect(formulaInput).toBeVisible()
  })

  test('Formula section has help text about SUM, COUNT, AVG', async ({ page }) => {
    await addElement(page, 'Calculated')

    // Help text mentions SUM, COUNT, AVG
    await expect(page.getByText('SUM, COUNT, AVG')).toBeVisible()
  })

  test('typing a formula into the input updates its value', async ({ page }) => {
    await addElement(page, 'Calculated')

    const formulaInput = page.locator('input[placeholder*="SUM"]')
    await formulaInput.fill('=SUM({Field 1}, {Field 2})')

    await expect(formulaInput).toHaveValue('=SUM({Field 1}, {Field 2})')
  })
})

// ── Conditional Visibility ─────────────────────────────────────

test.describe('Properties Panel — Conditional Visibility', () => {
  test('shows "Add condition..." button for text-input element', async ({ page }) => {
    await addElement(page, 'Text Field')

    // The "CONDITIONAL VISIBILITY" section should be visible
    await expect(page.getByText('Conditional Visibility')).toBeVisible()

    // The "Add condition..." button should be visible
    await expect(page.getByText('Add condition...')).toBeVisible()
  })

  test('clicking "Add condition..." reveals the condition editor', async ({ page }) => {
    // First add a checkbox so there is another field to reference
    await addElement(page, 'Checkbox')
    // Then add a text field — it will be auto-selected
    await addElement(page, 'Text Field')

    // Click "Add condition..."
    await page.getByText('Add condition...').click()

    // The condition editor should now show "Show when..." text
    await expect(page.getByText('Show when...')).toBeVisible()
  })

  test('condition editor has field selector dropdown', async ({ page }) => {
    // Add checkbox first, then text field
    await addElement(page, 'Checkbox')
    await addElement(page, 'Text Field')

    // Click "Add condition..."
    await page.getByText('Add condition...').click()

    // A select dropdown with "Select field..." default option should appear
    const fieldSelect = page.locator('select').filter({ hasText: 'Select field...' })
    await expect(fieldSelect).toBeVisible()
  })

  test('condition editor has operator dropdown with options', async ({ page }) => {
    await addElement(page, 'Checkbox')
    await addElement(page, 'Text Field')

    await page.getByText('Add condition...').click()

    // The operator dropdown should exist with "equals" as default
    const operatorSelect = page.locator('select').filter({ hasText: 'equals' })
    await expect(operatorSelect).toBeVisible()

    // It should have the 4 operator options
    const options = operatorSelect.locator('option')
    await expect(options).toHaveCount(4)
  })

  test('condition editor has value input field', async ({ page }) => {
    await addElement(page, 'Checkbox')
    await addElement(page, 'Text Field')

    await page.getByText('Add condition...').click()

    // The value input with placeholder "Value..." should be visible
    const valueInput = page.locator('input[placeholder="Value..."]')
    await expect(valueInput).toBeVisible()
  })

  test('condition editor field selector lists other form elements', async ({ page }) => {
    // Add a checkbox (will appear in the field selector)
    await addElement(page, 'Checkbox')
    // Add a text field (will be auto-selected)
    await addElement(page, 'Text Field')

    await page.getByText('Add condition...').click()

    // The field selector should list "Checkbox" as an option
    const fieldSelect = page.locator('select').filter({ hasText: 'Select field...' })
    await expect(fieldSelect.locator('option')).toHaveCount(2) // "Select field..." + "Checkbox"
    // Options inside <select> are hidden in the DOM — verify by checking the option text content
    await expect(fieldSelect.locator('option', { hasText: 'Checkbox' })).toHaveCount(1)
  })

  test('does not show conditional visibility for heading elements', async ({ page }) => {
    await addElement(page, 'Heading')

    // "Conditional Visibility" should NOT appear for headings
    await expect(page.getByText('Conditional Visibility')).not.toBeVisible()
  })

  test('does not show conditional visibility for divider elements', async ({ page }) => {
    await addElement(page, 'Divider')

    // "Conditional Visibility" should NOT appear for dividers
    await expect(page.getByText('Conditional Visibility')).not.toBeVisible()
  })
})

// ── Basic Properties with New Types ────────────────────────────

test.describe('Properties Panel — Basic Properties', () => {
  test('Date & Time element shows label "Date & Time" in properties', async ({ page }) => {
    await addElement(page, 'Date & Time')

    // The Label section should contain an input with value "Date & Time"
    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    const labelInput = propertiesPanel.locator('input[type="text"]').first()
    await expect(labelInput).toHaveValue('Date & Time')
  })

  test('adding an element shows Properties header', async ({ page }) => {
    await addElement(page, 'Checkbox')

    // The "Properties" header should be visible
    await expect(page.getByText('Properties')).toBeVisible()
  })

  test('deselecting returns to empty message', async ({ page }) => {
    await addElement(page, 'Text Field')
    // Verify properties are shown
    await expect(page.getByText('Properties')).toBeVisible()

    // Click on the canvas background to deselect (click on the empty area)
    // Press Escape to deselect
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // The empty message should return
    await expect(page.getByText('Select an element to edit its properties')).toBeVisible()
  })

  test('shows type badge for added element', async ({ page }) => {
    await addElement(page, 'Checkbox')

    // The type badge should show "checkbox" (lowercase, matching el.type)
    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('checkbox')).toBeVisible()
  })

  test('shows position X and Y inputs', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    // Position section should have X and Y labels
    await expect(propertiesPanel.getByText('Position')).toBeVisible()
    await expect(propertiesPanel.getByText('X', { exact: true })).toBeVisible()
    await expect(propertiesPanel.getByText('Y', { exact: true })).toBeVisible()
  })

  test('shows size W and H inputs', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    // Size section should have W and H labels — use exact: true to avoid matching "Font Size"
    await expect(propertiesPanel.getByText('Size', { exact: true })).toBeVisible()
    await expect(propertiesPanel.getByText('W', { exact: true })).toBeVisible()
    await expect(propertiesPanel.getByText('H', { exact: true })).toBeVisible()
  })

  test('shows Font Size section for text elements', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Font Size')).toBeVisible()
  })

  test('shows Font Weight section with normal and bold options', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Font Weight')).toBeVisible()
    await expect(propertiesPanel.getByText('normal')).toBeVisible()
    await expect(propertiesPanel.getByText('bold')).toBeVisible()
  })

  test('shows Alignment section with left, center, right options', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Alignment')).toBeVisible()
    await expect(propertiesPanel.getByText('left')).toBeVisible()
    await expect(propertiesPanel.getByText('center')).toBeVisible()
    await expect(propertiesPanel.getByText('right')).toBeVisible()
  })

  test('shows Required toggle for input elements', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Required')).toBeVisible()
  })

  test('shows Duplicate and Delete action buttons', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Duplicate')).toBeVisible()
    await expect(propertiesPanel.getByText('Delete')).toBeVisible()
  })

  test('shows Text Color section for text elements', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Text Color')).toBeVisible()
  })

  test('does not show label input for divider elements', async ({ page }) => {
    await addElement(page, 'Divider')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    // Dividers should NOT have a Label section
    await expect(propertiesPanel.getByText('Label')).not.toBeVisible()
  })

  test('does not show label input for image elements', async ({ page }) => {
    await addElement(page, 'Image')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    // Images should NOT have a Label section
    await expect(propertiesPanel.getByText('Label')).not.toBeVisible()
  })

  test('shows Placeholder section for text-input elements', async ({ page }) => {
    await addElement(page, 'Text Field')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Placeholder')).toBeVisible()
  })

  test('shows Options section for radio group elements', async ({ page }) => {
    await addElement(page, 'Radio Group')

    const propertiesPanel = page.locator('.w-\\[260px\\]').last()
    await expect(propertiesPanel.getByText('Options')).toBeVisible()
    // Default radio has 3 options
    await expect(propertiesPanel.getByText('Add option')).toBeVisible()
  })
})
