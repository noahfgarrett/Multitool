import type { ShapeType, Point, NodeStyle } from './types.ts'

// ── Shape categories ───────────────────────────────────────

export type ShapeCategory =
  | 'basic'
  | 'flowchart'
  | 'containers'
  | 'misc'
  | 'pid-vessels'
  | 'pid-rotating'
  | 'pid-heat'
  | 'pid-valves'
  | 'pid-instruments'
  | 'pid-piping'
  | 'pid-misc'

// ── Shape definition ────────────────────────────────────────

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

  // ════════════════════════════════════════════════════════════
  // P&ID SYMBOL LIBRARY  (ISA-5.1 / ISO 14617 conventions)
  // ════════════════════════════════════════════════════════════

  // ── Vessels & Tanks ──────────────────────────────────────

  {
    type: 'pid-horizontal-vessel',
    label: 'Horiz. Vessel',
    category: 'pid-vessels',
    defaultWidth: 140,
    defaultHeight: 70,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const r = h / 2
      return [
        `M ${r} 0 H ${w - r}`,
        `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
        `H ${r}`,
        `A ${r} ${r} 0 0 1 ${r} 0 Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-vertical-vessel',
    label: 'Vert. Vessel',
    category: 'pid-vessels',
    defaultWidth: 60,
    defaultHeight: 120,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const r = w / 2
      return [
        `M 0 ${r}`,
        `A ${r} ${r} 0 0 1 ${w} ${r}`,
        `V ${h - r}`,
        `A ${r} ${r} 0 0 1 0 ${h - r}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-open-tank',
    label: 'Open Tank',
    category: 'pid-vessels',
    defaultWidth: 80,
    defaultHeight: 70,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Open-top trapezoid tank
      const inset = w * 0.1
      return `M 0 0 L ${inset} ${h} H ${w - inset} L ${w} 0`
    },
  },
  {
    type: 'pid-closed-tank',
    label: 'Closed Tank',
    category: 'pid-vessels',
    defaultWidth: 80,
    defaultHeight: 90,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Rectangle body with domed top
      const domeH = h * 0.15
      return [
        `M 0 ${domeH}`,
        `Q ${w / 2} ${-domeH * 0.3} ${w} ${domeH}`,
        `V ${h}`,
        `H 0 Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-column',
    label: 'Column / Tower',
    category: 'pid-vessels',
    defaultWidth: 50,
    defaultHeight: 140,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const r = w / 2
      // Tall column with hemispherical caps and internal tray lines
      return [
        `M 0 ${r}`,
        `A ${r} ${r} 0 0 1 ${w} ${r}`,
        `V ${h - r}`,
        `A ${r} ${r} 0 0 1 0 ${h - r}`,
        `Z`,
        // Internal tray lines (decorative)
        `M 0 ${h * 0.3} H ${w}`,
        `M 0 ${h * 0.5} H ${w}`,
        `M 0 ${h * 0.7} H ${w}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-reactor',
    label: 'Reactor',
    category: 'pid-vessels',
    defaultWidth: 70,
    defaultHeight: 100,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Vertical vessel with agitator symbol inside
      const r = w / 2
      return [
        `M 0 ${r}`,
        `A ${r} ${r} 0 0 1 ${w} ${r}`,
        `V ${h - r}`,
        `A ${r} ${r} 0 0 1 0 ${h - r}`,
        `Z`,
        // Agitator shaft + blade
        `M ${w / 2} ${r * 0.5} V ${h * 0.65}`,
        `M ${w * 0.3} ${h * 0.55} L ${w * 0.7} ${h * 0.65}`,
        `M ${w * 0.3} ${h * 0.65} L ${w * 0.7} ${h * 0.55}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-drum',
    label: 'Drum',
    category: 'pid-vessels',
    defaultWidth: 60,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      const ry = h * 0.1
      return [
        `M 0 ${ry}`,
        `A ${w / 2} ${ry} 0 0 1 ${w} ${ry}`,
        `V ${h - ry}`,
        `A ${w / 2} ${ry} 0 0 1 0 ${h - ry}`,
        `Z`,
        `M 0 ${ry}`,
        `A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`,
      ].join(' ')
    },
  },

  // ── Rotating Equipment ───────────────────────────────────

  {
    type: 'pid-centrifugal-pump',
    label: 'Centrif. Pump',
    category: 'pid-rotating',
    defaultWidth: 70,
    defaultHeight: 70,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.3 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Circle with discharge nozzle (triangle) pointing right-up
      const cx = w * 0.4, cy = h / 2, r = Math.min(w, h) * 0.4
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Discharge nozzle triangle
        `M ${cx + r * 0.5} ${cy - r * 0.5}`,
        `L ${w} ${h * 0.15}`,
        `L ${w} ${h * 0.45}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-pd-pump',
    label: 'PD Pump',
    category: 'pid-rotating',
    defaultWidth: 70,
    defaultHeight: 70,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.3 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Circle with discharge nozzle + internal cross for PD
      const cx = w * 0.4, cy = h / 2, r = Math.min(w, h) * 0.4
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Discharge nozzle
        `M ${cx + r * 0.5} ${cy - r * 0.5}`,
        `L ${w} ${h * 0.15}`,
        `L ${w} ${h * 0.45}`,
        `Z`,
        // Internal "+" for positive displacement
        `M ${cx - r * 0.4} ${cy} H ${cx + r * 0.4}`,
        `M ${cx} ${cy - r * 0.4} V ${cy + r * 0.4}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-compressor',
    label: 'Compressor',
    category: 'pid-rotating',
    defaultWidth: 80,
    defaultHeight: 60,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.25 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Trapezoid (narrowing to right) — ISA compressor symbol
      return `M 0 0 L ${w} ${h * 0.25} V ${h * 0.75} L 0 ${h} Z`
    },
  },
  {
    type: 'pid-fan',
    label: 'Fan / Blower',
    category: 'pid-rotating',
    defaultWidth: 70,
    defaultHeight: 70,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Circle with a tangent line (snail shell style)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Tangent line upward (blower discharge)
        `M ${cx + r} ${cy} L ${w} 0`,
      ].join(' ')
    },
  },
  {
    type: 'pid-turbine',
    label: 'Turbine',
    category: 'pid-rotating',
    defaultWidth: 80,
    defaultHeight: 60,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h * 0.25 },
    }),
    svgPath: (w, h) => {
      // Reverse trapezoid (expanding to right)
      return `M 0 ${h * 0.25} L ${w} 0 V ${h} L 0 ${h * 0.75} Z`
    },
  },
  {
    type: 'pid-motor',
    label: 'Motor',
    category: 'pid-rotating',
    defaultWidth: 70,
    defaultHeight: 70,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Circle with "M" inside
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.45
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
      ].join(' ')
    },
  },

  // ── Heat Transfer ────────────────────────────────────────

  {
    type: 'pid-shell-tube-hx',
    label: 'Shell & Tube HX',
    category: 'pid-heat',
    defaultWidth: 120,
    defaultHeight: 60,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Circle (shell) with lines through it (tubes)
      const cx = w / 2, cy = h / 2, r = h * 0.45
      return [
        // Shell circle
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Inlet / outlet lines (horizontal through shell)
        `M 0 ${cy} H ${cx - r}`,
        `M ${cx + r} ${cy} H ${w}`,
        // Internal tube lines
        `M ${cx - r * 0.6} ${cy - r * 0.3} H ${cx + r * 0.6}`,
        `M ${cx - r * 0.6} ${cy + r * 0.3} H ${cx + r * 0.6}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-plate-hx',
    label: 'Plate HX',
    category: 'pid-heat',
    defaultWidth: 80,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Square rotated 45deg (diamond) with lines
      const cx = w / 2, cy = h / 2, s = Math.min(w, h) * 0.45
      return [
        `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`,
        // Internal chevron lines
        `M ${cx - s * 0.4} ${cy - s * 0.2} L ${cx} ${cy - s * 0.5} L ${cx + s * 0.4} ${cy - s * 0.2}`,
        `M ${cx - s * 0.4} ${cy + s * 0.2} L ${cx} ${cy - s * 0.1} L ${cx + s * 0.4} ${cy + s * 0.2}`,
        `M ${cx - s * 0.4} ${cy + s * 0.6} L ${cx} ${cy + s * 0.3} L ${cx + s * 0.4} ${cy + s * 0.6}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-air-cooler',
    label: 'Air Cooler',
    category: 'pid-heat',
    defaultWidth: 100,
    defaultHeight: 70,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Rectangle with triangular fins on top
      const bodyTop = h * 0.3
      const finW = w / 5
      const fins: string[] = []
      for (let i = 0; i < 5; i++) {
        const x = i * finW
        fins.push(`M ${x} ${bodyTop} L ${x + finW / 2} 0 L ${x + finW} ${bodyTop}`)
      }
      return [
        // Body
        `M 0 ${bodyTop} H ${w} V ${h} H 0 Z`,
        // Fins
        ...fins,
      ].join(' ')
    },
  },
  {
    type: 'pid-condenser',
    label: 'Condenser',
    category: 'pid-heat',
    defaultWidth: 120,
    defaultHeight: 60,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Shell & tube style with wavy internal lines for condensation
      const cx = w / 2, cy = h / 2, r = h * 0.45
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Inlet/outlet
        `M 0 ${cy} H ${cx - r}`,
        `M ${cx + r} ${cy} H ${w}`,
        // Wavy lines inside
        `M ${cx - r * 0.5} ${cy - r * 0.3}`,
        `Q ${cx - r * 0.25} ${cy - r * 0.5} ${cx} ${cy - r * 0.3}`,
        `Q ${cx + r * 0.25} ${cy - r * 0.1} ${cx + r * 0.5} ${cy - r * 0.3}`,
        `M ${cx - r * 0.5} ${cy + r * 0.3}`,
        `Q ${cx - r * 0.25} ${cy + r * 0.1} ${cx} ${cy + r * 0.3}`,
        `Q ${cx + r * 0.25} ${cy + r * 0.5} ${cx + r * 0.5} ${cy + r * 0.3}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-boiler',
    label: 'Boiler',
    category: 'pid-heat',
    defaultWidth: 80,
    defaultHeight: 100,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Rectangular body with flame symbol at bottom
      const flameY = h * 0.7
      return [
        `M 0 0 H ${w} V ${h} H 0 Z`,
        // Flame zigzag at bottom
        `M ${w * 0.15} ${h}`,
        `L ${w * 0.25} ${flameY}`,
        `L ${w * 0.35} ${h}`,
        `L ${w * 0.45} ${flameY}`,
        `L ${w * 0.55} ${h}`,
        `L ${w * 0.65} ${flameY}`,
        `L ${w * 0.75} ${h}`,
        `L ${w * 0.85} ${flameY}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-furnace',
    label: 'Furnace / Heater',
    category: 'pid-heat',
    defaultWidth: 90,
    defaultHeight: 90,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Box with internal coil (zigzag)
      return [
        `M 0 0 H ${w} V ${h} H 0 Z`,
        // Internal coil — horizontal zigzag
        `M ${w * 0.15} ${h * 0.25}`,
        `H ${w * 0.85}`,
        `V ${h * 0.4}`,
        `H ${w * 0.15}`,
        `V ${h * 0.55}`,
        `H ${w * 0.85}`,
        `V ${h * 0.7}`,
        `H ${w * 0.15}`,
      ].join(' ')
    },
  },

  // ── Valves ───────────────────────────────────────────────

  {
    type: 'pid-gate-valve',
    label: 'Gate Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Two opposing triangles (bowtie) — ISA gate valve symbol
      const cy = h / 2
      return [
        // Left triangle
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        // Right triangle
        `M ${w} 0 L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Stem line
        `M ${w / 2} 0 V ${-h * 0.15}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-globe-valve',
    label: 'Globe Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      const r = Math.min(w, h) * 0.2
      return [
        // Bowtie
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} 0 L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Small circle at center (globe indicator)
        `M ${w / 2 + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${w / 2 - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${w / 2 + r} ${cy}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-ball-valve',
    label: 'Ball Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      const r = Math.min(w, h) * 0.28
      return [
        // Bowtie
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} 0 L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Filled circle at center (ball)
        `M ${w / 2 + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${w / 2 - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${w / 2 + r} ${cy}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-butterfly-valve',
    label: 'Butterfly Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      return [
        // Bowtie
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} 0 L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Vertical line through center (disc)
        `M ${w / 2} 0 V ${h}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-check-valve',
    label: 'Check Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      return [
        // Left triangle only
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        // Right vertical line (stop plate)
        `M ${w / 2} 0 V ${h}`,
        // Flow direction arrow line
        `M ${w / 2} ${cy} H ${w}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-control-valve',
    label: 'Control Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.6 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h * 0.6 },
    }),
    svgPath: (w, h) => {
      const bodyH = h * 0.6
      const bodyY = h - bodyH
      const cy = bodyY + bodyH / 2
      return [
        // Bowtie (in lower portion)
        `M 0 ${bodyY} L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} ${bodyY} L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Actuator stem + diaphragm on top
        `M ${w / 2} ${bodyY} V 0`,
        `M ${w * 0.2} 0 H ${w * 0.8}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-relief-valve',
    label: 'Relief / Safety',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.6 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h * 0.6 },
    }),
    svgPath: (w, h) => {
      const bodyH = h * 0.6
      const bodyY = h - bodyH
      const cy = bodyY + bodyH / 2
      return [
        // Angular body (right-angle symbol)
        `M 0 ${bodyY} L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} ${bodyY} L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Spring zigzag on top
        `M ${w / 2} ${bodyY}`,
        `L ${w * 0.35} ${bodyY * 0.75}`,
        `L ${w * 0.65} ${bodyY * 0.5}`,
        `L ${w * 0.35} ${bodyY * 0.25}`,
        `L ${w * 0.65} 0`,
      ].join(' ')
    },
  },
  {
    type: 'pid-solenoid-valve',
    label: 'Solenoid Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.6 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h * 0.6 },
    }),
    svgPath: (w, h) => {
      const bodyH = h * 0.6
      const bodyY = h - bodyH
      const cy = bodyY + bodyH / 2
      return [
        // Bowtie
        `M 0 ${bodyY} L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} ${bodyY} L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Solenoid box on top
        `M ${w * 0.25} 0 H ${w * 0.75} V ${bodyY} H ${w * 0.25} Z`,
        // Lightning bolt
        `M ${w * 0.45} ${bodyY * 0.2}`,
        `L ${w * 0.4} ${bodyY * 0.55}`,
        `H ${w * 0.55}`,
        `L ${w * 0.5} ${bodyY * 0.85}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-3way-valve',
    label: '3-Way Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      return [
        // Bowtie (horizontal)
        `M 0 ${h * 0.15} L ${w / 2} ${cy} L 0 ${h * 0.85} Z`,
        `M ${w} ${h * 0.15} L ${w / 2} ${cy} L ${w} ${h * 0.85} Z`,
        // Third port (bottom)
        `M ${w / 2} ${cy} V ${h}`,
        `M ${w * 0.3} ${h} H ${w * 0.7}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-plug-valve',
    label: 'Plug Valve',
    category: 'pid-valves',
    defaultWidth: 50,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      const cy = h / 2
      return [
        // Bowtie
        `M 0 0 L ${w / 2} ${cy} L 0 ${h} Z`,
        `M ${w} 0 L ${w / 2} ${cy} L ${w} ${h} Z`,
        // Rectangle at center (plug)
        `M ${w * 0.35} ${h * 0.2} H ${w * 0.65} V ${h * 0.8} H ${w * 0.35} Z`,
      ].join(' ')
    },
  },

  // ── Instruments ──────────────────────────────────────────

  {
    type: 'pid-indicator',
    label: 'Indicator',
    category: 'pid-instruments',
    defaultWidth: 60,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Circle with horizontal line through center (ISA instrument)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.45
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        // Horizontal divider
        `M ${cx - r} ${cy} H ${cx + r}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-transmitter',
    label: 'Transmitter',
    category: 'pid-instruments',
    defaultWidth: 60,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Circle with horizontal line — dashed outline indicates field-mounted
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.45
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        `M ${cx - r} ${cy} H ${cx + r}`,
        // Small "T" indicator lines at bottom
        `M ${cx} ${cy + r} V ${h}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-controller',
    label: 'Controller',
    category: 'pid-instruments',
    defaultWidth: 60,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Square with horizontal line (control room mounted)
      const pad = Math.min(w, h) * 0.08
      return [
        `M ${pad} ${pad} H ${w - pad} V ${h - pad} H ${pad} Z`,
        // Horizontal divider
        `M ${pad} ${h / 2} H ${w - pad}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-recorder',
    label: 'Recorder',
    category: 'pid-instruments',
    defaultWidth: 60,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Circle with horizontal line + small arrow tip inside bottom half
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.45
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
        `M ${cx - r} ${cy} H ${cx + r}`,
        // Pen symbol (small triangle pointing down)
        `M ${cx - r * 0.2} ${cy + r * 0.2}`,
        `L ${cx} ${cy + r * 0.7}`,
        `L ${cx + r * 0.2} ${cy + r * 0.2}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-sensor',
    label: 'Sensor',
    category: 'pid-instruments',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Small filled circle (primary element)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35
      return [
        `M ${cx + r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
        `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-flow-element',
    label: 'Flow Element',
    category: 'pid-instruments',
    defaultWidth: 60,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Orifice plate — two opposing triangles meeting at center line
      const cy = h / 2
      return [
        `M 0 0 V ${h}`,
        `M 0 ${cy} H ${w}`,
        `M ${w} 0 V ${h}`,
        // Restriction symbol (converging lines)
        `M ${w * 0.15} 0 L ${w / 2} ${cy} L ${w * 0.15} ${h}`,
        `M ${w * 0.85} 0 L ${w / 2} ${cy} L ${w * 0.85} ${h}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-level-gauge',
    label: 'Level Gauge',
    category: 'pid-instruments',
    defaultWidth: 30,
    defaultHeight: 70,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Thin rectangle with level indicator lines
      return [
        `M 0 0 H ${w} V ${h} H 0 Z`,
        // Level marks
        `M 0 ${h * 0.25} H ${w * 0.3}`,
        `M 0 ${h * 0.5} H ${w * 0.3}`,
        `M 0 ${h * 0.75} H ${w * 0.3}`,
        // Fill indication (wavy line at 60%)
        `M 0 ${h * 0.6} H ${w}`,
      ].join(' ')
    },
  },

  // ── Piping ───────────────────────────────────────────────

  {
    type: 'pid-reducer',
    label: 'Reducer',
    category: 'pid-piping',
    defaultWidth: 60,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Trapezoid narrowing from left to right
      const inset = h * 0.2
      return `M 0 0 L ${w} ${inset} V ${h - inset} L 0 ${h} Z`
    },
  },
  {
    type: 'pid-tee',
    label: 'Tee',
    category: 'pid-piping',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // T-shaped pipe fitting
      const t = Math.min(w, h) * 0.2 // pipe thickness
      const cy = h / 2
      return [
        // Horizontal pipe
        `M 0 ${cy - t} H ${w} V ${cy + t} H 0 Z`,
        // Vertical branch (upward)
        `M ${w / 2 - t} 0 H ${w / 2 + t} V ${cy - t} H ${w / 2 - t} Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-elbow',
    label: 'Elbow',
    category: 'pid-piping',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // 90-degree elbow (L-shaped with rounded corner)
      const t = Math.min(w, h) * 0.2
      return [
        `M ${w / 2 - t} 0`,
        `V ${h / 2 - t}`,
        `Q ${w / 2 - t} ${h / 2 + t} ${w / 2 + t} ${h / 2 + t}`,
        `H ${w}`,
        `V ${h / 2 - t}`,
        `H ${w / 2 + t}`,
        `Q ${w / 2 + t} ${h / 2 - t} ${w / 2 + t} ${h / 2 - t}`,
        `V 0`,
        `Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-cap',
    label: 'Cap / Blind',
    category: 'pid-piping',
    defaultWidth: 40,
    defaultHeight: 40,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Semicircle cap
      const r = w / 2
      return [
        `M 0 ${h / 2} V 0`,
        `A ${r} ${r} 0 0 1 ${w} 0`,
        `V ${h / 2}`,
        `H 0 Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-flange',
    label: 'Flange',
    category: 'pid-piping',
    defaultWidth: 40,
    defaultHeight: 50,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Two parallel lines with perpendicular bolt lines
      const cx = w / 2
      const gap = w * 0.15
      return [
        // Left flange face
        `M ${cx - gap} 0 V ${h}`,
        // Right flange face
        `M ${cx + gap} 0 V ${h}`,
        // Bolt lines (horizontal connecting)
        `M ${cx - gap} ${h * 0.2} H ${cx + gap}`,
        `M ${cx - gap} ${h * 0.5} H ${cx + gap}`,
        `M ${cx - gap} ${h * 0.8} H ${cx + gap}`,
        // Extended pipe stubs
        `M 0 ${h * 0.35} H ${cx - gap}`,
        `M 0 ${h * 0.65} H ${cx - gap}`,
        `M ${cx + gap} ${h * 0.35} H ${w}`,
        `M ${cx + gap} ${h * 0.65} H ${w}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-strainer',
    label: 'Strainer / Filter',
    category: 'pid-piping',
    defaultWidth: 60,
    defaultHeight: 60,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Y-shaped strainer body
      const cx = w / 2, cy = h / 2
      return [
        // Y-body: top-left to center, top-right to center, center down
        `M 0 0 L ${cx} ${cy}`,
        `M ${w} 0 L ${cx} ${cy}`,
        `M ${cx} ${cy} V ${h}`,
        // Screen element (small rectangle across the branch)
        `M ${cx - w * 0.2} ${h * 0.65} H ${cx + w * 0.2}`,
        // Basket outline
        `M ${cx - w * 0.25} ${h * 0.7}`,
        `V ${h * 0.9}`,
        `H ${cx + w * 0.25}`,
        `V ${h * 0.7}`,
      ].join(' ')
    },
  },

  // ── P&ID: Miscellaneous ──────────────────────────────────

  {
    type: 'pid-spray-nozzle',
    label: 'Spray Nozzle',
    category: 'pid-misc',
    defaultWidth: 50,
    defaultHeight: 50,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Inverted triangle (nozzle) with spray lines
      const cx = w / 2
      return [
        // Nozzle body
        `M ${cx - w * 0.15} 0 H ${cx + w * 0.15} L ${cx} ${h * 0.4} Z`,
        // Spray lines fanning out
        `M ${cx} ${h * 0.4} L ${w * 0.1} ${h}`,
        `M ${cx} ${h * 0.4} L ${w * 0.3} ${h * 0.9}`,
        `M ${cx} ${h * 0.4} L ${cx} ${h}`,
        `M ${cx} ${h * 0.4} L ${w * 0.7} ${h * 0.9}`,
        `M ${cx} ${h * 0.4} L ${w * 0.9} ${h}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-mixer',
    label: 'Mixer / Agitator',
    category: 'pid-misc',
    defaultWidth: 60,
    defaultHeight: 80,
    ports: standardPorts,
    svgPath: (w, h) => {
      // Vessel outline with agitator inside
      const cx = w / 2
      return [
        // Tank outline
        `M 0 ${h * 0.15} H ${w} V ${h} H 0 Z`,
        // Agitator shaft
        `M ${cx} 0 V ${h * 0.65}`,
        // Impeller blades (X pattern)
        `M ${w * 0.2} ${h * 0.55} L ${w * 0.8} ${h * 0.65}`,
        `M ${w * 0.2} ${h * 0.65} L ${w * 0.8} ${h * 0.55}`,
        // Motor symbol (small rectangle on top)
        `M ${cx - w * 0.15} 0 H ${cx + w * 0.15} V ${h * 0.1} H ${cx - w * 0.15} Z`,
      ].join(' ')
    },
  },
  {
    type: 'pid-cyclone',
    label: 'Cyclone',
    category: 'pid-misc',
    defaultWidth: 60,
    defaultHeight: 100,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h * 0.2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h * 0.2 },
    }),
    svgPath: (w, h) => {
      // Cone shape with tangential inlet
      return [
        // Main cone body
        `M 0 0 H ${w} L ${w / 2 + 5} ${h} H ${w / 2 - 5} Z`,
        // Top outlet (vortex finder)
        `M ${w * 0.35} 0 V ${-h * 0.1}`,
        `M ${w * 0.65} 0 V ${-h * 0.1}`,
        `M ${w * 0.35} ${-h * 0.1} H ${w * 0.65}`,
      ].join(' ')
    },
  },
  {
    type: 'pid-conveyor',
    label: 'Conveyor',
    category: 'pid-misc',
    defaultWidth: 140,
    defaultHeight: 40,
    ports: (w, h) => ({
      top: { x: w / 2, y: 0 },
      right: { x: w, y: h / 2 },
      bottom: { x: w / 2, y: h },
      left: { x: 0, y: h / 2 },
    }),
    svgPath: (w, h) => {
      // Two circles connected by lines (belt conveyor)
      const r = h * 0.35
      const cy = h / 2
      return [
        // Left drum
        `M ${r} ${cy + r}`,
        `A ${r} ${r} 0 1 1 ${r} ${cy - r}`,
        `A ${r} ${r} 0 1 1 ${r} ${cy + r}`,
        `Z`,
        // Right drum
        `M ${w - r} ${cy + r}`,
        `A ${r} ${r} 0 1 1 ${w - r} ${cy - r}`,
        `A ${r} ${r} 0 1 1 ${w - r} ${cy + r}`,
        `Z`,
        // Belt lines (top and bottom)
        `M ${r} ${cy - r} H ${w - r}`,
        `M ${r} ${cy + r} H ${w - r}`,
        // Arrow direction
        `M ${w * 0.45} ${cy - r - 2} L ${w * 0.55} ${cy - r - 2}`,
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
  node: { x: number; y: number; width: number; height: number; type: ShapeType },
  port: 'top' | 'right' | 'bottom' | 'left',
): Point {
  const def = getShapeDef(node.type)
  const relative = def.ports(node.width, node.height)[port]
  return { x: node.x + relative.x, y: node.y + relative.y }
}
