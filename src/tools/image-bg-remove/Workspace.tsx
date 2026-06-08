// src/tools/image-bg-remove/Workspace.tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Point, BrushStroke, Tool, PreviewBackground } from './types'

interface WorkspaceProps {
  originalCanvas: HTMLCanvasElement
  maskedCanvas: HTMLCanvasElement
  imageWidth: number
  imageHeight: number
  tool: Tool
  brushSize: number
  previewBg: PreviewBackground
  showOriginal: boolean
  /** Bumped by the orchestrator whenever maskedCanvas content changes. */
  renderVersion: number
  onPickColor: (p: Point) => void
  onWandClick: (p: Point) => void
  onStroke: (stroke: BrushStroke) => void
}

interface View {
  scale: number
  tx: number
  ty: number
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const size = 10
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#2c2c2c'
  for (let yy = 0; yy < h; yy += size) {
    for (let xx = 0; xx < w; xx += size) {
      if ((Math.floor(xx / size) + Math.floor(yy / size)) % 2 === 0) {
        ctx.fillRect(x + xx, y + yy, Math.min(size, w - xx), Math.min(size, h - yy))
      }
    }
  }
}

export function Workspace(props: WorkspaceProps) {
  const {
    originalCanvas, maskedCanvas, imageWidth, imageHeight,
    tool, brushSize, previewBg, showOriginal, renderVersion,
    onPickColor, onWandClick, onStroke,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<View>({ scale: 1, tx: 0, ty: 0 })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  const isPanning = useRef(false)
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const isDrawing = useRef(false)
  const strokePoints = useRef<Point[]>([])
  const spaceDown = useRef(false)
  const fittedRef = useRef(false)
  const isBrush = tool === 'erase' || tool === 'restore'

  // Re-fit on the next valid draw whenever a new image loads.
  useEffect(() => {
    fittedRef.current = false
  }, [imageWidth, imageHeight])

  const toImage = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const { scale, tx, ty } = viewRef.current
    return { x: (clientX - rect.left - tx) / scale, y: (clientY - rect.top - ty) / scale }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw === 0 || ch === 0) return
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }

    // Fit-to-container once per image (preserves zoom/pan on later redraws).
    if (!fittedRef.current) {
      const pad = 48
      const s = Math.min((cw - pad) / imageWidth, (ch - pad) / imageHeight)
      const scale = s > 0 && Number.isFinite(s) ? s : 1
      viewRef.current = {
        scale,
        tx: (cw - imageWidth * scale) / 2,
        ty: (ch - imageHeight * scale) / 2,
      }
      fittedRef.current = true
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)

    const { scale, tx, ty } = viewRef.current
    const rw = imageWidth * scale
    const rh = imageHeight * scale

    ctx.save()
    ctx.beginPath()
    ctx.rect(tx, ty, rw, rh)
    ctx.clip()
    if (previewBg === 'white') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(tx, ty, rw, rh)
    } else if (previewBg === 'black') {
      ctx.fillStyle = '#000000'
      ctx.fillRect(tx, ty, rw, rh)
    } else {
      drawCheckerboard(ctx, tx, ty, rw, rh)
    }
    ctx.restore()

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const srcCanvas = showOriginal ? originalCanvas : maskedCanvas
    ctx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, tx, ty, rw, rh)

    // In-progress stroke overlay (visual feedback before commit)
    if (isDrawing.current && strokePoints.current.length > 0) {
      ctx.fillStyle = tool === 'restore' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      const rad = brushSize * scale
      for (const p of strokePoints.current) {
        ctx.beginPath()
        ctx.arc(tx + p.x * scale, ty + p.y * scale, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [imageWidth, imageHeight, previewBg, showOriginal, originalCanvas, maskedCanvas, tool, brushSize])

  // Redraw on visual prop / content changes (view transform is preserved).
  useEffect(() => {
    draw()
  }, [draw, renderVersion])

  // Resize handling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // Wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { scale, tx, ty } = viewRef.current
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newScale = Math.min(20, Math.max(0.05, scale * factor))
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const ix = (mx - tx) / scale
      const iy = (my - ty) / scale
      viewRef.current = { scale: newScale, tx: mx - ix * newScale, ty: my - iy * newScale }
      draw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [draw])

  // Space-to-pan tracking
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    if (spaceDown.current || e.button === 1) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty }
      return
    }
    if (e.button !== 0) return
    const p = toImage(e.clientX, e.clientY)
    if (tool === 'picker') {
      onPickColor(p)
      return
    }
    if (tool === 'wand') {
      onWandClick(p)
      return
    }
    isDrawing.current = true
    strokePoints.current = [p]
    draw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (isBrush) setCursor({ x: e.clientX, y: e.clientY })
    if (isPanning.current && panStart.current) {
      viewRef.current.tx = panStart.current.tx + (e.clientX - panStart.current.x)
      viewRef.current.ty = panStart.current.ty + (e.clientY - panStart.current.y)
      draw()
      return
    }
    if (isDrawing.current) {
      strokePoints.current.push(toImage(e.clientX, e.clientY))
      draw()
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    if (isPanning.current) {
      isPanning.current = false
      panStart.current = null
      return
    }
    if (isDrawing.current) {
      isDrawing.current = false
      const points = strokePoints.current
      strokePoints.current = []
      if (points.length > 0) {
        onStroke({ type: tool === 'restore' ? 'restore' : 'erase', points, radius: brushSize })
      }
    }
  }

  const cursorClass =
    tool === 'picker' || tool === 'wand' ? 'cursor-crosshair' : isBrush ? 'cursor-none' : 'cursor-default'

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <canvas
        ref={canvasRef}
        data-testid="bg-workspace-canvas"
        className={`absolute inset-0 ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setCursor(null)}
      />
      {isBrush && cursor && (
        <div
          className="pointer-events-none fixed rounded-full border border-white/80 mix-blend-difference"
          style={{
            left: cursor.x - brushSize * viewRef.current.scale,
            top: cursor.y - brushSize * viewRef.current.scale,
            width: brushSize * viewRef.current.scale * 2,
            height: brushSize * viewRef.current.scale * 2,
          }}
        />
      )}
    </div>
  )
}
