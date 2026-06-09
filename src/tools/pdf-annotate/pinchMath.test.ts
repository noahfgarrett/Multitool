import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinchGestureTransform, anchorScrollAxis } from './pinchMath'
import type { PinchStart, GestureTransform } from './pinchMath'

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

/** Where the anchor (content under the start midpoint) lands in client coords
 * after the live transform. transform-origin is 0 0, so client = origin + t +
 * s*localAnchor. Must equal the current midpoint. */
function anchorClientAfterTransform(s: PinchStart, t: GestureTransform): { x: number; y: number } {
  const ax = s.startMidX - s.originX
  const ay = s.startMidY - s.originY
  return { x: s.originX + t.tx + t.s * ax, y: s.originY + t.ty + t.s * ay }
}

test('live transform: anchor follows the moving midpoint while zooming in', () => {
  const t = pinchGestureTransform(start, 360, 300, 2)
  assert.equal(t.s, 2)
  const a = anchorClientAfterTransform(start, t)
  assert.ok(Math.abs(a.x - 360) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - 300) < EPS, `y=${a.y}`)
})

test('live transform: stationary midpoint pins the same content point', () => {
  const t = pinchGestureTransform(start, start.startMidX, start.startMidY, 1.5)
  const a = anchorClientAfterTransform(start, t)
  assert.ok(Math.abs(a.x - start.startMidX) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - start.startMidY) < EPS, `y=${a.y}`)
})

test('live transform: zooming out keeps the anchor pinned', () => {
  const t = pinchGestureTransform(start, 280, 240, 0.5)
  assert.equal(t.s, 0.5)
  const a = anchorClientAfterTransform(start, t)
  assert.ok(Math.abs(a.x - 280) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - 240) < EPS, `y=${a.y}`)
})

test('anchorScrollAxis: lands the anchor under the midpoint in the final layout', () => {
  // contentOrigin 80 (layer client-x at scroll 0, final layout), anchorLocal 200
  // at start zoom, ratio 2 → anchor at local 400; scroll so it sits under mid 300.
  const scroll = anchorScrollAxis(80, 200, 2, 300)
  assert.equal(scroll, 180)
  // The anchor's client position after applying that scroll == the midpoint.
  assert.ok(Math.abs((80 - scroll + 200 * 2) - 300) < EPS)
})

test('anchorScrollAxis: clamps to zero, never negative', () => {
  assert.equal(anchorScrollAxis(0, 100, 0.5, 300), 0) // 0 + 50 - 300 < 0 → 0
})
