import type { ConnectorType } from './types.ts'

// ── Dash patterns per style ─────────────────────────────────

export function getDashPattern(style: ConnectorType['style']): number[] {
  switch (style) {
    case 'solid':  return []
    case 'dashed': return [8, 5]
    case 'dotted': return [2, 3]
    case 'double': return []  // double uses two solid strokes, no dash
  }
}

// ── drawStyledLine ──────────────────────────────────────────

/**
 * Strokes a 2+ point path with the given ConnectorType.
 * For style === 'double', draws two parallel strokes offset perpendicular to
 * the overall source-to-target direction.
 *
 * `zoomForDashScaling`: pass the current viewport zoom from the live canvas
 * so dash/dot patterns stay visually consistent across zoom levels. Pass 1
 * (or omit) for export renderers where the canvas is drawn at native scale.
 */
export function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  type: ConnectorType,
  zoomForDashScaling: number = 1,
): void {
  if (path.length < 2) return

  ctx.save()
  ctx.strokeStyle = type.color
  ctx.lineWidth = type.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const dash = getDashPattern(type.style)
  if (dash.length > 0) {
    ctx.setLineDash(dash.map(v => v / zoomForDashScaling))
  }

  const strokePath = (): void => {
    ctx.beginPath()
    ctx.moveTo(path[0][0], path[0][1])
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i][0], path[i][1])
    }
    ctx.stroke()
  }

  if (type.style === 'double') {
    // Draw two parallel strokes offset perpendicular to the overall direction
    const [sx, sy] = path[0]
    const [ex, ey] = path[path.length - 1]
    const dx = ex - sx
    const dy = ey - sy
    const len = Math.hypot(dx, dy) || 1
    const offsetMag = 2  // 2px on each side of center = 4px total separation
    const nx = -dy / len * offsetMag
    const ny = dx / len * offsetMag

    ctx.lineWidth = Math.max(1, type.lineWidth * 0.6)

    // First stroke: offset by +n
    ctx.translate(nx, ny)
    strokePath()
    // Second stroke: offset by -2n (undoing the +n and then applying -n)
    ctx.translate(-2 * nx, -2 * ny)
    strokePath()
  } else {
    strokePath()
  }

  ctx.restore()
}

// ── Secondary edge routing ──────────────────────────────────

interface RoutableNode {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Computes a 2-point straight-line path between two nodes, anchored on each
 * node's border rectangle (not at the center). The line "points toward" the
 * target but starts/ends where it crosses each node's edge.
 *
 * Returns an empty array if the nodes overlap so badly that both anchors
 * collapse to the same point — the caller should skip the connection.
 */
export function routeSecondaryEdge(
  from: RoutableNode,
  to: RoutableNode,
): [number, number][] {
  const fromCx = from.x + from.width / 2
  const fromCy = from.y + from.height / 2
  const toCx = to.x + to.width / 2
  const toCy = to.y + to.height / 2

  const dx = toCx - fromCx
  const dy = toCy - fromCy
  const centerDist = Math.hypot(dx, dy)
  if (centerDist < 0.5) return []  // nodes stacked — skip

  const sourceAnchor = clipRayToRect(fromCx, fromCy, dx, dy, from)
  // For the target, shoot the ray from the TARGET center backward toward source
  const targetAnchor = clipRayToRect(toCx, toCy, -dx, -dy, to)

  // Sanity check: if the anchors collapse to the same point, skip
  const anchorDist = Math.hypot(
    targetAnchor[0] - sourceAnchor[0],
    targetAnchor[1] - sourceAnchor[1],
  )
  if (anchorDist < 1) return []

  return [sourceAnchor, targetAnchor]
}

/**
 * Clips a ray starting at (cx, cy) heading in direction (dx, dy) to the
 * boundary of the given axis-aligned rectangle. Returns the intersection point
 * on the rectangle's edge closest to the starting direction.
 */
function clipRayToRect(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  rect: RoutableNode,
): [number, number] {
  const halfW = rect.width / 2
  const halfH = rect.height / 2

  // Parametric: (cx + t*dx, cy + t*dy) hits edge when |t*dx| === halfW or |t*dy| === halfH
  const tx = dx !== 0 ? halfW / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? halfH / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)

  return [cx + dx * t, cy + dy * t]
}

// ── Hit testing ─────────────────────────────────────────────

/**
 * Tests whether a point (in canvas coordinates) is within `toleranceCanvasPx`
 * of any segment in the path. Callers should pass `6 / viewport.zoom` as the
 * tolerance to get a constant 6-screen-pixel hit area regardless of zoom.
 *
 * This function takes a pre-computed path instead of nodes so callers can
 * share routing work with the renderer.
 */
export function hitTestPath(
  x: number,
  y: number,
  path: [number, number][],
  toleranceCanvasPx: number,
): boolean {
  if (path.length < 2) return false
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i]
    const [x2, y2] = path[i + 1]
    if (distancePointToSegment(x, y, x1, y1, x2, y2) <= toleranceCanvasPx) {
      return true
    }
  }
  return false
}

function distancePointToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)

  // Project point onto segment, clamp to [0, 1]
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.hypot(px - projX, py - projY)
}
