/**
 * Pure math for mobile pinch-to-zoom.
 *
 * The gesture layer (`gestureTransformRef`) sits inside the scroll container
 * with `transform-origin: 0 0`. During a pinch we drive it with a SINGLE
 * composited transform `translate(tx,ty) scale(s)` and touch native scroll
 * ZERO times — this is what makes it smooth (no per-frame layout reads, no
 * integer-quantised scroll writes, no scroll-range clamping mid-gesture).
 *
 * Coordinate spaces (all client/CSS pixels unless noted):
 *  - `originX/Y`  : the gesture layer's untransformed top-left in client coords
 *                   at gesture start (a.k.a. L0). Cached once on touchstart.
 *  - `startMidX/Y`: finger midpoint at gesture start.
 *  - The "anchor" is the content point that was under the start midpoint. In
 *    the layer's local space its coords are (startMid - origin), i.e. measured
 *    at the START zoom. Both the live transform and the commit keep that anchor
 *    pinned, so the content stays under the fingers.
 *
 * Everything here is framework-free and DOM-free so it can be unit-tested.
 */

export interface PinchStart {
  /** Gesture layer's untransformed top-left in client coords (L0). */
  originX: number
  originY: number
  /** Finger midpoint at gesture start, client coords. */
  startMidX: number
  startMidY: number
  /** Scroll offset at gesture start. */
  scrollLeft: number
  scrollTop: number
  /** Committed zoom at gesture start. */
  startZoom: number
}

export interface GestureTransform {
  tx: number
  ty: number
  s: number
}

export interface ScrollOffset {
  scrollLeft: number
  scrollTop: number
}

/**
 * Live transform for the gesture layer. Scales by `s = targetZoom/startZoom`
 * and translates so the anchor (content under the start midpoint) sits under
 * the CURRENT finger midpoint — giving the "zoom + pan like a map" feel.
 */
export function pinchGestureTransform(
  start: PinchStart,
  currentMidX: number,
  currentMidY: number,
  targetZoom: number,
): GestureTransform {
  const s = targetZoom / start.startZoom
  const ax = start.startMidX - start.originX
  const ay = start.startMidY - start.originY
  return {
    tx: currentMidX - start.originX - s * ax,
    ty: currentMidY - start.originY - s * ay,
    s,
  }
}

/**
 * Final scroll offset to apply AFTER the new zoom is committed (re-laid out at
 * `finalZoom`), so the anchor lands under the final finger midpoint. Clamped to
 * >= 0; the browser clamps the upper bound against the new scroll range.
 */
export function pinchCommitScroll(
  start: PinchStart,
  finalMidX: number,
  finalMidY: number,
  finalZoom: number,
): ScrollOffset {
  const ratio = finalZoom / start.startZoom
  const ax = start.startMidX - start.originX
  const ay = start.startMidY - start.originY
  return {
    scrollLeft: Math.max(0, start.originX + start.scrollLeft + ax * ratio - finalMidX),
    scrollTop: Math.max(0, start.originY + start.scrollTop + ay * ratio - finalMidY),
  }
}
