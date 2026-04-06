import { useState, useCallback, useMemo } from 'react'
import type { FlowchartStore } from './flowchartStore.ts'
import type { ShapeType } from './types.ts'
import { SHAPE_DEFS, type ShapeDef, type ShapeCategory } from './shapes.ts'
import { ChevronDown, ChevronRight, Search, Clock, X } from 'lucide-react'

// ── Category grouping ───────────────────────────────────────

interface CategoryInfo {
  key: ShapeCategory
  label: string
  group?: string   // visual grouping header (e.g. "P&ID")
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'flowchart', label: 'Flowchart' },
  { key: 'misc', label: 'Miscellaneous' },
  // P&ID sub-categories
  { key: 'pid-vessels', label: 'Vessels & Tanks', group: 'P&ID Symbols' },
  { key: 'pid-rotating', label: 'Rotating Equipment', group: 'P&ID Symbols' },
  { key: 'pid-heat', label: 'Heat Transfer', group: 'P&ID Symbols' },
  { key: 'pid-valves', label: 'Valves', group: 'P&ID Symbols' },
  { key: 'pid-instruments', label: 'Instruments', group: 'P&ID Symbols' },
  { key: 'pid-piping', label: 'Piping', group: 'P&ID Symbols' },
  { key: 'pid-misc', label: 'Misc Equipment', group: 'P&ID Symbols' },
]

function groupByCategory(): Map<ShapeCategory, ShapeDef[]> {
  const map = new Map<ShapeCategory, ShapeDef[]>()
  for (const cat of CATEGORIES) {
    map.set(cat.key, SHAPE_DEFS.filter(d => d.category === cat.key))
  }
  return map
}

const grouped = groupByCategory()

// ── Recently used shapes (localStorage) ────────────────────

const RECENT_KEY = 'flowchart-recent-shapes'
const MAX_RECENT = 10

function getRecentShapes(): ShapeType[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Filter to only valid shape types that still exist
    const validTypes = new Set(SHAPE_DEFS.map(d => d.type))
    return (parsed as string[]).filter(t => validTypes.has(t as ShapeType)) as ShapeType[]
  } catch {
    return []
  }
}

function pushRecentShape(type: ShapeType): void {
  const current = getRecentShapes().filter(t => t !== type)
  current.unshift(type)
  if (current.length > MAX_RECENT) current.length = MAX_RECENT
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(current))
  } catch {
    // localStorage full — ignore
  }
}

// ── Fuzzy search ───────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  // Substring match
  if (t.includes(q)) return true
  // Abbreviation match: "stHX" matches "Shell & Tube HX"
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

// ── Component ───────────────────────────────────────────────

export function ShapeLibrary({ store }: { store: FlowchartStore }) {
  const { toolMode, setToolMode } = store
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    // P&ID categories start collapsed by default
    const set = new Set<string>()
    for (const cat of CATEGORIES) {
      if (cat.group) set.add(cat.key)
    }
    return set
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [recentShapes, setRecentShapes] = useState<ShapeType[]>(getRecentShapes)

  const toggleCategory = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectShape = useCallback((type: ShapeType) => {
    const isActive = typeof toolMode === 'object' && 'place' in toolMode && toolMode.place === type
    if (isActive) {
      setToolMode('select')
    } else {
      setToolMode({ place: type })
      pushRecentShape(type)
      setRecentShapes(getRecentShapes())
    }
  }, [toolMode, setToolMode])

  // Filter shapes by search query
  const filteredShapes = useMemo(() => {
    if (!searchQuery.trim()) return null // null = show normal categorized view
    return SHAPE_DEFS.filter(d =>
      fuzzyMatch(searchQuery, d.label) ||
      fuzzyMatch(searchQuery, d.category),
    )
  }, [searchQuery])

  // Build recent shape defs
  const recentDefs = useMemo(() => {
    const defMap = new Map(SHAPE_DEFS.map(d => [d.type, d]))
    return recentShapes
      .map(t => defMap.get(t))
      .filter((d): d is ShapeDef => d !== undefined)
  }, [recentShapes])

  // Track group headers already rendered
  const renderedGroups = new Set<string>()

  return (
    <div className="w-[180px] flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-dark-elevated overflow-y-auto">
      {/* Search bar */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-base rounded border border-white/[0.08] focus-within:border-[#F47B20]/30 transition-colors">
          <Search size={11} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search shapes..."
            className="flex-1 bg-transparent text-[11px] text-white placeholder:text-white/25 outline-none min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Search results mode */}
      {filteredShapes !== null ? (
        <div className="px-2 pb-2">
          <div className="text-[9px] text-white/25 px-1 py-1">
            {filteredShapes.length} result{filteredShapes.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {filteredShapes.map(def => {
              const isActive = typeof toolMode === 'object' && 'place' in toolMode && toolMode.place === def.type
              return (
                <ShapeTile
                  key={def.type}
                  def={def}
                  active={isActive}
                  onClick={() => selectShape(def.type)}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Recently Used */}
          {recentDefs.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('__recent')}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white/50 hover:text-white/70 transition-colors"
              >
                {collapsed.has('__recent') ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                <Clock size={10} className="text-white/30" />
                Recent
              </button>
              {!collapsed.has('__recent') && (
                <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                  {recentDefs.map(def => {
                    const isActive = typeof toolMode === 'object' && 'place' in toolMode && toolMode.place === def.type
                    return (
                      <ShapeTile
                        key={def.type}
                        def={def}
                        active={isActive}
                        onClick={() => selectShape(def.type)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section header */}
          <div className="px-3 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Shapes
          </div>

          {/* Categorized shapes */}
          {CATEGORIES.map(cat => {
            const shapes = grouped.get(cat.key) || []
            const isCollapsed = collapsed.has(cat.key)
            const Chevron = isCollapsed ? ChevronRight : ChevronDown

            // Show group header if this is the first in a new group
            let groupHeader: React.ReactNode = null
            if (cat.group && !renderedGroups.has(cat.group)) {
              renderedGroups.add(cat.group)
              groupHeader = (
                <div className="px-3 pt-2 pb-0.5 text-[9px] font-bold text-[#F47B20]/40 uppercase tracking-widest">
                  {cat.group}
                </div>
              )
            }

            return (
              <div key={cat.key}>
                {groupHeader}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white/50 hover:text-white/70 transition-colors"
                >
                  <Chevron size={10} />
                  {cat.label}
                  <span className="ml-auto text-[8px] text-white/20">{shapes.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                    {shapes.map(def => {
                      const isActive = typeof toolMode === 'object' && 'place' in toolMode && toolMode.place === def.type
                      return (
                        <ShapeTile
                          key={def.type}
                          def={def}
                          active={isActive}
                          onClick={() => selectShape(def.type)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Shape tile with SVG preview ─────────────────────────────

function ShapeTile({
  def,
  active,
  onClick,
}: {
  def: ShapeDef
  active: boolean
  onClick: () => void
}) {
  // Render a small preview of the shape
  const previewW = 50
  const previewH = 35
  const scaleX = previewW / def.defaultWidth
  const scaleY = previewH / def.defaultHeight
  const scale = Math.min(scaleX, scaleY) * 0.8
  const offsetX = (previewW - def.defaultWidth * scale) / 2
  const offsetY = (previewH - def.defaultHeight * scale) / 2

  return (
    <button
      title={def.label}
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg transition-colors
        ${active
          ? 'bg-[#F47B20]/15 ring-1 ring-[#F47B20]/30'
          : 'hover:bg-white/[0.04]'
        }
      `}
    >
      <svg width={previewW} height={previewH} className="flex-shrink-0">
        <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
          <path
            d={def.svgPath(def.defaultWidth, def.defaultHeight)}
            fill={active ? 'rgba(244,123,32,0.15)' : 'rgba(255,255,255,0.06)'}
            stroke={active ? 'rgba(244,123,32,0.6)' : 'rgba(255,255,255,0.2)'}
            strokeWidth={1.5 / scale}
          />
        </g>
      </svg>
      <span className={`text-[9px] leading-tight text-center ${active ? 'text-[#F47B20]' : 'text-white/40'}`}>
        {def.label}
      </span>
    </button>
  )
}
