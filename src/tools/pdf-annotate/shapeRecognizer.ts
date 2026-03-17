/**
 * $1 Unistroke Recognizer — Ink-to-Shape Recognition
 *
 * Based on the $1 Unistroke Recognizer algorithm by Wobbrock, Wilson, & Li (2007).
 * Detects circle, rectangle, line, arrow, and triangle from freehand strokes.
 */

import type { Point } from './types.ts'

// ── Public Types ────────────────────────────────────────

interface RecognizedShape {
  name: 'circle' | 'rectangle' | 'line' | 'arrow' | 'triangle'
  score: number  // 0-1 confidence
  bounds: { x: number; y: number; width: number; height: number }
}

// ── Constants ───────────────────────────────────────────

const NUM_POINTS = 64
const SQUARE_SIZE = 250
const HALF_DIAGONAL = 0.5 * Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE)
const ANGLE_RANGE = Math.PI / 4   // 45 degrees
const ANGLE_STEP = Math.PI / 90   // 2 degrees
const PHI = 0.5 * (-1 + Math.sqrt(5)) // golden ratio

/** Minimum confidence to return a match */
const MIN_SCORE = 0.75

/** Only consider strokes with 10-80 raw points */
const MIN_POINTS = 10
const MAX_POINTS = 80

// ── Geometry Utilities ──────────────────────────────────

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function pathLength(points: readonly Point[]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i])
  }
  return d
}

function centroid(points: readonly Point[]): Point {
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  return { x: cx / points.length, y: cy / points.length }
}

function boundingBox(points: readonly Point[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// ── $1 Algorithm Steps ──────────────────────────────────

/** Step 1: Resample a point path to N evenly-spaced points */
function resample(rawPoints: readonly Point[], n: number): Point[] {
  const interval = pathLength(rawPoints) / (n - 1)
  const pts: Point[] = [{ x: rawPoints[0].x, y: rawPoints[0].y }]
  let D = 0

  for (let i = 1; i < rawPoints.length; i++) {
    const d = distance(rawPoints[i - 1], rawPoints[i])
    if (D + d >= interval) {
      const qx = rawPoints[i - 1].x + ((interval - D) / d) * (rawPoints[i].x - rawPoints[i - 1].x)
      const qy = rawPoints[i - 1].y + ((interval - D) / d) * (rawPoints[i].y - rawPoints[i - 1].y)
      const q: Point = { x: qx, y: qy }
      pts.push(q)
      // Insert q into rawPoints so we can measure from it next iteration.
      // We mutate a copy below; but since we want to avoid mutating the input,
      // we work with an index offset instead.
      rawPoints = [...rawPoints.slice(0, i), q, ...rawPoints.slice(i)]
      D = 0
    } else {
      D += d
    }
  }

  // Rounding errors may leave us one short
  while (pts.length < n) {
    pts.push({ x: rawPoints[rawPoints.length - 1].x, y: rawPoints[rawPoints.length - 1].y })
  }

  return pts.slice(0, n)
}

/** Compute the "indicative angle" — angle from centroid to first point */
function indicativeAngle(points: readonly Point[]): number {
  const c = centroid(points)
  return Math.atan2(c.y - points[0].y, c.x - points[0].x)
}

/** Step 2: Rotate points so the indicative angle is 0 */
function rotateBy(points: readonly Point[], radians: number): Point[] {
  const c = centroid(points)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return points.map(p => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }))
}

/** Step 3: Scale to a reference square */
function scaleTo(points: readonly Point[], size: number): Point[] {
  const b = boundingBox(points)
  const w = b.width === 0 ? 1 : b.width
  const h = b.height === 0 ? 1 : b.height
  return points.map(p => ({
    x: p.x * (size / w),
    y: p.y * (size / h),
  }))
}

/** Step 4: Translate centroid to origin */
function translateTo(points: readonly Point[], target: Point): Point[] {
  const c = centroid(points)
  return points.map(p => ({
    x: p.x + target.x - c.x,
    y: p.y + target.y - c.y,
  }))
}

/** Compute average distance between corresponding points of two paths */
function pathDistance(a: readonly Point[], b: readonly Point[]): number {
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += distance(a[i], b[i])
  }
  return d / a.length
}

/** Golden-section search for the best rotation angle */
function distanceAtBestAngle(
  points: readonly Point[],
  template: readonly Point[],
  aAngle: number,
  bAngle: number,
  threshold: number,
): number {
  let a = aAngle
  let b = bAngle
  let x1 = PHI * a + (1 - PHI) * b
  let f1 = pathDistance(rotateBy(points, x1), template)
  let x2 = (1 - PHI) * a + PHI * b
  let f2 = pathDistance(rotateBy(points, x2), template)

  while (Math.abs(b - a) > threshold) {
    if (f1 < f2) {
      b = x2
      x2 = x1
      f2 = f1
      x1 = PHI * a + (1 - PHI) * b
      f1 = pathDistance(rotateBy(points, x1), template)
    } else {
      a = x1
      x1 = x2
      f1 = f2
      x2 = (1 - PHI) * a + PHI * b
      f2 = pathDistance(rotateBy(points, x2), template)
    }
  }

  return Math.min(f1, f2)
}

// ── Template Processing ─────────────────────────────────

/** Normalize a template (or input) through the full pipeline: resample, rotate, scale, translate */
function normalize(points: readonly Point[]): Point[] {
  let pts = resample(points, NUM_POINTS)
  const angle = indicativeAngle(pts)
  pts = rotateBy(pts, -angle)
  pts = scaleTo(pts, SQUARE_SIZE)
  pts = translateTo(pts, { x: 0, y: 0 })
  return pts
}

// ── Template Definitions ────────────────────────────────

interface ShapeTemplate {
  name: RecognizedShape['name']
  points: Point[]
}

/** Generate N evenly-spaced points along a circle */
function generateCirclePoints(n: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n
    pts.push({ x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 })
  }
  return pts
}

/** Generate N points around a rectangle */
function generateRectanglePoints(n: number): Point[] {
  const w = 200
  const h = 150
  const perimeter = 2 * (w + h)
  const pts: Point[] = []

  for (let i = 0; i < n; i++) {
    let d = (perimeter * i) / n
    let x: number
    let y: number

    if (d < w) {
      // Top edge
      x = d
      y = 0
    } else if (d < w + h) {
      // Right edge
      d -= w
      x = w
      y = d
    } else if (d < 2 * w + h) {
      // Bottom edge
      d -= w + h
      x = w - d
      y = h
    } else {
      // Left edge
      d -= 2 * w + h
      x = 0
      y = h - d
    }

    pts.push({ x, y })
  }

  return pts
}

/** Generate N points along a straight line */
function generateLinePoints(n: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    pts.push({ x: t * 200, y: 0 })
  }
  return pts
}

/** Generate N points for an arrow (line + V-head) */
function generateArrowPoints(n: number): Point[] {
  const shaftEnd = 0.7
  const headLen = 60
  const headAngle = Math.PI / 6 // 30 degrees
  const pts: Point[] = []

  // Shaft portion
  const shaftCount = Math.floor(n * shaftEnd)
  for (let i = 0; i < shaftCount; i++) {
    const t = i / (shaftCount - 1)
    pts.push({ x: t * 200, y: 0 })
  }

  // Upper head arm
  const armCount = Math.floor((n - shaftCount) / 2)
  for (let i = 0; i < armCount; i++) {
    const t = i / Math.max(armCount - 1, 1)
    pts.push({
      x: 200 - t * headLen * Math.cos(headAngle),
      y: -t * headLen * Math.sin(headAngle),
    })
  }

  // Back to tip, then lower head arm
  pts.push({ x: 200, y: 0 })
  const remaining = n - pts.length
  for (let i = 0; i < remaining; i++) {
    const t = i / Math.max(remaining - 1, 1)
    pts.push({
      x: 200 - t * headLen * Math.cos(headAngle),
      y: t * headLen * Math.sin(headAngle),
    })
  }

  return pts.slice(0, n)
}

/** Generate N points along a triangle */
function generateTrianglePoints(n: number): Point[] {
  const pts: Point[] = []
  // Equilateral-ish triangle
  const vertices: Point[] = [
    { x: 100, y: 0 },      // top
    { x: 200, y: 173 },    // bottom-right
    { x: 0, y: 173 },      // bottom-left
  ]

  const perimeter =
    distance(vertices[0], vertices[1]) +
    distance(vertices[1], vertices[2]) +
    distance(vertices[2], vertices[0])

  for (let i = 0; i < n; i++) {
    let d = (perimeter * i) / n
    const d01 = distance(vertices[0], vertices[1])
    const d12 = distance(vertices[1], vertices[2])

    if (d < d01) {
      const t = d / d01
      pts.push({
        x: vertices[0].x + t * (vertices[1].x - vertices[0].x),
        y: vertices[0].y + t * (vertices[1].y - vertices[0].y),
      })
    } else if (d < d01 + d12) {
      d -= d01
      const t = d / d12
      pts.push({
        x: vertices[1].x + t * (vertices[2].x - vertices[1].x),
        y: vertices[1].y + t * (vertices[2].y - vertices[1].y),
      })
    } else {
      d -= d01 + d12
      const d20 = distance(vertices[2], vertices[0])
      const t = d / d20
      pts.push({
        x: vertices[2].x + t * (vertices[0].x - vertices[2].x),
        y: vertices[2].y + t * (vertices[0].y - vertices[2].y),
      })
    }
  }

  return pts
}

/** Pre-computed and normalized templates */
const TEMPLATES: ShapeTemplate[] = [
  { name: 'circle', points: normalize(generateCirclePoints(NUM_POINTS)) },
  { name: 'rectangle', points: normalize(generateRectanglePoints(NUM_POINTS)) },
  { name: 'line', points: normalize(generateLinePoints(NUM_POINTS)) },
  { name: 'arrow', points: normalize(generateArrowPoints(NUM_POINTS)) },
  { name: 'triangle', points: normalize(generateTrianglePoints(NUM_POINTS)) },
]

// ── Public API ──────────────────────────────────────────

/**
 * Recognize a shape from a freehand stroke using the $1 Unistroke Recognizer.
 *
 * @param points Raw freehand input points
 * @returns The best matching shape, or null if confidence < 0.75 or point count out of range
 */
export function recognizeShape(points: readonly Point[]): RecognizedShape | null {
  // Guard: only recognize strokes with 10-80 points
  if (points.length < MIN_POINTS || points.length > MAX_POINTS) {
    return null
  }

  // Guard: need non-zero path length
  if (pathLength(points) < 1) {
    return null
  }

  // Normalize input through the $1 pipeline
  const candidate = normalize(points)

  // Find best matching template
  let bestDistance = Infinity
  let bestTemplate: ShapeTemplate | null = null

  for (const template of TEMPLATES) {
    const d = distanceAtBestAngle(candidate, template.points, -ANGLE_RANGE, ANGLE_RANGE, ANGLE_STEP)
    if (d < bestDistance) {
      bestDistance = d
      bestTemplate = template
    }
  }

  if (bestTemplate === null) {
    return null
  }

  // Convert distance to a 0-1 score
  const score = 1 - bestDistance / HALF_DIAGONAL

  if (score < MIN_SCORE) {
    return null
  }

  // Compute bounds from the original (un-normalized) input
  const bounds = boundingBox(points)

  return {
    name: bestTemplate.name,
    score,
    bounds,
  }
}
