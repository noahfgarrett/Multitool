import type { Point, Annotation, HandleId, PageAnnotations } from './types.ts'
import { genId } from './types.ts'

// ── Text wrapping helper ─────────────────────────────

export function wrapText(text: string, maxWidth: number, fontSize: number, bold = false, measureFn?: (text: string) => number): string[] {
  const charWidth = fontSize * 0.6 * (bold ? 1.08 : 1)
  const measure = measureFn || ((t: string) => t.length * charWidth)
  const result: string[] = []
  for (const line of text.split('\n')) {
    if (!line) { result.push(''); continue }
    const words = line.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (measure(test) > maxWidth && current) {
        result.push(current)
        current = word
      } else {
        current = test
      }
    }
    result.push(current)
  }
  return result
}

// ── Auto-height text box helper ──────────────────────

export function computeTextBoxHeight(ann: Annotation, defaultH: number, measureFn?: (text: string) => number): number {
  if (!ann.text || !ann.width) return defaultH
  const fs = ann.fontSize || (ann.type === 'callout' ? 14 : 16)
  const lh = ann.lineHeight || 1.3
  const lines = wrapText(ann.text, ann.width, fs, ann.bold || false, measureFn)
  const contentH = lines.length * fs * lh
  const padding = ann.type === 'callout' ? 8 : 0
  return Math.max(defaultH, contentH + padding)
}

// ── Nearest point on rectangle edge ─────────────────

export function nearestPointOnRect(rx: number, ry: number, rw: number, rh: number, px: number, py: number): Point {
  const cx = Math.max(rx, Math.min(rx + rw, px))
  const cy = Math.max(ry, Math.min(ry + rh, py))
  if (cx === px && cy === py) {
    const dLeft = px - rx, dRight = rx + rw - px
    const dTop = py - ry, dBottom = ry + rh - py
    const min = Math.min(dLeft, dRight, dTop, dBottom)
    if (min === dLeft) return { x: rx, y: py }
    if (min === dRight) return { x: rx + rw, y: py }
    if (min === dTop) return { x: px, y: ry }
    return { x: px, y: ry + rh }
  }
  return { x: cx, y: cy }
}

// ── Callout box hit-test ────────────────────────────

export function hitTestCalloutBox(pt: Point, ann: Annotation): boolean {
  if (ann.type !== 'callout' || !ann.width || !ann.height || !ann.points.length) return false
  const { x, y } = ann.points[0]
  return pt.x >= x && pt.x <= x + ann.width && pt.y >= y && pt.y <= y + ann.height
}

// ── Resize handle helpers ────────────────────────────

export function getHandles(x: number, y: number, w: number, h: number): { id: HandleId; x: number; y: number }[] {
  return [
    { id: 'nw', x, y },
    { id: 'n', x: x + w / 2, y },
    { id: 'ne', x: x + w, y },
    { id: 'e', x: x + w, y: y + h / 2 },
    { id: 'se', x: x + w, y: y + h },
    { id: 's', x: x + w / 2, y: y + h },
    { id: 'sw', x, y: y + h },
    { id: 'w', x, y: y + h / 2 },
  ]
}

export function hitTestHandle(pt: Point, ann: Annotation, threshold: number): HandleId | null {
  if ((ann.type !== 'text' && ann.type !== 'callout') || !ann.width || !ann.height || !ann.points.length) return null
  const { x, y } = ann.points[0]
  const handles = getHandles(x, y, ann.width, ann.height)
  for (const h of handles) {
    if (Math.hypot(pt.x - h.x, pt.y - h.y) < threshold) return h.id
  }
  return null
}

// ── Point-to-segment distance ────────────────────────

export function ptSegDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

// ── Main hit-test ────────────────────────────────────

export function hitTest(p: Point, ann: Annotation, threshold: number): boolean {
  const th = threshold + ann.strokeWidth / 2
  switch (ann.type) {
    case 'pencil':
    case 'highlighter':
      if (ann.rects) {
        for (const r of ann.rects) {
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return true
        }
        return false
      }
      for (let i = 0; i < ann.points.length - 1; i++) {
        if (ptSegDist(p, ann.points[i], ann.points[i + 1]) < th) return true
      }
      return false
    case 'line':
    case 'arrow':
      return ann.points.length >= 2 && ptSegDist(p, ann.points[0], ann.points[1]) < th
    case 'rectangle': {
      if (ann.points.length < 2) return false
      const [p1, p2] = ann.points
      const c: Point[] = [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }]
      for (let i = 0; i < 4; i++) { if (ptSegDist(p, c[i], c[(i + 1) % 4]) < th) return true }
      return false
    }
    case 'cloud': {
      if (ann.points.length < 3) return false
      const cloudTh = th + 8
      for (let i = 0; i < ann.points.length; i++) {
        if (ptSegDist(p, ann.points[i], ann.points[(i + 1) % ann.points.length]) < cloudTh) return true
      }
      return false
    }
    case 'circle': {
      if (ann.points.length < 2) return false
      const cx = (ann.points[0].x + ann.points[1].x) / 2
      const cy = (ann.points[0].y + ann.points[1].y) / 2
      const rx = Math.abs(ann.points[1].x - ann.points[0].x) / 2
      const ry = Math.abs(ann.points[1].y - ann.points[0].y) / 2
      if (rx < 1 || ry < 1) return false
      const d = Math.sqrt(((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2)
      return Math.abs(d - 1) * Math.min(rx, ry) < th
    }
    case 'text': {
      if (!ann.points.length) return false
      const { x, y } = ann.points[0]
      const tw = ann.width || (ann.text ? ann.text.length * (ann.fontSize || 16) * 0.6 : 0)
      const tLines = ann.text ? ann.text.split('\n') : ['']
      const tH = ann.height || tLines.length * (ann.fontSize || 16) * 1.3
      const nearX = Math.max(x, Math.min(x + tw, p.x))
      const nearY = Math.max(y, Math.min(y + tH, p.y))
      return Math.hypot(p.x - nearX, p.y - nearY) < th
    }
    case 'stamp': {
      if (!ann.points.length || !ann.width || !ann.height) return false
      const { x: sx, y: sy } = ann.points[0]
      return p.x >= sx - th && p.x <= sx + ann.width + th && p.y >= sy - th && p.y <= sy + ann.height + th
    }
    case 'callout': {
      if (!ann.points.length || !ann.width || !ann.height) return false
      const { x, y } = ann.points[0]
      const bNx = Math.max(x, Math.min(x + ann.width, p.x))
      const bNy = Math.max(y, Math.min(y + ann.height, p.y))
      if (Math.hypot(p.x - bNx, p.y - bNy) < th) return true
      if (ann.arrows) {
        for (const tip of ann.arrows) {
          const origin = nearestPointOnRect(x, y, ann.width, ann.height, tip.x, tip.y)
          if (ptSegDist(p, origin, tip) < th) return true
        }
      }
      return false
    }
  }
  return false
}

// ── Eraser path splitting ──────────────────────────────

export function circleSegIntersections(center: Point, radius: number, a: Point, b: Point): Point[] {
  const dx = b.x - a.x, dy = b.y - a.y
  const fx = a.x - center.x, fy = a.y - center.y
  const A = dx * dx + dy * dy
  const B = 2 * (fx * dx + fy * dy)
  const C = fx * fx + fy * fy - radius * radius
  const disc = B * B - 4 * A * C
  if (disc < 0 || A === 0) return []
  const sqrtDisc = Math.sqrt(disc)
  const pts: Point[] = []
  for (const t of [(-B - sqrtDisc) / (2 * A), (-B + sqrtDisc) / (2 * A)]) {
    if (t > 0.001 && t < 0.999) pts.push({ x: a.x + t * dx, y: a.y + t * dy })
  }
  return pts
}

export function pathHitsCircle(points: Point[], center: Point, radius: number): boolean {
  if (points.length === 1) return Math.hypot(points[0].x - center.x, points[0].y - center.y) < radius
  for (let i = 0; i < points.length - 1; i++) {
    if (ptSegDist(center, points[i], points[i + 1]) < radius) return true
  }
  return false
}

export function splitPathByEraser(ann: Annotation, center: Point, radius: number): Annotation[] {
  const results: Point[][] = []
  let current: Point[] = []

  const isInside = (p: Point) => Math.hypot(p.x - center.x, p.y - center.y) <= radius

  for (let i = 0; i < ann.points.length; i++) {
    const pt = ann.points[i]
    const ptIn = isInside(pt)

    if (i === 0) {
      if (!ptIn) current.push(pt)
      continue
    }

    const prev = ann.points[i - 1]
    const prevIn = isInside(prev)

    if (!prevIn && !ptIn) {
      const crossings = circleSegIntersections(center, radius, prev, pt)
      if (crossings.length === 2) {
        current.push(crossings[0])
        if (current.length >= 2) results.push(current)
        current = [crossings[1], pt]
      } else {
        current.push(pt)
      }
    } else if (!prevIn && ptIn) {
      const crossings = circleSegIntersections(center, radius, prev, pt)
      if (crossings.length > 0) current.push(crossings[0])
      if (current.length >= 2) results.push(current)
      current = []
    } else if (prevIn && !ptIn) {
      const crossings = circleSegIntersections(center, radius, prev, pt)
      current = crossings.length > 0 ? [crossings[crossings.length - 1], pt] : [pt]
    }
  }

  if (current.length >= 2) results.push(current)
  return results.map(pts => ({ ...ann, id: genId(), points: pts }))
}

// ── Shape → polyline conversion for partial erasing ──

export function densifyEdge(a: Point, b: Point, maxGap = 5): Point[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const n = Math.max(1, Math.ceil(d / maxGap))
  const out: Point[] = [a]
  for (let i = 1; i < n; i++) {
    const t = i / n
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  out.push(b)
  return out
}

export function shapeToPolyline(ann: Annotation): Point[] {
  const pts = ann.points
  switch (ann.type) {
    case 'line':
    case 'arrow':
      return pts.length >= 2 ? densifyEdge(pts[0], pts[1]) : [...pts]
    case 'rectangle': {
      if (pts.length < 2) return [...pts]
      const tl = { x: Math.min(pts[0].x, pts[1].x), y: Math.min(pts[0].y, pts[1].y) }
      const tr = { x: Math.max(pts[0].x, pts[1].x), y: Math.min(pts[0].y, pts[1].y) }
      const br = { x: Math.max(pts[0].x, pts[1].x), y: Math.max(pts[0].y, pts[1].y) }
      const bl = { x: Math.min(pts[0].x, pts[1].x), y: Math.max(pts[0].y, pts[1].y) }
      return [
        ...densifyEdge(tl, tr),
        ...densifyEdge(tr, br).slice(1),
        ...densifyEdge(br, bl).slice(1),
        ...densifyEdge(bl, tl).slice(1),
      ]
    }
    case 'circle': {
      if (pts.length < 2) return [...pts]
      const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2
      const rx = Math.abs(pts[1].x - pts[0].x) / 2, ry = Math.abs(pts[1].y - pts[0].y) / 2
      const out: Point[] = []
      const steps = 72
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) })
      }
      return out
    }
    case 'cloud': {
      if (pts.length < 3) return [...pts]
      const out: Point[] = []
      const arcSize = 20
      for (let ei = 0; ei < pts.length; ei++) {
        const a = pts[ei], b = pts[(ei + 1) % pts.length]
        const edgeLen = Math.hypot(b.x - a.x, b.y - a.y)
        const numBumps = Math.max(2, Math.round(edgeLen / arcSize))
        const dx = (b.x - a.x) / numBumps, dy = (b.y - a.y) / numBumps
        const len = Math.hypot(dx, dy)
        if (len === 0) continue
        const nx = (dy / len) * arcSize * 0.4, ny = (-dx / len) * arcSize * 0.4
        for (let j = 0; j < numBumps; j++) {
          const sx = a.x + dx * j, sy = a.y + dy * j
          const ex = a.x + dx * (j + 1), ey = a.y + dy * (j + 1)
          const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
          for (let k = 0; k <= 8; k++) {
            const t = k / 8
            out.push({
              x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex,
              y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey,
            })
          }
        }
      }
      if (out.length > 0) out.push(out[0])
      return out
    }
    default:
      return [...pts]
  }
}

// ── Annotation bounding box ──────────────────────────────

export function getAnnotationBounds(ann: Annotation): { x: number; y: number; w: number; h: number } | null {
  const pts = ann.points
  if (!pts.length) return null
  switch (ann.type) {
    case 'text':
    case 'callout':
    case 'stamp':
    case 'imageStamp': {
      if (!ann.width || !ann.height) return null
      return { x: pts[0].x, y: pts[0].y, w: ann.width, h: ann.height }
    }
    case 'rectangle': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x), h: Math.abs(pts[1].y - pts[0].y) }
    }
    case 'circle': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x), h: Math.abs(pts[1].y - pts[0].y) }
    }
    case 'line':
    case 'arrow': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x) || 2, h: Math.abs(pts[1].y - pts[0].y) || 2 }
    }
    case 'pencil':
    case 'highlighter':
    case 'cloud':
    case 'polygon': {
      if (ann.rects && ann.rects.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const r of ann.rects) {
          if (r.x < minX) minX = r.x
          if (r.y < minY) minY = r.y
          if (r.x + r.w > maxX) maxX = r.x + r.w
          if (r.y + r.h > maxY) maxY = r.y + r.h
        }
        return { x: minX, y: minY, w: maxX - minX || 2, h: maxY - minY || 2 }
      }
      if (pts.length < 2) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      return { x: minX, y: minY, w: maxX - minX || 2, h: maxY - minY || 2 }
    }
  }
  return null
}

// ── Pixel snapping for measurement tool ────────────────

export function snapToContent(
  clickPt: Point,
  otherPt: Point | null,
  annCanvas: HTMLCanvasElement,
  searchRadius: number,
  corridorWidth: number,
  renderScale: number,
): Point {
  if (!otherPt) return clickPt

  const ctx = annCanvas.getContext('2d')
  if (!ctx) return clickPt

  const scale = renderScale
  const dx = clickPt.x - otherPt.x
  const dy = clickPt.y - otherPt.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return clickPt

  const dirX = dx / len
  const dirY = dy / len
  const perpX = -dirY
  const perpY = dirX

  const cx = clickPt.x * scale
  const cy = clickPt.y * scale
  const r = searchRadius * scale
  const x0 = Math.max(0, Math.floor(cx - r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const x1 = Math.min(annCanvas.width, Math.ceil(cx + r))
  const y1 = Math.min(annCanvas.height, Math.ceil(cy + r))
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return clickPt

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(x0, y0, w, h)
  } catch {
    return clickPt
  }
  const data = imageData.data

  let farthestPt: Point | null = null
  const halfCorridor = corridorWidth * scale

  for (let step = -searchRadius; step <= searchRadius; step++) {
    const sampleX = cx + dirX * step * scale
    const sampleY = cy + dirY * step * scale

    for (let c = -halfCorridor; c <= halfCorridor; c++) {
      const px = Math.round(sampleX + perpX * c - x0)
      const py = Math.round(sampleY + perpY * c - y0)
      if (px < 0 || px >= w || py < 0 || py >= h) continue

      const idx = (py * w + px) * 4
      const alpha = data[idx + 3]
      if (alpha > 10) {
        const candidateX = (sampleX) / scale
        const candidateY = (sampleY) / scale
        if (!farthestPt) {
          farthestPt = { x: candidateX, y: candidateY }
        } else {
          const prevDist = (farthestPt.x - otherPt.x) * dirX + (farthestPt.y - otherPt.y) * dirY
          const newDist = (candidateX - otherPt.x) * dirX + (candidateY - otherPt.y) * dirY
          if (newDist > prevDist) {
            farthestPt = { x: candidateX, y: candidateY }
          }
        }
        break
      }
    }
  }

  return farthestPt ?? clickPt
}

// ── Rotation coordinate transform ────────────────────

export function rotatePoint(p: Point, fromRot: number, toRot: number, origW: number, origH: number): Point {
  if (fromRot === toRot) return p
  let x0: number, y0: number
  const fr = ((fromRot % 360) + 360) % 360
  switch (fr) {
    case 90:  x0 = p.y;          y0 = origH - p.x; break
    case 180: x0 = origW - p.x;  y0 = origH - p.y; break
    case 270: x0 = origW - p.y;  y0 = p.x;         break
    default:  x0 = p.x;          y0 = p.y;          break
  }
  const tr = ((toRot % 360) + 360) % 360
  switch (tr) {
    case 90:  return { x: origH - y0, y: x0 }
    case 180: return { x: origW - x0, y: origH - y0 }
    case 270: return { x: y0,         y: origW - x0 }
    default:  return { x: x0,         y: y0 }
  }
}

// ── Text highlight helpers ───────────────────────────

export function isPointInTextItem(pt: { x: number; y: number }, item: { x: number; y: number; width: number; height: number }): boolean {
  return pt.x >= item.x && pt.x <= item.x + item.width && pt.y >= item.y && pt.y <= item.y + item.height
}

export function isPointInAnyTextItem(pt: { x: number; y: number }, items: { x: number; y: number; width: number; height: number }[]): boolean {
  for (const item of items) {
    if (isPointInTextItem(pt, item)) return true
  }
  return false
}

export function findIntersectingTextItems(
  items: { x: number; y: number; width: number; height: number }[],
  selRect: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number }[] {
  const result: { x: number; y: number; w: number; h: number }[] = []
  for (const item of items) {
    if (item.width <= 0) continue
    if (item.x < selRect.x + selRect.w &&
        item.x + item.width > selRect.x &&
        item.y < selRect.y + selRect.h &&
        item.y + item.height > selRect.y) {
      result.push({ x: item.x, y: item.y, w: item.width, h: item.height })
    }
  }
  return result
}

// ── Flow-based text selection ────────────────────────

type TextItemLike = { x: number; y: number; width: number; height: number }

interface FlowLine { y: number; h: number; items: TextItemLike[] }

function buildTextLines(items: TextItemLike[]): { lines: FlowLine[]; ordered: TextItemLike[] } {
  const valid = items.filter(i => i.width > 0)
  if (valid.length === 0) return { lines: [], ordered: [] }
  const sorted = [...valid]
  sorted.sort((a, b) => a.y - b.y || a.x - b.x)

  const lines: FlowLine[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(item.y - last.y) < item.height * 0.5) {
      last.items.push(item)
    } else {
      lines.push({ y: item.y, h: item.height, items: [item] })
    }
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return { lines, ordered: lines.flatMap(l => l.items) }
}

function nearestItemIndex(pt: { x: number; y: number }, lines: FlowLine[], ordered: TextItemLike[]): number {
  let bestLine = 0, bestDist = Infinity
  for (let i = 0; i < lines.length; i++) {
    const d = Math.abs(pt.y - (lines[i].y + lines[i].h / 2))
    if (d < bestDist) { bestDist = d; bestLine = i }
  }
  const lineItems = lines[bestLine].items
  let bestItem = lineItems[0], bestXDist = Infinity
  for (const item of lineItems) {
    const d = Math.abs(pt.x - (item.x + item.width / 2))
    if (d < bestXDist) { bestXDist = d; bestItem = item }
  }
  return ordered.indexOf(bestItem)
}

export function flowSelectTextItems(
  items: TextItemLike[],
  startPt: { x: number; y: number },
  endPt: { x: number; y: number },
): { x: number; y: number; w: number; h: number }[] {
  const { lines, ordered } = buildTextLines(items)
  if (ordered.length === 0) return []

  const startIdx = nearestItemIndex(startPt, lines, ordered)
  const endIdx = nearestItemIndex(endPt, lines, ordered)
  const from = Math.min(startIdx, endIdx)
  const to = Math.max(startIdx, endIdx)

  const leadPt = startIdx <= endIdx ? startPt : endPt
  const trailPt = startIdx <= endIdx ? endPt : startPt

  const result: { x: number; y: number; w: number; h: number }[] = []
  for (let i = from; i <= to; i++) {
    const item = ordered[i]
    let x = item.x
    let right = item.x + item.width

    if (from === to) {
      const leftX = Math.min(leadPt.x, trailPt.x)
      const rightX = Math.max(leadPt.x, trailPt.x)
      x = Math.max(item.x, leftX)
      right = Math.min(item.x + item.width, rightX)
    } else if (i === from) {
      x = Math.max(item.x, leadPt.x)
    } else if (i === to) {
      right = Math.min(item.x + item.width, trailPt.x)
    }

    const w = right - x
    if (w > 0) {
      result.push({ x, y: item.y, w, h: item.height })
    }
  }
  return result
}

// ── Measurement hit-test ─────────────────────────────

export function hitTestMeasurementLabel(pt: Point, m: { startPt: Point; endPt: Point }, threshold: number): boolean {
  const mx = (m.startPt.x + m.endPt.x) / 2
  const my = (m.startPt.y + m.endPt.y) / 2
  return Math.hypot(pt.x - mx, pt.y - my) < threshold
}

// ── Ramer-Douglas-Peucker point decimation ───────────

/**
 * Ramer-Douglas-Peucker algorithm — reduce point count while preserving shape.
 * epsilon = max perpendicular distance tolerance (in doc-space units).
 */
export function decimatePoints(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points

  // Find the point with maximum distance from the line between first and last
  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]
  const dx = last.x - first.x
  const dy = last.y - first.y
  const lenSq = dx * dx + dy * dy

  for (let i = 1; i < points.length - 1; i++) {
    let dist: number
    if (lenSq === 0) {
      dist = Math.hypot(points[i].x - first.x, points[i].y - first.y)
    } else {
      const t = Math.max(0, Math.min(1, ((points[i].x - first.x) * dx + (points[i].y - first.y) * dy) / lenSq))
      dist = Math.hypot(points[i].x - (first.x + t * dx), points[i].y - (first.y + t * dy))
    }
    if (dist > maxDist) { maxDist = dist; maxIdx = i }
  }

  if (maxDist > epsilon) {
    const left = decimatePoints(points.slice(0, maxIdx + 1), epsilon)
    const right = decimatePoints(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [first, last]
}

// ── Annotation alignment & distribution ─────────────

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV'

interface AlignBounds {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  w: number
  h: number
}

function toBounds(b: { x: number; y: number; w: number; h: number }): AlignBounds {
  return {
    left: b.x,
    top: b.y,
    right: b.x + b.w,
    bottom: b.y + b.h,
    centerX: b.x + b.w / 2,
    centerY: b.y + b.h / 2,
    w: b.w,
    h: b.h,
  }
}

/** Shift all spatial data on an annotation by (dx, dy). */
function shiftAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  return {
    ...ann,
    points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
    ...(ann.arrows ? { arrows: ann.arrows.map(a => ({ x: a.x + dx, y: a.y + dy })) } : {}),
    ...(ann.rects ? { rects: ann.rects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy })) } : {}),
  }
}

/**
 * Align or distribute a set of annotations on a given page.
 * Returns a new PageAnnotations with the selected annotations repositioned.
 */
export function alignAnnotations(
  annIds: Set<string>,
  annotations: PageAnnotations,
  page: number,
  alignment: AlignmentType,
): PageAnnotations {
  const pageAnns: Annotation[] = annotations[page] || []
  const selected = pageAnns.filter((a: Annotation) => annIds.has(a.id))
  if (selected.length < 2) return annotations

  // Build bounds map for each selected annotation
  const boundsMap = new Map<string, AlignBounds>()
  for (const ann of selected) {
    const raw = getAnnotationBounds(ann)
    if (raw) boundsMap.set(ann.id, toBounds(raw))
  }
  if (boundsMap.size < 2) return annotations

  const allBounds = Array.from(boundsMap.values())

  // Calculate the delta for each annotation
  const deltas = new Map<string, { dx: number; dy: number }>()

  switch (alignment) {
    case 'left': {
      const target = Math.min(...allBounds.map(b => b.left))
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: target - b.left, dy: 0 })
      }
      break
    }
    case 'center': {
      const avg = allBounds.reduce((s, b) => s + b.centerX, 0) / allBounds.length
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: avg - b.centerX, dy: 0 })
      }
      break
    }
    case 'right': {
      const target = Math.max(...allBounds.map(b => b.right))
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: target - b.right, dy: 0 })
      }
      break
    }
    case 'top': {
      const target = Math.min(...allBounds.map(b => b.top))
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: 0, dy: target - b.top })
      }
      break
    }
    case 'middle': {
      const avg = allBounds.reduce((s, b) => s + b.centerY, 0) / allBounds.length
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: 0, dy: avg - b.centerY })
      }
      break
    }
    case 'bottom': {
      const target = Math.max(...allBounds.map(b => b.bottom))
      for (const [id, b] of boundsMap) {
        deltas.set(id, { dx: 0, dy: target - b.bottom })
      }
      break
    }
    case 'distributeH': {
      if (boundsMap.size < 3) return annotations
      // Sort by left edge
      const sorted = [...boundsMap.entries()].sort((a, b) => a[1].left - b[1].left)
      const first = sorted[0][1]
      const last = sorted[sorted.length - 1][1]
      const totalItemWidth = sorted.reduce((s, [, b]) => s + b.w, 0)
      const totalSpan = last.right - first.left
      const gap = (totalSpan - totalItemWidth) / (sorted.length - 1)
      let cursor = first.left
      for (const [id, b] of sorted) {
        deltas.set(id, { dx: cursor - b.left, dy: 0 })
        cursor += b.w + gap
      }
      break
    }
    case 'distributeV': {
      if (boundsMap.size < 3) return annotations
      // Sort by top edge
      const sorted = [...boundsMap.entries()].sort((a, b) => a[1].top - b[1].top)
      const first = sorted[0][1]
      const last = sorted[sorted.length - 1][1]
      const totalItemHeight = sorted.reduce((s, [, b]) => s + b.h, 0)
      const totalSpan = last.bottom - first.top
      const gap = (totalSpan - totalItemHeight) / (sorted.length - 1)
      let cursor = first.top
      for (const [id, b] of sorted) {
        deltas.set(id, { dx: 0, dy: cursor - b.top })
        cursor += b.h + gap
      }
      break
    }
  }

  // Apply deltas to produce new page annotations
  const newPageAnns = pageAnns.map((a: Annotation) => {
    const d = deltas.get(a.id)
    if (!d || (d.dx === 0 && d.dy === 0)) return a
    return shiftAnnotation(a, d.dx, d.dy)
  })

  return { ...annotations, [page]: newPageAnns }
}
