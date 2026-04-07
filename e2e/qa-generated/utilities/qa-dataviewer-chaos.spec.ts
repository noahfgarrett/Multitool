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

test.describe('Data Viewer — chaos: rapid file switching', () => {
  test('rapid CSV -> JSON -> CSV switching does not crash', async ({ page }) => {
    await goToDataViewer(page)

    // Load CSV
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Quick switch to new file
    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()

    // Load JSON
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Quick switch again
    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()

    // Load CSV again
    await uploadFile(page, 'large.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=20 / 20 rows')).toBeVisible()
  })

  test('switching between table and tree view repeatedly', async ({ page }) => {
    await goToDataViewer(page)
    await uploadFile(page, 'nested-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const tableBtn = page.locator('button').filter({ hasText: /^Table$/ })
    const treeBtn = page.locator('button').filter({ hasText: /^Tree$/ })

    for (let i = 0; i < 5; i++) {
      await treeBtn.click()
      await expect(page.locator('table')).not.toBeVisible()

      await tableBtn.click()
      await expect(page.locator('table')).toBeVisible()
    }

    // Final state should be table with data intact
    await expect(page.locator('text=3 / 3 rows')).toBeVisible()
  })
})

test.describe('Data Viewer — chaos: search while loading', () => {
  test('typing search rapidly does not crash', async ({ page }) => {
    await goToDataViewer(page)
    await uploadFile(page, 'large.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')

    // Type rapidly, character by character
    await search.focus()
    for (const char of 'Employee_001') {
      await page.keyboard.type(char, { delay: 20 })
    }

    // Should filter to 1 row
    await expect(page.locator('text=1 / 20 rows')).toBeVisible()

    // Clear rapidly
    await search.fill('')
    await expect(page.locator('text=20 / 20 rows')).toBeVisible()

    // Type another search
    await search.fill('Engineering')
    // Engineering appears in 7 rows in large.csv
    await expect(page.locator('text=7 / 20 rows')).toBeVisible()
  })

  test('search then clear then search repeatedly', async ({ page }) => {
    await goToDataViewer(page)
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const search = page.locator('input[placeholder="Search all columns..."]')

    for (let i = 0; i < 5; i++) {
      await search.fill('Marketing')
      await expect(page.locator('text=2 / 5 rows')).toBeVisible()

      await search.fill('')
      await expect(page.locator('text=5 / 5 rows')).toBeVisible()
    }
  })
})

test.describe('Data Viewer — chaos: sort spam', () => {
  test('clicking sort headers rapidly does not crash', async ({ page }) => {
    await goToDataViewer(page)
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    const nameHeader = page.locator('th').filter({ hasText: 'Name' })
    const ageHeader = page.locator('th').filter({ hasText: 'Age' })
    const salaryHeader = page.locator('th').filter({ hasText: 'Salary' })

    // Rapid clicks across different columns
    for (let i = 0; i < 3; i++) {
      await nameHeader.click()
      await ageHeader.click()
      await salaryHeader.click()
    }

    // App should still be functional - last sort was on Salary
    // 3 clicks on salary: asc, then desc (since column changes reset to asc)
    // Actually each column change resets to asc: so last click is salaryHeader asc
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()
  })

  test('sort + search + sort does not produce stale data', async ({ page }) => {
    await goToDataViewer(page)
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Sort by age ascending
    await page.locator('th').filter({ hasText: 'Age' }).click()

    // Search for Engineering
    const search = page.locator('input[placeholder="Search all columns..."]')
    await search.fill('Engineering')
    await expect(page.locator('text=2 / 5 rows')).toBeVisible()

    // Sort by salary descending
    const salaryHeader = page.locator('th').filter({ hasText: 'Salary' })
    await salaryHeader.click() // asc
    await salaryHeader.click() // desc

    // Alice Brown (102000) should be first, John Doe (95000) second
    const firstRow = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRow).toHaveText('Alice Brown')

    // Clear search
    await search.fill('')
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()

    // Sort should still be active - Alice Brown (102000) still first
    const firstRowAfter = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstRowAfter).toHaveText('Alice Brown')
  })
})

test.describe('Data Viewer — chaos: error recovery', () => {
  test('loading malformed JSON then valid CSV recovers cleanly', async ({ page }) => {
    await goToDataViewer(page)

    // Load malformed JSON — after fix, it resets to drop zone with error
    await uploadFile(page, 'malformed.json')
    await expect(page.locator('text=Invalid JSON')).toBeVisible({ timeout: 5000 })
    // Drop zone should still be visible for retry
    await expect(page.locator('text=Drop a JSON or CSV file')).toBeVisible()

    // Now load valid CSV directly (no need to click "New file")
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()
  })

  test('loading empty JSON then valid file recovers', async ({ page }) => {
    await goToDataViewer(page)

    // Load empty array JSON — shows as tree view with [0]
    await uploadFile(page, 'empty.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('span').filter({ hasText: '[0]' })).toBeVisible()

    // Load valid CSV via New file
    await page.locator('button, a').filter({ hasText: 'New file' }).click()
    await uploadFile(page, 'sample.csv')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=5 / 5 rows')).toBeVisible()
  })
})

test.describe('Data Viewer — chaos: copy to clipboard', () => {
  test('copy button does not crash for table data', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await goToDataViewer(page)
    await uploadFile(page, 'flat-array.json')
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

    // Click copy
    await page.locator('button').filter({ hasText: 'Copy' }).click()

    // Verify clipboard content is valid JSON
    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    const parsed = JSON.parse(clipText)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(5)
  })

  test('copy button does not crash for tree data', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await goToDataViewer(page)
    await uploadFile(page, 'single-object.json')
    await expect(page.locator('text=New file')).toBeVisible({ timeout: 5000 })

    // Click copy
    await page.locator('button').filter({ hasText: 'Copy' }).click()

    // Verify clipboard content
    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    const parsed = JSON.parse(clipText)
    expect(parsed).toHaveProperty('name', 'Test Config')
  })
})
