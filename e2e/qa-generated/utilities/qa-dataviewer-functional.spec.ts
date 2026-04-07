import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../../helpers/navigation'
import { uploadFile } from '../../helpers/file-upload'

const BASE_URL = 'http://127.0.0.1:5182'

test.use({ baseURL: BASE_URL })

/** Navigate to Data Viewer tool */
async function goToDataViewer(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
  const sidebar = page.locator('aside nav')
  await sidebar.locator('button').filter({ hasText: 'Data Viewer' }).click()
  await waitForToolLoad(page)
  await expect(page.locator('header h1')).toHaveText('Data Viewer')
}

/** Locate a tree key span by its key name (rendered as "keyName":) */
function treeKey(page: import('@playwright/test').Page, keyName: string) {
  return page.locator('span').filter({ hasText: `"${keyName}":` })
}

/** Locate a tree string value (rendered as "value" in green) */
function treeStringValue(page: import('@playwright/test').Page, value: string) {
  return page.locator('span.text-emerald-400').filter({ hasText: `"${value}"` })
}

// ── Empty state ──────────────────────────────────────────────────────────
test.describe('Data Viewer — empty state', () => {
  test('shows upload area with correct labels', async ({ page }) => {
    await goToDataViewer(page)
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()
    await expect(page.locator('text=JSON, CSV, or TSV')).toBeVisible()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.json,.csv,.tsv')
  })
})

// ── CSV loading ──────────────────────────────────────────────────────────
test.describe('Data Viewer — CSV loading', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('loads CSV and shows table with headers and rows', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Check headers
    for (const h of ['Name', 'Age', 'Department', 'Salary']) {
      await expect(page.locator('th').filter({ hasText: h })).toBeVisible()
    }

    // Row count
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Spot-check cells
    await expect(page.locator('td').filter({ hasText: 'John Doe' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: '95000' })).toBeVisible()
  })

  test('row numbering starts at 1', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // First row number column should show "1"
    const firstRowNum = page.locator('tbody tr').first().locator('td').first()
    await expect(firstRowNum).toHaveText('1')
  })

  test('CSV with special characters (commas, quotes, newlines)', async ({ page }) => {
    await uploadFile(page, 'special-chars.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Headers
    for (const h of ['Name', 'Description', 'Price']) {
      await expect(page.locator('th').filter({ hasText: h })).toBeVisible()
    }

    // Quoted field with comma: "Widget, Standard"
    await expect(page.locator('td').filter({ hasText: 'Widget, Standard' })).toBeVisible()

    // Quoted field with escaped quotes: Gadget "Pro"
    await expect(page.locator('td').filter({ hasText: 'Gadget "Pro"' })).toBeVisible()
  })

  test('CSV with Unicode characters', async ({ page }) => {
    await uploadFile(page, 'unicode.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Check Unicode content renders
    await expect(page.locator('td').filter({ hasText: 'Müller' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'München' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'Tanaka' })).toBeVisible()
  })

  test('large CSV renders all rows', async ({ page }) => {
    await uploadFile(page, 'large.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=20 / 20 rows')).toBeVisible()
  })
})

// ── JSON loading ─────────────────────────────────────────────────────────
test.describe('Data Viewer — JSON loading', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('flat JSON array shows as table', async ({ page }) => {
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Headers
    for (const h of ['id', 'name', 'score']) {
      await expect(page.locator('th').filter({ hasText: h })).toBeVisible()
    }

    // Row count
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Data
    await expect(page.locator('td').filter({ hasText: 'Alice' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: '95' })).toBeVisible()
  })

  test('nested JSON object shows tree view', async ({ page }) => {
    await uploadFile(page, 'sample.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Tree should show top-level keys (rendered as "keyName": in spans)
    await expect(treeKey(page, 'employees')).toBeVisible()
    await expect(treeKey(page, 'metadata')).toBeVisible()
  })

  test('single object (non-array) shows tree view', async ({ page }) => {
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Tree should render with keys
    await expect(treeKey(page, 'name')).toBeVisible()
    await expect(treeKey(page, 'version')).toBeVisible()
    await expect(treeKey(page, 'settings')).toBeVisible()
    await expect(treeKey(page, 'features')).toBeVisible()
  })

  test('nested array JSON shows table with toggle to tree', async ({ page }) => {
    await uploadFile(page, 'nested-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Should have Table/Tree toggle because it's nested
    const tableBtn = page.locator('button').filter({ hasText: /^Table$/ })
    const treeBtn = page.locator('button').filter({ hasText: /^Tree$/ })
    await expect(tableBtn).toBeVisible()
    await expect(treeBtn).toBeVisible()

    // Switch to tree
    await treeBtn.click()
    // Table should disappear, tree content should appear
    await expect(page.locator('table')).not.toBeVisible()
    // Tree view should show array indicator [3]
    await expect(page.locator('span').filter({ hasText: '[3]' })).toBeVisible()

    // Switch back to table
    await tableBtn.click()
    await expect(page.locator('table')).toBeVisible()
  })

  test('JSON with booleans and nulls renders correctly in table', async ({ page }) => {
    await uploadFile(page, 'boolean-null.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Boolean values should render as strings
    await expect(page.locator('td').filter({ hasText: 'true' }).first()).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'false' }).first()).toBeVisible()

    // Check row count (3 rows)
    await expect(page.locator('text=3 / 3 rows')).toBeVisible()
  })

  test('empty JSON array shows tree view with empty array', async ({ page }) => {
    await uploadFile(page, 'empty.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Empty array is non-tabular, shown as tree with [0] (array with 0 items)
    await expect(page.locator('span').filter({ hasText: '[0]' })).toBeVisible()
  })

  test('malformed JSON shows error and stays on drop zone', async ({ page }) => {
    await uploadFile(page, 'malformed.json')

    // After fix: malformed JSON resets fileName so we stay on the drop zone
    // The error should be shown on the drop zone screen
    await expect(page.locator('text=Invalid JSON')).toBeVisible({ timeout: 5000 })

    // Drop zone should still be visible for retry
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()
  })
})

// ── Search/filter ────────────────────────────────────────────────────────
test.describe('Data Viewer — search and filter', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('search filters rows in CSV', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Engineering')

    // Should show only Engineering rows (John Doe, Alice Brown)
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'John Doe' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'Alice Brown' })).toBeVisible()
  })

  test('search is case-insensitive', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('engineering')

    await expect(page.locator('text=2 / 5 rows')).toBeVisible()
  })

  test('search by numeric value', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('95000')

    await expect(page.locator('text=1 / 5 rows')).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'John Doe' })).toBeVisible()
  })

  test('search with no results shows empty message', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('xyznonexistent')

    await expect(page.locator('text=0 / 5 rows')).toBeVisible()
    await expect(page.locator('text=No matching rows')).toBeVisible()
  })

  test('clearing search restores all rows', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Marketing')
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    await search.fill('')
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()
  })

  test('search works on JSON table data', async ({ page }) => {
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Alice')

    await expect(page.locator('text=1 / 5 rows')).toBeVisible()
  })
})

// ── Sorting ──────────────────────────────────────────────────────────────
test.describe('Data Viewer — column sorting', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('sort ascending on text column', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Click Name header to sort ascending
    await page.locator('th').filter({ hasText: 'Name' }).click()

    // First row should be Alice Brown (alphabetically first)
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('Alice Brown')
  })

  test('sort descending on text column', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Click Name header twice: asc then desc
    const nameHeader = page.locator('th').filter({ hasText: 'Name' })
    await nameHeader.click()
    await nameHeader.click()

    // First row should be John Doe (alphabetically last)
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('John Doe')
  })

  test('sort ascending on numeric column', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Click Age header to sort ascending
    await page.locator('th').filter({ hasText: 'Age' }).click()

    // First row should be Jane Smith (age 28, youngest)
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('Jane Smith')
  })

  test('sort descending on numeric column', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const ageHeader = page.locator('th').filter({ hasText: 'Age' })
    await ageHeader.click()
    await ageHeader.click()

    // First row should be Bob Wilson (age 45, oldest)
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('Bob Wilson')
  })

  test('third click on column removes sort', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const nameHeader = page.locator('th').filter({ hasText: 'Name' })
    await nameHeader.click()  // asc
    await nameHeader.click()  // desc
    await nameHeader.click()  // unsorted

    // Should be back to original order: John Doe first
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('John Doe')
  })

  test('sort combined with search', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // First filter
    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Engineering')
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    // Then sort by salary ascending
    await page.locator('th').filter({ hasText: 'Salary' }).click()

    // John Doe (95000) should come before Alice Brown (102000)
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('John Doe')
  })

  test('sort on JSON table data', async ({ page }) => {
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Sort by score descending
    const scoreHeader = page.locator('th').filter({ hasText: 'score' })
    await scoreHeader.click()  // asc
    await scoreHeader.click()  // desc

    // Alice (95) should be first
    const firstRow = page.locator('tbody tr').first().locator('td').nth(2)
    await expect(firstRow).toHaveText('Alice')
  })
})

// ── Tree view ────────────────────────────────────────────────────────────
test.describe('Data Viewer — tree view', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('tree view renders all primitive types', async ({ page }) => {
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // String values rendered in green spans
    await expect(treeStringValue(page, 'Test Config')).toBeVisible()
    await expect(treeStringValue(page, '1.0.0')).toBeVisible()

    // Boolean value - "notifications" key is at depth 2 inside "settings" (depth 1)
    // settings is at depth 1 (auto-expanded since depth < 2)
    // notifications is inside settings and rendered as a primitive (boolean)
    await expect(treeStringValue(page, 'dark')).toBeVisible()
    await expect(page.locator('span.text-purple-400').filter({ hasText: 'true' })).toBeVisible()
  })

  test('collapsing and expanding nodes works', async ({ page }) => {
    await uploadFile(page, 'sample.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Root object at depth 0 (expanded), employees at depth 1 (expanded)
    // Array items "0","1","2" at depth 2 (collapsed by default: depth < 2 = false)
    const employeesBtn = page.locator('button').filter({ hasText: /employees/ })
    await expect(employeesBtn).toBeVisible()

    // Array items should be visible as collapsed entries with {3}
    const firstItemBtn = page.locator('button').filter({ hasText: /"0"/ })
    await expect(firstItemBtn).toBeVisible()

    // Expand first item to see its properties
    await firstItemBtn.click()
    await expect(treeStringValue(page, 'John Doe')).toBeVisible()

    // Collapse employees array entirely
    await employeesBtn.click()

    // After collapse, array items (and their contents) should be hidden
    await expect(firstItemBtn).not.toBeVisible()
    await expect(treeStringValue(page, 'John Doe')).not.toBeVisible()

    // Expand employees again — items reappear but in collapsed state
    // (React unmounts children on collapse, re-mount resets to default state)
    await employeesBtn.click()
    await expect(firstItemBtn).toBeVisible()

    // Re-expand the first item to verify data is still intact
    await firstItemBtn.click()
    await expect(treeStringValue(page, 'John Doe')).toBeVisible()
  })

  test('deeply nested objects have correct expand/collapse behavior', async ({ page }) => {
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // "features" is an array at depth 1 (auto-expanded since depth < 2)
    // Array items are strings at depth 2, rendered as primitives (no expand/collapse)
    await expect(treeStringValue(page, 'auth')).toBeVisible()
    await expect(treeStringValue(page, 'dashboard')).toBeVisible()

    // Collapse "features"
    const featuresBtn = page.locator('button').filter({ hasText: /features/ })
    await featuresBtn.click()
    await expect(treeStringValue(page, 'auth')).not.toBeVisible()

    // Re-expand
    await featuresBtn.click()
    await expect(treeStringValue(page, 'auth')).toBeVisible()
  })
})

// ── Export ────────────────────────────────────────────────────────────────
test.describe('Data Viewer — export', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('export CSV button triggers download', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Intercept download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button').filter({ hasText: 'CSV' }).first().click(),
    ])

    expect(download.suggestedFilename()).toMatch(/sample-export\.csv/)
  })

  test('export JSON button triggers download', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button').filter({ hasText: 'JSON' }).first().click(),
    ])

    expect(download.suggestedFilename()).toMatch(/sample-export\.json/)
  })

  test('export JSON for tree-only data triggers download', async ({ page }) => {
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button').filter({ hasText: 'JSON' }).first().click(),
    ])

    expect(download.suggestedFilename()).toMatch(/single-object-export\.json/)
  })

  test('export CSV is disabled for tree-only JSON', async ({ page }) => {
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // CSV button should be disabled when there are no rows
    const csvBtn = page.locator('button').filter({ hasText: 'CSV' }).first()
    await expect(csvBtn).toBeDisabled()
  })

  test('export CSV respects current sort order', async ({ page }) => {
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Sort by score descending
    const scoreHeader = page.locator('th').filter({ hasText: 'score' })
    await scoreHeader.click()
    await scoreHeader.click()

    // Export CSV
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button').filter({ hasText: 'CSV' }).first().click(),
    ])

    // Read the exported file
    const content = await (await download.createReadStream()).toArray()
    const text = Buffer.concat(content).toString('utf-8')
    const lines = text.trim().split('\n')

    // First data line should be Alice (score 95, highest)
    expect(lines[1]).toContain('Alice')
    expect(lines[1]).toContain('95')
  })

  test('export CSV respects search filter', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Filter to Engineering
    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Engineering')
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    // Export CSV
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button').filter({ hasText: 'CSV' }).first().click(),
    ])

    const content = await (await download.createReadStream()).toArray()
    const text = Buffer.concat(content).toString('utf-8')
    const lines = text.trim().split('\n')

    // Should have header + 2 data rows
    expect(lines).toHaveLength(3)
  })
})

// ── New file / reset ─────────────────────────────────────────────────────
test.describe('Data Viewer — new file reset', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('clicking New file returns to upload area', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()
  })

  test('loading a new file replaces previous data', async ({ page }) => {
    // Load CSV first
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Click New file
    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()

    // Load JSON
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Headers should be from JSON, not CSV
    await expect(page.locator('th').filter({ hasText: 'id' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: 'score' })).toBeVisible()
    // CSV headers should NOT be present
    await expect(page.locator('th').filter({ hasText: 'Department' })).not.toBeVisible()
  })

  test('search is cleared when loading a new file', async ({ page }) => {
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Set search
    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Engineering')
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    // New file
    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Search should be cleared
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()
    await expect(search).toHaveValue('')
  })
})

// ── TSV support ──────────────────────────────────────────────────────────
test.describe('Data Viewer — TSV support', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('TSV file parses correctly with tab delimiter', async ({ page }) => {
    await uploadFile(page, 'sample.tsv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Should detect TSV and parse tab-separated columns
    for (const h of ['Name', 'Age', 'City']) {
      await expect(page.locator('th').filter({ hasText: h })).toBeVisible()
    }

    await expect(page.locator('text=3 / 3 rows')).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'Alice' })).toBeVisible()
    await expect(page.locator('td').filter({ hasText: 'New York' })).toBeVisible()
  })
})

// ── Header-only CSV ──────────────────────────────────────────────────────
test.describe('Data Viewer — edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await goToDataViewer(page)
  })

  test('header-only CSV shows table with zero rows', async ({ page }) => {
    await uploadFile(page, 'header-only.csv')
    // Should show the toolbar (file is loaded)
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Should show headers in table
    await expect(page.locator('table')).toBeVisible()
    for (const h of ['Name', 'Age', 'Department']) {
      await expect(page.locator('th').filter({ hasText: h })).toBeVisible()
    }

    // Row count should show 0
    await expect(page.locator('text=0 / 0 rows')).toBeVisible()
    await expect(page.locator('text=No data')).toBeVisible()
  })
})
