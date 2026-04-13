import type {
  OrgNode, OrgChartState,
  Connection, ConnectorType, ConnectorTypeId, LegendConfig, LegendPosition,
} from './types.ts'
import {
  NODE_WIDTH, NODE_HEIGHT, H_SPACING, V_SPACING,
  AVATAR_SIZE, CONNECTOR_RADIUS,
  SECTION_TITLE_HEIGHT, SECTION_GAP,
  createDefaultConnectorTypes, createDefaultLegend, mergeWithDefaults,
  getConnectorType,
} from './types.ts'
import { drawStyledLine, routeSecondaryEdge } from './connectorStyle.ts'
import { downloadBlob, downloadText } from '@/utils/download.ts'
import { loadImage } from '@/utils/imageProcessing.ts'

// ── Layout types (local) ────────────────────────────────────

interface LayoutNode extends OrgNode {
  x: number
  y: number
  width: number
  height: number
  children: LayoutNode[]
}

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

// ── Build layout tree ───────────────────────────────────────

function buildLayout(nodes: OrgNode[]): LayoutNode[] {
  const roots = nodes.filter(n => !n.reportsTo)
  if (roots.length === 0) return []

  const childMap = new Map<string, OrgNode[]>()
  for (const n of nodes) {
    if (n.reportsTo) {
      const arr = childMap.get(n.reportsTo) ?? []
      arr.push(n)
      childMap.set(n.reportsTo, arr)
    }
  }

  const buildSubtree = (node: OrgNode): LayoutNode => {
    const children = (childMap.get(node.id) ?? []).map(buildSubtree)
    return { ...node, x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT, children }
  }

  const allFlat: LayoutNode[] = []
  let xOffset = 0

  for (const root of roots) {
    const tree = buildSubtree(root)
    const treeWidth = layoutTopDown(tree, 0)
    const yShift = root.sectionTitle ? SECTION_TITLE_HEIGHT : 0
    shiftX(tree, xOffset)
    if (yShift > 0) shiftY(tree, yShift)

    const flat = flattenTree(tree)
    allFlat.push(...flat)
    xOffset += treeWidth + SECTION_GAP
  }

  // Apply manual offsets from OrgNode
  for (const ln of allFlat) {
    ln.x += ln.offsetX
    ln.y += ln.offsetY
  }

  return allFlat
}

function shiftY(node: LayoutNode, dy: number) {
  node.y += dy
  for (const child of node.children) shiftY(child, dy)
}

function layoutTopDown(node: LayoutNode, depth: number): number {
  node.y = depth * (NODE_HEIGHT + V_SPACING)
  if (node.children.length === 0) { node.x = 0; return NODE_WIDTH }

  let totalWidth = 0
  const widths: number[] = []
  for (const child of node.children) {
    const w = layoutTopDown(child, depth + 1)
    widths.push(w)
    totalWidth += w
  }
  totalWidth += (node.children.length - 1) * H_SPACING

  let offset = 0
  for (let i = 0; i < node.children.length; i++) {
    shiftX(node.children[i], offset)
    offset += widths[i] + H_SPACING
  }

  const first = node.children[0]
  const last = node.children[node.children.length - 1]
  node.x = (first.x + last.x + last.width) / 2 - NODE_WIDTH / 2
  return Math.max(NODE_WIDTH, totalWidth)
}

function shiftX(node: LayoutNode, dx: number) {
  node.x += dx
  for (const child of node.children) shiftX(child, dx)
}

function flattenTree(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node]
  for (const child of node.children) result.push(...flattenTree(child))
  return result
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

async function renderToCanvas(state: OrgChartState): Promise<HTMLCanvasElement> {
  const { nodes, connections, connectorTypes } = state
  const flat = buildLayout(nodes)
  const imageCache = await preloadImages(nodes)
  const roots = flat.filter(n => !n.reportsTo)

  // Expand bounds to include section titles AND secondary edge anchors
  const { minX, minY: rawMinY, maxX, maxY } = calcBounds(flat, connections)
  const hasTitles = roots.some(r => r.sectionTitle)
  const minY = hasTitles ? rawMinY - SECTION_TITLE_HEIGHT : rawMinY
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

  // Draw primary connectors (tree edges)
  const primaryType = getConnectorType(connectorTypes, 'primary')
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
      drawConnector(ctx, parent, child, primaryType)
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
      const type = getConnectorType(connectorTypes, conn.typeId)
      drawStyledLine(ctx, path, type, 1) // native scale, no zoom dash adjustment
    }
  }

  // Draw section titles and dividers
  roots.forEach((root, idx) => {
    if (root.sectionTitle) {
      ctx.save()
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.textAlign = 'center'
      const titleX = root.x + root.width / 2
      const titleY = root.y - SECTION_TITLE_HEIGHT / 2 + 4
      ctx.fillText(root.sectionTitle, titleX, titleY)
      ctx.restore()
    }

    if (idx < roots.length - 1) {
      const sectionNodes = getSectionNodesFlat(root, flat)
      let maxRight = root.x + root.width
      for (const sn of sectionNodes) maxRight = Math.max(maxRight, sn.x + sn.width)
      const nextRoot = roots[idx + 1]
      const dividerX = (maxRight + nextRoot.x) / 2

      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(dividerX, minY)
      ctx.lineTo(dividerX, maxY)
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

function drawConnector(
  ctx: CanvasRenderingContext2D,
  parent: LayoutNode,
  child: LayoutNode,
  primaryType: ConnectorType,
) {
  const px = parent.x + parent.width / 2
  const py = parent.y + parent.height
  const cx = child.x + child.width / 2
  const cy = child.y
  const midY = (py + cy) / 2
  const r = Math.min(CONNECTOR_RADIUS, Math.abs(midY - py), Math.abs(cx - px) / 2 || CONNECTOR_RADIUS)

  ctx.save()
  ctx.strokeStyle = primaryType.color
  ctx.lineWidth = primaryType.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  if (Math.abs(cx - px) < 1) {
    ctx.moveTo(px, py)
    ctx.lineTo(cx, cy)
  } else {
    ctx.moveTo(px, py)
    ctx.lineTo(px, midY - r)
    if (cx > px) {
      ctx.arcTo(px, midY, px + r, midY, r)
      ctx.lineTo(cx - r, midY)
      ctx.arcTo(cx, midY, cx, midY + r, r)
    } else {
      ctx.arcTo(px, midY, px - r, midY, r)
      ctx.lineTo(cx + r, midY)
      ctx.arcTo(cx, midY, cx, midY + r, r)
    }
    ctx.lineTo(cx, cy)
  }
  ctx.stroke()
  ctx.restore()
}

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

  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(truncateText(ctx, node.name, maxTextW), textX, 16)

  ctx.font = '400 10px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.50)'
  ctx.fillText(truncateText(ctx, node.title, maxTextW), textX, 34)

  if (node.department) {
    ctx.font = '400 9px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.30)'
    ctx.fillText(truncateText(ctx, node.department, maxTextW), textX, 50)
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

export async function exportPNG(state: OrgChartState, filename = 'org-chart.png'): Promise<void> {
  const canvas = await renderToCanvas(state)
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

export async function copyPNGToClipboard(state: OrgChartState): Promise<void> {
  const canvas = await renderToCanvas(state)
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

export async function exportSVG(state: OrgChartState, filename = 'org-chart.svg'): Promise<void> {
  const { nodes, connections, connectorTypes } = state
  const flat = buildLayout(nodes)
  const roots = flat.filter(n => !n.reportsTo)
  const { minX, minY: rawMinY, maxX, maxY } = calcBounds(flat, connections)
  const hasTitles = roots.some(r => r.sectionTitle)
  const minY = hasTitles ? rawMinY - SECTION_TITLE_HEIGHT : rawMinY
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

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`,
    `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#0a0a14"/>`,
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
  const primaryType = getConnectorType(connectorTypes, 'primary')
  for (const parent of flat) {
    const children = childMap.get(parent.id) ?? []
    for (const child of children) {
      const px = parent.x + parent.width / 2
      const py = parent.y + parent.height
      const cx = child.x + child.width / 2
      const cy = child.y
      const midY = (py + cy) / 2
      parts.push(`<path d="M${px},${py} L${px},${midY} L${cx},${midY} L${cx},${cy}" fill="none" stroke="${primaryType.color}" stroke-width="${primaryType.lineWidth}"/>`)
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
      const type = getConnectorType(connectorTypes, conn.typeId)

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
      parts.push(`<text x="${titleX}" y="${titleY}" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="18" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(root.sectionTitle)}</text>`)
    }

    if (idx < roots.length - 1) {
      const sectionNodes = getSectionNodesFlat(root, flat)
      let maxRight = root.x + root.width
      for (const sn of sectionNodes) maxRight = Math.max(maxRight, sn.x + sn.width)
      const nextRoot = roots[idx + 1]
      const dividerX = (maxRight + nextRoot.x) / 2
      parts.push(`<line x1="${dividerX}" y1="${minY}" x2="${dividerX}" y2="${maxY}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="6,4"/>`)
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
    parts.push(`<text x="${textX}" y="${ny + 24}" fill="#ffffff" font-size="12" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.name)}</text>`)
    parts.push(`<text x="${textX}" y="${ny + 42}" fill="rgba(255,255,255,0.5)" font-size="10" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.title)}</text>`)
    if (node.department) {
      parts.push(`<text x="${textX}" y="${ny + 56}" fill="rgba(255,255,255,0.3)" font-size="9" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.department)}</text>`)
    }
    parts.push(`</g>`)
  }

  parts.push(`</svg>`)

  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}

// ── Export as JSON ───────────────────────────────────────────

export function exportJSON(state: OrgChartState, filename = 'org-chart.json'): void {
  downloadText(JSON.stringify(state, null, 2), filename, 'application/json')
}

// Local type guard — export.ts is a pure module without a dependency on
// orgChartStore.ts, so it defines its own narrower instead of importing.
function isLegendPosition(value: unknown): value is LegendPosition {
  return value === 'top-left' || value === 'top-right'
    || value === 'bottom-left' || value === 'bottom-right'
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
  let legend: LegendConfig
  const rawLegend = obj.legend
  if (rawLegend && typeof rawLegend === 'object') {
    const pos = (rawLegend as Record<string, unknown>).position
    legend = isLegendPosition(pos) ? { position: pos } : createDefaultLegend()
  } else {
    legend = createDefaultLegend()
  }

  // Sweep orphan connections whose from/to node is missing
  const nodeIds = new Set(nodes.map(n => n.id))
  connections = connections.filter(c => nodeIds.has(c.fromId) && nodeIds.has(c.toId))

  // Sweep connections with unknown typeIds (defensive — mergeWithDefaults guarantees 4 known ids)
  const typeIds = new Set<string>(connectorTypes.map(t => t.id))
  connections = connections.filter(c => isKnownTypeId(c.typeId, typeIds))

  return { nodes, connections, connectorTypes, legend }
}

// ── Export as CSV ────────────────────────────────────────────

export function exportCSV(nodes: OrgNode[], filename = 'org-chart.csv'): void {
  const nameMap = new Map(nodes.map(n => [n.id, n.name]))

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

  const header = ['Name', 'Title', 'Department', 'Section', 'Reports To', 'Email', 'Phone', 'Location']
  const rows = nodes.map(n => [
    csvEscape(n.name),
    csvEscape(n.title),
    csvEscape(n.department),
    csvEscape(sectionMap.get(n.id) ?? ''),
    csvEscape(n.reportsTo ? (nameMap.get(n.reportsTo) ?? '') : ''),
    csvEscape(n.email),
    csvEscape(n.phone),
    csvEscape(n.location),
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
