import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { test } from 'node:test'
import { downloadUpdateFile } from './updateDownload.ts'
import type { UpdateInfo } from './updateChecker.ts'

function makeGzipUpdateInfo(): UpdateInfo {
  return {
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
}

test('downloadUpdateFile fetches gzipped update and saves decompressed HTML', async () => {
  const html = '<!doctype html><title>Multitool</title>'
  const calls: Array<{ url: string; accept: string | null }> = []
  const saved: Array<{ filename: string; mimeType?: string; text: string }> = []
  const info = makeGzipUpdateInfo()

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

test('downloadUpdateFile opens the direct HTML asset when browser asset fetches fail', async () => {
  const calls: string[] = []
  const directDownloads: Array<{ url: string; filename: string }> = []

  const result = await downloadUpdateFile(makeGzipUpdateInfo(), {
    fetchImpl: async (url) => {
      calls.push(String(url))
      throw new TypeError('Failed to fetch')
    },
    directDownloadImpl: (url, filename) => {
      directDownloads.push({ url, filename })
    },
  })

  assert.deepEqual(calls, [
    'https://api.github.com/assets/gzip',
    'https://api.github.com/assets/plain',
  ])
  assert.deepEqual(directDownloads, [
    { url: 'https://github.com/download/plain', filename: 'Multitool.html' },
  ])
  assert.deepEqual(result, {
    downloadedAssetName: 'Multitool.html',
    savedFilename: 'Multitool.html',
    usedCompressedAsset: false,
    usedDirectDownloadFallback: true,
  })
})

test('downloadUpdateFile uses the direct HTML asset immediately in standalone file contexts', async () => {
  const directDownloads: Array<{ url: string; filename: string }> = []

  const result = await downloadUpdateFile(makeGzipUpdateInfo(), {
    shouldUseDirectDownload: () => true,
    fetchImpl: async () => {
      throw new Error('fetch should not run')
    },
    directDownloadImpl: (url, filename) => {
      directDownloads.push({ url, filename })
    },
  })

  assert.deepEqual(directDownloads, [
    { url: 'https://github.com/download/plain', filename: 'Multitool.html' },
  ])
  assert.deepEqual(result, {
    downloadedAssetName: 'Multitool.html',
    savedFilename: 'Multitool.html',
    usedCompressedAsset: false,
    usedDirectDownloadFallback: true,
  })
})
