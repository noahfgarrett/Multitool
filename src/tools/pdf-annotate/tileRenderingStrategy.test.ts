import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldUseTileRendering } from './tileRenderingStrategy.ts'

test('uses tiles when the requested scale exceeds the safe full-page scale', () => {
  assert.equal(shouldUseTileRendering({
    naturalWidth: 1000,
    naturalHeight: 1000,
    requestedScale: 5,
    maxRenderScale: 4,
    progressiveTileMinPixels: 10_000_000,
    progressiveTileMinAxisPx: 1800,
  }), true)
})

test('uses progressive tiles for large pages even when under the hard cap', () => {
  assert.equal(shouldUseTileRendering({
    naturalWidth: 1728,
    naturalHeight: 4320,
    requestedScale: 1,
    maxRenderScale: 2,
    progressiveTileMinPixels: 1_500_000,
    progressiveTileMinAxisPx: 1800,
  }), true)
})

test('keeps small high-DPI pages on the faster single-canvas path', () => {
  assert.equal(shouldUseTileRendering({
    naturalWidth: 612,
    naturalHeight: 792,
    requestedScale: 2,
    maxRenderScale: 5,
    progressiveTileMinPixels: 1_500_000,
    progressiveTileMinAxisPx: 1800,
  }), false)
})
