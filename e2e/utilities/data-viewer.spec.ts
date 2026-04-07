import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Data Viewer (JSON/CSV) tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })

    // Navigate to Data Viewer tool via sidebar
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Data Viewer' }).click()
    await waitForToolLoad(page)

    // Verify we are on the Data Viewer tool
    await expect(page.locator('header h1')).toHaveText('Data Viewer')
  })

  test('empty state shows upload area', async ({ page }) => {
    // The FileDropZone should display its label
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()

    // The description should also show
    await expect(page.locator('text=JSON, CSV, or TSV')).toBeVisible()

    // There should be a hidden file input with the correct accept attribute
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.json,.csv,.tsv')
  })

  test('JSON file upload shows data in tree view', async ({ page }) => {
    // Upload the sample.json fixture
    await uploadFile(page, 'sample.json')

    // Wait for data to load - the toolbar should appear with search and row count
    // The sample.json has a nested structure (employees array + metadata object)
    // Since it's not a flat array, it should show in tree view
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // The JSON tree viewer should render. The sample.json has "employees" and "metadata" keys
    // The tree view shows key names like "employees" and "metadata"
    await expect(page.locator('text="employees"')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text="metadata"')).toBeVisible()

    // Export buttons should be visible
    await expect(page.locator('button').filter({ hasText: 'JSON' }).first()).toBeVisible()
  })

  test('CSV file upload shows table', async ({ page }) => {
    // Upload the sample.csv fixture
    await uploadFile(page, 'sample.csv')

    // Wait for table to render
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Column headers from sample.csv: Name, Age, Department, Salary
    const headers = ['Name', 'Age', 'Department', 'Salary']
    for (const header of headers) {
      await expect(page.locator('th').filter({ hasText: header })).toBeVisible()
    }

    // Data rows should be visible - sample.csv has 5 data rows
    // The row count display should show "5 / 5 rows"
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Verify some actual data is rendered in the table cells
    await expect(page.locator('td').filter({ hasText: 'John Doe' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'Engineering' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: '95000' })).toBeVisible()

    // Search should be functional
    const searchInput = page.locator('input[placeholder="Search all columns..."]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Marketing')

    // Should now show 2 filtered rows (Jane Smith and Charlie Davis are in Marketing)
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    // Export buttons should be visible
    await expect(page.locator('button').filter({ hasText: 'CSV' }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'JSON' }).first()).toBeVisible()
  })

  test('column sorting works on CSV table', async ({ page }) => {
    // Upload CSV
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Click on "Age" column header to sort ascending
    const ageHeader = page.locator('th').filter({ hasText: 'Age' })
    await ageHeader.click()

    // The first data row should now be Jane Smith (age 28 - youngest)
    const firstRowName = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRowName).toHaveText('Jane Smith')

    // Click again to sort descending
    await ageHeader.click()

    // The first data row should now be Bob Wilson (age 45 - oldest)
    const firstRowAfterDesc = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRowAfterDesc).toHaveText('Bob Wilson')
  })
})
