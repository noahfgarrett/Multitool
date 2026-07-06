import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveViteBuildMode } from './viteBuildMode.ts'

test('resolveViteBuildMode keeps the browser release as a single HTML build', () => {
  assert.deepEqual(resolveViteBuildMode('production'), {
    outDir: 'dist',
    singleFile: true,
    bundledOcr: true,
    base: './',
  })
})

test('resolveViteBuildMode emits split assets for the Tauri desktop build', () => {
  assert.deepEqual(resolveViteBuildMode('tauri'), {
    outDir: 'dist-tauri',
    singleFile: false,
    bundledOcr: true,
    base: './',
  })
})

test('resolveViteBuildMode emits a lightweight Pages build without bundled OCR', () => {
  assert.deepEqual(resolveViteBuildMode('pages'), {
    outDir: 'dist-pages',
    singleFile: false,
    bundledOcr: false,
    base: './',
  })
})
