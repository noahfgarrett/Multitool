import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinchFrame, maxScroll } from './pinchMath'
import type { PinchStart } from './pinchMath'

const start: PinchStart = {
  originX: 100,
  originY: 50,
  startMidX: 300,
  startMidY: 250,
  scrollLeft: 40,
  scrollTop: 20,
  startZoom: 1,
}
const EPS = 1e-9
const BIG = 1_000_000 // effectively unclamped

/** Client position of the anchor (content under the start midpoint) after the
 * live transform. transform-origin is 0 0, layer top-left is at originX/Y, so
 * client = origin + translate + scale * anchorLocal. */
function anchorClient(s: PinchStart, f: { tx: number; ty: number; s: number }): { x: number; y: number } {
  const ax = s.startMidX - s.originX
  const ay = s.startMidY - s.originY
  return { x: s.originX + f.tx + f.s * ax, y: s.originY + f.ty + f.s * ay }
}

test('pinchFrame: unclamped, anchor lands under the finger (zoom in, panning)', () => {
  const f = pinchFrame(start, 360, 300, 2, BIG, BIG)
  assert.equal(f.s, 2)
  const a = anchorClient(start, f)
  assert.ok(Math.abs(a.x - 360) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - 300) < EPS, `y=${a.y}`)
})

test('pinchFrame: zooming out keeps the anchor pinned (unclamped)', () => {
  // mid (200,150) keeps the desired scroll positive (unclamped) at 0.5x.
  const f = pinchFrame(start, 200, 150, 0.5, BIG, BIG)
  assert.equal(f.s, 0.5)
  const a = anchorClient(start, f)
  assert.ok(Math.abs(a.x - 200) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - 150) < EPS, `y=${a.y}`)
})

test('pinchFrame: the transform reproduces the returned scroll (live == commit, no jump)', () => {
  // The whole point: applying the transform live, then committing scrollLeft/Top,
  // must be the same position. That holds iff tx = startScroll - scrollLeft.
  const f = pinchFrame(start, 360, 300, 2, BIG, BIG)
  assert.equal(f.tx, start.scrollLeft - f.scrollLeft)
  assert.equal(f.ty, start.scrollTop - f.scrollTop)
})

test('pinchFrame: clamps to the lower bound (0)', () => {
  // Finger far to the bottom-right → desired scroll very negative → clamps to 0.
  const f = pinchFrame(start, 100_000, 100_000, 2, 500, 500)
  assert.equal(f.scrollLeft, 0)
  assert.equal(f.scrollTop, 0)
})

test('pinchFrame: clamps to the upper bound (maxScroll)', () => {
  // Finger far to the top-left → desired scroll huge → clamps to max.
  const f = pinchFrame(start, -100_000, -100_000, 2, 500, 600)
  assert.equal(f.scrollLeft, 500)
  assert.equal(f.scrollTop, 600)
})

test('pinchFrame: negative maxScroll (content smaller than viewport) clamps to 0', () => {
  const f = pinchFrame(start, 300, 250, 0.5, -200, -200)
  assert.equal(f.scrollLeft, 0)
  assert.equal(f.scrollTop, 0)
})

test('maxScroll: content larger than viewport → overflow is scrollable', () => {
  // 800px content @2x + 48px padding = 1648; 1024 viewport → 624 scrollable.
  assert.equal(maxScroll(800, 2, 48, 1024), 624)
})

test('maxScroll: content fits the viewport → 0 (not negative)', () => {
  // 400px content @1x + 48 padding = 448 < 1024 viewport → no scroll.
  assert.equal(maxScroll(400, 1, 48, 1024), 0)
})

test('maxScroll: crossing the fit threshold is continuous (no snap)', () => {
  // At the zoom where content+padding exactly equals the viewport, maxScroll is
  // 0, and just past it the value grows smoothly from 0 — no discontinuity.
  const natural = 488, pad = 48, client = 1024 // fits exactly at zoom 2
  assert.equal(maxScroll(natural, 2, pad, client), 0)
  assert.ok(Math.abs(maxScroll(natural, 2.001, pad, client) - 0.488) < 1e-6)
})
