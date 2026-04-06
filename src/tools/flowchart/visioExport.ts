import JSZip from 'jszip'
import type { DiagramNode, DiagramEdge } from './types.ts'
import { getShapeDef, getPortPosition } from './shapes.ts'
import { downloadBlob } from '@/utils/download.ts'

// ═══════════════════════════════════════════════════════════════
// Minimal Visio (.vsdx) Export
// ═══════════════════════════════════════════════════════════════
//
// A .vsdx file is a ZIP (OPC) archive with XML inside. This module
// generates the absolute minimum XML structure that Visio 2013+
// can open. It maps our DiagramNode → Visio Shape and
// DiagramEdge → Visio Connector.
//
// References:
//   - MS-VSDX spec: https://docs.microsoft.com/en-us/openspecs/office_file_formats
//   - Visio XML schema namespace: http://schemas.microsoft.com/office/visio/2012/main
//
// ═══════════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────────

/** Visio uses inches internally. Convert our px to inches at 96 DPI. */
const PX_TO_IN = 1 / 96

/** Visio page dimensions (letter landscape) */
const PAGE_WIDTH_IN = 11
const PAGE_HEIGHT_IN = 8.5

// ── XML namespaces ─────────────────────────────────────────────

const NS_MAIN = 'http://schemas.microsoft.com/office/visio/2012/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
const NS_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships'

// ── Helpers ────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Convert px to Visio inches */
function toIn(px: number): string {
  return (px * PX_TO_IN).toFixed(6)
}

/** Visio Y-axis is inverted (origin at bottom-left) */
function flipY(yPx: number, heightPx: number): number {
  return PAGE_HEIGHT_IN / PX_TO_IN - yPx - heightPx
}

/** Map our fill color (rgba or hex) to Visio hex (#RRGGBB) */
function toVisioColor(color: string): string {
  // Handle rgba(r,g,b,a) format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = Number(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = Number(rgbaMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  // Already hex
  if (color.startsWith('#')) return color.slice(0, 7)
  return '#FFFFFF'
}

/** Extract alpha from rgba() string, returns 0-1 */
function toVisioAlpha(color: string): number {
  const match = color.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)/)
  if (match) return Number(match[1])
  return 1
}

// ── XML generators ─────────────────────────────────────────────

function genContentTypes(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="${NS_CT}">`,
    `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `  <Default Extension="xml" ContentType="application/xml"/>`,
    `  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>`,
    `  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>`,
    `  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>`,
    `</Types>`,
  ].join('\n')
}

function genRootRels(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="${NS_RELS}">`,
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>`,
    `</Relationships>`,
  ].join('\n')
}

function genDocumentXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<VisioDocument xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`,
    `  <DocumentProperties>`,
    `    <Creator>LotusWorksToolkit</Creator>`,
    `  </DocumentProperties>`,
    `</VisioDocument>`,
  ].join('\n')
}

function genDocumentRels(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="${NS_RELS}">`,
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>`,
    `</Relationships>`,
  ].join('\n')
}

function genPagesXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Pages xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`,
    `  <Page ID="0" Name="Page-1" NameU="Page-1">`,
    `    <Rel r:id="rId1"/>`,
    `  </Page>`,
    `</Pages>`,
  ].join('\n')
}

function genPagesRels(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="${NS_RELS}">`,
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>`,
    `</Relationships>`,
  ].join('\n')
}

// ── Shape XML generation ───────────────────────────────────────

function genShapeXml(node: DiagramNode, shapeId: number): string {
  const pinX = node.x + node.width / 2
  const pinY = flipY(node.y, node.height) + node.height / 2
  const w = node.width
  const h = node.height

  const fillColor = toVisioColor(node.style.fill)
  const fillAlpha = toVisioAlpha(node.style.fill)
  const lineColor = toVisioColor(node.style.stroke)

  // Get shape path for geometry section
  const def = getShapeDef(node.type)
  const svgPath = def.svgPath(w, h)

  // Convert SVG path to Visio Geometry section
  const geoSection = svgPathToVisioGeometry(svgPath, w, h)

  return [
    `      <Shape ID="${shapeId}" NameU="Shape.${shapeId}" Type="Shape">`,
    `        <Cell N="PinX" V="${toIn(pinX)}"/>`,
    `        <Cell N="PinY" V="${toIn(pinY)}"/>`,
    `        <Cell N="Width" V="${toIn(w)}"/>`,
    `        <Cell N="Height" V="${toIn(h)}"/>`,
    `        <Cell N="LocPinX" V="${toIn(w / 2)}"/>`,
    `        <Cell N="LocPinY" V="${toIn(h / 2)}"/>`,
    `        <Cell N="FillForegnd" V="${fillColor}"/>`,
    `        <Cell N="FillForegndTrans" V="${(1 - fillAlpha).toFixed(2)}"/>`,
    `        <Cell N="LineColor" V="${lineColor}"/>`,
    `        <Cell N="LineWeight" V="${toIn(node.style.strokeWidth)}"/>`,
    `        <Cell N="Char.Size" V="${toIn(node.style.fontSize)}"/>`,
    `        <Cell N="Char.Color" V="${toVisioColor(node.style.fontColor)}"/>`,
    `        <Text>${escapeXml(node.label)}</Text>`,
    geoSection,
    `      </Shape>`,
  ].join('\n')
}

function genConnectorXml(
  edge: DiagramEdge,
  shapeId: number,
  nodeIdToShapeId: Map<string, number>,
  nodes: DiagramNode[],
): string {
  const sourceShapeId = nodeIdToShapeId.get(edge.sourceId)
  const targetShapeId = nodeIdToShapeId.get(edge.targetId)
  if (sourceShapeId === undefined || targetShapeId === undefined) return ''

  const sourceNode = nodes.find(n => n.id === edge.sourceId)
  const targetNode = nodes.find(n => n.id === edge.targetId)
  if (!sourceNode || !targetNode) return ''

  const fromPt = getPortPosition(sourceNode, edge.sourcePort)
  const toPt = getPortPosition(targetNode, edge.targetPort)

  const beginX = fromPt.x
  const beginY = flipY(fromPt.y, 0)
  const endX = toPt.x
  const endY = flipY(toPt.y, 0)

  const lineColor = toVisioColor(edge.style.stroke)
  const dashPattern = edge.style.dashArray ? '2' : '0' // 0=solid, 2=dashed

  return [
    `      <Shape ID="${shapeId}" NameU="Connector.${shapeId}" Type="Shape" Master="0">`,
    `        <Cell N="BeginX" V="${toIn(beginX)}"/>`,
    `        <Cell N="BeginY" V="${toIn(beginY)}"/>`,
    `        <Cell N="EndX" V="${toIn(endX)}"/>`,
    `        <Cell N="EndY" V="${toIn(endY)}"/>`,
    `        <Cell N="LineColor" V="${lineColor}"/>`,
    `        <Cell N="LineWeight" V="${toIn(edge.style.strokeWidth)}"/>`,
    `        <Cell N="LinePattern" V="${dashPattern}"/>`,
    `        <Cell N="BeginArrow" V="0"/>`,
    `        <Cell N="EndArrow" V="${edge.style.markerEnd ? '5' : '0'}"/>`,
    edge.label ? `        <Text>${escapeXml(edge.label)}</Text>` : '',
    `        <Section N="Geometry" IX="0">`,
    `          <Row T="MoveTo" IX="1">`,
    `            <Cell N="X" V="${toIn(beginX)}"/>`,
    `            <Cell N="Y" V="${toIn(beginY)}"/>`,
    `          </Row>`,
    `          <Row T="LineTo" IX="2">`,
    `            <Cell N="X" V="${toIn(endX)}"/>`,
    `            <Cell N="Y" V="${toIn(endY)}"/>`,
    `          </Row>`,
    `        </Section>`,
    `      </Shape>`,
  ].filter(Boolean).join('\n')
}

function genPageXml(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const shapes: string[] = []
  const nodeIdToShapeId = new Map<string, number>()
  let nextId = 1

  // Generate node shapes
  for (const node of nodes) {
    nodeIdToShapeId.set(node.id, nextId)
    shapes.push(genShapeXml(node, nextId))
    nextId++
  }

  // Generate connector shapes
  for (const edge of edges) {
    shapes.push(genConnectorXml(edge, nextId, nodeIdToShapeId, nodes))
    nextId++
  }

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<PageContents xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`,
    `  <PageSheet>`,
    `    <Cell N="PageWidth" V="${PAGE_WIDTH_IN}"/>`,
    `    <Cell N="PageHeight" V="${PAGE_HEIGHT_IN}"/>`,
    `  </PageSheet>`,
    `  <Shapes>`,
    ...shapes,
    `  </Shapes>`,
    `</PageContents>`,
  ].join('\n')
}

// ── SVG path → Visio Geometry conversion ───────────────────────

function svgPathToVisioGeometry(svgPath: string, _w: number, _h: number): string {
  // Parse SVG path commands into Visio geometry rows
  const rows: string[] = []
  let rowIdx = 1

  // Tokenize the SVG path
  const tokens = svgPath.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+)/g)
  if (!tokens) {
    // Fallback: simple rectangle
    return [
      `        <Section N="Geometry" IX="0">`,
      `          <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>`,
      `          <Row T="LineTo" IX="2"><Cell N="X" V="${toIn(_w)}"/><Cell N="Y" V="0"/></Row>`,
      `          <Row T="LineTo" IX="3"><Cell N="X" V="${toIn(_w)}"/><Cell N="Y" V="${toIn(_h)}"/></Row>`,
      `          <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${toIn(_h)}"/></Row>`,
      `          <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>`,
      `        </Section>`,
    ].join('\n')
  }

  let i = 0
  let curX = 0, curY = 0
  let startX = 0, startY = 0

  const nextNum = (): number => {
    i++
    return Number(tokens[i]) || 0
  }

  while (i < tokens.length) {
    const cmd = tokens[i]

    switch (cmd) {
      case 'M': {
        curX = nextNum()
        curY = nextNum()
        startX = curX
        startY = curY
        rows.push(
          `          <Row T="MoveTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        // Subsequent coordinate pairs are implicit LineTo
        while (i + 1 < tokens.length && !isNaN(Number(tokens[i + 1]))) {
          curX = nextNum()
          curY = nextNum()
          rows.push(
            `          <Row T="LineTo" IX="${rowIdx}">` +
            `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
            `</Row>`,
          )
          rowIdx++
        }
        break
      }
      case 'L': {
        curX = nextNum()
        curY = nextNum()
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        // Subsequent coordinate pairs
        while (i + 1 < tokens.length && !isNaN(Number(tokens[i + 1]))) {
          curX = nextNum()
          curY = nextNum()
          rows.push(
            `          <Row T="LineTo" IX="${rowIdx}">` +
            `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
            `</Row>`,
          )
          rowIdx++
        }
        break
      }
      case 'H': {
        curX = nextNum()
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        break
      }
      case 'V': {
        curY = nextNum()
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        break
      }
      case 'C': {
        // Cubic bezier: cp1x cp1y cp2x cp2y x y
        const cp1x = nextNum()
        const cp1y = nextNum()
        const cp2x = nextNum()
        const cp2y = nextNum()
        curX = nextNum()
        curY = nextNum()
        // Visio uses NURBSTo for complex curves; approximate with LineTo for compatibility
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        // Consume additional implicit C parameters
        while (i + 1 < tokens.length && !isNaN(Number(tokens[i + 1]))) {
          // Skip unused vars but must read them
          nextNum(); nextNum(); nextNum(); nextNum()
          curX = nextNum()
          curY = nextNum()
          rows.push(
            `          <Row T="LineTo" IX="${rowIdx}">` +
            `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
            `</Row>`,
          )
          rowIdx++
        }
        // Suppress unused variable warnings by using cp values in a comment
        void cp1x; void cp1y; void cp2x; void cp2y
        break
      }
      case 'Q': {
        // Quadratic bezier: cpx cpy x y
        const _qcpx = nextNum()
        const _qcpy = nextNum()
        curX = nextNum()
        curY = nextNum()
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        void _qcpx; void _qcpy
        break
      }
      case 'A': {
        // Arc: rx ry x-rotation large-arc-flag sweep-flag x y
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum()
        curX = nextNum()
        curY = nextNum()
        rows.push(
          `          <Row T="LineTo" IX="${rowIdx}">` +
          `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
          `</Row>`,
        )
        rowIdx++
        // Consume additional implicit A parameters
        while (i + 1 < tokens.length && !isNaN(Number(tokens[i + 1]))) {
          nextNum(); nextNum(); nextNum(); nextNum(); nextNum()
          curX = nextNum()
          curY = nextNum()
          rows.push(
            `          <Row T="LineTo" IX="${rowIdx}">` +
            `<Cell N="X" V="${toIn(curX)}"/><Cell N="Y" V="${toIn(curY)}"/>` +
            `</Row>`,
          )
          rowIdx++
        }
        break
      }
      case 'Z':
      case 'z': {
        // Close path
        if (curX !== startX || curY !== startY) {
          rows.push(
            `          <Row T="LineTo" IX="${rowIdx}">` +
            `<Cell N="X" V="${toIn(startX)}"/><Cell N="Y" V="${toIn(startY)}"/>` +
            `</Row>`,
          )
          rowIdx++
        }
        break
      }
      default: {
        // Skip unknown commands or bare numbers (implicit coordinates handled above)
        break
      }
    }
    i++
  }

  if (rows.length === 0) {
    // Fallback
    return [
      `        <Section N="Geometry" IX="0">`,
      `          <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>`,
      `          <Row T="LineTo" IX="2"><Cell N="X" V="${toIn(_w)}"/><Cell N="Y" V="${toIn(_h)}"/></Row>`,
      `        </Section>`,
    ].join('\n')
  }

  return [
    `        <Section N="Geometry" IX="0">`,
    ...rows,
    `        </Section>`,
  ].join('\n')
}

// ── Main export function ───────────────────────────────────────

export async function exportVSDX(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  filename: string = 'flowchart.vsdx',
): Promise<void> {
  const zip = new JSZip()

  // [Content_Types].xml — required by OPC
  zip.file('[Content_Types].xml', genContentTypes())

  // _rels/.rels — root relationships
  zip.file('_rels/.rels', genRootRels())

  // visio/document.xml
  zip.file('visio/document.xml', genDocumentXml())

  // visio/_rels/document.xml.rels
  zip.file('visio/_rels/document.xml.rels', genDocumentRels())

  // visio/pages/pages.xml
  zip.file('visio/pages/pages.xml', genPagesXml())

  // visio/pages/_rels/pages.xml.rels
  zip.file('visio/pages/_rels/pages.xml.rels', genPagesRels())

  // visio/pages/page1.xml — the actual diagram content
  zip.file('visio/pages/page1.xml', genPageXml(nodes, edges))

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-visio.drawing',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  downloadBlob(blob, filename)
}
