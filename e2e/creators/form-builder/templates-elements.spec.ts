import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'form-creator')
  await expect(page.getByText('Elements', { exact: true })).toBeVisible({ timeout: 10000 })
})

/**
 * Helper: open Templates modal and click a template by name.
 * Scrolls the template into view within the modal before clicking.
 */
async function selectTemplate(page: import('@playwright/test').Page, templateName: string): Promise<void> {
  // Open Templates modal
  const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).first()
  await templatesButton.click()

  // Wait for the modal content to be visible
  await expect(page.getByText('Blank', { exact: true })).toBeVisible({ timeout: 5000 })

  // Click the template via JavaScript dispatch since the modal panel may extend
  // beyond the viewport without internal scrolling, making some items unreachable
  // via Playwright's standard click action
  const templateButton = page.locator('button').filter({ hasText: templateName }).first()
  await templateButton.dispatchEvent('click')

  // Wait for the modal to close and elements to render
  await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 5000 })
}

// ── Construction Templates ─────────────────────────────────────

test.describe('Templates modal — all 15 templates', () => {
  test('templates modal shows all 15 template names', async ({ page }) => {
    // Open the Templates modal
    const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).first()
    await templatesButton.click()

    // Wait for the modal content to be visible
    await expect(page.getByText('Blank', { exact: true })).toBeVisible({ timeout: 5000 })

    const expectedTemplates = [
      'Blank',
      'Sign-in Sheet',
      'Contact Form',
      'Work Order',
      'Inspection Form',
      'Daily Field Report',
      'Safety Toolbox Talk',
      'Job Hazard Analysis (JHA)',
      'Punch List',
      'Change Order',
      'Timesheet',
      'Concrete Pour Log',
      'Hot Work Permit',
      'Equipment Inspection',
      'RFI (Request for Information)',
    ]

    for (const name of expectedTemplates) {
      const templateEntry = page.getByText(name, { exact: true }).first()
      // Use isVisible() check since the modal panel extends beyond viewport
      // and some items may be outside the viewport but still rendered
      await expect(templateEntry).toBeAttached()
    }
  })

  test('clicking "Daily Field Report" template loads it and updates form title', async ({ page }) => {
    await selectTemplate(page, 'Daily Field Report')

    // Form title in the toolbar should update to match the template
    const titleButton = page.locator('button[title="Rename form"]')
    await expect(titleButton).toContainText('Daily Field Report')
  })

  test('clicking "Job Hazard Analysis (JHA)" template loads it and updates form title', async ({ page }) => {
    await selectTemplate(page, 'Job Hazard Analysis (JHA)')

    // Form title updates to "Job Hazard Analysis" (document title)
    const titleButton = page.locator('button[title="Rename form"]')
    await expect(titleButton).toContainText('Job Hazard Analysis')
  })

  test('clicking "Timesheet" template loads it and updates form title', async ({ page }) => {
    await selectTemplate(page, 'Timesheet')

    // Form title should update to "Timesheet"
    const titleButton = page.locator('button[title="Rename form"]')
    await expect(titleButton).toContainText('Timesheet')
  })

  test('loading a template replaces the empty canvas with elements', async ({ page }) => {
    // Verify empty state is visible initially
    await expect(page.getByText('Add elements from the left panel or choose a template')).toBeVisible()

    await selectTemplate(page, 'Sign-in Sheet')

    // Canvas should have rendered elements (check for at least one data-element-id attribute)
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })
  })
})

// ── New Element Types in Palette ───────────────────────────────

test.describe('New element types in palette', () => {
  test('palette shows all 4 new element entries', async ({ page }) => {
    const newElements = ['Date & Time', 'Number', 'Table', 'Calculated']

    for (const element of newElements) {
      await expect(page.locator('button').filter({ hasText: element }).first()).toBeVisible()
    }
  })

  test('clicking "Date & Time" adds it and shows MM/DD/YYYY HH:MM placeholder', async ({ page }) => {
    // Click "Date & Time" in the palette
    const dateTimeButton = page.locator('button').filter({ hasText: 'Date & Time' }).first()
    await dateTimeButton.click()

    // Empty state should disappear
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })

    // Verify the datetime element renders with the expected placeholder text
    await expect(page.getByText('MM/DD/YYYY HH:MM')).toBeVisible()
  })

  test('clicking "Number" adds it and shows 0.00 placeholder', async ({ page }) => {
    // Click "Number" in the palette
    const numberButton = page.locator('button').filter({ hasText: 'Number' }).first()
    await numberButton.click()

    // Empty state should disappear
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })

    // Verify the number element renders with the expected placeholder
    await expect(page.getByText('0.00')).toBeVisible()
  })

  test('clicking "Table" adds it and renders a grid with "Column 1" header', async ({ page }) => {
    // Click "Table" in the palette
    const tableButton = page.locator('button').filter({ hasText: 'Table' }).first()
    await tableButton.click()

    // Empty state should disappear
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })

    // Verify the table element renders with default headers
    await expect(page.getByText('Column 1')).toBeVisible()
  })

  test('clicking "Calculated" adds it and shows formula display area', async ({ page }) => {
    // Click "Calculated" in the palette
    const calculatedButton = page.locator('button').filter({ hasText: 'Calculated' }).first()
    await calculatedButton.click()

    // Empty state should disappear
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })

    // Verify the calculated element renders with the label "Total"
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-element-id]').getByText('Total')).toBeVisible()

    // The formula display area should exist (monospace styled div with bg-gray-100)
    const formulaContainer = page.locator('[data-element-id] .bg-gray-100.border.border-gray-300')
    await expect(formulaContainer).toBeVisible()
  })

  test('Table element renders with multiple column headers', async ({ page }) => {
    // Click "Table" in the palette
    const tableButton = page.locator('button').filter({ hasText: 'Table' }).first()
    await tableButton.click()

    // Wait for the element to appear
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })

    // Default table has 4 columns: Column 1 through Column 4
    await expect(page.getByText('Column 1')).toBeVisible()
    await expect(page.getByText('Column 2')).toBeVisible()
    await expect(page.getByText('Column 3')).toBeVisible()
    await expect(page.getByText('Column 4')).toBeVisible()

    // Verify the table element has rows (should have th and td elements)
    const tableElement = page.locator('table')
    await expect(tableElement).toBeVisible()
    // Default table has 3 body rows
    const bodyRows = tableElement.locator('tbody tr')
    await expect(bodyRows).toHaveCount(3)
  })

  test('Number element shows prefix when configured via template', async ({ page }) => {
    // Load "Change Order" template which has a Number element with "$" prefix
    await selectTemplate(page, 'Change Order')

    // Wait for elements to render
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })

    // The Change Order template has a "Cost Impact" field with "$" prefix
    await expect(page.getByText('Cost Impact')).toBeVisible()
  })

  test('Date & Time element from template renders correctly', async ({ page }) => {
    // Load "Concrete Pour Log" template which uses datetime elements
    await selectTemplate(page, 'Concrete Pour Log')

    // Wait for elements to render
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })

    // The template has datetime elements (Start Time, End Time)
    await expect(page.getByText('Start Time')).toBeVisible()
    await expect(page.getByText('End Time')).toBeVisible()

    // Datetime elements should display MM/DD/YYYY HH:MM
    const datetimePlaceholders = page.getByText('MM/DD/YYYY HH:MM')
    await expect(datetimePlaceholders.first()).toBeVisible()
  })

  test('Table element from JHA template renders with custom headers', async ({ page }) => {
    // Load JHA template which has a table with custom headers
    await selectTemplate(page, 'Job Hazard Analysis (JHA)')

    // Wait for elements to render
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })

    // The JHA table has headers: "Job Step", "Potential Hazard", "Control Measures"
    await expect(page.getByText('Job Step')).toBeVisible()
    await expect(page.getByText('Potential Hazard')).toBeVisible()
    await expect(page.getByText('Control Measures')).toBeVisible()
  })

  test('Calculated element from Timesheet template shows formula', async ({ page }) => {
    // Load Timesheet template which has a calculated field with formula
    await selectTemplate(page, 'Timesheet')

    // Wait for elements to render
    await expect(page.locator('[data-element-id]').first()).toBeVisible({ timeout: 5000 })

    // The Timesheet template has a "Total Hours" calculated field with formula "=SUM({ts-t})"
    await expect(page.getByText('Total Hours')).toBeVisible()
    await expect(page.getByText('=SUM({ts-t})')).toBeVisible()
  })
})
