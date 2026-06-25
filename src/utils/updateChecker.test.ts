import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectUpdateAsset } from './updateChecker.ts'

test('selectUpdateAsset prefers gzipped HTML while keeping plain HTML as fallback', () => {
  const asset = selectUpdateAsset([
    {
      name: 'Multitool.html',
      url: 'https://api.github.com/assets/plain',
      browser_download_url: 'https://github.com/download/plain',
    },
    {
      name: 'Multitool.html.gz',
      url: 'https://api.github.com/assets/gzip',
      browser_download_url: 'https://github.com/download/gzip',
    },
  ])

  assert.deepEqual(asset, {
    downloadUrl: 'https://github.com/download/gzip',
    assetApiUrl: 'https://api.github.com/assets/gzip',
    assetName: 'Multitool.html.gz',
    downloadKind: 'gzip-html',
    fallbackDownloadUrl: 'https://github.com/download/plain',
    fallbackAssetApiUrl: 'https://api.github.com/assets/plain',
    fallbackAssetName: 'Multitool.html',
  })
})

test('selectUpdateAsset requires plain HTML for older app compatibility', () => {
  const asset = selectUpdateAsset([
    {
      name: 'Multitool.html.gz',
      url: 'https://api.github.com/assets/gzip',
      browser_download_url: 'https://github.com/download/gzip',
    },
  ])

  assert.equal(asset, null)
})

test('selectUpdateAsset uses plain HTML when no gzipped asset is present', () => {
  const asset = selectUpdateAsset([
    {
      name: 'Multitool.html',
      url: 'https://api.github.com/assets/plain',
      browser_download_url: 'https://github.com/download/plain',
    },
  ])

  assert.deepEqual(asset, {
    downloadUrl: 'https://github.com/download/plain',
    assetApiUrl: 'https://api.github.com/assets/plain',
    assetName: 'Multitool.html',
    downloadKind: 'html',
  })
})
