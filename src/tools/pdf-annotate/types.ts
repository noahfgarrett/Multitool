import { StandardFonts } from 'pdf-lib'
import {
  Pencil, Highlighter, Square, Circle, ArrowUpRight, Minus, Type,
  Cloud, Pentagon, MessageSquare, ImagePlus,
} from 'lucide-react'

// ── Core Types ──────────────────────────────────────────

export type ToolType = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'eraser' | 'cloud' | 'polygon' | 'callout' | 'measure' | 'textHighlight' | 'textStrikethrough' | 'stamp' | 'imageStamp' | 'crop' | 'note' | 'ocrRegion'

export interface Point { x: number; y: number }

export interface Annotation {
  id: string
  type: Exclude<ToolType, 'select' | 'eraser' | 'measure' | 'textHighlight' | 'textStrikethrough' | 'crop' | 'note'>
  points: Point[]
  color: string
  strokeWidth: number
  opacity: number
  text?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  backgroundColor?: string
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  width?: number   // textbox width (doc space) — text & callout
  height?: number  // textbox height (doc space) — text & callout
  arrows?: Point[] // callout only: arrow tip positions
  smooth?: boolean // false = straight segments (eraser fragments from shapes)
  rects?: { x: number; y: number; w: number; h: number }[] // text highlight rectangles
  fillColor?: string // fill color for shapes (rectangle, circle, cloud)
  cornerRadius?: number // rounded rectangle corner radius
  dashPattern?: 'solid' | 'dashed' | 'dotted' // stroke dash pattern
  arrowStart?: boolean // arrow at start point (for arrow/line tool)
  superscript?: boolean
  subscript?: boolean
  listType?: 'none' | 'bullet' | 'numbered'
  stampType?: string
  imageDataUrl?: string  // imageStamp: embedded image as data URL
  layerId?: string       // annotation layer assignment
  pressure?: number[]    // per-point pressure data for freehand (0-1)
  rotation?: number      // cumulative rotation in degrees (for text/callout — rotates content, not just position)
}

export type PageAnnotations = Record<number, Annotation[]>

/** Annotation layer for organizing and toggling visibility */
export interface AnnotationLayer {
  id: string
  name: string
  visible: boolean
  color: string
}

/** @legacy Used by existing 2-point distance measurement code. See PolyMeasurement for expanded modes. */
export interface Measurement {
  id: string
  startPt: Point
  endPt: Point
  page: number
}

// ── Expanded Measurement Types ──────────────────────

/** Measurement modes for the expanded measurement dropdown */
export type MeasureMode = 'distance' | 'polylength' | 'area' | 'count'

/** Expanded measurement type (supports distance, polylength, area, and count) */
export interface PolyMeasurement {
  id: string
  mode: MeasureMode
  points: Point[]  // For distance: 2 points. For polylength/area: N points
  page: number
  label?: string   // User-defined label (especially for count groups)
  closed?: boolean // For area: whether the polygon is closed
  depth?: number   // For volume: depth multiplier (area × depth = volume)
}

/** Count group for the count tool */
export interface CountGroup {
  id: string
  label: string   // e.g., "Doors", "Outlets"
  color: string   // Marker color
  points: Point[] // Each click location
  page: number
}

/** Measurement export row for CSV */
export interface MeasurementExportRow {
  page: number
  type: string  // 'distance' | 'polylength' | 'area' | 'perimeter' | 'count'
  label: string
  value: number
  unit: string
}

// ── Comment & Review Types ──────────────────────────

/** Comment status for annotations and sticky notes */
export type CommentStatus = 'none' | 'open' | 'accepted' | 'rejected' | 'resolved'

export const COMMENT_STATUS_COLORS: Record<CommentStatus, string> = {
  none: '#6B7280',      // gray
  open: '#3B82F6',      // blue
  accepted: '#22C55E',  // green
  rejected: '#EF4444',  // red
  resolved: '#8B5CF6',  // purple
}

/** A single comment in a thread */
export interface Comment {
  id: string
  authorName: string
  authorInitials: string
  timestamp: number
  text: string
  parentId?: string // for threaded replies
}

/** Comment thread attached to any annotation or sticky note */
export interface CommentThread {
  annotationId: string // links to Annotation.id or StickyNote.id
  comments: Comment[]
  status: CommentStatus
}

/** Sticky note placed on the PDF */
export interface StickyNote {
  id: string
  point: Point
  page: number
  color: string
  text: string
  minimized: boolean
}

export const STICKY_NOTE_COLORS = ['#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA', '#FB923C']

// ── Export & Email Types ────────────────────────────

/** Export mode: review preserves metadata, final flattens permanently */
export type ExportMode = 'review' | 'final'

/** Email recipient */
export interface EmailRecipient {
  id: string
  name: string
  email: string
}

/** Named group of email recipients */
export interface EmailGroup {
  id: string
  name: string
  recipientIds: string[]
}

/** Full annotation data embedded in PDF metadata for "For Review" exports */
export interface EmbeddedAnnotationData {
  version: number
  annotations: Record<number, Annotation[]>
  measurements: Record<number, unknown[]>
  polyMeasurements: Record<number, unknown[]>
  countGroups: Record<number, unknown[]>
  commentThreads: CommentThread[]
  stickyNotes: Record<number, StickyNote[]>
  calibration: { pixelsPerUnit: number | null; unit: string }
  pageRotations: Record<number, number>
}

export interface CalibrationState {
  pixelsPerUnit: number | null
  unit: string
}

export type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w'

export interface PageRefs {
  pdfCanvas: HTMLCanvasElement
  annCanvas: HTMLCanvasElement
  activeCanvas: HTMLCanvasElement
  container: HTMLDivElement
}

// ── Constants ──────────────────────────────────────────

export const RENDER_SCALE = typeof window !== 'undefined' ? (window.devicePixelRatio || 1.5) : 1.5
export const MAX_HISTORY = 50
export const HANDLE_SIZE = 6
export const DEFAULT_TEXTBOX_W = 200
export const DEFAULT_TEXTBOX_H = 50
export const ANN_COLORS = ['#000000', '#FF0000', '#14B8A6', '#FFFF00', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF']
export const HIGHLIGHT_COLORS = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#14B8A6']

export const MEASURE_MODES: { mode: MeasureMode; label: string }[] = [
  { mode: 'distance', label: 'Distance' },
  { mode: 'polylength', label: 'Polylength' },
  { mode: 'area', label: 'Area / Perimeter' },
  { mode: 'count', label: 'Count' },
]
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0] as const

export type ToolDef = { type: ToolType; icon: React.ComponentType<{ size?: number }>; label: string }

export const DRAW_TOOLS: ToolDef[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil (P)' },
  { type: 'line', icon: Minus, label: 'Line (L)' },
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
  { type: 'rectangle', icon: Square, label: 'Rectangle (R)' },
  { type: 'circle', icon: Circle, label: 'Circle (C)' },
  { type: 'cloud', icon: Cloud, label: 'Cloud (K)' },
  { type: 'polygon', icon: Pentagon, label: 'Polygon (Shift+K)' },
]

export const TEXT_TOOLS: ToolDef[] = [
  { type: 'text', icon: Type, label: 'Text (T)' },
  { type: 'callout', icon: MessageSquare, label: 'Callout (O)' },
]

export const DRAW_TYPES = new Set(DRAW_TOOLS.map(s => s.type))
export const TEXT_TYPES = new Set(TEXT_TOOLS.map(s => s.type))

export const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Calibri',
  'Times New Roman', 'Georgia', 'Palatino', 'Garamond',
  'Courier New', 'Consolas', 'Monaco', 'Lucida Console',
  'Comic Sans MS', 'Impact',
]

export const PDF_FONT_MAP: Record<string, StandardFonts> = {
  'Arial': StandardFonts.Helvetica, 'Helvetica': StandardFonts.Helvetica,
  'Verdana': StandardFonts.Helvetica, 'Tahoma': StandardFonts.Helvetica,
  'Trebuchet MS': StandardFonts.Helvetica, 'Calibri': StandardFonts.Helvetica,
  'Times New Roman': StandardFonts.TimesRoman, 'Georgia': StandardFonts.TimesRoman,
  'Palatino': StandardFonts.TimesRoman, 'Garamond': StandardFonts.TimesRoman,
  'Courier New': StandardFonts.Courier, 'Consolas': StandardFonts.Courier,
  'Monaco': StandardFonts.Courier, 'Lucida Console': StandardFonts.Courier,
  'Comic Sans MS': StandardFonts.Helvetica, 'Impact': StandardFonts.Helvetica,
}

type FontVariantKey = 'regular' | 'bold' | 'italic' | 'boldItalic'

export const PDF_FONT_VARIANTS: Record<string, Record<FontVariantKey, StandardFonts>> = {
  helvetica: {
    regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  timesRoman: {
    regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  courier: {
    regular: StandardFonts.Courier, bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique,
  },
}

export const STAMP_PRESETS = [
  { label: 'APPROVED', color: '#16a34a', bg: '#f0fdf4' },
  { label: 'DRAFT', color: '#2563eb', bg: '#eff6ff' },
  { label: 'CONFIDENTIAL', color: '#dc2626', bg: '#fef2f2' },
  { label: 'REVIEWED', color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'VOID', color: '#ea580c', bg: '#fff7ed' },
  { label: 'FOR REVIEW', color: '#ca8a04', bg: '#fefce8' },
]

export const CURSOR_MAP: Record<ToolType, string> = {
  select: 'default', pencil: 'crosshair', highlighter: 'crosshair', line: 'crosshair',
  arrow: 'crosshair', rectangle: 'crosshair', circle: 'crosshair',
  cloud: 'crosshair', text: 'text', eraser: 'none',
  callout: 'crosshair', measure: 'crosshair', textHighlight: 'text', textStrikethrough: 'text',
  polygon: 'crosshair', stamp: 'crosshair', imageStamp: 'crosshair', crop: 'crosshair', note: 'crosshair', ocrRegion: 'crosshair',
}

export const HANDLE_CURSOR_MAP: Record<string, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}

export function genId() { return crypto.randomUUID() }

/** Parse a hex color string (#RRGGBB) to pdf-lib-compatible {r,g,b} (0-1 range) */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

// ── PDF font resolution ─────────────────────────────

export function resolvePdfFontFamily(ff: string): string {
  const base = PDF_FONT_MAP[ff] || StandardFonts.Helvetica
  if (base === StandardFonts.TimesRoman || base === StandardFonts.TimesRomanBold ||
      base === StandardFonts.TimesRomanItalic || base === StandardFonts.TimesRomanBoldItalic) return 'timesRoman'
  if (base === StandardFonts.Courier || base === StandardFonts.CourierBold ||
      base === StandardFonts.CourierOblique || base === StandardFonts.CourierBoldOblique) return 'courier'
  return 'helvetica'
}

export function resolvePdfFont(ff: string, bold: boolean, italic: boolean): StandardFonts {
  const family = resolvePdfFontFamily(ff)
  const key: FontVariantKey = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular'
  return PDF_FONT_VARIANTS[family][key]
}

// ── File System Access API typed wrapper ─────────────

interface PickerHandle {
  createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>
}
type PickerFn = (opts: {
  suggestedName: string
  types: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<PickerHandle>

export async function saveWithPicker(
  blob: Blob,
  suggestedName: string,
  fileType: { description: string; accept: Record<string, string[]> },
): Promise<'saved' | 'fallback' | 'cancelled'> {
  if (!('showSaveFilePicker' in window)) return 'fallback'
  try {
    const picker = (window as unknown as { showSaveFilePicker: PickerFn }).showSaveFilePicker
    const handle = await picker({ suggestedName, types: [fileType] })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    return 'fallback'
  }
}

// ── PDF coordinate transform for export ─────────────

export function toPdfCoords(p: Point, origW: number, origH: number, rotation: number): { x: number; y: number } {
  switch (((rotation % 360) + 360) % 360) {
    case 90:  return { x: p.y, y: p.x }
    case 180: return { x: origW - p.x, y: p.y }
    case 270: return { x: origW - p.y, y: origH - p.x }
    default:  return { x: p.x, y: origH - p.y }
  }
}
