// ── Flowchart Diagram Types ──────────────────────────────────

export interface Point {
  x: number
  y: number
}

// ── Shape types ─────────────────────────────────────────────

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'diamond'
  | 'pill'
  | 'circle'
  | 'parallelogram'
  | 'cylinder'
  | 'triangle'
  | 'hexagon'
  | 'document'
  | 'cloud'
  | 'callout'
  | 'star'
  | 'swim-lane'
  // Agent A: additional ISO 5807 shapes
  | 'document-shape'
  | 'predefined-process'
  | 'manual-operation'
  | 'manual-input'
  | 'delay'
  | 'on-page-ref'
  | 'off-page-ref'
  | 'stored-data'

export type PortPosition = 'top' | 'right' | 'bottom' | 'left'

// ── Node styling ────────────────────────────────────────────

export type FontWeight = 'normal' | 'bold'
export type FontStyle = 'normal' | 'italic'
export type TextAlign = 'left' | 'center' | 'right'

export interface NodeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  fontSize: number
  fontColor: string
  fontWeight: FontWeight
  fontStyle: FontStyle
  textAlign: TextAlign
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  fill: 'rgba(244,123,32,0.08)',
  stroke: 'rgba(244,123,32,0.4)',
  strokeWidth: 1.5,
  fontSize: 13,
  fontColor: '#ffffff',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
}

// ── Edge styling ────────────────────────────────────────────

export type EdgeRouteType = 'straight' | 'orthogonal' | 'curved'

export interface EdgeStyle {
  stroke: string
  strokeWidth: number
  dashArray: string       // '' = solid, '6 3' = dashed, '2 2' = dotted
  markerEnd: boolean      // arrowhead on target
}

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: 'rgba(244,123,32,0.5)',
  strokeWidth: 1.5,
  dashArray: '',
  markerEnd: true,
}

// ── Diagram node ────────────────────────────────────────────

export interface DiagramNode {
  id: string
  type: ShapeType
  label: string
  x: number
  y: number
  width: number
  height: number
  style: NodeStyle
  zIndex: number
  rotation: number       // degrees, default 0 (Agent A)
  groupId: string | null // Agent C
  layerId: string        // Agent C
}

// ── Diagram edge ────────────────────────────────────────────

export interface DiagramEdge {
  id: string
  sourceId: string
  sourcePort: PortPosition
  targetId: string
  targetPort: PortPosition
  label: string
  routeType: EdgeRouteType
  style: EdgeStyle
  waypoints: Point[]
  labelPosition: number // 0-1 along edge path, default 0.5 (Agent A)
}

// ── Layer ────────────────────────────────────────────────────

export interface DiagramLayer {
  id: string
  name: string
  isVisible: boolean
  isLocked: boolean
}

export const DEFAULT_LAYER: DiagramLayer = {
  id: 'default',
  name: 'Default',
  isVisible: true,
  isLocked: false,
}

// ── Diagram state (for undo/redo snapshots) ─────────────────

export interface DiagramState {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

// ── Diagram page (for multi-page support) ───────────────────

export interface DiagramPage {
  id: string
  name: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  viewport: Viewport
  layers: DiagramLayer[]
}

// ── Interaction modes ───────────────────────────────────────

export type ToolMode =
  | 'select'            // default pointer mode
  | 'pan'               // hand/pan tool
  | 'connect'           // click source then target to draw edge
  | { place: ShapeType } // click to place a shape of this type

// ── Selection ───────────────────────────────────────────────

export interface SelectionState {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

export function emptySelection(): SelectionState {
  return { nodeIds: new Set(), edgeIds: new Set() }
}

// ── Canvas viewport ─────────────────────────────────────────

export interface Viewport {
  panX: number
  panY: number
  zoom: number
}

export const DEFAULT_VIEWPORT: Viewport = {
  panX: 0,
  panY: 0,
  zoom: 1,
}

export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 4

// ── PDF Export page sizes ──────────────────────────────────

export type PdfPageSize = 'auto' | 'letter' | 'tabloid' | 'a4'

export const PDF_PAGE_SIZES: Record<Exclude<PdfPageSize, 'auto'>, { width: number; height: number; label: string }> = {
  letter:  { width: 612, height: 792, label: 'Letter (8.5 x 11)' },
  tabloid: { width: 792, height: 1224, label: 'Tabloid (11 x 17)' },
  a4:      { width: 595, height: 842, label: 'A4 (210 x 297mm)' },
}

// ── Utility ─────────────────────────────────────────────────

export function genId(): string {
  return Math.random().toString(36).substring(2, 11)
}
