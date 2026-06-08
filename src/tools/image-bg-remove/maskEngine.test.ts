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
import {
  rasterizeStrokes,
  combineMax,
  collectBgColors,
  applyMask,
  renderMask,
  MANUAL_NONE,
  MANUAL_KEEP,
  MANUAL_REMOVE,
} from './maskEngine'
import type { BrushStroke, MaskDoc } from './types'

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

test('rasterizeStrokes: disk stamps the center; erase=2, restore=1; last wins', () => {
  const erase: BrushStroke = { type: 'erase', points: [{ x: 2, y: 2 }], radius: 1 }
  const m1 = rasterizeStrokes(5, 5, [erase], 1)
  assert.equal(m1[2 * 5 + 2], MANUAL_REMOVE)
  assert.equal(m1[0], MANUAL_NONE)

  const restore: BrushStroke = { type: 'restore', points: [{ x: 2, y: 2 }], radius: 1 }
  const m2 = rasterizeStrokes(5, 5, [erase, restore], 1) // restore applied last
  assert.equal(m2[2 * 5 + 2], MANUAL_KEEP)
})

test('rasterizeStrokes: scale maps native coords/radius into buffer space', () => {
  const stroke: BrushStroke = { type: 'erase', points: [{ x: 4, y: 4 }], radius: 2 }
  const m = rasterizeStrokes(5, 5, [stroke], 0.5) // center → (2,2), radius → 1
  assert.equal(m[2 * 5 + 2], MANUAL_REMOVE)
})

test('combineMax takes the per-pixel maximum', () => {
  // Use float32-exact values so Array.from round-trips without quantization drift.
  const a = new Float32Array([0, 0.75, 1])
  const b = new Float32Array([0.5, 0.25, 0])
  assert.deepEqual(Array.from(combineMax(a, b)), [0.5, 0.75, 1])
})

test('applyMask: manual override beats key removal', () => {
  const src = new Uint8ClampedArray([10, 20, 30, 255, 10, 20, 30, 255])
  const removal = new Float32Array([1, 0]) // px0 removed, px1 kept by key
  const manual = new Uint8Array([MANUAL_KEEP, MANUAL_REMOVE]) // overrides flip both
  const out = applyMask(src, 2, 1, removal, manual, [], 0)
  assert.equal(out[3], 255) // px0 force-kept
  assert.equal(out[7], 0)   // px1 force-removed
})

test('applyMask: partial removal scales original alpha', () => {
  const src = new Uint8ClampedArray([0, 0, 0, 200])
  const removal = new Float32Array([0.5])
  const out = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), [], 0)
  assert.equal(out[3], Math.round((1 - 0.5) * 200))
})

test('applyMask: defringe pushes edge color toward the unmixed foreground', () => {
  // Observed grey 128 at coverage a=0.5 over black bg → unmixed F = 256→clamped 255.
  const src = new Uint8ClampedArray([128, 128, 128, 255])
  const removal = new Float32Array([0.5]) // a = 0.5 (edge pixel)
  const bg = [{ r: 0, g: 0, b: 0 }]
  const none = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), bg, 0)
  const full = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), bg, 100)
  assert.equal(none[0], 128)        // defringe off → unchanged
  assert.ok(full[0] > none[0])      // defringe on → brighter (decontaminated)
})

test('renderMask: end-to-end keys the sampled background', () => {
  // 2x1: green bg + red fg. Sample green via doc.samples.
  const src = new Uint8ClampedArray([0, 255, 0, 255, 255, 0, 0, 255])
  const doc: MaskDoc = {
    samples: [{ r: 0, g: 255, b: 0 }],
    wandSeeds: [],
    strokes: [],
    tolerance: 10,
    softness: 0,
    defringe: 0,
  }
  const out = renderMask(src, 2, 1, doc, 1)
  assert.equal(out[3], 0)   // green bg transparent
  assert.equal(out[7], 255) // red fg opaque
})

test('collectBgColors: includes samples and the color under each seed', () => {
  const src = new Uint8ClampedArray([0, 0, 255, 255]) // single blue pixel
  const colors = collectBgColors(src, 1, 1, [{ r: 9, g: 9, b: 9 }], [{ x: 0, y: 0 }])
  assert.deepEqual(colors[0], { r: 9, g: 9, b: 9 })
  assert.deepEqual(colors[1], { r: 0, g: 0, b: 255 })
})
