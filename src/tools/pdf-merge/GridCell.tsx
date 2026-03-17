import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { ZoomIn, ZoomOut, X, Maximize2, Plus } from 'lucide-react'

/* ── Types ── */

export interface GridCellData {
  id: string
  label: string
  file: File | null
  type: 'pdf' | 'image' | null
  thumbnail: string | null
  nativeWidth: number
  nativeHeight: number
  offsetX: number
  offsetY: number
  scale: number // 1.0 = contain-fit, >1 zooms in
  pageNumber?: number   // for multi-page PDFs — which page to use (1-based)
  totalPages?: number   // total pages in the source PDF
}

interface GridCellProps {
  cell: GridCellData
  isSelected: boolean
  isMultiSelected: boolean
  cellWidth: number
  cellHeight: number
  onSelect: () => void
  onUpdateOffset: (offsetX: number, offsetY: number) => void
  onUpdateScale: (scale: number) => void
  onSwapStart: (cellId: string) => void
  onSwapDrop: (targetCellId: string) => void
  onContextMenu: (e: React.MouseEvent) => void
  onFocus: () => void
  onUpdateLabel: (label: string) => void
  onAddFile: () => void
  onDropFile: (file: File) => void
  onCtrlClick?: () => void
  onPageChange?: (pageNumber: number) => void
}

/* ── Constants ── */

const MIN_SCALE = 0.1
const MAX_SCALE = 10
const SCROLL_STEP = 0.05
const SNAP_THRESHOLD = 8

/* ── Component ── */

export const GridCell = memo(function GridCell({
  cell,
  isSelected,
  isMultiSelected,
  cellWidth,
  cellHeight,
  onSelect,
  onUpdateOffset,
  onUpdateScale,
  onSwapStart,
  onSwapDrop,
  onContextMenu,
  onFocus,
  onUpdateLabel,
  onAddFile,
  onDropFile,
  onCtrlClick,
  onPageChange,
}: GridCellProps) {
  const dragRef = useRef<{
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)

  // Stable refs for wheel handler
  const scaleRef = useRef(cell.scale)
  scaleRef.current = cell.scale
  const isSelectedRef = useRef(isSelected)
  isSelectedRef.current = isSelected
  const hasContentRef = useRef(false)
  const onUpdateScaleRef = useRef(onUpdateScale)
  onUpdateScaleRef.current = onUpdateScale

  // Calculate contain-fit base dimensions, then apply cell scale
  const hasContent = cell.file !== null && cell.thumbnail !== null
  hasContentRef.current = hasContent
  let displayW = 0
  let displayH = 0
  let contentLeft = 0
  let contentTop = 0

  if (hasContent && cell.nativeWidth > 0 && cell.nativeHeight > 0) {
    const fitScaleX = cellWidth / cell.nativeWidth
    const fitScaleY = cellHeight / cell.nativeHeight
    const fitScale = Math.min(fitScaleX, fitScaleY)
    const baseW = cell.nativeWidth * fitScale
    const baseH = cell.nativeHeight * fitScale
    displayW = baseW * cell.scale
    displayH = baseH * cell.scale
    // Center the scaled content
    contentLeft = (cellWidth - displayW) / 2
    contentTop = (cellHeight - displayH) / 2
  }

  /* ── Snap guide state ── */

  const [snapGuide, setSnapGuide] = useState<{ x: boolean; y: boolean } | null>(null)
  const snapGuideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSnapGuide = useCallback((axes: { x: boolean; y: boolean }) => {
    if (snapGuideTimer.current) clearTimeout(snapGuideTimer.current)
    setSnapGuide(axes)
    snapGuideTimer.current = setTimeout(() => setSnapGuide(null), 300)
  }, [])

  /* ── Pointer drag for content nudging ── */

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasContent) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: cell.offsetX,
      startOffsetY: cell.offsetY,
    }
    contentRef.current?.setPointerCapture(e.pointerId)
  }, [hasContent, cell.offsetX, cell.offsetY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    let newX = dragRef.current.startOffsetX + dx
    let newY = dragRef.current.startOffsetY + dy

    // Snap-to-position: compute snap targets based on current display dimensions
    // Snap targets are offset values that align content to meaningful positions
    const snapTargetsX = [
      0,                              // center
      -(displayW - cellWidth) / 2,    // left edge flush
      (displayW - cellWidth) / 2,     // right edge flush
    ]
    const snapTargetsY = [
      0,                              // center
      -(displayH - cellHeight) / 2,   // top edge flush
      (displayH - cellHeight) / 2,    // bottom edge flush
    ]

    let snappedX = false
    let snappedY = false

    for (const sx of snapTargetsX) {
      if (Math.abs(newX - sx) < SNAP_THRESHOLD) {
        newX = sx
        snappedX = true
        break
      }
    }
    for (const sy of snapTargetsY) {
      if (Math.abs(newY - sy) < SNAP_THRESHOLD) {
        newY = sy
        snappedY = true
        break
      }
    }

    if (snappedX || snappedY) {
      showSnapGuide({ x: snappedX, y: snappedY })
    }

    onUpdateOffset(newX, newY)
  }, [onUpdateOffset, displayW, displayH, cellWidth, cellHeight, showSnapGuide])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    contentRef.current?.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  /* ── Scroll wheel zoom (native listener for passive: false) ── */

  useEffect(() => {
    const el = cellRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!hasContentRef.current || !isSelectedRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? SCROLL_STEP : -SCROLL_STEP
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current + delta))
      onUpdateScaleRef.current(newScale)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  /* ── Label badge drag for cell swapping ── */

  const handleLabelDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', cell.id)
    e.dataTransfer.effectAllowed = 'move'
    onSwapStart(cell.id)
  }, [cell.id, onSwapStart])

  const [isDragOver, setIsDragOver] = useState(false)

  const handleCellDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Check if it's a file drop or a cell swap
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleCellDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleCellDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the cell itself (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleCellDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // File drop from desktop
    if (e.dataTransfer.files?.length > 0) {
      const file = e.dataTransfer.files[0]
      onDropFile(file)
      return
    }

    // Cell swap
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId && sourceId !== cell.id) {
      onSwapDrop(cell.id)
    }
  }, [cell.id, onSwapDrop, onDropFile])

  /* ── Label editing ── */

  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabelValue, setEditLabelValue] = useState(cell.label)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Sync external label changes
  useEffect(() => { setEditLabelValue(cell.label) }, [cell.label])

  useEffect(() => {
    if (isEditingLabel) labelInputRef.current?.select()
  }, [isEditingLabel])

  const commitLabel = useCallback(() => {
    const trimmed = editLabelValue.trim()
    if (trimmed && trimmed !== cell.label) onUpdateLabel(trimmed)
    else setEditLabelValue(cell.label)
    setIsEditingLabel(false)
  }, [editLabelValue, cell.label, onUpdateLabel])

  const hasOffset = cell.offsetX !== 0 || cell.offsetY !== 0
  const isZoomed = cell.scale !== 1

  return (
    <div
      ref={cellRef}
      className={`
        relative overflow-hidden
        ${isSelected ? 'ring-2 ring-[#F47B20] z-10' : isMultiSelected ? 'ring-2 ring-[#3B82F6] z-10' : ''}
      `}
      title={hasContent ? cell.file?.name ?? '' : ''}
      style={{
        width: cellWidth,
        height: cellHeight,
        backgroundColor: hasContent ? 'var(--color-dark-base, #00171F)' : '#ffffff',
      }}
      onClick={(e) => {
        e.stopPropagation()
        if ((e.ctrlKey || e.metaKey) && onCtrlClick) { onCtrlClick(); return }
        onSelect()
      }}
      onContextMenu={onContextMenu}
      onDragOver={handleCellDragOver}
      onDragEnter={handleCellDragEnter}
      onDragLeave={handleCellDragLeave}
      onDrop={handleCellDrop}
    >
      {/* File drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-[#F47B20]/15 border-2 border-dashed border-[#F47B20] rounded-sm flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-[#F47B20]">Drop file here</span>
        </div>
      )}
      {/* Content */}
      {hasContent ? (
        <div
          ref={contentRef}
          className="absolute cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: contentLeft + cell.offsetX,
            top: contentTop + cell.offsetY,
            width: displayW,
            height: displayH,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={cell.thumbnail!}
            alt={cell.label}
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group/add hover:bg-black/[0.03] transition-colors"
          onClick={(e) => { e.stopPropagation(); onAddFile() }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-black/15 group-hover/add:border-[#F47B20]/50 group-hover/add:bg-[#F47B20]/5 flex items-center justify-center transition-colors">
            <Plus size={20} className="text-black/20 group-hover/add:text-[#F47B20]/70 transition-colors" />
          </div>
          <span className="text-[10px] text-black/20 group-hover/add:text-black/40 mt-1.5 transition-colors">Add file</span>
        </div>
      )}

      {/* Label badge (top-left) — draggable for swapping, double-click to edit */}
      {isEditingLabel ? (
        <input
          ref={labelInputRef}
          value={editLabelValue}
          onChange={(e) => setEditLabelValue(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel()
            if (e.key === 'Escape') { setEditLabelValue(cell.label); setIsEditingLabel(false) }
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1.5 left-1.5 px-1 py-0 rounded text-[10px] font-bold z-20 bg-white text-black border border-[#F47B20] outline-none w-16"
          maxLength={10}
        />
      ) : (
        <div
          draggable={hasContent}
          onDragStart={handleLabelDragStart}
          onDoubleClick={(e) => { e.stopPropagation(); setIsEditingLabel(true) }}
          className={`
            absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold z-20
            ${hasContent ? 'cursor-grab bg-black/60 text-white/80' : 'bg-black/10 text-black/30'}
          `}
          title={hasContent ? 'Drag to swap · Double-click to rename' : 'Double-click to rename'}
        >
          {cell.label}
        </div>
      )}

      {/* Zoom controls — visible when selected and has content */}
      {isSelected && hasContent && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onFocus() }}
            className="p-1 rounded bg-[#F47B20]/80 text-white hover:bg-[#F47B20] transition-colors mr-1"
            title="Focus edit mode"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateScale(Math.max(MIN_SCALE, cell.scale - 0.1)) }}
            className="p-1 rounded bg-black/60 text-white/70 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[9px] text-white/60 bg-black/60 px-1 py-0.5 rounded min-w-[32px] text-center">
            {Math.round(cell.scale * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateScale(Math.min(MAX_SCALE, cell.scale + 0.1)) }}
            className="p-1 rounded bg-black/60 text-white/70 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
          {(isZoomed || hasOffset) && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateScale(1); onUpdateOffset(0, 0) }}
              className="p-1 rounded bg-black/60 text-white/70 hover:text-white transition-colors"
              title="Reset zoom and position"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Snap guide crosshair */}
      {snapGuide && (
        <div className="absolute inset-0 pointer-events-none z-20" style={{ animation: 'snapFade 300ms ease-out forwards' }}>
          {snapGuide.x && (
            <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-white/50" />
          )}
          {snapGuide.y && (
            <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-white/50" />
          )}
        </div>
      )}

      {/* Info overlay (bottom-right) when selected */}
      {isSelected && hasContent && (hasOffset || isZoomed) && (
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white/60 z-20 pointer-events-none">
          {isZoomed && <span>{Math.round(cell.scale * 100)}%</span>}
          {isZoomed && hasOffset && <span> · </span>}
          {hasOffset && <span>x: {cell.offsetX > 0 ? '+' : ''}{Math.round(cell.offsetX)}, y: {cell.offsetY > 0 ? '+' : ''}{Math.round(cell.offsetY)}</span>}
        </div>
      )}

      {/* Multi-page PDF page selector (bottom-left, next to label) */}
      {isSelected && hasContent && cell.type === 'pdf' && cell.totalPages && cell.totalPages > 1 && onPageChange && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onPageChange(Math.max(1, (cell.pageNumber ?? 1) - 1)) }}
            disabled={(cell.pageNumber ?? 1) <= 1}
            className="w-5 h-5 rounded bg-black/60 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[10px] font-bold"
          >
            ‹
          </button>
          <span className="text-[9px] text-white/60 bg-black/60 px-1 py-0.5 rounded min-w-[32px] text-center">
            {cell.pageNumber ?? 1}/{cell.totalPages}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onPageChange(Math.min(cell.totalPages!, (cell.pageNumber ?? 1) + 1)) }}
            disabled={(cell.pageNumber ?? 1) >= cell.totalPages}
            className="w-5 h-5 rounded bg-black/60 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[10px] font-bold"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
})
