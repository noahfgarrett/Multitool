import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { preview } from 'vite'

// Without a URL, test the actual Pages build, not Vite's development module loader.
const remoteUrl = process.argv[2]
let server
let browser
try {
  if (!remoteUrl) {
    await access(new URL('../dist-pages/.nojekyll', import.meta.url))
    server = await preview({
      configFile: false,
      base: '/Multitool/',
      build: { outDir: 'dist-pages' },
      preview: { port: 5185, strictPort: true, open: false },
    })
  }
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const failures = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  await page.addInitScript(() => {
    localStorage.setItem('mt-user-profile', JSON.stringify({ name: 'Test User', initials: 'TU' }))
    // Exercise real browser downloads without opening an OS-native save dialog.
    delete window.showSaveFilePicker
  })
  await page.goto(remoteUrl ?? 'http://localhost:5185/Multitool/')
  await page.locator('nav button').filter({ hasText: 'PDF Split' }).click()
  await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles(
    new URL('../e2e/fixtures/multi-page.pdf', import.meta.url).pathname,
  )
  await expect(page.getByText('multi-page.pdf', { exact: true })).toBeVisible()
  for (let number = 1; number <= 5; number++) {
    const image = page.getByRole('img', { name: `Page ${number}`, exact: true })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  }
  const range = page.locator('input[placeholder*="1-50"]')
  await range.fill('1,3')
  await page.getByRole('button', { name: 'Add pages by range', exact: true }).click()

  async function download(buttonName) {
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: buttonName, exact: true }).click()
    const result = await pending
    assert.equal(await result.failure(), null)
    return { name: result.suggestedFilename(), bytes: await readFile(await result.path()) }
  }
  const single = await download('Export Document')
  assert.equal(single.name, 'Document 1.pdf')
  assert.equal((await PDFDocument.load(single.bytes)).getPageCount(), 2)

  await page.getByRole('button', { name: 'New Document', exact: true }).click()
  await range.fill('2,4-5')
  await page.getByRole('button', { name: 'Add pages by range', exact: true }).click()
  const multiple = await download('Export All (2 docs)')
  assert.equal(multiple.name, 'multi-page-split.zip')
  const zip = await JSZip.loadAsync(multiple.bytes)
  assert.deepEqual(Object.keys(zip.files).sort(), ['Document 1.pdf', 'Document 2.pdf'])
  for (const [name, count] of [['Document 1.pdf', 2], ['Document 2.pdf', 3]]) {
    assert.equal((await PDFDocument.load(await zip.file(name).async('uint8array'))).getPageCount(), count)
  }
  assert.deepEqual(failures, [])
  console.log('PASS: PDF Split loads, five thumbnails render, selected pages export as PDF and ZIP; no HTTP or browser errors.')
} finally {
  await browser?.close()
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
