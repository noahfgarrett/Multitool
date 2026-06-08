// src/tools/image-bg-remove/maskEngine.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  smoothstep,
  toleranceToDist,
  colorDist,
  removalFromColor,
  MAX_COLOR_DIST,
} from './maskEngine'
import type { ColorSample } from './types'

/** Build a solid RGBA buffer. */
function solid(w: number, h: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    d[p * 4] = r
    d[p * 4 + 1] = g
    d[p * 4 + 2] = b
    d[p * 4 + 3] = a
  }
  return d
}

test('smoothstep clamps and eases', () => {
  assert.equal(smoothstep(0, 10, -5), 0)
  assert.equal(smoothstep(0, 10, 15), 1)
  assert.equal(smoothstep(0, 10, 5), 0.5)
  assert.equal(smoothstep(5, 5, 4), 0) // degenerate band → step
  assert.equal(smoothstep(5, 5, 6), 1)
})

test('toleranceToDist maps 0–100 onto color-distance space', () => {
  assert.equal(toleranceToDist(0), 0)
  assert.ok(Math.abs(toleranceToDist(100) - MAX_COLOR_DIST) < 1e-6)
})

test('colorDist is Euclidean', () => {
  const c: ColorSample = { r: 0, g: 0, b: 0 }
  assert.ok(Math.abs(colorDist(0, 0, 0, c) - 0) < 1e-6)
  assert.ok(Math.abs(colorDist(255, 0, 0, c) - 255) < 1e-6)
})

test('removalFromColor: exact match removed, far pixel kept (hard band)', () => {
  // 2x1 image: pixel 0 = green bg, pixel 1 = red fg
  const data = new Uint8ClampedArray([0, 255, 0, 255, 255, 0, 0, 255])
  const samples: ColorSample[] = [{ r: 0, g: 255, b: 0 }]
  const removal = removalFromColor(data, 2, 1, samples, 10, 0)
  assert.equal(removal[0], 1) // green removed
  assert.equal(removal[1], 0) // red kept
})

test('removalFromColor: soft band yields partial removal', () => {
  // single pixel at distance ~127.5 from the sample
  const data = solid(1, 1, 128, 0, 0)
  const samples: ColorSample[] = [{ r: 0, g: 0, b: 0 }]
  // inner = tolerance dist, band wide enough that 128 falls inside the ramp
  const removal = removalFromColor(data, 1, 1, samples, 5, 60)
  assert.ok(removal[0] > 0 && removal[0] < 1, `expected partial, got ${removal[0]}`)
})

test('removalFromColor: no samples removes nothing', () => {
  const data = solid(3, 1, 10, 20, 30)
  const removal = removalFromColor(data, 3, 1, [], 50, 20)
  assert.deepEqual(Array.from(removal), [0, 0, 0])
})
