/**
 * PDF Annotate sessionStorage persistence
 * Saves/restores annotation sessions across page refreshes.
 * All operations wrapped in try-catch for Safari private browsing / quota exceeded.
 */

const SESSION_KEY = 'mt-pdf-annotate-session'

export interface PdfAnnotateSession {
  version: 1
  file: { fileName: string; fileSize: number }
  fileHash?: string
  // User work
  annotations: Record<number, unknown[]>
  measurements: Record<number, unknown[]>
  pageRotations: Record<number, number>
  calibration: { pixelsPerUnit: number | null; unit: string }
  // View state
  zoom: number
  scrollTop: number
  scrollLeft: number
  currentPage: number
  // Tool settings
  color: string
  fontSize: number
  fontFamily: string
  strokeWidth: number
  opacity: number
  activeTool: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  textAlign: string
  textBgColor: string | null
  lineSpacing: number
  superscript: boolean
  subscript: boolean
  listType: string
  eraserRadius: number
  eraserMode: string
  activeHighlight: string
  activeDraw: string
  activeText: string
  // Expanded measurement state
  polyMeasurements?: Record<number, unknown[]>
  countGroups?: Record<number, unknown[]>
  measureMode?: string
  activeCountGroup?: string | null
  edgeSnappingEnabled?: boolean
  // Comment & review state
  commentThreads?: unknown[]
  stickyNotes?: Record<number, unknown[]>
  // Layer state
  layers?: unknown[]
  activeLayerId?: string
}

export function saveSession(session: PdfAnnotateSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // quota exceeded or private browsing — silently fail
  }
}

export function loadSession(): PdfAnnotateSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PdfAnnotateSession
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

/** Hash the first 64 KB of a file for fast identity matching. */
export async function computeFileHash(file: File): Promise<string> {
  const chunk = file.slice(0, 65536)
  const buffer = await chunk.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(hashBuffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
