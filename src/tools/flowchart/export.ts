import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import type { DiagramNode, DiagramEdge, DiagramState, PdfPageSize } from './types.ts'
import { PDF_PAGE_SIZES } from './types.ts'
import { getShapeDef } from './shapes.ts'
import { edgePath, edgeLabelPoint, edgeMidpoint, getEdgePoints } from './connectors.ts'
import { downloadBlob, downloadText } from '@/utils/download.ts'

// ── Bounds calculation ──────────────────────────────────────

function calcBounds(nodes: DiagramNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }
  return { minX: minX - 40, minY: minY - 40, maxX: maxX + 40, maxY: maxY + 40 }
}

// ── Shared canvas rendering ─────────────────────────────────

function renderToCanvas(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): HTMLCanvasElement {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const { minX, minY, maxX, maxY } = calcBounds(nodes)
  const w = maxX - minX
  const h = maxY - minY
  const scale = 2

  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas 2D context')
  ctx.scale(scale, scale)
  ctx.translate(-minX, -minY)

  // Background
  ctx.fillStyle = '#0a0a14'
  ctx.fillRect(minX, minY, w, h)

  // Draw edges
  for (const edge of edges) {
    const d = edgePath(edge, nodeMap)
    if (!d) continue

    ctx.strokeStyle = edge.style.stroke
    ctx.lineWidth = edge.style.strokeWidth
    if (edge.style.dashArray) {
      ctx.setLineDash(edge.style.dashArray.split(' ').map(Number))
    } else {
      ctx.setLineDash([])
    }

    const p = new Path2D(d)
    ctx.stroke(p)

    // Edge label
    if (edge.label) {
      const mid = edgeMidpoint(edge, nodeMap)
      if (mid) {
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const tw = ctx.measureText(edge.label).width + 8
        ctx.fillStyle = 'rgba(10,10,20,0.85)'
        ctx.fillRect(mid.x - tw / 2, mid.y - 9, tw, 18)
        ctx.fillStyle = edge.style.stroke
        ctx.fillText(edge.label, mid.x, mid.y)
      }
    }
  }

  ctx.setLineDash([])

  // Draw nodes (sorted by z-index)
  const sortedNodes = [...nodes].sort((a, b) => a.zIndex - b.zIndex)
  for (const node of sortedNodes) {
    ctx.save()
    ctx.translate(node.x, node.y)

    // Apply rotation around node center (Agent A)
    const rotation = node.rotation ?? 0
    if (rotation !== 0) {
      ctx.translate(node.width / 2, node.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-node.width / 2, -node.height / 2)
    }

    const def = getShapeDef(node.type)
    const path = def.svgPath(node.width, node.height)
    const p = new Path2D(path)

    ctx.fillStyle = node.style.fill
    ctx.fill(p)
    ctx.strokeStyle = node.style.stroke
    ctx.lineWidth = node.style.strokeWidth
    ctx.stroke(p)

    // Text with rich text support (Agent A)
    const fontWeight = node.style.fontWeight === 'bold' ? 'bold' : ''
    const fontStyleStr = node.style.fontStyle === 'italic' ? 'italic' : ''
    const textAlign = node.style.textAlign ?? 'center'

    ctx.fillStyle = node.style.fontColor
    ctx.font = `${fontStyleStr} ${fontWeight} ${node.style.fontSize}px sans-serif`.trim()
    ctx.textAlign = textAlign
    ctx.textBaseline = 'middle'

    // Compute text x based on alignment
    const textX = textAlign === 'left' ? 8
      : textAlign === 'right' ? node.width - 8
      : node.width / 2

    // Simple text wrapping
    const maxW = node.width - 16
    const words = node.label.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)

    const lineH = node.style.fontSize * 1.3
    const startY = node.height / 2 - ((lines.length - 1) * lineH) / 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, startY + i * lineH)
    }

    ctx.restore()
  }

  return canvas
}

// ── Export as PNG ────────────────────────────────────────────

export async function exportPNG(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  filename: string = 'flowchart.png',
): Promise<void> {
  const canvas = renderToCanvas(nodes, edges)

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        downloadBlob(blob, filename)
        resolve()
      } else {
        reject(new Error('Failed to create PNG'))
      }
      canvas.width = 0
      canvas.height = 0
    }, 'image/png')
  })
}

// ── Copy as PNG to clipboard ────────────────────────────────

export async function copyPNGToClipboard(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Promise<void> {
  const canvas = renderToCanvas(nodes, edges)

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('Failed to create PNG'))
        canvas.width = 0
        canvas.height = 0
        return
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        resolve()
      } catch (err) {
        reject(new Error(
          'Failed to copy to clipboard' +
          (err instanceof Error ? ': ' + err.message : ''),
        ))
      } finally {
        canvas.width = 0
        canvas.height = 0
      }
    }, 'image/png')
  })
}

// ── Export as SVG ────────────────────────────────────────────

export function exportSVGString(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  background: string = '#0a0a14',
): string {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const { minX, minY, maxX, maxY } = calcBounds(nodes)
  const w = maxX - minX
  const h = maxY - minY

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`,
    `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="${background}"/>`,
    // Arrow marker
    `<defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">`,
    `<polygon points="0 0, 10 3.5, 0 7" fill="rgba(244,123,32,0.5)"/></marker></defs>`,
  ]

  // Edges
  for (const edge of edges) {
    const d = edgePath(edge, nodeMap)
    if (!d) continue
    const marker = edge.style.markerEnd ? ' marker-end="url(#arrow)"' : ''
    const dash = edge.style.dashArray ? ` stroke-dasharray="${edge.style.dashArray}"` : ''
    parts.push(`<path d="${d}" fill="none" stroke="${edge.style.stroke}" stroke-width="${edge.style.strokeWidth}"${dash}${marker}/>`)

    if (edge.label) {
      const mid = edgeMidpoint(edge, nodeMap)
      if (mid) {
        parts.push(`<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="central" fill="${edge.style.stroke}" font-size="11" font-family="sans-serif">${escapeXml(edge.label)}</text>`)
      }
    }
  }

  // Nodes
  const sortedNodes = [...nodes].sort((a, b) => a.zIndex - b.zIndex)
  for (const node of sortedNodes) {
    const def = getShapeDef(node.type)
    const path = def.svgPath(node.width, node.height)
    const rotation = node.rotation ?? 0
    const rotateAttr = rotation !== 0
      ? ` rotate(${rotation}, ${node.width / 2}, ${node.height / 2})`
      : ''
    parts.push(`<g transform="translate(${node.x},${node.y})${rotateAttr}">`)
    parts.push(`<path d="${path}" fill="${node.style.fill}" stroke="${node.style.stroke}" stroke-width="${node.style.strokeWidth}"/>`)
    const fontWeightAttr = node.style.fontWeight === 'bold' ? ' font-weight="bold"' : ''
    const fontStyleAttr = node.style.fontStyle === 'italic' ? ' font-style="italic"' : ''
    const textAnchorMap = { left: 'start', center: 'middle', right: 'end' } as const
    const textAlign = node.style.textAlign ?? 'center'
    const textAnchor = textAnchorMap[textAlign]
    const textX = textAlign === 'left' ? 8 : textAlign === 'right' ? node.width - 8 : node.width / 2
    parts.push(`<text x="${textX}" y="${node.height / 2}" text-anchor="${textAnchor}" dominant-baseline="central" fill="${node.style.fontColor}" font-size="${node.style.fontSize}" font-family="sans-serif"${fontWeightAttr}${fontStyleAttr}>${escapeXml(node.label)}</text>`)
    parts.push(`</g>`)
  }

  parts.push(`</svg>`)
  return parts.join('\n')
}

export function exportSVG(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  filename: string = 'flowchart.svg',
): void {
  const svgStr = exportSVGString(nodes, edges)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}

// ── Export as PDF ────────────────────────────────────────────

/** Parse a CSS rgba/hex color to pdf-lib rgb() */
function parseCssColor(css: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba(r,g,b,a)
  const rgbaMatch = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    }
  }
  // Handle hex
  const hexMatch = css.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16) / 255,
      g: parseInt(hexMatch[2], 16) / 255,
      b: parseInt(hexMatch[3], 16) / 255,
      a: 1,
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

/** Word-wrap text to fit within maxWidth using pdf-lib font metrics */
function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function exportPDF(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  pageSize: PdfPageSize = 'auto',
  filename: string = 'flowchart.pdf',
): Promise<void> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const { minX, minY, maxX, maxY } = calcBounds(nodes)
  const diagramW = maxX - minX
  const diagramH = maxY - minY

  // Determine page dimensions
  let pageW: number
  let pageH: number
  let scale: number

  if (pageSize === 'auto') {
    // Fit content + padding
    const padding = 40
    pageW = diagramW + padding * 2
    pageH = diagramH + padding * 2
    scale = 1
  } else {
    const dims = PDF_PAGE_SIZES[pageSize]
    // Auto-detect landscape vs portrait
    const isLandscape = diagramW > diagramH
    pageW = isLandscape ? Math.max(dims.width, dims.height) : Math.min(dims.width, dims.height)
    pageH = isLandscape ? Math.min(dims.width, dims.height) : Math.max(dims.width, dims.height)
    // Scale to fit
    const padding = 40
    scale = Math.min((pageW - padding * 2) / diagramW, (pageH - padding * 2) / diagramH, 1)
  }

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([pageW, pageH])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Coordinate transform: diagram coords → PDF coords
  // PDF origin is bottom-left; diagram origin is top-left
  const offsetX = (pageW - diagramW * scale) / 2 - minX * scale
  const offsetY = (pageH - diagramH * scale) / 2 + maxY * scale

  const toPdfX = (x: number): number => x * scale + offsetX
  const toPdfY = (y: number): number => offsetY - y * scale

  // White background
  page.drawRectangle({
    x: 0, y: 0, width: pageW, height: pageH,
    color: rgb(1, 1, 1),
  })

  // Draw edges
  for (const edge of edges) {
    const points = getEdgePoints(edge, nodeMap)
    if (points.length < 2) continue

    const strokeColor = parseCssColor(edge.style.stroke)
    const lineWidth = edge.style.strokeWidth * scale

    // Draw line segments
    for (let i = 0; i < points.length - 1; i++) {
      page.drawLine({
        start: { x: toPdfX(points[i].x), y: toPdfY(points[i].y) },
        end: { x: toPdfX(points[i + 1].x), y: toPdfY(points[i + 1].y) },
        thickness: lineWidth,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        opacity: strokeColor.a,
        dashArray: edge.style.dashArray
          ? edge.style.dashArray.split(' ').map(v => parseFloat(v) * scale)
          : undefined,
      })
    }

    // Draw arrowhead
    if (edge.style.markerEnd && points.length >= 2) {
      const last = points[points.length - 1]
      const prev = points[points.length - 2]
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x)
      const arrowLen = 10 * scale
      const arrowWidth = 4 * scale

      const tipX = toPdfX(last.x)
      const tipY = toPdfY(last.y)
      const left = {
        x: tipX - arrowLen * Math.cos(angle - Math.PI / 2) * 0 - arrowLen * Math.cos(angle),
        y: tipY + arrowLen * Math.sin(angle) + arrowWidth * Math.cos(angle),
      }
      const right = {
        x: tipX - arrowLen * Math.cos(angle) + arrowWidth * Math.sin(angle),
        y: tipY + arrowLen * Math.sin(angle) - arrowWidth * Math.cos(angle),
      }
      // Simplified arrow: draw two lines from tip
      page.drawLine({
        start: { x: tipX, y: tipY },
        end: { x: left.x, y: left.y },
        thickness: lineWidth,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        opacity: strokeColor.a,
      })
      page.drawLine({
        start: { x: tipX, y: tipY },
        end: { x: right.x, y: right.y },
        thickness: lineWidth,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        opacity: strokeColor.a,
      })
    }

    // Edge label
    if (edge.label) {
      const mid = edgeMidpoint(edge, nodeMap)
      if (mid) {
        const fontSize = 9 * scale
        const textWidth = font.widthOfTextAtSize(edge.label, fontSize)
        page.drawText(edge.label, {
          x: toPdfX(mid.x) - textWidth / 2,
          y: toPdfY(mid.y) - fontSize / 3,
          size: fontSize,
          font,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: Math.min(1, strokeColor.a + 0.3),
        })
      }
    }
  }

  // Draw nodes (sorted by z-index)
  const sortedNodes = [...nodes].sort((a, b) => a.zIndex - b.zIndex)
  for (const node of sortedNodes) {
    const fillColor = parseCssColor(node.style.fill)
    const strokeColor = parseCssColor(node.style.stroke)
    const fontColor = parseCssColor(node.style.fontColor)

    const nx = toPdfX(node.x)
    const ny = toPdfY(node.y + node.height) // PDF y is bottom-left
    const nw = node.width * scale
    const nh = node.height * scale

    // For most shapes, draw a rectangle as approximation
    // Special handling for specific shapes
    if (node.type === 'diamond') {
      const cx = nx + nw / 2
      const cy = ny + nh / 2
      // Draw diamond as 4 lines
      const top = { x: cx, y: ny + nh }
      const right = { x: nx + nw, y: cy }
      const bottom = { x: cx, y: ny }
      const left = { x: nx, y: cy }
      const diamondPairs: [{ x: number; y: number }, { x: number; y: number }][] = [
        [top, right], [right, bottom], [bottom, left], [left, top],
      ]
      for (const [start, end] of diamondPairs) {
        page.drawLine({
          start, end,
          thickness: node.style.strokeWidth * scale,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: strokeColor.a,
        })
      }
    } else if (node.type === 'circle') {
      const rx = nw / 2
      const ry = nh / 2
      page.drawEllipse({
        x: nx + rx,
        y: ny + ry,
        xScale: rx,
        yScale: ry,
        color: rgb(fillColor.r, fillColor.g, fillColor.b),
        opacity: fillColor.a,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: node.style.strokeWidth * scale,
        borderOpacity: strokeColor.a,
      })
    } else {
      // Rectangle-based shapes (rectangle, rounded-rectangle, pill, parallelogram, etc.)
      page.drawRectangle({
        x: nx,
        y: ny,
        width: nw,
        height: nh,
        color: rgb(fillColor.r, fillColor.g, fillColor.b),
        opacity: fillColor.a,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: node.style.strokeWidth * scale,
        borderOpacity: strokeColor.a,
      })
    }

    // Draw text label
    if (node.label) {
      const fontSize = node.style.fontSize * scale
      const maxTextW = nw - 16 * scale
      const lines = wrapText(node.label, fontSize, maxTextW, font)
      const lineH = fontSize * 1.3
      const totalTextH = lines.length * lineH
      const textStartY = ny + nh / 2 + totalTextH / 2 - lineH / 2

      for (let i = 0; i < lines.length; i++) {
        const textWidth = font.widthOfTextAtSize(lines[i], fontSize)
        page.drawText(lines[i], {
          x: nx + nw / 2 - textWidth / 2,
          y: textStartY - i * lineH - fontSize * 0.3,
          size: fontSize,
          font,
          color: rgb(fontColor.r, fontColor.g, fontColor.b),
          opacity: fontColor.a,
        })
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  downloadBlob(new Uint8Array(pdfBytes), filename, 'application/pdf')
}

// ── Export as JSON (save/load) ───────────────────────────────

export function exportJSON(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  filename: string = 'flowchart.json',
): void {
  const state: DiagramState = { nodes, edges }
  downloadText(JSON.stringify(state, null, 2), filename, 'application/json')
}

export function importJSON(json: string): DiagramState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: failed to parse')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid flowchart JSON: expected an object')
  }

  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error('Invalid flowchart JSON: expected { nodes: [], edges: [] }')
  }

  // Validate nodes have required fields
  for (const node of obj.nodes) {
    if (!node || typeof node !== 'object' || !('id' in node) || !('type' in node) || !('x' in node) || !('y' in node)) {
      throw new Error('Invalid flowchart JSON: nodes must have id, type, x, and y fields')
    }
  }

  // Ensure new fields have defaults for backward compatibility
  const nodes = (obj.nodes as Record<string, unknown>[]).map(n => ({
    ...n,
    groupId: ('groupId' in n) ? n.groupId : null,
    layerId: ('layerId' in n && typeof n.layerId === 'string') ? n.layerId : 'default',
  }))

  return { nodes, edges: obj.edges } as unknown as DiagramState
}

// ── Utility ─────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
