/**
 * Text Extract — Extraction Accuracy Tests
 *
 * These tests verify that the Text Extract tool correctly extracts
 * known content from purpose-built fixture PDFs. Each fixture has
 * deterministic content so we can assert on specific extracted values.
 */
import { test, expect, type Page } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'text-extract')
})

/** Upload a fixture PDF, extract in given mode, return all preview pane text */
async function extractAndGetText(page: Page, filename: string, mode: 'Document' | 'Table' = 'Document'): Promise<string> {
  await uploadFile(page, filename)
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(500)

  // Set extraction mode
  if (mode === 'Table') {
    await page.locator('button').filter({ hasText: 'Table' }).click()
    await page.waitForTimeout(200)
  }

  // Click Extract
  await page.getByRole('button', { name: /^Extract$/ }).click()
  await expect(page.getByRole('button', { name: /Re-extract/ })).toBeVisible({ timeout: 60000 })
  await page.waitForTimeout(1000)

  // Collect all text from the preview/right pane
  return page.evaluate(() => {
    // The right pane contains the extracted text preview
    const panels = document.querySelectorAll('[class*="overflow"]')
    let text = ''
    panels.forEach(p => { text += (p.textContent || '') + '\n' })
    return text
  })
}

/** Extract and trigger a download, return the download object */
async function extractAndExport(page: Page, filename: string, format: string, mode: 'Document' | 'Table' = 'Document') {
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
  await uploadFile(page, filename)
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(500)

  if (mode === 'Table') {
    await page.locator('button').filter({ hasText: 'Table' }).click()
    await page.waitForTimeout(200)
  }

  await page.getByRole('button', { name: /^Extract$/ }).click()
  await expect(page.getByRole('button', { name: /Re-extract/ })).toBeVisible({ timeout: 60000 })
  await page.waitForTimeout(500)

  const exportBtn = page.locator('button').filter({ hasText: 'Export' })
  await exportBtn.click()
  await page.waitForTimeout(300)

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await page.getByText(format).click()
  return downloadPromise
}

// ═══════════════════════════════════════════════════════
// Simple Table (table-simple.pdf)
// ═══════════════════════════════════════════════════════

test.describe('Simple Table Extraction', () => {
  test('document mode extracts all employee names', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-simple.pdf', 'Document')
    expect(text).toContain('Alice Johnson')
    expect(text).toContain('Bob Martinez')
    expect(text).toContain('Carol Chen')
    expect(text).toContain('David Kim')
    expect(text).toContain('Eve Wilson')
  })

  test('document mode extracts title', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-simple.pdf', 'Document')
    expect(text).toContain('Employee Directory')
  })

  test('table mode extracts header row', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-simple.pdf', 'Table')
    expect(text).toContain('Name')
    expect(text).toContain('Department')
    expect(text).toContain('Title')
    expect(text).toContain('Salary')
  })

  test('table mode extracts salary values', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-simple.pdf', 'Table')
    expect(text).toContain('$125,000')
    expect(text).toContain('$142,000')
  })

  test('table has exactly 5 data rows (no title pollution)', async ({ page }) => {
    await extractAndGetText(page, 'table-simple.pdf', 'Table')
    // Count table rows in DOM (excluding header)
    const rowCount = await page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return -1
      return table.querySelectorAll('tbody tr, tr').length - 1 // subtract header row
    })
    expect(rowCount).toBe(5)
  })

  test('table does not contain "Employee Directory" as a row', async ({ page }) => {
    await extractAndGetText(page, 'table-simple.pdf', 'Table')
    const tableRows = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tr')
      return Array.from(rows).map(r => r.textContent?.trim() || '')
    })
    // Title should NOT appear in any table row
    for (const row of tableRows) {
      expect(row).not.toContain('Employee Directory')
    }
  })

  test('export simple table to CSV produces valid download', async ({ page }) => {
    const download = await extractAndExport(page, 'table-simple.pdf', 'CSV (.csv)', 'Table')
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('export simple table to Excel produces valid download', async ({ page }) => {
    const download = await extractAndExport(page, 'table-simple.pdf', 'Excel (.xlsx)', 'Table')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('export simple table to TXT produces valid download', async ({ page }) => {
    const download = await extractAndExport(page, 'table-simple.pdf', 'Text (.txt)', 'Table')
    expect(download.suggestedFilename()).toContain('.txt')
  })
})

// ═══════════════════════════════════════════════════════
// Multi-Column Table (table-multicolumn.pdf)
// ═══════════════════════════════════════════════════════

test.describe('Multi-Column Table Extraction', () => {
  test('table mode extracts region names', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-multicolumn.pdf', 'Table')
    expect(text).toContain('Northeast')
    expect(text).toContain('West Coast')
    expect(text).toContain('Northwest')
  })

  test('table mode extracts quarterly values', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-multicolumn.pdf', 'Table')
    // Check specific values from the table
    expect(text).toContain('45,200')  // Northeast Q1
    expect(text).toContain('249,500') // West Coast Total
  })

  test('table mode extracts all 6 column headers', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-multicolumn.pdf', 'Table')
    expect(text).toContain('Region')
    expect(text).toContain('Q1')
    expect(text).toContain('Q2')
    expect(text).toContain('Q3')
    expect(text).toContain('Q4')
    expect(text).toContain('Total')
  })

  test('export multi-column table to CSV', async ({ page }) => {
    const download = await extractAndExport(page, 'table-multicolumn.pdf', 'CSV (.csv)', 'Table')
    expect(download.suggestedFilename()).toContain('.csv')
  })
})

// ═══════════════════════════════════════════════════════
// Large Table (table-large.pdf — 60 rows, 3 pages)
// ═══════════════════════════════════════════════════════

test.describe('Large Table Extraction', () => {
  test('shows 3 pages for large table PDF', async ({ page }) => {
    await uploadFile(page, 'table-large.pdf')
    await expect(page.getByText('table-large.pdf')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=/Page 1 \\/ 3/')).toBeVisible({ timeout: 5000 })
  })

  test('table mode extracts first page data', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-large.pdf', 'Table')
    expect(text).toContain('Product Item 1')
    expect(text).toContain('Electronics')
  })

  test('table mode extracts column headers', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-large.pdf', 'Table')
    expect(text).toContain('ID')
    expect(text).toContain('Product')
    expect(text).toContain('Category')
    expect(text).toContain('Price')
  })

  test('export large table to Excel', async ({ page }) => {
    const download = await extractAndExport(page, 'table-large.pdf', 'Excel (.xlsx)', 'Table')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})

// ═══════════════════════════════════════════════════════
// Mixed Content (mixed-content.pdf — text + table)
// ═══════════════════════════════════════════════════════

test.describe('Mixed Content Extraction', () => {
  test('document mode extracts both title and paragraphs', async ({ page }) => {
    const text = await extractAndGetText(page, 'mixed-content.pdf', 'Document')
    expect(text).toContain('Project Status Report')
    expect(text).toContain('Prepared by')
    expect(text).toContain('Engineering Team')
  })

  test('document mode extracts paragraph text', async ({ page }) => {
    const text = await extractAndGetText(page, 'mixed-content.pdf', 'Document')
    expect(text).toContain('current status')
    expect(text).toContain('milestone')
  })

  test('table mode extracts project data from mixed content', async ({ page }) => {
    const text = await extractAndGetText(page, 'mixed-content.pdf', 'Table')
    expect(text).toContain('Alpha Release')
    expect(text).toContain('Beta Platform')
  })

  test('document mode extracts "Next Steps" section', async ({ page }) => {
    const text = await extractAndGetText(page, 'mixed-content.pdf', 'Document')
    expect(text).toContain('Next Steps')
    expect(text).toContain('weekly standup')
  })

  test('table mode extracts status values', async ({ page }) => {
    const text = await extractAndGetText(page, 'mixed-content.pdf', 'Table')
    expect(text).toContain('On Track')
    expect(text).toContain('At Risk')
    expect(text).toContain('Delayed')
  })

  test('table has exactly 4 data rows — no paragraph text pollution', async ({ page }) => {
    await extractAndGetText(page, 'mixed-content.pdf', 'Table')
    const rowCount = await page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return -1
      return table.querySelectorAll('tbody tr, tr').length - 1
    })
    expect(rowCount).toBe(4)
  })

  test('table does not contain paragraph text like "current status"', async ({ page }) => {
    await extractAndGetText(page, 'mixed-content.pdf', 'Table')
    const tableText = await page.evaluate(() => {
      const table = document.querySelector('table')
      return table?.textContent || ''
    })
    expect(tableText).not.toContain('current status')
    expect(tableText).not.toContain('Next Steps')
    expect(tableText).not.toContain('weekly standup')
  })

  test('export mixed content to PDF', async ({ page }) => {
    const download = await extractAndExport(page, 'mixed-content.pdf', 'PDF (.pdf)', 'Document')
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ═══════════════════════════════════════════════════════
// Complex Table (table-complex.pdf — 8 columns, budget data)
// ═══════════════════════════════════════════════════════

test.describe('Complex Table Extraction', () => {
  test('table mode extracts department names', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-complex.pdf', 'Table')
    expect(text).toContain('Engineering')
    expect(text).toContain('Marketing')
    expect(text).toContain('Finance')
    expect(text).toContain('HR')
  })

  test('table mode extracts budget totals', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-complex.pdf', 'Table')
    expect(text).toContain('$725,000')
    expect(text).toContain('$460,000')
  })

  test('table mode extracts 8 column headers', async ({ page }) => {
    const text = await extractAndGetText(page, 'table-complex.pdf', 'Table')
    expect(text).toContain('Department')
    expect(text).toContain('Staff')
    expect(text).toContain('Equipment')
    expect(text).toContain('Total Budget')
  })

  test('export complex table to CSV', async ({ page }) => {
    const download = await extractAndExport(page, 'table-complex.pdf', 'CSV (.csv)', 'Table')
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('table has exactly 5 data rows — no title pollution', async ({ page }) => {
    await extractAndGetText(page, 'table-complex.pdf', 'Table')
    const rowCount = await page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return -1
      return table.querySelectorAll('tbody tr, tr').length - 1
    })
    expect(rowCount).toBe(5)
  })
})

// ═══════════════════════════════════════════════════════
// Multi-Page Document (document-multipage.pdf — 3 pages text)
// ═══════════════════════════════════════════════════════

test.describe('Multi-Page Document Extraction', () => {
  test('shows 3 pages for multi-page document', async ({ page }) => {
    await uploadFile(page, 'document-multipage.pdf')
    await expect(page.getByText('document-multipage.pdf')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=/Page 1 \\/ 3/')).toBeVisible({ timeout: 5000 })
  })

  test('document mode extracts section headings', async ({ page }) => {
    const text = await extractAndGetText(page, 'document-multipage.pdf', 'Document')
    expect(text).toContain('Introduction')
  })

  test('document mode extracts body text content', async ({ page }) => {
    const text = await extractAndGetText(page, 'document-multipage.pdf', 'Document')
    expect(text).toContain('document extraction mode')
  })

  test('export multi-page document to TXT', async ({ page }) => {
    const download = await extractAndExport(page, 'document-multipage.pdf', 'Text (.txt)', 'Document')
    expect(download.suggestedFilename()).toContain('.txt')
  })

  test('export multi-page document to PDF', async ({ page }) => {
    const download = await extractAndExport(page, 'document-multipage.pdf', 'PDF (.pdf)', 'Document')
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})
