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
import { floodFillRegion, boxBlur01, removalFromWand } from './maskEngine'
import type { Point } from './types'

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

test('floodFillRegion: fills only the contiguous matching region', () => {
  // 3x1: black, black, white. Seed at x=0, low tolerance.
  const data = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255])
  const region = floodFillRegion(new Uint8ClampedArray(data), 3, 1, { x: 0, y: 0 }, 5)
  assert.equal(region[0], 1)
  assert.equal(region[1], 1)
  assert.equal(region[2], 0) // white not reached
})

test('floodFillRegion: does not leak across a non-matching barrier', () => {
  // 5x1: black, black, WHITE barrier, black, black. Seed left → only left pair.
  const px = [
    0, 0, 0, 255,
    0, 0, 0, 255,
    255, 255, 255, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
  ]
  const region = floodFillRegion(new Uint8ClampedArray(px), 5, 1, { x: 0, y: 0 }, 5)
  assert.deepEqual(Array.from(region), [1, 1, 0, 0, 0])
})

test('boxBlur01: radius 0 is identity; blur of a step is monotonic and bounded', () => {
  const mask = new Float32Array([0, 0, 1, 1])
  assert.deepEqual(Array.from(boxBlur01(mask, 4, 1, 0)), [0, 0, 1, 1])
  const blurred = boxBlur01(new Float32Array([0, 0, 1, 1, 1, 1]), 6, 1, 1)
  for (const v of blurred) assert.ok(v >= 0 && v <= 1)
})

test('removalFromWand: unions seeds and stays within 0..1', () => {
  const data = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255])
  const seeds: Point[] = [{ x: 0, y: 0 }]
  const removal = removalFromWand(data, 3, 1, seeds, 5, 0)
  assert.equal(removal[0], 1)
  assert.equal(removal[2], 0)
  for (const v of removal) assert.ok(v >= 0 && v <= 1)
})

test('removalFromWand: no seeds removes nothing', () => {
  const data = new Uint8ClampedArray(3 * 4)
  const removal = removalFromWand(data, 3, 1, [], 50, 50)
  assert.deepEqual(Array.from(removal), [0, 0, 0])
})
