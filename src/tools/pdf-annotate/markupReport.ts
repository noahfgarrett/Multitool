import {
  PDFDocument,
  StandardFonts,
  PDFFont,
  PDFPage,
  rgb,
} from 'pdf-lib'
import type {
  Annotation,
  Measurement,
  PolyMeasurement,
  CountGroup,
  CommentThread,
  StickyNote,
  CalibrationState,
  PageRefs,
  CommentStatus,
} from './types'

// ── Constants ────────────────────────────────────────────

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const THUMBNAIL_MAX_WIDTH = 400
const LINE_HEIGHT_NORMAL = 14
const LINE_HEIGHT_HEADING = 22
const SECTION_GAP = 16
const TABLE_ROW_HEIGHT = 16
const TABLE_HEADER_HEIGHT = 18
const DIVIDER_THICKNESS = 0.5

// ── Helpers ──────────────────────────────────────────────

function sanitizeText(text: string): string {
  return text.replace(/[^\x00-\xFF]/g, '?')
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: CommentStatus): string {
  const map: Record<CommentStatus, string> = {
    none: 'None',
    open: 'Open',
    accepted: 'Accepted',
    rejected: 'Rejected',
    resolved: 'Resolved',
  }
  return map[status]
}

function annotationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    pencil: 'Pencil',
    highlighter: 'Highlighter',
    rectangle: 'Rectangle',
    circle: 'Circle',
    arrow: 'Arrow',
    line: 'Line',
    text: 'Text',
    cloud: 'Cloud',
    callout: 'Callout',
    stamp: 'Stamp',
  }
  return map[type] ?? type
}

function measureModeLabel(mode: string): string {
  const map: Record<string, string> = {
    distance: 'Distance',
    polylength: 'Polylength',
    area: 'Area',
    count: 'Count',
    angle: 'Angle',
  }
  return map[mode] ?? mode
}

function computeDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function computeMeasurementValue(
  m: Measurement,
  calibration: CalibrationState,
): { value: string; unit: string } {
  const dist = computeDistance(m.startPt.x, m.startPt.y, m.endPt.x, m.endPt.y)
  if (calibration.pixelsPerUnit !== null && calibration.pixelsPerUnit > 0) {
    return {
      value: (dist / calibration.pixelsPerUnit).toFixed(2),
      unit: calibration.unit,
    }
  }
  return { value: dist.toFixed(1), unit: 'px' }
}

function computePolyValue(
  pm: PolyMeasurement,
  calibration: CalibrationState,
): { value: string; unit: string } {
  const ppu = calibration.pixelsPerUnit
  const unit = ppu !== null && ppu > 0 ? calibration.unit : 'px'
  const scale = ppu !== null && ppu > 0 ? ppu : 1

  if (pm.mode === 'distance' && pm.points.length >= 2) {
    const d = computeDistance(
      pm.points[0].x,
      pm.points[0].y,
      pm.points[1].x,
      pm.points[1].y,
    )
    return { value: (d / scale).toFixed(2), unit }
  }

  if (pm.mode === 'polylength' && pm.points.length >= 2) {
    let total = 0
    for (let i = 1; i < pm.points.length; i++) {
      total += computeDistance(
        pm.points[i - 1].x,
        pm.points[i - 1].y,
        pm.points[i].x,
        pm.points[i].y,
      )
    }
    return { value: (total / scale).toFixed(2), unit }
  }

  if (pm.mode === 'area' && pm.points.length >= 3) {
    // Shoelace formula
    let area = 0
    const pts = pm.points
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length
      area += pts[i].x * pts[j].y
      area -= pts[j].x * pts[i].y
    }
    area = Math.abs(area) / 2
    const scaledArea = area / (scale * scale)
    return { value: scaledArea.toFixed(2), unit: `${unit}\u00B2` }
  }

  if (pm.mode === 'angle' && pm.points.length >= 3) {
    const a = pm.points[0]
    const b = pm.points[1]
    const c = pm.points[2]
    const angleA = Math.atan2(a.y - b.y, a.x - b.x)
    const angleC = Math.atan2(c.y - b.y, c.x - b.x)
    let diff = angleA - angleC
    if (diff < 0) diff += 2 * Math.PI
    const degrees = diff * (180 / Math.PI)
    return { value: degrees.toFixed(1), unit: '°' }
  }

  if (pm.mode === 'count') {
    return { value: String(pm.points.length), unit: 'count' }
  }

  return { value: '0', unit }
}

function escapeCSV(value: string): string {
  const s = value.replace(/"/g, '""')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s}"`
  }
  return s
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

// ── PDF drawing helpers ──────────────────────────────────

function drawDivider(page: PDFPage, y: number): void {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: DIVIDER_THICKNESS,
    color: rgb(0.75, 0.75, 0.75),
  })
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
): void {
  page.drawText(sanitizeText(text), { x, y, size, font, color })
}

function needsNewPage(y: number, requiredSpace: number): boolean {
  return y - requiredSpace < MARGIN
}

// ── Report params ────────────────────────────────────────

export interface MarkupReportParams {
  fileName: string
  pageCount: number
  pageRefsMap: Map<number, PageRefs>
  annotations: Record<number, Annotation[]>
  measurements: Record<number, Measurement[]>
  polyMeasurements: Record<number, PolyMeasurement[]>
  countGroups: Record<number, CountGroup[]>
  commentThreads: CommentThread[]
  stickyNotes: Record<number, StickyNote[]>
  calibration: CalibrationState
}

// ── Main PDF generation ──────────────────────────────────

export async function generateMarkupReport(
  params: MarkupReportParams,
): Promise<Uint8Array> {
  const {
    fileName,
    pageCount,
    pageRefsMap,
    annotations,
    measurements,
    polyMeasurements,
    countGroups,
    commentThreads,
    stickyNotes,
    calibration,
  } = params

  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Build thread lookup: annotationId -> CommentThread
  const threadMap = new Map<string, CommentThread>()
  for (const thread of commentThreads) {
    threadMap.set(thread.annotationId, thread)
  }

  // Count totals
  let totalAnnotations = 0
  let totalMeasurements = 0
  let totalComments = 0
  let totalStickyNotes = 0
  let totalCountGroups = 0

  for (let p = 1; p <= pageCount; p++) {
    totalAnnotations += (annotations[p] ?? []).length
    totalMeasurements +=
      (measurements[p] ?? []).length + (polyMeasurements[p] ?? []).length
    totalCountGroups += (countGroups[p] ?? []).length
    totalStickyNotes += (stickyNotes[p] ?? []).length
  }
  totalComments = commentThreads.reduce(
    (sum, t) => sum + t.comments.length,
    0,
  )

  // ── Cover page ──
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cy = PAGE_HEIGHT - 150

  drawText(coverPage, 'Markup Summary Report', MARGIN, cy, boldFont, 24)
  cy -= 36
  drawText(
    coverPage,
    truncateText(fileName, 80),
    MARGIN,
    cy,
    regularFont,
    14,
    rgb(0.3, 0.3, 0.3),
  )
  cy -= 24
  drawText(
    coverPage,
    formatDate(new Date()),
    MARGIN,
    cy,
    regularFont,
    11,
    rgb(0.4, 0.4, 0.4),
  )
  cy -= 48
  drawDivider(coverPage, cy)
  cy -= 30

  const summaryLines: [string, number][] = [
    ['Annotations', totalAnnotations],
    ['Measurements', totalMeasurements],
    ['Count Groups', totalCountGroups],
    ['Sticky Notes', totalStickyNotes],
    ['Comments', totalComments],
    ['Pages', pageCount],
  ]
  for (const [label, count] of summaryLines) {
    drawText(coverPage, `${label}:`, MARGIN, cy, boldFont, 11)
    drawText(coverPage, String(count), MARGIN + 120, cy, regularFont, 11)
    cy -= LINE_HEIGHT_NORMAL + 4
  }

  // ── Per-page sections ──
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const pageAnns = annotations[pageNum] ?? []
    const pageMeas = measurements[pageNum] ?? []
    const pagePolyMeas = polyMeasurements[pageNum] ?? []
    const pageCounts = countGroups[pageNum] ?? []
    const pageNotes = stickyNotes[pageNum] ?? []

    const hasContent =
      pageAnns.length > 0 ||
      pageMeas.length > 0 ||
      pagePolyMeas.length > 0 ||
      pageCounts.length > 0 ||
      pageNotes.length > 0

    if (!hasContent) continue

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let y = PAGE_HEIGHT - MARGIN

    // Page header
    drawText(currentPage, `Page ${pageNum}`, MARGIN, y, boldFont, 16)
    y -= 6
    drawDivider(currentPage, y)
    y -= SECTION_GAP

    // Page thumbnail
    const refs = pageRefsMap.get(pageNum)
    if (refs) {
      try {
        const canvas = refs.pdfCanvas
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        const base64 = dataUrl.split(',')[1]
        if (base64) {
          const imageBytes = Uint8Array.from(atob(base64), (c) =>
            c.charCodeAt(0),
          )
          const jpgImage = await pdfDoc.embedJpg(imageBytes)
          const aspect = jpgImage.height / jpgImage.width
          const thumbWidth = Math.min(THUMBNAIL_MAX_WIDTH, CONTENT_WIDTH)
          const thumbHeight = thumbWidth * aspect

          if (needsNewPage(y, thumbHeight + 20)) {
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
            y = PAGE_HEIGHT - MARGIN
          }

          currentPage.drawImage(jpgImage, {
            x: MARGIN,
            y: y - thumbHeight,
            width: thumbWidth,
            height: thumbHeight,
          })
          y -= thumbHeight + SECTION_GAP
        }
      } catch {
        // If canvas capture fails, skip thumbnail
      }
    }

    // Helper: ensure space or add new page
    const ensureSpace = (needed: number): void => {
      if (needsNewPage(y, needed)) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        y = PAGE_HEIGHT - MARGIN
      }
    }

    // ── Annotations table ──
    if (pageAnns.length > 0) {
      ensureSpace(TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT + 30)
      drawText(currentPage, 'Annotations', MARGIN, y, boldFont, 12)
      y -= TABLE_HEADER_HEIGHT

      // Column headers
      const colX = [MARGIN, MARGIN + 80, MARGIN + 140, MARGIN + 310, MARGIN + 380]
      drawText(currentPage, 'Type', colX[0], y, boldFont, 8)
      drawText(currentPage, 'Color', colX[1], y, boldFont, 8)
      drawText(currentPage, 'Content', colX[2], y, boldFont, 8)
      drawText(currentPage, 'Status', colX[3], y, boldFont, 8)
      drawText(currentPage, 'Comments', colX[4], y, boldFont, 8)
      y -= 4
      drawDivider(currentPage, y)
      y -= TABLE_ROW_HEIGHT - 4

      for (const ann of pageAnns) {
        ensureSpace(TABLE_ROW_HEIGHT)
        const thread = threadMap.get(ann.id)
        const status = thread ? statusLabel(thread.status) : '-'
        const commentCount = thread ? String(thread.comments.length) : '0'
        const content = ann.text ? truncateText(ann.text, 30) : '-'

        drawText(
          currentPage,
          annotationTypeLabel(ann.type),
          colX[0],
          y,
          regularFont,
          8,
        )
        drawText(currentPage, ann.color, colX[1], y, regularFont, 8)
        drawText(currentPage, content, colX[2], y, regularFont, 8)
        drawText(currentPage, status, colX[3], y, regularFont, 8)
        drawText(currentPage, commentCount, colX[4], y, regularFont, 8)
        y -= TABLE_ROW_HEIGHT
      }
      y -= SECTION_GAP / 2
    }

    // ── Measurements table ──
    const allMeas: { type: string; value: string; unit: string }[] = []
    for (const m of pageMeas) {
      const cv = computeMeasurementValue(m, calibration)
      allMeas.push({ type: 'Distance', value: cv.value, unit: cv.unit })
    }
    for (const pm of pagePolyMeas) {
      const cv = computePolyValue(pm, calibration)
      allMeas.push({
        type: measureModeLabel(pm.mode),
        value: cv.value,
        unit: cv.unit,
      })
      // Add volume row for area measurements with depth
      if (pm.mode === 'area' && pm.depth && pm.depth > 0 && pm.points.length >= 3) {
        const ppu = calibration.pixelsPerUnit
        const scl = ppu !== null && ppu > 0 ? ppu : 1
        let area = 0
        for (let i = 0; i < pm.points.length; i++) {
          const j = (i + 1) % pm.points.length
          area += pm.points[i].x * pm.points[j].y
          area -= pm.points[j].x * pm.points[i].y
        }
        area = Math.abs(area) / 2
        const calibratedArea = area / (scl * scl)
        const volume = calibratedArea * pm.depth
        const volUnit = ppu !== null && ppu > 0 ? `${calibration.unit}³` : 'px³'
        allMeas.push({ type: 'Volume', value: volume.toFixed(2), unit: volUnit })
      }
    }

    if (allMeas.length > 0) {
      ensureSpace(TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT + 30)
      drawText(currentPage, 'Measurements', MARGIN, y, boldFont, 12)
      y -= TABLE_HEADER_HEIGHT

      const mColX = [MARGIN, MARGIN + 120, MARGIN + 260]
      drawText(currentPage, 'Type', mColX[0], y, boldFont, 8)
      drawText(currentPage, 'Value', mColX[1], y, boldFont, 8)
      drawText(currentPage, 'Unit', mColX[2], y, boldFont, 8)
      y -= 4
      drawDivider(currentPage, y)
      y -= TABLE_ROW_HEIGHT - 4

      for (const row of allMeas) {
        ensureSpace(TABLE_ROW_HEIGHT)
        drawText(currentPage, row.type, mColX[0], y, regularFont, 8)
        drawText(currentPage, row.value, mColX[1], y, regularFont, 8)
        drawText(currentPage, row.unit, mColX[2], y, regularFont, 8)
        y -= TABLE_ROW_HEIGHT
      }
      y -= SECTION_GAP / 2
    }

    // ── Count groups table ──
    if (pageCounts.length > 0) {
      ensureSpace(TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT + 30)
      drawText(currentPage, 'Count Groups', MARGIN, y, boldFont, 12)
      y -= TABLE_HEADER_HEIGHT

      const cColX = [MARGIN, MARGIN + 200]
      drawText(currentPage, 'Group Label', cColX[0], y, boldFont, 8)
      drawText(currentPage, 'Count', cColX[1], y, boldFont, 8)
      y -= 4
      drawDivider(currentPage, y)
      y -= TABLE_ROW_HEIGHT - 4

      for (const cg of pageCounts) {
        ensureSpace(TABLE_ROW_HEIGHT)
        drawText(currentPage, cg.label, cColX[0], y, regularFont, 8)
        drawText(
          currentPage,
          String(cg.points.length),
          cColX[1],
          y,
          regularFont,
          8,
        )
        y -= TABLE_ROW_HEIGHT
      }
      y -= SECTION_GAP / 2
    }

    // ── Sticky notes ──
    if (pageNotes.length > 0) {
      ensureSpace(TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT + 30)
      drawText(currentPage, 'Sticky Notes', MARGIN, y, boldFont, 12)
      y -= TABLE_HEADER_HEIGHT

      const nColX = [MARGIN, MARGIN + 80]
      drawText(currentPage, 'Color', nColX[0], y, boldFont, 8)
      drawText(currentPage, 'Text', nColX[1], y, boldFont, 8)
      y -= 4
      drawDivider(currentPage, y)
      y -= TABLE_ROW_HEIGHT - 4

      for (const note of pageNotes) {
        ensureSpace(TABLE_ROW_HEIGHT)
        drawText(currentPage, note.color, nColX[0], y, regularFont, 8)
        drawText(
          currentPage,
          truncateText(note.text, 60),
          nColX[1],
          y,
          regularFont,
          8,
        )
        y -= TABLE_ROW_HEIGHT
      }
      y -= SECTION_GAP / 2
    }

    // ── Comment threads for this page ──
    const pageAnnIds = new Set(pageAnns.map((a) => a.id))
    const pageNoteIds = new Set(pageNotes.map((n) => n.id))
    const pageThreads = commentThreads.filter(
      (t) =>
        (pageAnnIds.has(t.annotationId) || pageNoteIds.has(t.annotationId)) &&
        t.comments.length > 0,
    )

    if (pageThreads.length > 0) {
      ensureSpace(LINE_HEIGHT_HEADING + LINE_HEIGHT_NORMAL + 30)
      drawText(currentPage, 'Comment Threads', MARGIN, y, boldFont, 12)
      y -= LINE_HEIGHT_HEADING

      for (const thread of pageThreads) {
        ensureSpace(LINE_HEIGHT_NORMAL * 3)

        // Find the annotation or sticky note this thread belongs to
        const ann = pageAnns.find((a) => a.id === thread.annotationId)
        const note = pageNotes.find((n) => n.id === thread.annotationId)
        const refLabel = ann
          ? `${annotationTypeLabel(ann.type)} annotation`
          : note
            ? 'Sticky Note'
            : thread.annotationId

        drawText(
          currentPage,
          `${refLabel} - Status: ${statusLabel(thread.status)}`,
          MARGIN,
          y,
          boldFont,
          9,
        )
        y -= LINE_HEIGHT_NORMAL

        for (const comment of thread.comments) {
          ensureSpace(LINE_HEIGHT_NORMAL * 2)
          const timestamp = new Date(comment.timestamp).toLocaleString()
          drawText(
            currentPage,
            `${comment.authorName} (${timestamp})`,
            MARGIN + 10,
            y,
            boldFont,
            8,
            rgb(0.3, 0.3, 0.3),
          )
          y -= LINE_HEIGHT_NORMAL

          // Wrap comment text
          const maxLineWidth = CONTENT_WIDTH - 20
          const words = comment.text.split(' ')
          let currentLine = ''
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidth = regularFont.widthOfTextAtSize(
              sanitizeText(testLine),
              8,
            )
            if (testWidth > maxLineWidth && currentLine) {
              ensureSpace(LINE_HEIGHT_NORMAL)
              drawText(
                currentPage,
                currentLine,
                MARGIN + 10,
                y,
                regularFont,
                8,
              )
              y -= LINE_HEIGHT_NORMAL
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) {
            ensureSpace(LINE_HEIGHT_NORMAL)
            drawText(
              currentPage,
              currentLine,
              MARGIN + 10,
              y,
              regularFont,
              8,
            )
            y -= LINE_HEIGHT_NORMAL
          }
        }

        y -= 6
        ensureSpace(4)
        drawDivider(currentPage, y)
        y -= SECTION_GAP / 2
      }
    }
  }

  return pdfDoc.save()
}

// ── CSV generation ───────────────────────────────────────

export function generateMarkupCSV(
  params: Omit<MarkupReportParams, 'pageRefsMap'>,
): string {
  const {
    annotations,
    measurements,
    polyMeasurements,
    countGroups,
    commentThreads,
    stickyNotes,
    calibration,
    pageCount,
  } = params

  const threadMap = new Map<string, CommentThread>()
  for (const thread of commentThreads) {
    threadMap.set(thread.annotationId, thread)
  }

  const headers = [
    'Page',
    'Type',
    'Subtype',
    'Label/Content',
    'Value',
    'Unit',
    'Status',
    'Author',
    'Date',
    'Comments',
  ]
  const rows: string[][] = []

  for (let page = 1; page <= pageCount; page++) {
    // Annotations
    for (const ann of annotations[page] ?? []) {
      const thread = threadMap.get(ann.id)
      const status = thread ? statusLabel(thread.status) : ''
      const commentsText = (thread?.comments ?? [])
        .map(
          (c) =>
            `${c.authorName} (${new Date(c.timestamp).toLocaleString()}): ${c.text}`,
        )
        .join(' | ')

      rows.push([
        String(page),
        'Annotation',
        annotationTypeLabel(ann.type),
        ann.text ?? '',
        '',
        '',
        status,
        '',
        '',
        commentsText,
      ])

      // Add individual comment rows
      if (thread) {
        for (const comment of thread.comments) {
          rows.push([
            String(page),
            'Comment',
            annotationTypeLabel(ann.type),
            comment.text,
            '',
            '',
            statusLabel(thread.status),
            comment.authorName,
            new Date(comment.timestamp).toLocaleString(),
            '',
          ])
        }
      }
    }

    // Legacy measurements
    for (const m of measurements[page] ?? []) {
      const cv = computeMeasurementValue(m, calibration)
      rows.push([
        String(page),
        'Measurement',
        'Distance',
        '',
        cv.value,
        cv.unit,
        '',
        '',
        '',
        '',
      ])
    }

    // Poly measurements
    for (const pm of polyMeasurements[page] ?? []) {
      const cv = computePolyValue(pm, calibration)
      rows.push([
        String(page),
        'Measurement',
        measureModeLabel(pm.mode),
        pm.label ?? '',
        cv.value,
        cv.unit,
        '',
        '',
        '',
        '',
      ])
      // Volume row for area measurements with depth
      if (pm.mode === 'area' && pm.depth && pm.depth > 0 && pm.points.length >= 3) {
        const ppu = calibration.pixelsPerUnit
        const scl = ppu !== null && ppu > 0 ? ppu : 1
        let area = 0
        for (let i = 0; i < pm.points.length; i++) {
          const j = (i + 1) % pm.points.length
          area += pm.points[i].x * pm.points[j].y
          area -= pm.points[j].x * pm.points[i].y
        }
        area = Math.abs(area) / 2
        const calibratedArea = area / (scl * scl)
        const volume = calibratedArea * pm.depth
        const volUnit = ppu !== null && ppu > 0 ? `${calibration.unit}³` : 'px³'
        rows.push([
          String(page),
          'Measurement',
          'Volume',
          pm.label ? `${pm.label} (volume)` : '',
          volume.toFixed(2),
          volUnit,
          '',
          '',
          '',
          '',
        ])
      }
    }

    // Count groups
    for (const cg of countGroups[page] ?? []) {
      rows.push([
        String(page),
        'Count Group',
        '',
        cg.label,
        String(cg.points.length),
        'count',
        '',
        '',
        '',
        '',
      ])
    }

    // Sticky notes
    for (const note of stickyNotes[page] ?? []) {
      const thread = threadMap.get(note.id)
      const status = thread ? statusLabel(thread.status) : ''
      const commentsText = (thread?.comments ?? [])
        .map(
          (c) =>
            `${c.authorName} (${new Date(c.timestamp).toLocaleString()}): ${c.text}`,
        )
        .join(' | ')

      rows.push([
        String(page),
        'Sticky Note',
        '',
        note.text,
        '',
        '',
        status,
        '',
        '',
        commentsText,
      ])

      // Add individual comment rows for sticky notes
      if (thread) {
        for (const comment of thread.comments) {
          rows.push([
            String(page),
            'Comment',
            'Sticky Note',
            comment.text,
            '',
            '',
            statusLabel(thread.status),
            comment.authorName,
            new Date(comment.timestamp).toLocaleString(),
            '',
          ])
        }
      }
    }
  }

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ]

  return csvLines.join('\n')
}
