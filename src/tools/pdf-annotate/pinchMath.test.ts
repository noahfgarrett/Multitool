import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinchGestureTransform, pinchCommitScroll } from './pinchMath'
import type { PinchStart, GestureTransform, ScrollOffset } from './pinchMath'

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

/**
 * Independently (from first principles) compute where the anchor — the content
 * point under the START midpoint — appears in client coords after the live
 * transform. Layer-local anchor = (startMid - origin); transform-origin is 0 0,
 * so client = origin + tx + s * localAnchor. Must equal the current midpoint.
 */
function anchorClientAfterTransform(s: PinchStart, t: GestureTransform): { x: number; y: number } {
  const ax = s.startMidX - s.originX
  const ay = s.startMidY - s.originY
  return { x: s.originX + t.tx + t.s * ax, y: s.originY + t.ty + t.s * ay }
}

/**
 * Independently compute the anchor's client position AFTER commit: the layer's
 * client origin becomes (origin + startScroll) - newScroll, and the anchor's
 * content offset scales by ratio. Must equal the final midpoint.
 */
function anchorClientAfterCommit(s: PinchStart, finalZoom: number, ns: ScrollOffset): { x: number; y: number } {
  const ax = s.startMidX - s.originX
  const ay = s.startMidY - s.originY
  const ratio = finalZoom / s.startZoom
  return {
    x: (s.originX + s.scrollLeft) - ns.scrollLeft + ax * ratio,
    y: (s.originY + s.scrollTop) - ns.scrollTop + ay * ratio,
  }
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

test('live transform: zooming out also keeps the anchor pinned', () => {
  const t = pinchGestureTransform(start, 280, 240, 0.5)
  assert.equal(t.s, 0.5)
  const a = anchorClientAfterTransform(start, t)
  assert.ok(Math.abs(a.x - 280) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - 240) < EPS, `y=${a.y}`)
})

test('commit scroll: anchor lands under the final midpoint at the new zoom', () => {
  const finalMidX = 360, finalMidY = 300, finalZoom = 2
  const ns = pinchCommitScroll(start, finalMidX, finalMidY, finalZoom)
  const a = anchorClientAfterCommit(start, finalZoom, ns)
  assert.ok(Math.abs(a.x - finalMidX) < EPS, `x=${a.x}`)
  assert.ok(Math.abs(a.y - finalMidY) < EPS, `y=${a.y}`)
})

test('commit scroll: clamps to zero, never negative', () => {
  const ns = pinchCommitScroll({ ...start, scrollLeft: 0, scrollTop: 0 }, start.startMidX, start.startMidY, 0.5)
  assert.ok(ns.scrollLeft >= 0, `left=${ns.scrollLeft}`)
  assert.ok(ns.scrollTop >= 0, `top=${ns.scrollTop}`)
})
