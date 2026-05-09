import type { Point, CalibrationState } from './types.ts'

// ── Helper functions ────────────────────────────────────

/** Distance between two points */
export function computeSegmentLength(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/** Sum of segment lengths for a polyline */
export function computePolylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += computeSegmentLength(points[i - 1], points[i])
  }
  return total
}

/** Shoelace formula — returns area in annotation-space units² */
export function computePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

/**
 * Format a measurement value with calibration units.
 * For length: value / pixelsPerUnit
 * For area: value / pixelsPerUnit²
 */
export function formatMeasurement(
  value: number,
  calibration: CalibrationState,
  isArea: boolean,
): string {
  if (calibration.pixelsPerUnit !== null) {
    const divisor = isArea
      ? calibration.pixelsPerUnit * calibration.pixelsPerUnit
      : calibration.pixelsPerUnit
    const converted = value / divisor
    const suffix = isArea ? `${calibration.unit}²` : calibration.unit
    return `${converted.toFixed(2)} ${suffix}`
  }
  const suffix = isArea ? 'px²' : 'px'
  return `${value.toFixed(1)} ${suffix}`
}

/**
 * Format a volume value (area × depth) with calibration units.
 */
export function formatVolume(
  area: number,
  depth: number,
  calibration: CalibrationState,
): string {
  if (calibration.pixelsPerUnit !== null) {
    const ppu = calibration.pixelsPerUnit
    const calibratedArea = area / (ppu * ppu)
    const calibratedDepth = depth // depth is entered in calibrated units already
    const volume = calibratedArea * calibratedDepth
    return `${volume.toFixed(2)} ${calibration.unit}³`
  }
  return `${(area * depth).toFixed(1)} px³`
}

// ── Label drawing helper ────────────────────────────────

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  isActive: boolean,
): void {
  ctx.save()
  ctx.font = '600 12px system-ui, sans-serif'

  const metrics = ctx.measureText(text)
  const padX = 8
  const padY = 4
  const tw = metrics.width + padX * 2
  const th = 17 + padY * 2
  const radius = th / 2
  const rx = x - tw / 2
  const ry = y - th / 2

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // Dark background pill
  ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.95)' : 'rgba(0, 30, 40, 0.88)'
  ctx.beginPath()
  ctx.roundRect(rx, ry, tw, th, radius)
  ctx.fill()

  // Reset shadow for border and text
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Cyan border
  ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.4)' : '#22D3EE'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(rx, ry, tw, th, radius)
  ctx.stroke()

  // Text
  ctx.fillStyle = isActive ? '#ffffff' : '#22D3EE'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)

  ctx.restore()
}

// ── Polylength drawing ──────────────────────────────────

export function drawPolylength(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  scale: number,
  calibration: CalibrationState,
  isActive: boolean,
): void {
  if (points.length < 2) return

  ctx.save()

  // Draw dashed lines between points
  ctx.strokeStyle = isActive ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = isActive ? 2.5 : 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(points[0].x * scale, points[0].y * scale)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * scale, points[i].y * scale)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // Draw vertex circles
  ctx.fillStyle = isActive ? '#06B6D4' : '#22D3EE'
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x * scale, p.y * scale, isActive ? 5 : 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Per-segment length labels
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1]
    const p2 = points[i]
    const segLen = computeSegmentLength(p1, p2)
    const label = formatMeasurement(segLen, calibration, false)
    const mx = ((p1.x + p2.x) / 2) * scale
    const my = ((p1.y + p2.y) / 2) * scale
    drawLabel(ctx, label, mx, my, isActive)
  }

  // Cumulative total label at the last point
  const totalLen = computePolylineLength(points)
  const totalLabel = `Total: ${formatMeasurement(totalLen, calibration, false)}`
  const lastPt = points[points.length - 1]
  drawLabel(ctx, totalLabel, lastPt.x * scale, lastPt.y * scale - 20, isActive)

  ctx.restore()
}

// ── Area polygon drawing ────────────────────────────────

export function drawAreaPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  scale: number,
  calibration: CalibrationState,
  closed: boolean,
  isActive: boolean,
  depth?: number,
): void {
  if (points.length < 2) return

  ctx.save()

  // Draw filled polygon if closed or preview
  if (points.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(points[0].x * scale, points[0].y * scale)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale)
    }
    ctx.closePath()
    ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.15)' : 'rgba(34, 211, 238, 0.15)'
    ctx.fill()
  }

  // Draw border
  ctx.strokeStyle = isActive ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = isActive ? 2.5 : 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(points[0].x * scale, points[0].y * scale)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * scale, points[i].y * scale)
  }
  if (closed) {
    ctx.closePath()
  }
  ctx.stroke()

  // If not closed, draw dashed preview line from last point to first
  if (!closed && points.length >= 3) {
    const last = points[points.length - 1]
    const first = points[0]
    ctx.strokeStyle = isActive ? 'rgba(6, 182, 212, 0.5)' : 'rgba(34, 211, 238, 0.5)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(last.x * scale, last.y * scale)
    ctx.lineTo(first.x * scale, first.y * scale)
    ctx.stroke()
  }

  ctx.setLineDash([])

  // Draw vertex circles
  ctx.fillStyle = isActive ? '#06B6D4' : '#22D3EE'
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x * scale, p.y * scale, isActive ? 5 : 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Area and perimeter labels centered in the polygon
  if (points.length >= 3) {
    // Compute centroid for label placement
    let cx = 0
    let cy = 0
    for (const p of points) {
      cx += p.x
      cy += p.y
    }
    cx = (cx / points.length) * scale
    cy = (cy / points.length) * scale

    const area = computePolygonArea(points)
    const areaLabel = formatMeasurement(area, calibration, true)
    drawLabel(ctx, areaLabel, cx, cy - 10, isActive)

    // Perimeter (include closing segment)
    let perimeter = computePolylineLength(points)
    perimeter += computeSegmentLength(points[points.length - 1], points[0])
    const perimLabel = `P: ${formatMeasurement(perimeter, calibration, false)}`
    drawLabel(ctx, perimLabel, cx, cy + 14, isActive)

    // Volume label (if depth is set)
    if (depth && depth > 0) {
      const volLabel = `V: ${formatVolume(area, depth, calibration)}`
      drawLabel(ctx, volLabel, cx, cy + 38, isActive)
    }
  }

  ctx.restore()
}

// ── Angle measurement drawing ─────────────────────────────

/** Compute angle at vertex B formed by rays B→A and B→C, in degrees (0–360). */
export function computeAngleDegrees(a: Point, b: Point, c: Point): number {
  const angleA = Math.atan2(a.y - b.y, a.x - b.x)
  const angleC = Math.atan2(c.y - b.y, c.x - b.x)
  let diff = angleA - angleC
  // Normalize to [0, 2π)
  if (diff < 0) diff += 2 * Math.PI
  // Convert to degrees
  return diff * (180 / Math.PI)
}

export function drawAngleMeasurement(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  scale: number,
  isActive: boolean,
): void {
  if (points.length < 2) return

  const a = points[0]
  const b = points[1] // vertex
  const c = points.length >= 3 ? points[2] : null

  ctx.save()

  const strokeColor = isActive ? '#06B6D4' : '#22D3EE'

  // Draw ray B→A
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = isActive ? 2.5 : 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(b.x * scale, b.y * scale)
  ctx.lineTo(a.x * scale, a.y * scale)
  ctx.stroke()

  // Draw ray B→C if we have the third point
  if (c) {
    ctx.beginPath()
    ctx.moveTo(b.x * scale, b.y * scale)
    ctx.lineTo(c.x * scale, c.y * scale)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Draw vertex circles
  ctx.fillStyle = strokeColor
  const dotRadius = isActive ? 5 : 4
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x * scale, p.y * scale, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw arc and degree label if all three points are placed
  if (c) {
    const angleA = Math.atan2(a.y - b.y, a.x - b.x)
    const angleC = Math.atan2(c.y - b.y, c.x - b.x)
    let sweep = angleA - angleC
    if (sweep < 0) sweep += 2 * Math.PI

    const degrees = sweep * (180 / Math.PI)

    // Arc radius proportional to shortest ray but clamped
    const rayLenA = Math.hypot(a.x - b.x, a.y - b.y) * scale
    const rayLenC = Math.hypot(c.x - b.x, c.y - b.y) * scale
    const arcRadius = Math.max(20, Math.min(40, Math.min(rayLenA, rayLenC) * 0.3))

    // Draw arc from angleC to angleA (counterclockwise = false for the swept angle)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = isActive ? 2 : 1.5
    ctx.beginPath()
    ctx.arc(b.x * scale, b.y * scale, arcRadius, angleC, angleA, sweep > Math.PI)
    ctx.stroke()

    // Fill arc region with semi-transparent color
    ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.12)' : 'rgba(34, 211, 238, 0.12)'
    ctx.beginPath()
    ctx.moveTo(b.x * scale, b.y * scale)
    ctx.arc(b.x * scale, b.y * scale, arcRadius, angleC, angleA, sweep > Math.PI)
    ctx.closePath()
    ctx.fill()

    // Label at the midpoint of the arc
    const midAngle = angleC + (sweep > Math.PI ? -(2 * Math.PI - sweep) / 2 : sweep / 2)
    const labelRadius = arcRadius + 16
    const lx = b.x * scale + Math.cos(midAngle) * labelRadius
    const ly = b.y * scale + Math.sin(midAngle) * labelRadius

    drawLabel(ctx, `${degrees.toFixed(1)}°`, lx, ly, isActive)
  }

  ctx.restore()
}

// ── Count marker drawing ────────────────────────────────

export function drawCountMarker(
  ctx: CanvasRenderingContext2D,
  point: Point,
  number: number,
  color: string,
  scale: number,
): void {
  const radius = 12 * scale
  const cx = point.x * scale
  const cy = point.y * scale

  ctx.save()

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 4 * scale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2 * scale

  // Filled circle with group color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()

  // Reset shadow for text
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // White number text centered
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${11 * scale}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number), cx, cy)

  ctx.restore()
}

// ── Count group summary badge ───────────────────────────

export function drawCountGroupSummary(
  ctx: CanvasRenderingContext2D,
  label: string,
  count: number,
  x: number,
  y: number,
  color: string,
  scale: number,
): void {
  ctx.save()

  const text = `${label}: ${count}`
  ctx.font = `600 12px system-ui, sans-serif`

  const metrics = ctx.measureText(text)
  const padX = 10
  const padY = 6
  const tw = metrics.width + padX * 2 + 16 // extra space for color dot
  const th = 20 + padY * 2
  const radius = th / 2

  // Badge background
  ctx.fillStyle = 'rgba(0, 40, 50, 0.9)'
  ctx.beginPath()
  ctx.roundRect(x, y, tw, th, radius)
  ctx.fill()

  // Badge border
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, tw, th, radius)
  ctx.stroke()

  // Color dot
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x + padX + 5, y + th / 2, 5, 0, Math.PI * 2)
  ctx.fill()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX + 16, y + th / 2)

  ctx.restore()
}
