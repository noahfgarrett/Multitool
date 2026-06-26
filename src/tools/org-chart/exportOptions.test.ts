import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveExportBackgroundColor } from './exportOptions.ts'

test('resolveExportBackgroundColor uses the chart background for current mode', () => {
  assert.equal(
    resolveExportBackgroundColor({ mode: 'current', chartColor: '#1f2937' }),
    '#1f2937',
  )
})

test('resolveExportBackgroundColor keeps transparent exports transparent', () => {
  assert.equal(
    resolveExportBackgroundColor({ mode: 'transparent', chartColor: '#1f2937' }),
    null,
  )
})

test('resolveExportBackgroundColor sanitizes invalid custom export colors', () => {
  assert.equal(
    resolveExportBackgroundColor({
      mode: 'custom',
      chartColor: '#1f2937',
      customColor: 'midnight',
    }),
    '#1f2937',
  )
})
