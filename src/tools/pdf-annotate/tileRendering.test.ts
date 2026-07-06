import assert from 'node:assert/strict'
import test from 'node:test'
import { computeTileGridLayout } from './tileGridLayout.ts'

test('splits tall progressive pages into top-to-bottom tile rows', () => {
  const layout = computeTileGridLayout({
    totalWidth: 864,
    totalHeight: 2160,
    maxCanvasPixels: 16_777_216,
    preferredMaxTileDim: 1536,
  })

  assert.equal(layout.cols, 1)
  assert.equal(layout.rows, 2)
})

test('keeps tile dimensions under the browser canvas budget', () => {
  const layout = computeTileGridLayout({
    totalWidth: 6000,
    totalHeight: 9000,
    maxCanvasPixels: 16_777_216,
    preferredMaxTileDim: 10_000,
  })

  assert(layout.tileW * layout.tileH <= 16_777_216 * 0.85)
})
