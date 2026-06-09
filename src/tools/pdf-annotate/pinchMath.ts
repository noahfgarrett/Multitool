/**
 * Pure math for mobile/tablet pinch-to-zoom.
 *
 * The gesture layer (`gestureTransformRef`) sits inside the scroll container
 * with `transform-origin: 0 0`. During a pinch we drive it with a SINGLE
 * composited transform `translate3d(tx,ty,0) scale(s)` and touch native scroll
 * ZERO times — smooth, no per-frame layout reads.
 *
 * The key idea (see `pinchFrame`): every frame we compute the *committed scroll*
 * the gesture would settle to, CLAMPED to the real scroll range, then derive the
 * transform that reproduces exactly that scroll state. Because the live preview
 * and the eventual commit use the same clamped scroll, the page never moves on
 * the transform→scroll handoff, and crossing a "fit" threshold (where the scroll
 * range collapses) is smooth instead of a snap.
 *
 * Coordinate spaces (client/CSS px): `originX/Y` is the gesture layer's
 * untransformed top-left at gesture start (L0); the "anchor" is the content
 * under the start midpoint, whose offset inside the layer is (startMid - origin)
 * at start zoom. Framework-free + DOM-free so it's unit-testable.
 */

export interface PinchStart {
  /** Gesture layer's untransformed top-left in client coords (L0). */
  originX: number
  originY: number
  /** Finger midpoint at gesture start. */
  startMidX: number
  startMidY: number
  /** Scroll offset at gesture start. */
  scrollLeft: number
  scrollTop: number
  /** Committed zoom at gesture start. */
  startZoom: number
}

export interface PinchFrame {
  tx: number
  ty: number
  s: number
  scrollLeft: number
  scrollTop: number
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Max scroll offset on one axis — the browser's `scrollWidth - clientWidth`,
 * computed analytically so it's correct even when the content currently fits
 * the viewport (where `scrollWidth` would understate it). `natural` is the
 * unscaled content size, `totalPad` the padding on both sides combined, and
 * `client` the viewport (clientWidth/Height, which excludes the scrollbar).
 * Clamped to 0: content smaller than the viewport can't scroll.
 */
export function maxScroll(natural: number, zoom: number, totalPad: number, client: number): number {
  return Math.max(0, natural * zoom + totalPad - client)
}

/**
 * One pinch frame, BOUNDED to the scroll range.
 *
 * 1. Compute the scroll that would put the anchor (content under the start
 *    midpoint) under the current finger midpoint at `targetZoom`.
 * 2. Clamp it to [0, maxScrollX] / [0, maxScrollY] — the same bounds the browser
 *    enforces, so the gesture can't show a position the commit can't reproduce.
 * 3. Derive the gesture-layer transform that reproduces exactly that scroll
 *    state over the start layout (tx = startScroll - scrollLeft, s = ratio).
 *
 * The caller applies `translate3d(tx,ty,0) scale(s)` live, and on commit sets
 * `scrollLeft/scrollTop` — identical position, so no jump.
 */
export function pinchFrame(
  start: PinchStart,
  midX: number,
  midY: number,
  targetZoom: number,
  maxScrollX: number,
  maxScrollY: number,
): PinchFrame {
  const s = targetZoom / start.startZoom
  const anchorLocalX = start.startMidX - start.originX
  const anchorLocalY = start.startMidY - start.originY
  const scrollLeft = clamp(start.originX + start.scrollLeft + anchorLocalX * s - midX, 0, Math.max(0, maxScrollX))
  const scrollTop = clamp(start.originY + start.scrollTop + anchorLocalY * s - midY, 0, Math.max(0, maxScrollY))
  return {
    s,
    tx: start.scrollLeft - scrollLeft,
    ty: start.scrollTop - scrollTop,
    scrollLeft,
    scrollTop,
  }
}
