import type { Annotation } from './types.ts'
import { getAnnotationBounds } from './geometry.ts'

// ── Types ──────────────────────────────────────────

export interface SnapGuide {
  axis: 'x' | 'y'
  position: number  // doc-space coordinate
}

interface DraggedBounds {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

// ── Constants ──────────────────────────────────────

const SNAP_THRESHOLD = 5  // doc-space pixels

// ── Exported Functions ─────────────────────────────

/**
 * Compute visual-only alignment guides for a dragged annotation.
 *
 * Checks alignment against page center, page edges, and the bounds
 * of other annotations on the same page. Returns guides for any
 * edge/center within SNAP_THRESHOLD of a target — these are purely
 * visual indicators (no position snapping).
 */
export function computeSnapGuides(
  draggedBounds: DraggedBounds,
  otherAnnotations: Annotation[],
  pageWidth: number,
  pageHeight: number,
): SnapGuide[] {
  const guides: SnapGuide[] = []
  const xTargets: number[] = []
  const yTargets: number[] = []

  // Page center
  xTargets.push(pageWidth / 2)
  yTargets.push(pageHeight / 2)

  // Page edges
  xTargets.push(0, pageWidth)
  yTargets.push(0, pageHeight)

  // Other annotation centers and edges
  for (const ann of otherAnnotations) {
    const bounds = getAnnotationBounds(ann)
    if (!bounds) continue
    const right = bounds.x + bounds.w
    const bottom = bounds.y + bounds.h
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    xTargets.push(bounds.x, right, cx)
    yTargets.push(bounds.y, bottom, cy)
  }

  // Check dragged bounds against targets
  const dragXEdges = [draggedBounds.left, draggedBounds.right, draggedBounds.centerX]
  const dragYEdges = [draggedBounds.top, draggedBounds.bottom, draggedBounds.centerY]

  for (const tx of xTargets) {
    for (const dx of dragXEdges) {
      if (Math.abs(dx - tx) < SNAP_THRESHOLD) {
        guides.push({ axis: 'x', position: tx })
      }
    }
  }

  for (const ty of yTargets) {
    for (const dy of dragYEdges) {
      if (Math.abs(dy - ty) < SNAP_THRESHOLD) {
        guides.push({ axis: 'y', position: ty })
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return guides.filter(g => {
    const key = `${g.axis}:${g.position.toFixed(1)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Build DraggedBounds from a bounding box (x, y, w, h).
 */
export function boundsFromRect(
  x: number,
  y: number,
  w: number,
  h: number,
): DraggedBounds {
  return {
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    centerX: x + w / 2,
    centerY: y + h / 2,
  }
}
