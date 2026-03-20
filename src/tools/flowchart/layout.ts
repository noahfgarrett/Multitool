import dagre from '@dagrejs/dagre'
import type { DiagramNode, DiagramEdge, Point } from './types.ts'

// ── Layout direction ──────────────────────────────────────────

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL'

export const LAYOUT_DIRECTIONS: { value: LayoutDirection; label: string; arrow: string }[] = [
  { value: 'TB', label: 'Top to Bottom', arrow: '\u2193' },
  { value: 'LR', label: 'Left to Right', arrow: '\u2192' },
  { value: 'BT', label: 'Bottom to Top', arrow: '\u2191' },
  { value: 'RL', label: 'Right to Left', arrow: '\u2190' },
]

// ── Auto-layout via dagre ─────────────────────────────────────

interface LayoutResult {
  positions: Map<string, Point>
}

/**
 * Compute automatic layout positions for nodes using dagre.
 * Returns a map of node ID to new { x, y } position (top-left corner).
 */
export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: LayoutDirection = 'TB',
): LayoutResult {
  const g = new dagre.graphlib.Graph()

  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  })

  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes with their dimensions
  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width,
      height: node.height,
    })
  }

  // Add edges
  for (const edge of edges) {
    // Only add edges where both source and target exist
    if (g.hasNode(edge.sourceId) && g.hasNode(edge.targetId)) {
      g.setEdge(edge.sourceId, edge.targetId)
    }
  }

  // Run the layout algorithm
  dagre.layout(g)

  // Extract computed positions
  // dagre returns center positions; convert to top-left
  const positions = new Map<string, Point>()
  for (const node of nodes) {
    const layoutNode = g.node(node.id)
    if (layoutNode) {
      positions.set(node.id, {
        x: layoutNode.x - node.width / 2,
        y: layoutNode.y - node.height / 2,
      })
    }
  }

  return { positions }
}
