// ── Org Chart Types ──────────────────────────────────────────

export interface OrgNode {
  id: string
  name: string
  title: string
  reportsTo: string           // parent node id, '' for root
  department: string
  email: string
  phone: string
  location: string
  imageDataUrl: string | null // base64 avatar (max 128px, JPEG)
  nodeColor: string           // accent color (top bar on card)
  offsetX: number             // manual position offset from auto-layout (default 0)
  offsetY: number             // manual position offset from auto-layout (default 0)
  sectionTitle: string        // section header text — only meaningful when reportsTo === ''
}

export interface LayoutNode extends OrgNode {
  x: number
  y: number
  width: number
  height: number
  children: LayoutNode[]
}

export interface OrgChartState {
  nodes: OrgNode[]
  connections: Connection[]
  connectorTypes: ConnectorType[]
  legend: LegendConfig
}

export interface OrgChartVersion {
  id: string
  name: string
  timestamp: number
  nodeCount: number
  snapshot: OrgChartState
}

export const MAX_VERSIONS = 20
export const SECTION_TITLE_HEIGHT = 40
export const SECTION_GAP = 100

// ── Viewport ────────────────────────────────────────────────

export interface Viewport {
  panX: number
  panY: number
  zoom: number
}

export const DEFAULT_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 }
export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 4

// ── Layout ──────────────────────────────────────────────────

export type LayoutDirection = 'top-down' | 'left-right'

// ── Connector types ─────────────────────────────────────────

export type ConnectorTypeId = 'primary' | 'dotted-line' | 'supports' | 'collaborates'
export type ConnectorStyle = 'solid' | 'dashed' | 'dotted' | 'double'

export interface ConnectorType {
  id: ConnectorTypeId
  label: string
  color: string
  style: ConnectorStyle
  lineWidth: number
}

export interface Connection {
  id: string
  fromId: string
  toId: string
  typeId: ConnectorTypeId
}

export type LegendPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const LEGEND_POSITIONS: readonly LegendPosition[] = [
  'top-left', 'top-right', 'bottom-left', 'bottom-right',
] as const

export interface LegendConfig {
  position: LegendPosition
}

// ── Legend layout constants ─────────────────────────────────

export const LEGEND_PADDING = 14
export const LEGEND_TITLE_HEIGHT = 16
export const LEGEND_UNDERLINE_GAP = 6
export const LEGEND_ROW_HEIGHT = 18
export const LEGEND_LINE_SAMPLE_WIDTH = 42
export const LEGEND_LINE_LABEL_GAP = 10
export const LEGEND_MARGIN = 20

// ── Constants ───────────────────────────────────────────────

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 90
export const H_SPACING = 50
export const V_SPACING = 90
export const AVATAR_SIZE = 40
export const CONNECTOR_RADIUS = 6

// ── Department color presets ────────────────────────────────

export const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#3B82F6',
  Marketing: '#22C55E',
  Sales: '#F59E0B',
  Finance: '#8B5CF6',
  HR: '#EC4899',
  Operations: '#F97316',
  Design: '#06B6D4',
  Legal: '#6366F1',
}

// ── Factory ─────────────────────────────────────────────────

export function genId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function createNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: genId(),
    name: 'New Person',
    title: 'Title',
    reportsTo: '',
    department: '',
    email: '',
    phone: '',
    location: '',
    imageDataUrl: null,
    nodeColor: '#14B8A6',
    offsetX: 0,
    offsetY: 0,
    sectionTitle: '',
    ...overrides,
  }
}

// ── Connector type defaults ─────────────────────────────────

export function createDefaultConnectorTypes(): ConnectorType[] {
  return [
    // #9ca3af (tailwind gray-400) reads clearly on both dark and light
    // backgrounds. Existing JSON saves keep whatever color they stored, so
    // this only affects fresh diagrams and explicit reset-to-default actions.
    { id: 'primary',      label: 'Reports to',   color: '#9ca3af', style: 'solid',  lineWidth: 1.5 },
    { id: 'dotted-line',  label: 'Dotted-line',  color: '#60a5fa', style: 'dashed', lineWidth: 1.75 },
    { id: 'supports',     label: 'Supports',     color: '#fbbf24', style: 'dotted', lineWidth: 1.75 },
    { id: 'collaborates', label: 'Collaborates', color: '#a78bfa', style: 'double', lineWidth: 2 },
  ]
}

export function createDefaultLegend(): LegendConfig {
  return { position: 'bottom-right' }
}

/** Repairs a potentially malformed connectorTypes array. Always returns exactly 4 types in stable order.
 *  Missing ids get defaults; extra/unknown ids are dropped; malformed entries are replaced with defaults. */
export function mergeWithDefaults(partial: unknown): ConnectorType[] {
  const defaults = createDefaultConnectorTypes()
  if (!Array.isArray(partial)) return defaults

  const byId = new Map<ConnectorTypeId, ConnectorType>()
  for (const item of partial) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const id = candidate.id
    if (id !== 'primary' && id !== 'dotted-line' && id !== 'supports' && id !== 'collaborates') continue

    const defaultForId = defaults.find(d => d.id === id)
    if (!defaultForId) continue

    byId.set(id, {
      id,
      label: typeof candidate.label === 'string' && candidate.label.trim().length > 0
        ? candidate.label.slice(0, 40)
        : defaultForId.label,
      color: typeof candidate.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(candidate.color)
        ? candidate.color
        : defaultForId.color,
      style: defaultForId.style,       // fixed, never repaired from input
      lineWidth: defaultForId.lineWidth, // fixed
    })
  }

  // Assemble in stable order, filling missing entries from defaults
  return defaults.map(d => byId.get(d.id) ?? d)
}

/** Safe lookup with fallback to built-in defaults. */
export function getConnectorType(
  types: ConnectorType[],
  id: ConnectorTypeId,
): ConnectorType {
  const match = types.find(t => t.id === id)
  if (match) return match
  const fallback = createDefaultConnectorTypes().find(t => t.id === id)
  if (!fallback) throw new Error(`Unknown connector type id: ${id}`)
  return fallback
}
