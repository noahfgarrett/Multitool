import type { DiagramNode, Point, PortPosition } from './types.ts'
import { getPortPosition } from './shapes.ts'

// ── A* pathfinding for orthogonal connector routing ───────────

const GRID_RESOLUTION = 10
const BBOX_INFLATE = 20

interface GridCell {
  x: number
  y: number
}

interface AStarNode {
  cell: GridCell
  g: number        // cost from start
  h: number        // heuristic to end
  f: number        // g + h
  parent: AStarNode | null
}

// ── Obstacle grid ─────────────────────────────────────────────

interface ObstacleRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

function inflateNodeBBox(node: DiagramNode): ObstacleRect {
  return {
    x1: node.x - BBOX_INFLATE,
    y1: node.y - BBOX_INFLATE,
    x2: node.x + node.width + BBOX_INFLATE,
    y2: node.y + node.height + BBOX_INFLATE,
  }
}

function isBlocked(x: number, y: number, obstacles: ObstacleRect[]): boolean {
  for (const obs of obstacles) {
    if (x >= obs.x1 && x <= obs.x2 && y >= obs.y1 && y <= obs.y2) {
      return true
    }
  }
  return false
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_RESOLUTION) * GRID_RESOLUTION
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function manhattanDist(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// ── Extend port to standoff position ──────────────────────────

function extendPort(pt: Point, port: PortPosition, dist: number): Point {
  switch (port) {
    case 'top':    return { x: pt.x, y: pt.y - dist }
    case 'bottom': return { x: pt.x, y: pt.y + dist }
    case 'left':   return { x: pt.x - dist, y: pt.y }
    case 'right':  return { x: pt.x + dist, y: pt.y }
  }
}

// ── A* pathfinding ────────────────────────────────────────────

const DIRECTIONS: GridCell[] = [
  { x: GRID_RESOLUTION, y: 0 },
  { x: -GRID_RESOLUTION, y: 0 },
  { x: 0, y: GRID_RESOLUTION },
  { x: 0, y: -GRID_RESOLUTION },
]

function astarPath(
  start: GridCell,
  end: GridCell,
  obstacles: ObstacleRect[],
  maxIterations: number = 2000,
): GridCell[] | null {
  const openMap = new Map<string, AStarNode>()
  const closedSet = new Set<string>()

  const startNode: AStarNode = {
    cell: start,
    g: 0,
    h: manhattanDist(start, end),
    f: manhattanDist(start, end),
    parent: null,
  }

  const startKey = cellKey(start.x, start.y)
  openMap.set(startKey, startNode)

  let iterations = 0

  while (openMap.size > 0 && iterations < maxIterations) {
    iterations++

    // Find lowest f in open set
    let best: AStarNode | null = null
    let bestKey = ''
    for (const [key, node] of openMap) {
      if (!best || node.f < best.f || (node.f === best.f && node.h < best.h)) {
        best = node
        bestKey = key
      }
    }

    if (!best) break

    // Check if we reached the goal
    if (best.cell.x === end.x && best.cell.y === end.y) {
      // Reconstruct path
      const path: GridCell[] = []
      let current: AStarNode | null = best
      while (current) {
        path.unshift(current.cell)
        current = current.parent
      }
      return path
    }

    openMap.delete(bestKey)
    closedSet.add(bestKey)

    // Explore neighbors
    for (const dir of DIRECTIONS) {
      const nx = best.cell.x + dir.x
      const ny = best.cell.y + dir.y
      const nKey = cellKey(nx, ny)

      if (closedSet.has(nKey)) continue

      // Allow start and end positions even if technically inside an obstacle
      const isEndpoint = (nx === end.x && ny === end.y) || (nx === start.x && ny === start.y)
      if (!isEndpoint && isBlocked(nx, ny, obstacles)) continue

      const gCost = best.g + GRID_RESOLUTION
      // Add a small penalty for direction changes to prefer straight paths
      const bendPenalty = best.parent !== null &&
        (best.cell.x - best.parent.cell.x !== dir.x ||
         best.cell.y - best.parent.cell.y !== dir.y) ? 5 : 0
      const totalG = gCost + bendPenalty

      const existing = openMap.get(nKey)
      if (existing && existing.g <= totalG) continue

      const h = manhattanDist({ x: nx, y: ny }, end)
      const neighbor: AStarNode = {
        cell: { x: nx, y: ny },
        g: totalG,
        h,
        f: totalG + h,
        parent: best,
      }

      openMap.set(nKey, neighbor)
    }
  }

  return null // No path found
}

// ── Simplify path by removing collinear points ────────────────

function simplifyPath(path: GridCell[]): Point[] {
  if (path.length <= 2) return path.map(c => ({ x: c.x, y: c.y }))

  const result: Point[] = [{ x: path[0].x, y: path[0].y }]

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const curr = path[i]
    const next = path[i + 1]

    // Keep this point if direction changes (it's a bend)
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y

    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push({ x: curr.x, y: curr.y })
    }
  }

  result.push({ x: path[path.length - 1].x, y: path[path.length - 1].y })
  return result
}

// ── Public API ────────────────────────────────────────────────

/**
 * Compute an orthogonal path that avoids other node bounding boxes.
 * Returns an SVG path string. Falls back to direct orthogonal path
 * if A* fails.
 */
export function routeOrthogonalPath(
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
  sourcePort: PortPosition,
  targetPort: PortPosition,
  allNodes: DiagramNode[],
): string | null {
  // Build obstacle list, excluding source and target nodes
  const obstacles = allNodes
    .filter(n => n.id !== sourceNode.id && n.id !== targetNode.id)
    .map(inflateNodeBBox)

  // If no obstacles, no need for auto-routing
  if (obstacles.length === 0) return null

  const fromPort = getPortPosition(sourceNode, sourcePort)
  const toPort = getPortPosition(targetNode, targetPort)

  // Extend from ports to get standoff positions
  const standoff = BBOX_INFLATE + GRID_RESOLUTION
  const fromStandoff = extendPort(fromPort, sourcePort, standoff)
  const toStandoff = extendPort(toPort, targetPort, standoff)

  const start: GridCell = {
    x: snapToGrid(fromStandoff.x),
    y: snapToGrid(fromStandoff.y),
  }
  const end: GridCell = {
    x: snapToGrid(toStandoff.x),
    y: snapToGrid(toStandoff.y),
  }

  // Run A* to find path avoiding obstacles
  const gridPath = astarPath(start, end, obstacles)
  if (!gridPath) return null

  // Simplify path (remove collinear points)
  const simplified = simplifyPath(gridPath)

  // Build full path: port → standoff → A* path → standoff → port
  const fullPath: Point[] = [
    fromPort,
    fromStandoff,
    ...simplified,
    toStandoff,
    toPort,
  ]

  // Build SVG path string
  if (fullPath.length < 2) return null

  const segments = [`M ${fullPath[0].x} ${fullPath[0].y}`]
  for (let i = 1; i < fullPath.length; i++) {
    segments.push(`L ${fullPath[i].x} ${fullPath[i].y}`)
  }

  return segments.join(' ')
}

/**
 * Check if a direct orthogonal path between two nodes
 * passes through any other node's bounding box.
 * Returns true if there are obstacles in the way.
 */
export function hasObstaclesInPath(
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
  allNodes: DiagramNode[],
): boolean {
  const obstacles = allNodes
    .filter(n => n.id !== sourceNode.id && n.id !== targetNode.id)

  if (obstacles.length === 0) return false

  // Simple check: does the bounding box of the path overlap with any obstacle?
  const sx = sourceNode.x + sourceNode.width / 2
  const sy = sourceNode.y + sourceNode.height / 2
  const tx = targetNode.x + targetNode.width / 2
  const ty = targetNode.y + targetNode.height / 2

  const pathMinX = Math.min(sx, tx)
  const pathMaxX = Math.max(sx, tx)
  const pathMinY = Math.min(sy, ty)
  const pathMaxY = Math.max(sy, ty)

  for (const obs of obstacles) {
    const obsMinX = obs.x
    const obsMaxX = obs.x + obs.width
    const obsMinY = obs.y
    const obsMaxY = obs.y + obs.height

    // Check if the bounding boxes overlap
    if (pathMaxX > obsMinX && pathMinX < obsMaxX &&
        pathMaxY > obsMinY && pathMinY < obsMaxY) {
      return true
    }
  }

  return false
}
