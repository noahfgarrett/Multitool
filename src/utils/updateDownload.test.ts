import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { test } from 'node:test'
import { downloadUpdateFile } from './updateDownload.ts'
import type { UpdateInfo } from './updateChecker.ts'

test('downloadUpdateFile fetches gzipped update and saves decompressed HTML', async () => {
  const html = '<!doctype html><title>Multitool</title>'
  const calls: Array<{ url: string; accept: string | null }> = []
  const saved: Array<{ filename: string; mimeType?: string; text: string }> = []
  const info: UpdateInfo = {
    version: '5.0.0',
    releaseNotes: '',
    downloadUrl: 'https://github.com/download/gzip',
    assetApiUrl: 'https://api.github.com/assets/gzip',
    assetName: 'Multitool.html.gz',
    downloadKind: 'gzip-html',
    fallbackDownloadUrl: 'https://github.com/download/plain',
    fallbackAssetApiUrl: 'https://api.github.com/assets/plain',
    fallbackAssetName: 'Multitool.html',
  }

  const result = await downloadUpdateFile(info, {
    fetchImpl: async (url, init) => {
      calls.push({
        url: String(url),
        accept: init?.headers instanceof Headers
          ? init.headers.get('Accept')
          : (init?.headers as Record<string, string> | undefined)?.Accept ?? null,
      })
      return new Response(gzipSync(html), { status: 200 })
    },
    saveImpl: async (blob, filename, mimeType) => {
      saved.push({ filename, mimeType, text: await blob.text() })
    },
  })

  assert.deepEqual(result, { downloadedAssetName: 'Multitool.html.gz', savedFilename: 'Multitool.html', usedCompressedAsset: true })
  assert.deepEqual(calls, [{ url: 'https://api.github.com/assets/gzip', accept: 'application/octet-stream' }])
  assert.deepEqual(saved, [{ filename: 'Multitool.html', mimeType: 'text/html', text: html }])
})
