import { useState, useRef, useEffect } from 'react'
import type { FlowchartStore } from './flowchartStore.ts'
import type { AlignAxis, DistributeAxis } from './flowchartStore.ts'
import type { ShapeType } from './types.ts'
import { SHAPE_DEFS } from './shapes.ts'
import { THEMES } from './themes.ts'
import { LAYOUT_DIRECTIONS, type LayoutDirection } from './layout.ts'
import {
  MousePointer2, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Square, Download, Trash2, Grid3X3, Magnet, Link2, ChevronDown, Search,
  LayoutGrid, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  GripHorizontal, GripVertical,
  Palette, Sun, Moon, Printer, Pencil,
} from 'lucide-react'

// ── Component ───────────────────────────────────────────────

export function Toolbar({
  store,
  onExport,
  onImportText,
  onPrint,
}: {
  store: FlowchartStore
  onExport: () => void
  onImportText: () => void
  onPrint: () => void
}) {
  const {
    toolMode, setToolMode, viewport,
    canUndo, canRedo, undo, redo,
    zoomIn, zoomOut, fitToContent,
    deleteSelected, selection, clearDiagram,
    gridEnabled, setGridEnabled,
    snapEnabled, setSnapEnabled,
    sketchMode, setSketchMode,
  } = store

  const hasSelection = selection.nodeIds.size > 0 || selection.edgeIds.size > 0
  const hasMultiNodeSelection = selection.nodeIds.size >= 2
  const hasThreeNodeSelection = selection.nodeIds.size >= 3

  // ── Shape dropdown state ──────────────────────────────
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false)
  const [shapeSearch, setShapeSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Layout dropdown state ─────────────────────────────
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false)
  const layoutDropdownRef = useRef<HTMLDivElement>(null)

  // ── Align dropdown state ──────────────────────────────
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false)
  const alignDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    if (!shapeDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShapeDropdownOpen(false)
        setShapeSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shapeDropdownOpen])

  // Close layout dropdown on click outside
  useEffect(() => {
    if (!layoutDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target as Node)) {
        setLayoutDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [layoutDropdownOpen])

  // Close align dropdown on click outside
  useEffect(() => {
    if (!alignDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(e.target as Node)) {
        setAlignDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [alignDropdownOpen])

  // Focus search on open
  useEffect(() => {
    if (shapeDropdownOpen) searchRef.current?.focus()
  }, [shapeDropdownOpen])

  const activeShapeType = typeof toolMode === 'object' && 'place' in toolMode ? toolMode.place : null

  const filteredShapes = shapeSearch
    ? SHAPE_DEFS.filter(d => d.label.toLowerCase().includes(shapeSearch.toLowerCase()))
    : SHAPE_DEFS

  const selectShape = (type: ShapeType) => {
    setToolMode({ place: type })
    setShapeDropdownOpen(false)
    setShapeSearch('')
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-dark-elevated border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
      {/* ── Pointer / Pan / Connect ──────────────── */}
      <ToolbarGroup>
        <ToolbarButton
          icon={MousePointer2}
          label="Select (V)"
          active={toolMode === 'select'}
          onClick={() => setToolMode('select')}
        />
        <ToolbarButton
          icon={Hand}
          label="Pan (H)"
          active={toolMode === 'pan'}
          onClick={() => setToolMode('pan')}
        />
        <ToolbarButton
          icon={Link2}
          label="Connect (C)"
          active={toolMode === 'connect'}
          onClick={() => setToolMode('connect')}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Shapes dropdown ──────────────────────── */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setShapeDropdownOpen(!shapeDropdownOpen)}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors
            ${activeShapeType
              ? 'bg-[#F47B20]/20 text-[#F47B20]'
              : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }
          `}
        >
          <Square size={13} />
          <span>{activeShapeType ? SHAPE_DEFS.find(d => d.type === activeShapeType)?.label ?? 'Shape' : 'Shapes'}</span>
          <ChevronDown size={10} />
        </button>

        {shapeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[220px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-1.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-base rounded border border-white/[0.08]">
                <Search size={11} className="text-white/30 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={shapeSearch}
                  onChange={e => setShapeSearch(e.target.value)}
                  placeholder="Search shapes..."
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
                />
              </div>
            </div>

            {/* Shape list */}
            <div className="max-h-[280px] overflow-y-auto p-1">
              {filteredShapes.length === 0 && (
                <p className="text-[10px] text-white/25 text-center py-3">No shapes found</p>
              )}
              {filteredShapes.map(def => {
                const isActive = activeShapeType === def.type
                const previewW = 28
                const previewH = 20
                const scale = Math.min(previewW / def.defaultWidth, previewH / def.defaultHeight) * 0.8
                const ox = (previewW - def.defaultWidth * scale) / 2
                const oy = (previewH - def.defaultHeight * scale) / 2

                return (
                  <button
                    key={def.type}
                    onClick={() => selectShape(def.type)}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors
                      ${isActive
                        ? 'bg-[#F47B20]/15 text-[#F47B20]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                      }
                    `}
                  >
                    <svg width={previewW} height={previewH} className="flex-shrink-0">
                      <g transform={`translate(${ox}, ${oy}) scale(${scale})`}>
                        <path
                          d={def.svgPath(def.defaultWidth, def.defaultHeight)}
                          fill={isActive ? 'rgba(244,123,32,0.15)' : 'rgba(255,255,255,0.06)'}
                          stroke={isActive ? 'rgba(244,123,32,0.6)' : 'rgba(255,255,255,0.25)'}
                          strokeWidth={1.5 / scale}
                        />
                      </g>
                    </svg>
                    <span className="text-[11px]">{def.label}</span>
                    <span className="text-[9px] text-white/20 ml-auto">{def.category}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ToolbarDivider />

      {/* ── Undo / Redo ────────────────────────── */}
      <ToolbarGroup>
        <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} />
        <ToolbarButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo} />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Zoom ───────────────────────────────── */}
      <ToolbarGroup>
        <ToolbarButton icon={ZoomOut} label="Zoom Out" onClick={zoomOut} />
        <span className="text-[10px] text-white/40 min-w-[36px] text-center tabular-nums">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <ToolbarButton icon={ZoomIn} label="Zoom In" onClick={zoomIn} />
        <ToolbarButton icon={Maximize2} label="Fit to Content" onClick={fitToContent} />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Grid / Snap / Sketch ──────────────── */}
      <ToolbarGroup>
        <ToolbarButton
          icon={Grid3X3}
          label="Toggle Grid"
          active={gridEnabled}
          onClick={() => setGridEnabled(!gridEnabled)}
        />
        <ToolbarButton
          icon={Magnet}
          label="Toggle Snap"
          active={snapEnabled}
          onClick={() => setSnapEnabled(!snapEnabled)}
        />
        <ToolbarButton
          icon={Pencil}
          label="Sketch Mode"
          active={sketchMode}
          onClick={() => setSketchMode(!sketchMode)}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Theme dropdown (Agent A) ─────────── */}
      <ThemeDropdown store={store} />

      <ToolbarDivider />

      {/* ── Auto Layout ──────────────────────────── */}
      <div ref={layoutDropdownRef} className="relative">
        <button
          onClick={() => setLayoutDropdownOpen(!layoutDropdownOpen)}
          disabled={store.nodes.length === 0}
          title="Auto Layout"
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors
            ${store.nodes.length === 0
              ? 'opacity-30 pointer-events-none text-white/50'
              : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }
          `}
        >
          <LayoutGrid size={13} />
          <span>Layout</span>
          <ChevronDown size={10} />
        </button>

        {layoutDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[170px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden py-1">
            {LAYOUT_DIRECTIONS.map(dir => (
              <button
                key={dir.value}
                onClick={() => {
                  store.applyAutoLayout(dir.value)
                  setLayoutDropdownOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
              >
                <span className="w-4 text-center text-sm">{dir.arrow}</span>
                {dir.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Align & Distribute ────────────────────── */}
      {hasMultiNodeSelection && (
        <div ref={alignDropdownRef} className="relative">
          <button
            onClick={() => setAlignDropdownOpen(!alignDropdownOpen)}
            title="Align & Distribute"
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <AlignCenterVertical size={13} />
            <span>Align</span>
            <ChevronDown size={10} />
          </button>

          {alignDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-[200px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden py-1">
              <div className="px-3 py-1 text-[9px] font-semibold text-white/25 uppercase tracking-wider">Align</div>
              {([
                { axis: 'left' as AlignAxis, label: 'Align Left', Icon: AlignStartVertical },
                { axis: 'center' as AlignAxis, label: 'Align Center', Icon: AlignCenterVertical },
                { axis: 'right' as AlignAxis, label: 'Align Right', Icon: AlignEndVertical },
                { axis: 'top' as AlignAxis, label: 'Align Top', Icon: AlignStartHorizontal },
                { axis: 'middle' as AlignAxis, label: 'Align Middle', Icon: AlignCenterHorizontal },
                { axis: 'bottom' as AlignAxis, label: 'Align Bottom', Icon: AlignEndHorizontal },
              ]).map(item => (
                <button
                  key={item.axis}
                  onClick={() => {
                    store.alignNodes(item.axis)
                    setAlignDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                >
                  <item.Icon size={12} className="text-white/40" />
                  {item.label}
                </button>
              ))}

              {hasThreeNodeSelection && (
                <>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-3 py-1 text-[9px] font-semibold text-white/25 uppercase tracking-wider">Distribute</div>
                  {([
                    { axis: 'horizontal' as DistributeAxis, label: 'Distribute Horizontally', Icon: GripHorizontal },
                    { axis: 'vertical' as DistributeAxis, label: 'Distribute Vertically', Icon: GripVertical },
                  ]).map(item => (
                    <button
                      key={item.axis}
                      onClick={() => {
                        store.distributeNodes(item.axis)
                        setAlignDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                    >
                      <item.Icon size={12} className="text-white/40" />
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Spacer ─────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Actions ────────────────────────────── */}
      <ToolbarGroup>
        <button
          onClick={onImportText}
          className="px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
        >
          Import Text
        </button>
        <ToolbarButton icon={Printer} label="Print" onClick={onPrint} />
        <ToolbarButton icon={Download} label="Export" onClick={onExport} />
        {hasSelection && (
          <ToolbarButton icon={Trash2} label="Delete Selected" onClick={deleteSelected} danger />
        )}
      </ToolbarGroup>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/[0.08] mx-1" />
}

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  danger = false,
  onClick,
}: {
  icon: typeof Square
  label: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`
        p-1.5 rounded transition-colors
        ${disabled ? 'opacity-30 pointer-events-none' : ''}
        ${active
          ? 'bg-[#F47B20]/20 text-[#F47B20]'
          : danger
            ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
            : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
        }
      `}
    >
      <Icon size={15} />
    </button>
  )
}

// ── Theme dropdown (Agent A) ────────────────────────────────

function ThemeDropdown({ store }: { store: FlowchartStore }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isLightTheme = store.activeTheme.canvasBackground === '#ffffff' ||
    store.activeTheme.canvasBackground === '#f5f5f5'
  const ThemeIcon = isLightTheme ? Sun : Moon

  return (
    <div ref={ref} className="relative flex items-center gap-0.5">
      <button
        onClick={() => setOpen(!open)}
        title="Theme"
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors
          text-white/50 hover:text-white hover:bg-white/[0.06]
        `}
      >
        <Palette size={13} />
        <span>{store.activeTheme.name}</span>
        <ChevronDown size={10} />
      </button>

      {/* Quick dark/light toggle */}
      <button
        onClick={() => {
          // Toggle between Classic (dark) and Professional (light)
          const nextTheme = isLightTheme
            ? THEMES.find(t => t.name === 'Classic')
            : THEMES.find(t => t.name === 'Professional')
          if (nextTheme) store.applyTheme(nextTheme)
        }}
        title={isLightTheme ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        className="p-1.5 rounded transition-colors text-white/40 hover:text-white hover:bg-white/[0.06]"
      >
        <ThemeIcon size={13} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-[180px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden py-1">
          {THEMES.map(theme => {
            const isActive = store.activeTheme.name === theme.name
            return (
              <button
                key={theme.name}
                onClick={() => {
                  store.applyTheme(theme)
                  setOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors
                  ${isActive
                    ? 'bg-[#F47B20]/15 text-[#F47B20]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }
                `}
              >
                <span
                  className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0"
                  style={{ background: theme.canvasBackground }}
                />
                <span className="text-[11px]">{theme.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
