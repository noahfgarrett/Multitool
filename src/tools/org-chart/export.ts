import type {
  OrgNode, OrgChartState, LayoutNode,
  Connection, ConnectorType, ConnectorTypeId, LegendConfig, LegendPosition,
  ColorKeyConfig, ColorKeyEntry,
} from './types.ts'
import {
  NODE_WIDTH, NODE_HEIGHT, AVATAR_SIZE,
  SECTION_TITLE_HEIGHT,
  LEGEND_PADDING, LEGEND_TITLE_HEIGHT, LEGEND_UNDERLINE_GAP, LEGEND_ROW_HEIGHT,
  LEGEND_LINE_SAMPLE_WIDTH, LEGEND_LINE_LABEL_GAP, LEGEND_MARGIN,
  createDefaultConnectorTypes, mergeWithDefaults, mergeLegendWithDefaults,
  createDefaultBackground, mergeBackgroundWithDefaults,
  createDefaultColorKey, mergeColorKeyWithDefaults,
  getConnectorType, getNodeConnectorTypeId,
} from './types.ts'
import type { ImageExportOptions } from './exportOptions.ts'
import { drawStyledLine, routePrimaryEdge, routeSecondaryEdge } from './connectorStyle.ts'
import { downloadBlob, downloadText } from '@/utils/download.ts'
import { loadImage } from '@/utils/imageProcessing.ts'
import { buildOrgChartLayout } from './layout.ts'
import {
  buildLegendContent,
  ensureVisibleConnectorType,
  readableForeground,
  type LegendContent,
} from './legend.ts'

// ── Bounds ──────────────────────────────────────────────────

function calcBounds(flat: LayoutNode[], connections: Connection[] = []) {
  if (flat.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of flat) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }

  // Include secondary edge anchor points so fit-to-content captures diagonals
  if (connections.length > 0) {
    const byId = new Map<string, LayoutNode>()
    for (const n of flat) byId.set(n.id, n)
    for (const conn of connections) {
      const from = byId.get(conn.fromId)
      const to = byId.get(conn.toId)
      if (!from || !to) continue
      const path = routeSecondaryEdge(from, to)
      for (const [px, py] of path) {
        minX = Math.min(minX, px)
        minY = Math.min(minY, py)
        maxX = Math.max(maxX, px)
        maxY = Math.max(maxY, py)
      }
    }
  }

  return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 }
}

// ── Legend layout math ──────────────────────────────────────

interface LegendBox { x: number; y: number; w: number; h: number }

const LEGEND_SECTION_HEIGHT = 16

function hasLegendContent(content: LegendContent): boolean {
  return content.relationships.length > 0 || content.departments.length > 0
}

function measureLegend(
  ctx: CanvasRenderingContext2D,
  content: LegendContent,
): { w: number; h: number } {
  if (!hasLegendContent(content)) return { w: 0, h: 0 }

  ctx.save()
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif'
  const titleWidth = ctx.measureText('LEGEND').width

  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif'
  let longestRowWidth = 0
  for (const item of [...content.relationships, ...content.departments]) {
    const labelW = ctx.measureText(item.label).width
    const rowW = LEGEND_LINE_SAMPLE_WIDTH + LEGEND_LINE_LABEL_GAP + labelW
    if (rowW > longestRowWidth) longestRowWidth = rowW
  }
  ctx.restore()

  const contentWidth = Math.max(titleWidth, longestRowWidth)
  const w = 2 * LEGEND_PADDING + contentWidth
  const sectionCount = Number(content.relationships.length > 0) + Number(content.departments.length > 0)
  const rowCount = content.relationships.length + content.departments.length
  const h = 2 * LEGEND_PADDING
    + LEGEND_TITLE_HEIGHT
    + LEGEND_UNDERLINE_GAP
    + sectionCount * LEGEND_SECTION_HEIGHT
    + rowCount * LEGEND_ROW_HEIGHT

  return { w, h }
}

function positionLegend(
  position: LegendPosition,
  dims: { w: number; h: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): LegendBox {
  const { w, h } = dims
  switch (position) {
    case 'top-left':     return { x: bounds.minX + LEGEND_MARGIN,      y: bounds.minY + LEGEND_MARGIN,      w, h }
    case 'top-right':    return { x: bounds.maxX - w - LEGEND_MARGIN,  y: bounds.minY + LEGEND_MARGIN,      w, h }
    case 'bottom-left':  return { x: bounds.minX + LEGEND_MARGIN,      y: bounds.maxY - h - LEGEND_MARGIN,  w, h }
    case 'bottom-right': return { x: bounds.maxX - w - LEGEND_MARGIN,  y: bounds.maxY - h - LEGEND_MARGIN,  w, h }
  }
}

function measureColorKey(
  ctx: CanvasRenderingContext2D,
  entries: ColorKeyEntry[],
): { w: number; h: number } {
  if (entries.length === 0) return { w: 0, h: 0 }
  ctx.save()
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif'
  let longest = ctx.measureText('KEY').width
  for (const entry of entries) longest = Math.max(longest, 20 + ctx.measureText(entry.label).width)
  ctx.restore()
  return {
    w: 2 * LEGEND_PADDING + longest,
    h: 2 * LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP + entries.length * LEGEND_ROW_HEIGHT,
  }
}

function positionOverlayBoxes(
  legend: { position: LegendPosition; dims: { w: number; h: number } } | null,
  colorKey: { position: LegendPosition; dims: { w: number; h: number } } | null,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): { legendBox: LegendBox | null; colorKeyBox: LegendBox | null } {
  const legendBox = legend ? positionLegend(legend.position, legend.dims, bounds) : null
  const colorKeyBox = colorKey ? positionLegend(colorKey.position, colorKey.dims, bounds) : null
  if (legendBox && colorKeyBox && legend && colorKey && legend.position === colorKey.position) {
    if (legend.position.startsWith('top')) colorKeyBox.y = legendBox.y + legendBox.h + 8
    else colorKeyBox.y = legendBox.y - colorKeyBox.h - 8
  }
  return { legendBox, colorKeyBox }
}

function drawPanel(ctx: CanvasRenderingContext2D, box: LegendBox, title: string): void {
  const radius = 6
  drawRoundedRect(ctx, box.x, box.y, box.w, box.h, radius)
  ctx.fillStyle = 'rgba(10, 10, 20, 0.9)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(title, box.x + LEGEND_PADDING, box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT * 0.7)
  const underlineY = box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP / 2
  ctx.beginPath()
  ctx.moveTo(box.x + LEGEND_PADDING, underlineY)
  ctx.lineTo(box.x + box.w - LEGEND_PADDING, underlineY)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.stroke()
}

function drawColorKey(ctx: CanvasRenderingContext2D, box: LegendBox, entries: ColorKeyEntry[]): void {
  if (entries.length === 0) return
  ctx.save()
  drawPanel(ctx, box, 'KEY')
  let cursorY = box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP
  for (const entry of entries) {
    const centerY = cursorY + LEGEND_ROW_HEIGHT / 2
    ctx.fillStyle = entry.color
    ctx.fillRect(box.x + LEGEND_PADDING, centerY - 5, 10, 10)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.strokeRect(box.x + LEGEND_PADDING, centerY - 5, 10, 10)
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textBaseline = 'middle'
    ctx.fillText(entry.label, box.x + LEGEND_PADDING + 20, centerY)
    cursorY += LEGEND_ROW_HEIGHT
  }
  ctx.restore()
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  box: LegendBox,
  content: LegendContent,
): void {
  if (!hasLegendContent(content)) return

  ctx.save()

  // Background rounded rect
  const r = 6
  ctx.beginPath()
  ctx.moveTo(box.x + r, box.y)
  ctx.lineTo(box.x + box.w - r, box.y)
  ctx.arcTo(box.x + box.w, box.y, box.x + box.w, box.y + r, r)
  ctx.lineTo(box.x + box.w, box.y + box.h - r)
  ctx.arcTo(box.x + box.w, box.y + box.h, box.x + box.w - r, box.y + box.h, r)
  ctx.lineTo(box.x + r, box.y + box.h)
  ctx.arcTo(box.x, box.y + box.h, box.x, box.y + box.h - r, r)
  ctx.lineTo(box.x, box.y + r)
  ctx.arcTo(box.x, box.y, box.x + r, box.y, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(10, 10, 20, 0.9)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Title
  const titleX = box.x + LEGEND_PADDING
  const titleY = box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT * 0.7
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('LEGEND', titleX, titleY)

  // Underline
  const underlineY = box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP / 2
  ctx.beginPath()
  ctx.moveTo(box.x + LEGEND_PADDING, underlineY)
  ctx.lineTo(box.x + box.w - LEGEND_PADDING, underlineY)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.stroke()

  let cursorY = box.y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP
  const drawSectionLabel = (label: string): void => {
    ctx.font = '600 9px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
    ctx.textBaseline = 'middle'
    ctx.fillText(label.toUpperCase(), box.x + LEGEND_PADDING, cursorY + LEGEND_SECTION_HEIGHT / 2)
    cursorY += LEGEND_SECTION_HEIGHT
  }

  if (content.relationships.length > 0) {
    drawSectionLabel('Relationships')
  }
  for (const originalType of content.relationships) {
    const type = ensureVisibleConnectorType(originalType, '#0a0a14')
    const rowCenterY = cursorY + LEGEND_ROW_HEIGHT / 2
    const sampleStartX = box.x + LEGEND_PADDING
    const sampleEndX = sampleStartX + LEGEND_LINE_SAMPLE_WIDTH

    drawStyledLine(
      ctx,
      [[sampleStartX, rowCenterY], [sampleEndX, rowCenterY]],
      type,
      1,
    )

    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(type.label, sampleEndX + LEGEND_LINE_LABEL_GAP, rowCenterY)
    cursorY += LEGEND_ROW_HEIGHT
  }

  if (content.departments.length > 0) {
    drawSectionLabel('Departments')
  }
  for (const department of content.departments) {
    const rowCenterY = cursorY + LEGEND_ROW_HEIGHT / 2
    const sampleX = box.x + LEGEND_PADDING
    ctx.fillStyle = department.color
    ctx.fillRect(sampleX, rowCenterY - 5, 10, 10)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.strokeRect(sampleX, rowCenterY - 5, 10, 10)
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(department.label, sampleX + LEGEND_LINE_SAMPLE_WIDTH + LEGEND_LINE_LABEL_GAP, rowCenterY)
    cursorY += LEGEND_ROW_HEIGHT
  }

  ctx.restore()
}

function calcExportBounds(
  flat: LayoutNode[],
  connections: Connection[],
  overlayBoxes: LegendBox[],
  sectionTitleOffset: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const base = calcBounds(flat, connections)
  const minY = sectionTitleOffset > 0 ? base.minY - sectionTitleOffset : base.minY

  if (overlayBoxes.length === 0) {
    return { ...base, minY }
  }

  return overlayBoxes.reduce((bounds, box) => ({
    minX: Math.min(bounds.minX, box.x - LEGEND_MARGIN),
    minY: Math.min(bounds.minY, box.y - LEGEND_MARGIN),
    maxX: Math.max(bounds.maxX, box.x + box.w + LEGEND_MARGIN),
    maxY: Math.max(bounds.maxY, box.y + box.h + LEGEND_MARGIN),
  }), { ...base, minY })
}

function emitSVGLegend(
  parts: string[],
  box: LegendBox,
  content: LegendContent,
): void {
  if (!hasLegendContent(content)) return
  const { x, y, w, h } = box

  parts.push(`<g data-layer="legend">`)
  parts.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(10,10,20,0.9)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`)

  // Title
  const titleX = x + LEGEND_PADDING
  const titleY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT * 0.7
  parts.push(`  <text x="${titleX}" y="${titleY}" font-size="10" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="0.8">LEGEND</text>`)

  // Underline
  const underlineY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP / 2
  parts.push(`  <line x1="${x + LEGEND_PADDING}" y1="${underlineY}" x2="${x + w - LEGEND_PADDING}" y2="${underlineY}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`)

  let cursorY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP
  const emitSectionLabel = (label: string): void => {
    const labelY = cursorY + LEGEND_SECTION_HEIGHT / 2
    parts.push(`  <text x="${x + LEGEND_PADDING}" y="${labelY}" font-size="9" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.38)" dominant-baseline="central">${label.toUpperCase()}</text>`)
    cursorY += LEGEND_SECTION_HEIGHT
  }

  if (content.relationships.length > 0) emitSectionLabel('Relationships')
  for (const originalType of content.relationships) {
    const type = ensureVisibleConnectorType(originalType, '#0a0a14')
    const rowY = cursorY + LEGEND_ROW_HEIGHT / 2
    const sampleX1 = x + LEGEND_PADDING
    const sampleX2 = sampleX1 + LEGEND_LINE_SAMPLE_WIDTH

    const dashAttr = (() => {
      switch (type.style) {
        case 'solid':  return ''
        case 'dashed': return ' stroke-dasharray="8,5"'
        case 'dotted': return ' stroke-dasharray="2,3"'
        case 'double': return ''
      }
    })()

    if (type.style === 'double') {
      parts.push(`  <g stroke="${type.color}" stroke-width="${Math.max(1, type.lineWidth * 0.6)}" fill="none">`)
      parts.push(`    <line x1="${sampleX1}" y1="${rowY - 2}" x2="${sampleX2}" y2="${rowY - 2}"/>`)
      parts.push(`    <line x1="${sampleX1}" y1="${rowY + 2}" x2="${sampleX2}" y2="${rowY + 2}"/>`)
      parts.push(`  </g>`)
    } else {
      parts.push(`  <line x1="${sampleX1}" y1="${rowY}" x2="${sampleX2}" y2="${rowY}" stroke="${type.color}" stroke-width="${type.lineWidth}" stroke-linecap="round"${dashAttr}/>`)
    }

    const labelX = sampleX2 + LEGEND_LINE_LABEL_GAP
    parts.push(`  <text x="${labelX}" y="${rowY}" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.85)" dominant-baseline="central">${escapeXml(type.label)}</text>`)
    cursorY += LEGEND_ROW_HEIGHT
  }

  if (content.departments.length > 0) emitSectionLabel('Departments')
  for (const department of content.departments) {
    const rowY = cursorY + LEGEND_ROW_HEIGHT / 2
    const sampleX = x + LEGEND_PADDING
    parts.push(`  <rect x="${sampleX}" y="${rowY - 5}" width="10" height="10" rx="1" fill="${department.color}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`)
    parts.push(`  <text x="${sampleX + LEGEND_LINE_SAMPLE_WIDTH + LEGEND_LINE_LABEL_GAP}" y="${rowY}" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.85)" dominant-baseline="central">${escapeXml(department.label)}</text>`)
    cursorY += LEGEND_ROW_HEIGHT
  }

  parts.push(`</g>`)
}

function emitSVGColorKey(parts: string[], box: LegendBox, entries: ColorKeyEntry[]): void {
  if (entries.length === 0) return
  const { x, y, w, h } = box
  parts.push(`<g data-layer="color-key">`)
  parts.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(10,10,20,0.9)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`)
  const titleY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT * 0.7
  parts.push(`  <text x="${x + LEGEND_PADDING}" y="${titleY}" font-size="10" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.55)">KEY</text>`)
  const underlineY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP / 2
  parts.push(`  <line x1="${x + LEGEND_PADDING}" y1="${underlineY}" x2="${x + w - LEGEND_PADDING}" y2="${underlineY}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`)
  let cursorY = y + LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP
  for (const entry of entries) {
    const rowY = cursorY + LEGEND_ROW_HEIGHT / 2
    parts.push(`  <rect x="${x + LEGEND_PADDING}" y="${rowY - 5}" width="10" height="10" rx="1" fill="${entry.color}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`)
    parts.push(`  <text x="${x + LEGEND_PADDING + 20}" y="${rowY}" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="rgba(255,255,255,0.85)" dominant-baseline="central">${escapeXml(entry.label)}</text>`)
    cursorY += LEGEND_ROW_HEIGHT
  }
  parts.push(`</g>`)
}

// ── Preload images ──────────────────────────────────────────

async function preloadImages(nodes: OrgNode[]): Promise<Map<string, HTMLImageElement>> {
  const cache = new Map<string, HTMLImageElement>()
  const promises: Promise<void>[] = []
  for (const n of nodes) {
    if (n.imageDataUrl && !cache.has(n.imageDataUrl)) {
      const url = n.imageDataUrl
      promises.push(
        loadImage(url).then(img => { cache.set(url, img) }).catch(() => {}),
      )
    }
  }
  await Promise.all(promises)
  return cache
}

// ── Render to offscreen canvas ──────────────────────────────

function resolveRenderBackground(state: OrgChartState, options: ImageExportOptions): string | null {
  if ('backgroundColor' in options) return options.backgroundColor ?? null
  return state.background.color
}

async function renderToCanvas(
  state: OrgChartState,
  options: ImageExportOptions = {},
): Promise<HTMLCanvasElement> {
  const { nodes, connections, connectorTypes } = state
  const flat = buildOrgChartLayout(nodes, state.layoutDirection).flat
  const imageCache = await preloadImages(nodes)
  const roots = flat.filter(n => !n.reportsTo)

  // Measure legend first (temp ctx for text measurement)
  const legendContent = buildLegendContent(state)
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  const legendDims = hasLegendContent(legendContent) && tempCtx
    ? measureLegend(tempCtx, legendContent)
    : { w: 0, h: 0 }
  const colorKeyEntries = state.colorKey.visible ? state.colorKey.entries : []
  const colorKeyDims = tempCtx ? measureColorKey(tempCtx, colorKeyEntries) : { w: 0, h: 0 }

  // Compute diagram bounds (include section title offset for tentative positioning)
  const baseBounds = calcBounds(flat, connections)
  const hasTitles = roots.some(r => r.sectionTitle)
  const sectionOffset = hasTitles ? SECTION_TITLE_HEIGHT : 0

  // Tentatively position the legend against current bounds
  const tentativeBounds = {
    minX: baseBounds.minX,
    minY: hasTitles ? baseBounds.minY - SECTION_TITLE_HEIGHT : baseBounds.minY,
    maxX: baseBounds.maxX,
    maxY: baseBounds.maxY,
  }
  const { legendBox, colorKeyBox } = positionOverlayBoxes(
    hasLegendContent(legendContent) ? { position: state.legend.position, dims: legendDims } : null,
    colorKeyEntries.length > 0 ? { position: state.colorKey.position, dims: colorKeyDims } : null,
    tentativeBounds,
  )

  // Final bounds = diagram ∪ legend footprint (with margin)
  const overlayBoxes = [legendBox, colorKeyBox].filter((box): box is LegendBox => box !== null)
  const { minX, minY, maxX, maxY } = calcExportBounds(flat, connections, overlayBoxes, sectionOffset)
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
  const backgroundColor = resolveRenderBackground(state, options)
  const contrastBackground = backgroundColor ?? state.background.color
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(minX, minY, w, h)
  }

  // Draw primary connectors (tree edges)
  const childMap = new Map<string, LayoutNode[]>()
  for (const n of flat) {
    if (n.reportsTo) {
      const arr = childMap.get(n.reportsTo) ?? []
      arr.push(n)
      childMap.set(n.reportsTo, arr)
    }
  }
  for (const parent of flat) {
    const children = childMap.get(parent.id) ?? []
    for (const child of children) {
      const type = ensureVisibleConnectorType(
        getConnectorType(connectorTypes, getNodeConnectorTypeId(child)),
        contrastBackground,
      )
      drawStyledLine(
        ctx,
        routePrimaryEdge(parent, child, state.layoutDirection),
        type,
        1,
      )
    }
  }

  // Draw secondary edges
  if (connections.length > 0) {
    const nodeById = new Map<string, LayoutNode>()
    for (const n of flat) nodeById.set(n.id, n)

    for (const conn of connections) {
      const from = nodeById.get(conn.fromId)
      const to = nodeById.get(conn.toId)
      if (!from || !to) continue
      const path = routeSecondaryEdge(from, to)
      if (path.length === 0) continue
      const type = ensureVisibleConnectorType(
        getConnectorType(connectorTypes, conn.typeId),
        contrastBackground,
      )
      drawStyledLine(ctx, path, type, 1) // native scale, no zoom dash adjustment
    }
  }

  // Draw section titles and dividers
  roots.forEach((root, idx) => {
    if (root.sectionTitle) {
      ctx.save()
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = readableForeground(contrastBackground)
      ctx.globalAlpha = 0.82
      ctx.textAlign = 'center'
      const titleX = root.x + root.width / 2
      const titleY = root.y - SECTION_TITLE_HEIGHT / 2 + 4
      ctx.fillText(root.sectionTitle, titleX, titleY)
      ctx.restore()
    }

    if (idx < roots.length - 1) {
      const sectionNodes = getSectionNodesFlat(root, flat)
      const nextRoot = roots[idx + 1]

      ctx.save()
      ctx.strokeStyle = readableForeground(contrastBackground)
      ctx.globalAlpha = 0.14
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      if (state.layoutDirection === 'top-down') {
        let maxRight = root.x + root.width
        for (const node of sectionNodes) maxRight = Math.max(maxRight, node.x + node.width)
        const dividerX = (maxRight + nextRoot.x) / 2
        ctx.moveTo(dividerX, minY)
        ctx.lineTo(dividerX, maxY)
      } else {
        let maxBottom = root.y + root.height
        for (const node of sectionNodes) maxBottom = Math.max(maxBottom, node.y + node.height)
        const dividerY = (maxBottom + nextRoot.y) / 2
        ctx.moveTo(minX, dividerY)
        ctx.lineTo(maxX, dividerY)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  })

  // Draw nodes
  for (const node of flat) {
    ctx.save()
    ctx.translate(node.x, node.y)
    drawNodeCard(ctx, node, imageCache)
    ctx.restore()
  }

  // Draw legend and custom key (re-positioned against final bounds for accuracy)
  const finalOverlays = positionOverlayBoxes(
    hasLegendContent(legendContent) ? { position: state.legend.position, dims: legendDims } : null,
    colorKeyEntries.length > 0 ? { position: state.colorKey.position, dims: colorKeyDims } : null,
    { minX, minY, maxX, maxY },
  )
  if (finalOverlays.legendBox) drawLegend(ctx, finalOverlays.legendBox, legendContent)
  if (finalOverlays.colorKeyBox) drawColorKey(ctx, finalOverlays.colorKeyBox, colorKeyEntries)

  return canvas
}

function getSectionNodesFlat(root: LayoutNode, allFlat: LayoutNode[]): LayoutNode[] {
  const ids = new Set<string>([root.id])
  let found = true
  while (found) {
    found = false
    for (const n of allFlat) {
      if (!ids.has(n.id) && ids.has(n.reportsTo)) {
        ids.add(n.id)
        found = true
      }
    }
  }
  return allFlat.filter(n => ids.has(n.id))
}

// ── Drawing helpers ─────────────────────────────────────────

function drawNodeCard(ctx: CanvasRenderingContext2D, node: LayoutNode, imageCache: Map<string, HTMLImageElement>) {
  const w = NODE_WIDTH
  const h = NODE_HEIGHT
  const radius = 8

  // Background
  drawRoundedRect(ctx, 0, 0, w, h, radius)
  ctx.fillStyle = '#1a1a24'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Top accent bar
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(w - radius, 0)
  ctx.arcTo(w, 0, w, radius, radius)
  ctx.lineTo(w, 3)
  ctx.lineTo(0, 3)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
  ctx.fillStyle = node.nodeColor
  ctx.fill()
  ctx.restore()

  // Avatar
  const avatarX = 14
  const avatarY = h / 2
  const avatarR = AVATAR_SIZE / 2
  const img = node.imageDataUrl ? imageCache.get(node.imageDataUrl) : null

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, avatarX, avatarY - avatarR, AVATAR_SIZE, AVATAR_SIZE)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
  } else {
    const initials = getInitials(node.name)
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.fillStyle = node.nodeColor + '30'
    ctx.fill()
    ctx.strokeStyle = node.nodeColor + '50'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = node.nodeColor
    ctx.fillText(initials, avatarX + avatarR, avatarY)
  }

  // Text
  const textX = avatarX + AVATAR_SIZE + 12
  const maxTextW = w - textX - 10

  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(truncateText(ctx, node.name, maxTextW), textX, 15)

  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.64)'
  ctx.fillText(truncateText(ctx, node.title, maxTextW), textX, 34)

  if (node.department) {
    ctx.font = '400 10px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.fillText(truncateText(ctx, node.department, maxTextW), textX, 52)
  }
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

// ── Export as PNG ────────────────────────────────────────────

export async function exportPNG(
  state: OrgChartState,
  filename = 'org-chart.png',
  options: ImageExportOptions = {},
): Promise<void> {
  const canvas = await renderToCanvas(state, options)
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
  state: OrgChartState,
  options: ImageExportOptions = {},
): Promise<void> {
  const canvas = await renderToCanvas(state, options)
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
          'Failed to copy to clipboard' + (err instanceof Error ? ': ' + err.message : ''),
        ))
      } finally {
        canvas.width = 0
        canvas.height = 0
      }
    }, 'image/png')
  })
}

// ── Export as SVG ────────────────────────────────────────────

export async function exportSVG(
  state: OrgChartState,
  filename = 'org-chart.svg',
  options: ImageExportOptions = {},
): Promise<void> {
  const { nodes, connections, connectorTypes } = state
  const flat = buildOrgChartLayout(nodes, state.layoutDirection).flat
  const roots = flat.filter(n => !n.reportsTo)

  // Pre-measure legend before sizing the viewport
  const legendContent = buildLegendContent(state)
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  const legendDimsPre = hasLegendContent(legendContent) && tempCtx
    ? measureLegend(tempCtx, legendContent)
    : { w: 0, h: 0 }
  const colorKeyEntries = state.colorKey.visible ? state.colorKey.entries : []
  const colorKeyDimsPre = tempCtx ? measureColorKey(tempCtx, colorKeyEntries) : { w: 0, h: 0 }

  const baseBounds = calcBounds(flat, connections)
  const hasTitles = roots.some(r => r.sectionTitle)
  const sectionOffset = hasTitles ? SECTION_TITLE_HEIGHT : 0
  const tentativeBounds = {
    minX: baseBounds.minX,
    minY: hasTitles ? baseBounds.minY - SECTION_TITLE_HEIGHT : baseBounds.minY,
    maxX: baseBounds.maxX,
    maxY: baseBounds.maxY,
  }
  const { legendBox: legendBoxPre, colorKeyBox: colorKeyBoxPre } = positionOverlayBoxes(
    hasLegendContent(legendContent) ? { position: state.legend.position, dims: legendDimsPre } : null,
    colorKeyEntries.length > 0 ? { position: state.colorKey.position, dims: colorKeyDimsPre } : null,
    tentativeBounds,
  )

  const overlayBoxesPre = [legendBoxPre, colorKeyBoxPre].filter((box): box is LegendBox => box !== null)
  const { minX, minY, maxX, maxY } = calcExportBounds(flat, connections, overlayBoxesPre, sectionOffset)
  const w = maxX - minX
  const h = maxY - minY

  const childMap = new Map<string, LayoutNode[]>()
  for (const n of flat) {
    if (n.reportsTo) {
      const arr = childMap.get(n.reportsTo) ?? []
      arr.push(n)
      childMap.set(n.reportsTo, arr)
    }
  }

  const backgroundColor = resolveRenderBackground(state, options)
  const contrastBackground = backgroundColor ?? state.background.color
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`,
    ...(backgroundColor
      ? [`<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="${backgroundColor}"/>`]
      : []),
    `<defs>`,
  ]

  // Add clip paths for avatars
  for (const node of flat) {
    if (node.imageDataUrl) {
      parts.push(`<clipPath id="avatar-${node.id}"><circle cx="${node.x + 14 + AVATAR_SIZE / 2}" cy="${node.y + NODE_HEIGHT / 2}" r="${AVATAR_SIZE / 2}"/></clipPath>`)
    }
  }
  parts.push(`</defs>`)

  // Primary connectors (tree edges)
  for (const parent of flat) {
    const children = childMap.get(parent.id) ?? []
    for (const child of children) {
      const path = routePrimaryEdge(parent, child, state.layoutDirection)
      const pathData = path.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
      const type = ensureVisibleConnectorType(
        getConnectorType(connectorTypes, getNodeConnectorTypeId(child)),
        contrastBackground,
      )
      const dash = type.style === 'dashed' ? ' stroke-dasharray="8,5"'
        : type.style === 'dotted' ? ' stroke-dasharray="2,3"' : ''
      if (type.style === 'double') {
        parts.push(`<path d="${pathData}" fill="none" stroke="${type.color}" stroke-width="${type.lineWidth + 3}" stroke-linecap="round" stroke-linejoin="round"/>`)
        parts.push(`<path d="${pathData}" fill="none" stroke="${contrastBackground}" stroke-width="${Math.max(1, type.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`)
      } else {
        parts.push(`<path d="${pathData}" fill="none" stroke="${type.color}" stroke-width="${type.lineWidth}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`)
      }
    }
  }

  // Secondary edges
  if (connections.length > 0) {
    const nodeByIdSvg = new Map<string, LayoutNode>()
    for (const n of flat) nodeByIdSvg.set(n.id, n)

    for (const conn of connections) {
      const from = nodeByIdSvg.get(conn.fromId)
      const to = nodeByIdSvg.get(conn.toId)
      if (!from || !to) continue
      const path = routeSecondaryEdge(from, to)
      if (path.length === 0) continue
      const type = ensureVisibleConnectorType(
        getConnectorType(connectorTypes, conn.typeId),
        contrastBackground,
      )

      const dashAttr = (() => {
        switch (type.style) {
          case 'solid':  return ''
          case 'dashed': return ' stroke-dasharray="8,5"'
          case 'dotted': return ' stroke-dasharray="2,3"'
          case 'double': return '' // handled below with two parallel paths
        }
      })()

      const [sx, sy] = path[0]
      const [ex, ey] = path[1]

      if (type.style === 'double') {
        // Offset two parallel strokes perpendicular to the line
        const dx = ex - sx
        const dy = ey - sy
        const len = Math.hypot(dx, dy) || 1
        const nx = -dy / len * 2
        const ny = dx / len * 2
        const halfW = Math.max(1, type.lineWidth * 0.6)
        parts.push(`<g stroke="${type.color}" stroke-width="${halfW}" stroke-linecap="round" fill="none">`)
        parts.push(`  <path d="M${sx + nx},${sy + ny} L${ex + nx},${ey + ny}"/>`)
        parts.push(`  <path d="M${sx - nx},${sy - ny} L${ex - nx},${ey - ny}"/>`)
        parts.push(`</g>`)
      } else {
        parts.push(`<path d="M${sx},${sy} L${ex},${ey}" fill="none" stroke="${type.color}" stroke-width="${type.lineWidth}" stroke-linecap="round"${dashAttr}/>`)
      }
    }
  }

  // Section titles and dividers
  roots.forEach((root, idx) => {
    if (root.sectionTitle) {
      const titleX = root.x + root.width / 2
      const titleY = root.y - SECTION_TITLE_HEIGHT / 2 + 4
      parts.push(`<text x="${titleX}" y="${titleY}" text-anchor="middle" fill="${readableForeground(contrastBackground)}" fill-opacity="0.82" font-size="18" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(root.sectionTitle)}</text>`)
    }

    if (idx < roots.length - 1) {
      const sectionNodes = getSectionNodesFlat(root, flat)
      const nextRoot = roots[idx + 1]
      const dividerColor = readableForeground(contrastBackground)
      if (state.layoutDirection === 'top-down') {
        let maxRight = root.x + root.width
        for (const node of sectionNodes) maxRight = Math.max(maxRight, node.x + node.width)
        const dividerX = (maxRight + nextRoot.x) / 2
        parts.push(`<line x1="${dividerX}" y1="${minY}" x2="${dividerX}" y2="${maxY}" stroke="${dividerColor}" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="6,4"/>`)
      } else {
        let maxBottom = root.y + root.height
        for (const node of sectionNodes) maxBottom = Math.max(maxBottom, node.y + node.height)
        const dividerY = (maxBottom + nextRoot.y) / 2
        parts.push(`<line x1="${minX}" y1="${dividerY}" x2="${maxX}" y2="${dividerY}" stroke="${dividerColor}" stroke-opacity="0.14" stroke-width="1" stroke-dasharray="6,4"/>`)
      }
    }
  })

  // Nodes
  for (const node of flat) {
    const nx = node.x
    const ny = node.y
    parts.push(`<g>`)
    parts.push(`<rect x="${nx}" y="${ny}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="8" fill="#1a1a24" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`)
    parts.push(`<rect x="${nx}" y="${ny}" width="${NODE_WIDTH}" height="3" rx="2" fill="${node.nodeColor}"/>`)

    // Avatar
    if (node.imageDataUrl) {
      parts.push(`<image href="${node.imageDataUrl}" x="${nx + 14}" y="${ny + NODE_HEIGHT / 2 - AVATAR_SIZE / 2}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" clip-path="url(#avatar-${node.id})"/>`)
    } else {
      const initials = getInitials(node.name)
      parts.push(`<circle cx="${nx + 14 + AVATAR_SIZE / 2}" cy="${ny + NODE_HEIGHT / 2}" r="${AVATAR_SIZE / 2}" fill="${node.nodeColor}30" stroke="${node.nodeColor}50" stroke-width="1"/>`)
      parts.push(`<text x="${nx + 14 + AVATAR_SIZE / 2}" y="${ny + NODE_HEIGHT / 2}" text-anchor="middle" dominant-baseline="central" fill="${node.nodeColor}" font-size="13" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(initials)}</text>`)
    }

    // Text
    const textX = nx + 14 + AVATAR_SIZE + 12
    parts.push(`<text x="${textX}" y="${ny + 24}" fill="#ffffff" font-size="13" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.name)}</text>`)
    parts.push(`<text x="${textX}" y="${ny + 43}" fill="rgba(255,255,255,0.64)" font-size="11" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.title)}</text>`)
    if (node.department) {
      parts.push(`<text x="${textX}" y="${ny + 58}" fill="rgba(255,255,255,0.42)" font-size="10" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.department)}</text>`)
    }
    parts.push(`</g>`)
  }

  // Legend and custom key (after nodes so they overlay cleanly)
  const finalOverlays = positionOverlayBoxes(
    hasLegendContent(legendContent) ? { position: state.legend.position, dims: legendDimsPre } : null,
    colorKeyEntries.length > 0 ? { position: state.colorKey.position, dims: colorKeyDimsPre } : null,
    { minX, minY, maxX, maxY },
  )
  if (finalOverlays.legendBox) emitSVGLegend(parts, finalOverlays.legendBox, legendContent)
  if (finalOverlays.colorKeyBox) emitSVGColorKey(parts, finalOverlays.colorKeyBox, colorKeyEntries)

  parts.push(`</svg>`)

  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}

// ── Export as JSON ───────────────────────────────────────────

export function exportJSON(state: OrgChartState, filename = 'org-chart.json'): void {
  downloadText(JSON.stringify(state, null, 2), filename, 'application/json')
}

// Validates connection typeId against a set of known ids. Returns true if the
// caller should keep the connection; false if it should be swept.
function isKnownTypeId(typeId: unknown, knownIds: Set<string>): boolean {
  return typeof typeId === 'string' && knownIds.has(typeId)
}

export function importJSON(json: string): OrgChartState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: failed to parse')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid org chart JSON: expected an object')
  }

  const obj = parsed as Record<string, unknown>

  // nodes — required, must be an array of objects with id + name
  if (!Array.isArray(obj.nodes)) {
    throw new Error('Invalid org chart JSON: expected { nodes: [...] }')
  }
  for (const node of obj.nodes) {
    if (!node || typeof node !== 'object' || !('id' in node) || !('name' in node)) {
      throw new Error('Invalid org chart JSON: nodes must have id and name fields')
    }
    // Backward compat: default sectionTitle if missing (preserves existing behavior)
    const n = node as Record<string, unknown>
    if (!('sectionTitle' in n)) n.sectionTitle = ''
  }
  const nodes = obj.nodes as OrgNode[]

  // connections — default to [], shallow-validate shape
  let connections: Connection[]
  if (!('connections' in obj)) {
    connections = []
  } else if (!Array.isArray(obj.connections)) {
    throw new Error('Invalid org chart JSON: connections must be an array')
  } else {
    connections = obj.connections.filter((c): c is Connection => {
      if (!c || typeof c !== 'object') return false
      const cc = c as Record<string, unknown>
      return typeof cc.id === 'string'
        && typeof cc.fromId === 'string'
        && typeof cc.toId === 'string'
        && typeof cc.typeId === 'string'
    })
  }

  // connectorTypes — default or repair via mergeWithDefaults
  const connectorTypes: ConnectorType[] = 'connectorTypes' in obj
    ? mergeWithDefaults(obj.connectorTypes)
    : createDefaultConnectorTypes()

  // legend — default if missing or invalid
  const legend: LegendConfig = mergeLegendWithDefaults(obj.legend)
  const colorKey: ColorKeyConfig = 'colorKey' in obj
    ? mergeColorKeyWithDefaults(obj.colorKey)
    : createDefaultColorKey()

  const background = 'background' in obj
    ? mergeBackgroundWithDefaults(obj.background)
    : createDefaultBackground()
  const layoutDirection = obj.layoutDirection === 'left-right' ? 'left-right' : 'top-down'

  // Sweep orphan connections whose from/to node is missing
  const nodeIds = new Set(nodes.map(n => n.id))
  connections = connections.filter(c => nodeIds.has(c.fromId) && nodeIds.has(c.toId))

  // Sweep connections with unknown typeIds (defensive — mergeWithDefaults guarantees 4 known ids)
  const typeIds = new Set<string>(connectorTypes.map(t => t.id))
  connections = connections.filter(c => isKnownTypeId(c.typeId, typeIds))

  return { nodes, connections, connectorTypes, legend, colorKey, background, layoutDirection }
}

// ── Export as CSV ────────────────────────────────────────────

export function exportCSV(state: OrgChartState, filename = 'org-chart.csv'): void {
  const { nodes, connections, connectorTypes } = state

  const nameMap = new Map(nodes.map(n => [n.id, n.name]))
  const typeMap = new Map(connectorTypes.map(t => [t.id, t.label]))

  // Build a map from node id to its root's sectionTitle
  const sectionMap = new Map<string, string>()
  for (const n of nodes) {
    let current = n
    while (current.reportsTo) {
      const parent = nodes.find(p => p.id === current.reportsTo)
      if (!parent) break
      current = parent
    }
    sectionMap.set(n.id, current.sectionTitle || '')
  }

  // Build outgoing secondary relationships per source node.
  // Uses human-readable type labels so Excel users can read without a key.
  const outgoing = new Map<string, string[]>()
  for (const conn of connections) {
    const targetName = nameMap.get(conn.toId)
    if (!targetName) continue
    const typeLabel = typeMap.get(conn.typeId) ?? conn.typeId
    const formatted = `${targetName} (${typeLabel})`
    const existing = outgoing.get(conn.fromId) ?? []
    existing.push(formatted)
    outgoing.set(conn.fromId, existing)
  }

  const header = [
    'Name', 'Title', 'Department', 'Section', 'Reports To',
    'Email', 'Phone', 'Location', 'Secondary Relationships',
  ]
  const rows = nodes.map(n => [
    csvEscape(n.name),
    csvEscape(n.title),
    csvEscape(n.department),
    csvEscape(sectionMap.get(n.id) ?? ''),
    csvEscape(n.reportsTo ? (nameMap.get(n.reportsTo) ?? '') : ''),
    csvEscape(n.email),
    csvEscape(n.phone),
    csvEscape(n.location),
    csvEscape((outgoing.get(n.id) ?? []).join('; ')),
  ].join(','))

  const csv = [header.join(','), ...rows].join('\n')
  downloadText(csv, filename, 'text/csv')
}

// ── Utilities ───────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
