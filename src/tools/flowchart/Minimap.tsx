import { useCallback, useEffect, useRef, useMemo } from 'react'
import type { FlowchartStore } from './flowchartStore.ts'
import type { Point } from './types.ts'

// ── Constants ───────────────────────────────────────────────

const MINIMAP_W = 200
const MINIMAP_H = 150
const MINIMAP_PAD = 10
const REFRESH_INTERVAL_MS = 100 // ~10fps max refresh

// ── Component ───────────────────────────────────────────────

export function Minimap({ store }: { store: FlowchartStore }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafRef = useRef(0)
  const lastDrawRef = useRef(0)

  const { nodes, edges, viewport, setViewport } = store

  // ── Compute diagram bounds ──────────────────────────────

  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, w: 800, h: 600 }
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }
    const pad = 60
    minX -= pad
    minY -= pad
    maxX += pad
    maxY += pad
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
  }, [nodes])

  // ── Scale factor ────────────────────────────────────────

  const drawW = MINIMAP_W - MINIMAP_PAD * 2
  const drawH = MINIMAP_H - MINIMAP_PAD * 2
  const scale = Math.min(drawW / bounds.w, drawH / bounds.h)

  // ── Draw minimap ────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const now = Date.now()
    if (now - lastDrawRef.current < REFRESH_INTERVAL_MS) return
    lastDrawRef.current = now

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.9)'
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, MINIMAP_W, MINIMAP_H)

    ctx.save()
    ctx.translate(MINIMAP_PAD, MINIMAP_PAD)

    // Center the diagram in the minimap
    const scaledW = bounds.w * scale
    const scaledH = bounds.h * scale
    const offsetX = (drawW - scaledW) / 2
    const offsetY = (drawH - scaledH) / 2
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
    ctx.translate(-bounds.minX, -bounds.minY)

    // Draw edges as simple lines
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId)
      const target = nodeMap.get(edge.targetId)
      if (!source || !target) continue

      ctx.beginPath()
      ctx.moveTo(source.x + source.width / 2, source.y + source.height / 2)
      ctx.lineTo(target.x + target.width / 2, target.y + target.height / 2)
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)'
      ctx.lineWidth = 1 / scale
      ctx.stroke()
    }

    // Draw nodes as colored rectangles (no text)
    const sortedNodes = [...nodes].sort((a, b) => a.zIndex - b.zIndex)
    for (const node of sortedNodes) {
      ctx.fillStyle = node.style.fill || 'rgba(20, 184, 166, 0.15)'
      ctx.fillRect(node.x, node.y, node.width, node.height)
      ctx.strokeStyle = node.style.stroke || 'rgba(20, 184, 166, 0.4)'
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(node.x, node.y, node.width, node.height)
    }

    // Draw viewport rectangle
    const container = containerRef.current?.parentElement
    if (container) {
      const containerW = container.clientWidth
      const containerH = container.clientHeight

      // Viewport in diagram coordinates
      const vpX = -viewport.panX / viewport.zoom
      const vpY = -viewport.panY / viewport.zoom
      const vpW = containerW / viewport.zoom
      const vpH = containerH / viewport.zoom

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
      ctx.lineWidth = 2 / scale
      ctx.strokeRect(vpX, vpY, vpW, vpH)

      ctx.fillStyle = 'rgba(59, 130, 246, 0.06)'
      ctx.fillRect(vpX, vpY, vpW, vpH)
    }

    ctx.restore()
  }, [nodes, edges, viewport, bounds, scale, drawW, drawH])

  // ── Redraw on state changes ─────────────────────────────

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // ── Click/drag to pan ──────────────────────────────────

  const minimapToViewport = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const scaledW = bounds.w * scale
    const scaledH = bounds.h * scale
    const offsetX = (drawW - scaledW) / 2 + MINIMAP_PAD
    const offsetY = (drawH - scaledH) / 2 + MINIMAP_PAD

    // Convert minimap coordinates to diagram coordinates
    const diagX = bounds.minX + (mx - offsetX) / scale
    const diagY = bounds.minY + (my - offsetY) / scale

    return { x: diagX, y: diagY }
  }, [bounds, scale, drawW, drawH])

  const panToPoint = useCallback((pt: Point) => {
    const container = containerRef.current?.parentElement
    if (!container) return

    const containerW = container.clientWidth
    const containerH = container.clientHeight

    // Center the viewport on the clicked diagram point
    setViewport(prev => ({
      ...prev,
      panX: -pt.x * prev.zoom + containerW / 2,
      panY: -pt.y * prev.zoom + containerH / 2,
    }))
  }, [setViewport])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    isDragging.current = true
    const pt = minimapToViewport(e.clientX, e.clientY)
    panToPoint(pt)
  }, [minimapToViewport, panToPoint])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
    e.stopPropagation()
    const pt = minimapToViewport(e.clientX, e.clientY)
    panToPoint(pt)
  }, [minimapToViewport, panToPoint])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Don't render minimap when there are no nodes
  if (nodes.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-3 right-3 z-10 rounded-lg overflow-hidden shadow-xl"
      style={{ width: MINIMAP_W, height: MINIMAP_H, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: 'pointer' }}
      />
    </div>
  )
}
