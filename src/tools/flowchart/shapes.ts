import type { ShapeType, Point, NodeStyle } from './types.ts'

// ── Shape definition ────────────────────────────────────────

export type ShapeCategory = 'basic' | 'flowchart' | 'misc' | 'containers'

export interface ShapeDef {
  type: ShapeType
  label: string
  category: ShapeCategory
  defaultWidth: number
  defaultHeight: number
  /** Default style overrides (merged with DEFAULT_NODE_STYLE) */
  styleOverrides?: Partial<NodeStyle>
  /** Port positions relative to node center (0,0) for a given width/height */
  ports: (w: number, h: number) => Record<'top' | 'right' | 'bottom' | 'left', Point>
  /** SVG path or element render data relative to (0,0) top-left corner */
  svgPath: (w: number, h: number) => string
}

// ── Shared port calculator ──────────────────────────────────

function standardPorts(w: number, h: number) {
  return {
    top:    { x: w / 2, y: 0 },
    right:  { x: w, y: h / 2 },
    bottom: { x: w / 2, y: h },
    left:   { x: 0, y: h / 2 },
  }
}

// ── Shape registry ──────────────────────────────────────────

export const SHAPE_DEFS: ShapeDef[] = [
  // ── Basic ─────────────────────────────────────────
  {
    type: 'rectangle',
    label: 'Rectangle',
    category: 'basic',
    defaultWidth: 160,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => `M 0 0 H ${w} V ${h} H 0 Z`,
  },
  {
    type: 'rounded-rectangle',
    label: 'Rounded Rect',
    category: 'basic',
    defaultWidth: 160,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      const r = Math.min(10, w / 4, h / 4)
      return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`
    },
  },
  {
    type: 'circle',
    label: 'Circle',
    category: 'basic',
    defaultWidth: 80,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const rx = w / 2, ry = h / 2
      return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`
    },
  },

  // ── Flowchart ─────────────────────────────────────
  {
    type: 'diamond',
    label: 'Diamond',
    category: 'flowchart',
    defaultWidth: 140,
    defaultHeight: 90,
    ports: standardPorts,
    svgPath: (w, h) => `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`,
  },
  {
    type: 'pill',
    label: 'Pill / Terminal',
    category: 'flowchart',
    defaultWidth: 160,
    defaultHeight: 50,
    ports: standardPorts,
    svgPath: (w, h) => {
      const r = h / 2
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
    },
  },
  {
    type: 'parallelogram',
    label: 'Parallelogram',
    category: 'flowchart',
    defaultWidth: 160,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      const skew = w * 0.15
      return `M ${skew} 0 H ${w} L ${w - skew} ${h} H 0 Z`
    },
  },
  {
    type: 'cylinder',
    label: 'Cylinder',
    category: 'flowchart',
    defaultWidth: 100,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const ry = h * 0.12
      // top ellipse + body + bottom ellipse
      return [
        `M 0 ${ry}`,
        `A ${w / 2} ${ry} 0 0 1 ${w} ${ry}`,
        `V ${h - ry}`,
        `A ${w / 2} ${ry} 0 0 1 0 ${h - ry}`,
        `Z`,
        // top cap (drawn separately as full ellipse)
        `M 0 ${ry}`,
        `A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`,
      ].join(' ')
    },
  },

  // ── Additional Flowchart (ISO 5807) — Agent A ─────
  {
    type: 'document-shape',
    label: 'Document',
    category: 'flowchart',
    defaultWidth: 140,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const wave = h * 0.15
      return `M 0 0 H ${w} V ${h - wave} C ${w * 0.75} ${h - wave * 2}, ${w * 0.25} ${h}, 0 ${h - wave} Z`
    },
  },
  {
    type: 'predefined-process',
    label: 'Predefined Process',
    category: 'flowchart',
    defaultWidth: 160,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      const inset = w * 0.1
      // Outer rectangle + two inner vertical lines
      return [
        `M 0 0 H ${w} V ${h} H 0 Z`,
        `M ${inset} 0 V ${h}`,
        `M ${w - inset} 0 V ${h}`,
      ].join(' ')
    },
  },
  {
    type: 'manual-operation',
    label: 'Manual Operation',
    category: 'flowchart',
    defaultWidth: 140,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      const inset = w * 0.15
      // Trapezoid wider at top
      return `M 0 0 H ${w} L ${w - inset} ${h} H ${inset} Z`
    },
  },
  {
    type: 'manual-input',
    label: 'Manual Input',
    category: 'flowchart',
    defaultWidth: 140,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      const slope = h * 0.25
      // Flat bottom, angled top-left
      return `M 0 ${slope} L ${w} 0 V ${h} H 0 Z`
    },
  },
  {
    type: 'delay',
    label: 'Delay',
    category: 'flowchart',
    defaultWidth: 120,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // D-shape: flat left, rounded right (half-pill)
      const r = h / 2
      return `M 0 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H 0 Z`
    },
  },
  {
    type: 'on-page-ref',
    label: 'On-Page Ref',
    category: 'flowchart',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Small circle
      const rx = w / 2, ry = h / 2
      return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${h} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`
    },
  },
  {
    type: 'off-page-ref',
    label: 'Off-Page Ref',
    category: 'flowchart',
    defaultWidth: 80,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Pentagon / home-plate shape (house shape pointing down)
      const bodyH = h * 0.6
      return `M 0 0 H ${w} V ${bodyH} L ${w / 2} ${h} L 0 ${bodyH} Z`
    },
  },
  {
    type: 'stored-data',
    label: 'Stored Data',
    category: 'flowchart',
    defaultWidth: 120,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Cylinder-like open on left side
      const curve = w * 0.12
      return [
        `M ${curve} 0`,
        `H ${w}`,
        `C ${w - curve * 2} ${h * 0.15}, ${w - curve * 2} ${h * 0.85}, ${w} ${h}`,
        `H ${curve}`,
        `C ${curve * 2} ${h * 0.85}, ${curve * 2} ${h * 0.15}, ${curve} 0`,
        `Z`,
      ].join(' ')
    },
  },

  // ── Misc ──────────────────────────────────────────
  {
    type: 'triangle',
    label: 'Triangle',
    category: 'misc',
    defaultWidth: 100,
    defaultHeight: 90,
    ports: standardPorts,
    svgPath: (w, h) => `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`,
  },
  {
    type: 'hexagon',
    label: 'Hexagon',
    category: 'misc',
    defaultWidth: 140,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const inset = w * 0.2
      return `M ${inset} 0 H ${w - inset} L ${w} ${h / 2} L ${w - inset} ${h} H ${inset} L 0 ${h / 2} Z`
    },
  },
  {
    type: 'document',
    label: 'Document',
    category: 'misc',
    defaultWidth: 140,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const wave = h * 0.15
      return `M 0 0 H ${w} V ${h - wave} C ${w * 0.75} ${h - wave * 2}, ${w * 0.25} ${h}, 0 ${h - wave} Z`
    },
  },
  {
    type: 'cloud',
    label: 'Cloud',
    category: 'misc',
    defaultWidth: 160,
    defaultHeight: 100,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Approximation using cubic bezier arcs
      return [
        `M ${w * 0.25} ${h * 0.7}`,
        `C ${w * -0.05} ${h * 0.7}, ${w * -0.05} ${h * 0.3}, ${w * 0.2} ${h * 0.3}`,
        `C ${w * 0.15} ${h * 0.05}, ${w * 0.4} ${h * -0.05}, ${w / 2} ${h * 0.15}`,
        `C ${w * 0.6} ${h * -0.05}, ${w * 0.85} ${h * 0.05}, ${w * 0.8} ${h * 0.3}`,
        `C ${w * 1.05} ${h * 0.3}, ${w * 1.05} ${h * 0.7}, ${w * 0.75} ${h * 0.7}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'callout',
    label: 'Callout',
    category: 'misc',
    defaultWidth: 160,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const bodyH = h * 0.75
      const r = Math.min(8, w / 4, bodyH / 4)
      const tailW = w * 0.1
      const tailX = w * 0.2
      return [
        `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${bodyH - r} Q ${w} ${bodyH} ${w - r} ${bodyH}`,
        `H ${tailX + tailW}`,
        `L ${tailX} ${h}`,
        `L ${tailX} ${bodyH}`,
        `H ${r} Q 0 ${bodyH} 0 ${bodyH - r} V ${r} Q 0 0 ${r} 0 Z`,
      ].join(' ')
    },
  },
  {
    type: 'star',
    label: 'Star',
    category: 'misc',
    defaultWidth: 100,
    defaultHeight: 100,
    ports: standardPorts,
    svgPath: (w, h) => {
      const cx = w / 2, cy = h / 2
      const outerR = Math.min(w, h) / 2
      const innerR = outerR * 0.4
      const points: string[] = []
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5
        const innerAngle = outerAngle + Math.PI / 5
        points.push(`${cx + outerR * Math.cos(outerAngle)} ${cy + outerR * Math.sin(outerAngle)}`)
        points.push(`${cx + innerR * Math.cos(innerAngle)} ${cy + innerR * Math.sin(innerAngle)}`)
      }
      return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`
    },
  },

  // ── Containers — Agent C ─────────────────────────
  {
    type: 'swim-lane',
    label: 'Swim Lane',
    category: 'containers',
    defaultWidth: 300,
    defaultHeight: 500,
    styleOverrides: {
      fill: 'rgba(59,130,246,0.04)',
      stroke: 'rgba(59,130,246,0.3)',
      strokeWidth: 1.5,
      fontSize: 14,
    },
    ports: standardPorts,
    svgPath: (w, h) => {
      // Rectangle body with a header band at the top (40px tall)
      const headerH = 40
      return [
        `M 0 0 H ${w} V ${h} H 0 Z`,
        `M 0 ${headerH} H ${w}`,
      ].join(' ')
    },
  },
]

// ── Lookup helpers ──────────────────────────────────────────

const SHAPE_MAP = new Map(SHAPE_DEFS.map(d => [d.type, d]))

export function getShapeDef(type: ShapeType): ShapeDef {
  return SHAPE_MAP.get(type) || SHAPE_DEFS[0]
}

export function getPortPosition(
  node: { x: number; y: number; width: number; height: number; type: ShapeType; rotation?: number },
  port: 'top' | 'right' | 'bottom' | 'left',
): Point {
  const def = getShapeDef(node.type)
  const relative = def.ports(node.width, node.height)[port]
  const rotation = node.rotation ?? 0

  if (rotation === 0) {
    return { x: node.x + relative.x, y: node.y + relative.y }
  }

  // Rotate the port position around the node center
  const cx = node.width / 2
  const cy = node.height / 2
  const dx = relative.x - cx
  const dy = relative.y - cy
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return {
    x: node.x + cx + dx * cos - dy * sin,
    y: node.y + cy + dx * sin + dy * cos,
  }
}
