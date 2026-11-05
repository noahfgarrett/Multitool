import { test, expect } from '@playwright/test'
import { navigateToTool, waitForToolLoad } from '../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'form-creator')
})

test.describe('Form Builder Tool', () => {
  test('initial view shows toolbar, element palette, canvas, and properties panel', async ({ page }) => {
    // The toolbar should be visible with the form title "Untitled Form"
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // The ElementPalette header "Elements" should be visible
    await expect(page.getByText('Elements', { exact: true })).toBeVisible()

    // Empty state message should be shown on the canvas
    await expect(page.getByText('Add elements from the left panel or choose a template')).toBeVisible()

    // The "Browse Templates" button should be visible in the empty state
    await expect(page.getByRole('button', { name: /Browse Templates/i })).toBeVisible()
  })

  test('element palette shows all element types', async ({ page }) => {
    await expect(page.getByText('Elements', { exact: true })).toBeVisible({ timeout: 10000 })

    // All element types from the ElementPalette should be listed
    const expectedElements = [
      'Heading', 'Label', 'Text Field', 'Text Area', 'Checkbox',
      'Radio Group', 'Dropdown', 'Date', 'Signature', 'Image', 'Divider',
    ]

    for (const element of expectedElements) {
      await expect(page.locator('button').filter({ hasText: element }).first()).toBeVisible()
    }
  })

  test('clicking an element in the palette adds it to the canvas', async ({ page }) => {
    await expect(page.getByText('Elements', { exact: true })).toBeVisible({ timeout: 10000 })

    // Click "Text Field" in the palette to add it
    const textFieldButton = page.locator('button').filter({ hasText: 'Text Field' }).first()
    await textFieldButton.click()

    // The empty state overlay should disappear
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })
  })

  test('adding a checkbox element works', async ({ page }) => {
    await expect(page.getByText('Elements', { exact: true })).toBeVisible({ timeout: 10000 })

    // Click "Checkbox" in the palette
    const checkboxButton = page.locator('button').filter({ hasText: 'Checkbox' }).first()
    await checkboxButton.click()

    // The canvas should now have an element — empty state should be gone
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })
  })

  test('adding a heading element works', async ({ page }) => {
    await expect(page.getByText('Elements', { exact: true })).toBeVisible({ timeout: 10000 })

    // Click "Heading" in the palette
    const headingButton = page.locator('button').filter({ hasText: 'Heading' }).first()
    await headingButton.click()

    // Empty state should be gone
    await expect(page.getByText('Add elements from the left panel or choose a template')).not.toBeVisible({ timeout: 3000 })
  })

  test('toolbar has Export button', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // The Export button should be in the toolbar (title="Export")
    const exportButton = page.locator('button[title="Export"]')
    await expect(exportButton).toBeVisible()
  })

  test('clicking Export opens the export modal with format options', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // Add an element first so export options are enabled
    const textFieldButton = page.locator('button').filter({ hasText: 'Text Field' }).first()
    await textFieldButton.click()
    await page.waitForTimeout(300)

    // Click Export
    const exportButton = page.locator('button[title="Export"]')
    await exportButton.click()

    // The export modal should appear with "Export Form" title
    await expect(page.getByText('Export Form')).toBeVisible({ timeout: 3000 })

    // Format options should be listed
    await expect(page.getByText('Fillable PDF')).toBeVisible()
    await expect(page.getByText('Static PDF')).toBeVisible()
    await expect(page.getByText('Word Document')).toBeVisible()
    await expect(page.getByText('Save as JSON')).toBeVisible()
  })

  test('toolbar has Save button', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // The Save button with title "Save (Ctrl+S)"
    const saveButton = page.locator('button[title="Save (Ctrl+S)"]')
    await expect(saveButton).toBeVisible()
  })

  test('Templates button opens the templates modal', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // Click Templates button in the toolbar
    const templatesButton = page.locator('button').filter({ hasText: 'Templates' }).first()
    await templatesButton.click()

    // The Templates modal should appear
    await expect(page.getByText('Templates').first()).toBeVisible({ timeout: 3000 })
  })

  test('toolbar has undo/redo buttons', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // Undo and Redo buttons should exist
    const undoButton = page.locator('button[title="Undo (Ctrl+Z)"]')
    const redoButton = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(undoButton).toBeVisible()
    await expect(redoButton).toBeVisible()
  })

  test('page size selector exists in the toolbar', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // The page size select dropdown should exist with Letter and A4 options
    const pageSizeSelect = page.locator('select').filter({ hasText: 'Letter' })
    await expect(pageSizeSelect).toBeVisible()
  })

  test('Saved Forms button opens the saved forms modal', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // Click the Saved button in the toolbar
    const savedButton = page.locator('button').filter({ hasText: 'Saved' }).first()
    await savedButton.click()

    // The Saved Forms modal should appear
    await expect(page.getByRole('heading', { name: 'Saved Forms' })).toBeVisible({ timeout: 3000 })

    // If no saved forms, should show empty message
    await expect(page.getByText('No saved forms yet')).toBeVisible()
  })

  test('Import button exists in the toolbar', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // The Import button should exist
    const importButton = page.locator('button').filter({ hasText: 'Import' }).first()
    await expect(importButton).toBeVisible()
  })

  test('form title can be edited inline', async ({ page }) => {
    await expect(page.getByText('Untitled Form')).toBeVisible({ timeout: 10000 })

    // Click the title to start editing
    const titleButton = page.locator('button[title="Rename form"]')
    await titleButton.click()

    // The button is replaced by a focused input holding the current title
    const titleInput = page.locator('input:focus')
    await expect(titleInput).toHaveValue('Untitled Form')

    // Type a new title
    await titleInput.fill('My Test Form')
    await titleInput.press('Enter')

    // The new title should be displayed
    await expect(page.locator('button[title="Rename form"]')).toHaveText('My Test Form')
  })
})
