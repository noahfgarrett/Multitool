/**
 * Mobile phone layout surfaces for PDF Annotate.
 *
 * Rendered only when usePdfAnnotateState's `isMobile` flag is true
 * (matchMedia: `(max-width: 767px) and (any-pointer: coarse)`).
 *
 * Tablets and desktop keep the existing inline layout inside PdfAnnotateTool.
 *
 * The pieces:
 *   - MobilePeekBar        44px always-visible top bar with tools + hamburger
 *   - MobileTopOverlay     pull-down sheet with zoom/find/undo/export/etc.
 *   - MobileThumbSheet     left slide-in full-height thumbnails overlay
 *   - MobileLongPressPopover small popover for the long-press quick settings
 *
 * All components take their data via explicit props so they stay pure and
 * testable; PdfAnnotateTool owns all the state.
 */

import { memo } from 'react'
import {
  Menu, MousePointer2, Paintbrush, Highlighter, TextSelect,
  Eraser, MoreHorizontal, ChevronDown, X,
  ZoomIn, ZoomOut, Maximize, Search, Undo2, Redo2, RotateCcw, RotateCw,
  Mail, Printer, FileSpreadsheet, Download, Minimize2, Maximize2, FileText,
} from 'lucide-react'

// ── Shared types ─────────────────────────────────────────────────────────

export type MobileCoreTool = 'select' | 'pencil' | 'highlighter' | 'text' | 'eraser'

export interface MobilePeekBarProps {
  activeTool: string
  pageCount: number
  currentPage: number
  /** Tap the hamburger → open the thumbnail sheet. */
  onOpenThumbs: () => void
  /** Tap the "more tools" button → open the right tool drawer. */
  onOpenDrawer: () => void
  /** Tap the page counter → open the top toolbar (which holds the page input). */
  onOpenTopOverlay: () => void
  /** Select a core tool. */
  onSelectTool: (tool: MobileCoreTool) => void
  /** Long-press on a core tool → open the quick settings popover. */
  onLongPressTool: (tool: MobileCoreTool, clientX: number, clientY: number) => void
}

// ── Peek bar (always visible, 44px tall) ─────────────────────────────────

/**
 * 44px always-visible top strip on mobile.
 *
 * Contents (left to right):
 *   ☰ thumbnails  |  Select ✎ 🖍 T ⌫  |  ⋮ drawer  |  1/140 page  (right)
 *
 * Long-pressing any of the 5 core tool buttons (~500 ms) opens a quick
 * settings popover (color/size/opacity) via `onLongPressTool`.
 *
 * Swiping down ON the peek bar itself opens the top overlay — that gesture
 * lives on the parent so we don't have to thread touch handlers through
 * every child.
 */
export const MobilePeekBar = memo(function MobilePeekBar({
  activeTool, pageCount, currentPage,
  onOpenThumbs, onOpenDrawer, onOpenTopOverlay,
  onSelectTool, onLongPressTool,
}: MobilePeekBarProps) {
  // Core tools exposed directly in the peek bar. Everything else lives in
  // the drawer behind the ⋮ button.
  const tools: { id: MobileCoreTool; label: string; Icon: typeof MousePointer2 }[] = [
    { id: 'select', label: 'Select', Icon: MousePointer2 },
    { id: 'pencil', label: 'Pencil', Icon: Paintbrush },
    { id: 'highlighter', label: 'Highlight', Icon: Highlighter },
    { id: 'text', label: 'Text', Icon: TextSelect },
    { id: 'eraser', label: 'Eraser', Icon: Eraser },
  ]

  const longPressTimer = { current: null as number | null }
  const longPressFired = { current: false }
  const LONG_PRESS_MS = 500

  const handleToolPointerDown = (tool: MobileCoreTool, e: React.PointerEvent<HTMLButtonElement>): void => {
    longPressFired.current = false
    const { clientX, clientY } = e
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      onLongPressTool(tool, clientX, clientY)
    }, LONG_PRESS_MS)
  }
  const cancelLongPress = (): void => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div
      className="flex items-center gap-1 px-2 border-b border-white/[0.06] flex-shrink-0 bg-[#001218] relative"
      style={{ height: 44, touchAction: 'none' }}
      data-mobile-peek-bar
    >
      <button
        onClick={onOpenThumbs}
        aria-label="Open thumbnails"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Menu size={18} />
      </button>

      <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {tools.map(({ id, label, Icon }) => {
          const isActive = activeTool === id || (id === 'pencil' && activeTool === 'pencil')
          return (
            <button
              key={id}
              onClick={() => {
                cancelLongPress()
                if (longPressFired.current) return
                onSelectTool(id)
              }}
              onPointerDown={e => handleToolPointerDown(id, e)}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              aria-label={label}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-[#14B8A6]/15 text-[#14B8A6] ring-1 ring-inset ring-[#14B8A6]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon size={18} />
            </button>
          )
        })}

        <button
          onClick={onOpenDrawer}
          aria-label="More tools"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {pageCount > 1 && (
        <button
          onClick={onOpenTopOverlay}
          aria-label="Page navigation and tools"
          className="flex items-center gap-1 px-2 h-9 rounded-lg text-[11px] text-white/60 hover:text-white hover:bg-white/[0.06] tabular-nums whitespace-nowrap flex-shrink-0"
        >
          <span className="whitespace-nowrap">{currentPage}&nbsp;/&nbsp;{pageCount}</span>
          <ChevronDown size={12} className="opacity-60 flex-shrink-0" />
        </button>
      )}
    </div>
  )
})

// ── Top overlay (pull-down sheet) ────────────────────────────────────────

export interface MobileTopOverlayProps {
  open: boolean
  onClose: () => void
  zoomPct: number
  onZoomOut: () => void
  onZoomIn: () => void
  onFitToWindow: () => void
  onOpenFind: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onRotateCCW: () => void
  onRotateCW: () => void
  onEmail: () => void
  onPrint: () => void
  onReport: () => void
  onNew: () => void
  onExport: () => void
  focusMode: boolean
  onToggleFocus: () => void
  pageCount: number
  currentPage: number
  onNavigateToPage: (page: number) => void
}

/**
 * Slide-down sheet from the top edge containing everything that used to
 * live in the desktop top bar + secondary toolbar minus the tool buttons.
 * Opened via the peek bar page counter, swipe-down gesture on the peek
 * bar, or swipe-down from the top 80px of the document area.
 */
export const MobileTopOverlay = memo(function MobileTopOverlay({
  open, onClose, zoomPct, onZoomOut, onZoomIn, onFitToWindow, onOpenFind,
  canUndo, canRedo, onUndo, onRedo, onRotateCCW, onRotateCW,
  onEmail, onPrint, onReport, onNew, onExport,
  focusMode, onToggleFocus, pageCount, currentPage, onNavigateToPage,
}: MobileTopOverlayProps) {
  if (!open) return null

  return (
    <>
      {/* Tap-outside scrim */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-[#001a24] border-b border-white/[0.08] shadow-2xl flex flex-col"
        style={{
          maxHeight: '80vh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
        role="dialog"
        aria-label="Tools and navigation"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <span className="text-xs font-medium text-white/70">Tools</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Zoom row */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Zoom</h3>
            <div className="flex items-center gap-2">
              <button onClick={onZoomOut} className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <ZoomOut size={14} /> Out
              </button>
              <div className="px-3 h-10 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-xs text-white/70 tabular-nums min-w-[60px]">
                {zoomPct}%
              </div>
              <button onClick={onZoomIn} className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <ZoomIn size={14} /> In
              </button>
              <button onClick={onFitToWindow} className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <Maximize size={14} /> Fit
              </button>
            </div>
          </section>

          {/* Page navigation */}
          {pageCount > 1 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Page</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 tabular-nums w-12 text-center">
                  {currentPage} / {pageCount}
                </span>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  defaultValue={currentPage}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const n = Math.max(1, Math.min(pageCount, Number(e.currentTarget.value)))
                      onNavigateToPage(n)
                      onClose()
                    }
                  }}
                  className="flex-1 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 text-xs text-white outline-none focus:border-[#14B8A6]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="Jump to page"
                />
              </div>
            </section>
          )}

          {/* History */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wide text-white/40 mb-2">History</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs disabled:opacity-30"
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs disabled:opacity-30"
              >
                <Redo2 size={14} /> Redo
              </button>
            </div>
          </section>

          {/* Rotation */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Rotate</h3>
            <div className="flex items-center gap-2">
              <button onClick={onRotateCCW} className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <RotateCcw size={14} /> CCW
              </button>
              <button onClick={onRotateCW} className="flex-1 h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <RotateCw size={14} /> CW
              </button>
            </div>
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { onOpenFind(); onClose() }} className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <Search size={14} /> Find
              </button>
              <button onClick={() => { onExport(); onClose() }} className="h-10 rounded-lg bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 text-[#14B8A6] flex items-center justify-center gap-1.5 text-xs ring-1 ring-inset ring-[#14B8A6]/30">
                <Download size={14} /> Export PDF
              </button>
              <button onClick={() => { onEmail(); onClose() }} className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <Mail size={14} /> Email
              </button>
              <button onClick={() => { onPrint(); onClose() }} className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => { onReport(); onClose() }} className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <FileSpreadsheet size={14} /> Report
              </button>
              <button onClick={() => { onNew(); onClose() }} className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 flex items-center justify-center gap-1.5 text-xs">
                <FileText size={14} /> New
              </button>
            </div>
          </section>

          {/* Focus */}
          <section>
            <button
              onClick={() => { onToggleFocus(); onClose() }}
              className={`w-full h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors ${
                focusMode
                  ? 'bg-[#14B8A6]/15 text-[#14B8A6] ring-1 ring-inset ring-[#14B8A6]/30'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70'
              }`}
            >
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </button>
          </section>
        </div>
      </div>
    </>
  )
})

// ── Thumbnail sheet (left slide-in) ──────────────────────────────────────

export interface MobileThumbSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  pageCount: number
}

export const MobileThumbSheet = memo(function MobileThumbSheet({
  open, onClose, children, pageCount,
}: MobileThumbSheetProps) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed top-0 left-0 bottom-0 w-64 z-50 bg-[#001a24] border-r border-white/[0.08] shadow-2xl flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-label="Page thumbnails"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <span className="text-xs font-medium text-white/70">Pages ({pageCount})</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {children}
        </div>
      </div>
    </>
  )
})

// ── Long-press quick settings popover ────────────────────────────────────

export interface MobileLongPressPopoverProps {
  /** Anchor position in viewport coordinates (from the long-press event). */
  x: number
  y: number
  tool: MobileCoreTool
  color: string
  onChangeColor: (color: string) => void
  strokeWidth: number
  onChangeStrokeWidth: (w: number) => void
  opacity: number
  onChangeOpacity: (o: number) => void
  onClose: () => void
  colorPresets: readonly string[]
}

/**
 * Small floating popover that appears near the long-pressed tool button
 * on the peek bar. Shows color / stroke width / opacity — the subset of
 * controls that used to live in the desktop properties bar.
 */
export const MobileLongPressPopover = memo(function MobileLongPressPopover({
  x, y, tool, color, onChangeColor, strokeWidth, onChangeStrokeWidth,
  opacity, onChangeOpacity, onClose, colorPresets,
}: MobileLongPressPopoverProps) {
  // Clamp to viewport
  const W = 240
  const H = 180
  const left = Math.max(8, Math.min(x - W / 2, window.innerWidth - W - 8))
  const top = Math.min(y + 12, window.innerHeight - H - 8)

  const showStrokeWidth = tool !== 'select' && tool !== 'text'

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed z-50 bg-[#001a24] border border-white/[0.1] rounded-xl shadow-2xl p-3 space-y-3"
        style={{ left, top, width: W }}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-white/40">{tool}</span>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70"
            aria-label="Close"
          >
            <X size={12} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/50">Color</span>
            <span
              className="w-4 h-4 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {colorPresets.map(c => (
              <button
                key={c}
                onClick={() => onChangeColor(c)}
                className={`w-7 h-7 rounded-full border transition-all ${
                  color === c ? 'border-[#14B8A6] scale-110' : 'border-white/20'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {showStrokeWidth && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/50">Width</span>
              <span className="text-[10px] text-white/70 tabular-nums">{strokeWidth}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={strokeWidth}
              onChange={e => onChangeStrokeWidth(Number(e.target.value))}
              className="w-full h-1 accent-[#14B8A6]"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/50">Opacity</span>
            <span className="text-[10px] text-white/70 tabular-nums">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={e => onChangeOpacity(Number(e.target.value))}
            className="w-full h-1 accent-[#14B8A6]"
          />
        </div>
      </div>
    </>
  )
})
