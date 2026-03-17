import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronUp, Download, List, Filter,
  Pencil, Highlighter, Square, Circle, ArrowUpRight, Minus, Type,
  Cloud, Pentagon, MessageSquare, ImagePlus, Stamp, StickyNote,
} from 'lucide-react'
import type { Annotation, CommentThread, CommentStatus } from './types.ts'
import { COMMENT_STATUS_COLORS } from './types.ts'

// ── Icon mapping ────────────────────────────────────────

const ANNOTATION_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  pencil: Pencil,
  highlighter: Highlighter,
  rectangle: Square,
  circle: Circle,
  arrow: ArrowUpRight,
  line: Minus,
  text: Type,
  cloud: Cloud,
  polygon: Pentagon,
  callout: MessageSquare,
  imageStamp: ImagePlus,
  stamp: Stamp,
  ocrRegion: Type,
}

function getAnnotationIcon(type: string): React.ComponentType<{ size?: number }> {
  return ANNOTATION_ICON_MAP[type] ?? StickyNote
}

// ── Helpers ─────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '\u2026'
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day}/${year} ${hours}:${minutes}`
}

// ── Types ───────────────────────────────────────────────

interface MarkupRow {
  index: number
  id: string
  type: string
  page: number
  label: string
  color: string
  status: CommentStatus
  date: number
}

type SortField = 'index' | 'type' | 'page' | 'label' | 'color' | 'status' | 'date'
type SortDir = 'asc' | 'desc'

const STATUS_LABELS: Record<CommentStatus, string> = {
  none: 'None',
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

const STATUS_FILTER_OPTIONS: CommentStatus[] = ['none', 'open', 'accepted', 'rejected', 'resolved']

// ── Props ───────────────────────────────────────────────

interface MarkupsListProps {
  annotations: Record<number, Annotation[]>
  commentThreads: CommentThread[]
  selectedId: string | null
  onSelectAnnotation: (id: string, page: number) => void
  onExportCSV: () => void
}

// ── Component ───────────────────────────────────────────

export default function MarkupsList({
  annotations,
  commentThreads,
  selectedId,
  onSelectAnnotation,
  onExportCSV,
}: MarkupsListProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [sortField, setSortField] = useState<SortField>('index')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'all'>('all')

  // Build thread lookup: annotationId -> CommentThread
  const threadMap = useMemo(() => {
    const map = new Map<string, CommentThread>()
    for (const thread of commentThreads) {
      map.set(thread.annotationId, thread)
    }
    return map
  }, [commentThreads])

  // Flatten annotations into rows
  const allRows = useMemo((): MarkupRow[] => {
    const rows: MarkupRow[] = []
    let counter = 1
    const sortedPages = Object.keys(annotations)
      .map(Number)
      .sort((a, b) => a - b)

    for (const page of sortedPages) {
      const pageAnns = annotations[page]
      if (!pageAnns) continue
      for (const ann of pageAnns) {
        const thread = threadMap.get(ann.id)
        rows.push({
          index: counter++,
          id: ann.id,
          type: ann.type,
          page,
          label: ann.text ?? '',
          color: ann.color,
          status: thread?.status ?? 'none',
          date: Date.now() - (counter * 60000), // relative ordering fallback
        })
      }
    }
    return rows
  }, [annotations, threadMap])

  // Unique annotation types for filter dropdown
  const uniqueTypes = useMemo((): string[] => {
    const types = new Set<string>()
    for (const row of allRows) {
      types.add(row.type)
    }
    return [...types].sort()
  }, [allRows])

  // Apply filters
  const filteredRows = useMemo((): MarkupRow[] => {
    let rows = allRows
    if (typeFilter !== 'all') {
      rows = rows.filter(r => r.type === typeFilter)
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter)
    }
    return rows
  }, [allRows, typeFilter, statusFilter])

  // Apply sorting
  const sortedRows = useMemo((): MarkupRow[] => {
    const sorted = [...filteredRows]
    const dir = sortDir === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      switch (sortField) {
        case 'index':
          return (a.index - b.index) * dir
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'page':
          return (a.page - b.page) * dir
        case 'label':
          return a.label.localeCompare(b.label) * dir
        case 'color':
          return a.color.localeCompare(b.color) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'date':
          return (a.date - b.date) * dir
        default: {
          const _exhaustive: never = sortField
          return _exhaustive
        }
      }
    })

    return sorted
  }, [filteredRows, sortField, sortDir])

  const totalCount = allRows.length

  function handleSort(field: SortField): void {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function renderSortIndicator(field: SortField): React.JSX.Element | null {
    if (sortField !== field) return null
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="inline ml-0.5" />
      : <ChevronDown size={12} className="inline ml-0.5" />
  }

  return (
    <div className="border-t border-white/[0.06] bg-[#1a1a2e] flex flex-col">
      {/* Header bar — always visible */}
      <button
        onClick={() => setIsCollapsed(prev => !prev)}
        className="flex items-center justify-between px-4 py-2 hover:bg-white/[0.03] transition-colors w-full text-left shrink-0"
      >
        <div className="flex items-center gap-2">
          <List size={16} className="text-[#F47B20]" />
          <span className="text-white font-semibold text-sm">
            Markups ({totalCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExportCSV()
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white/80 transition-colors"
              title="Export CSV"
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
          {isCollapsed
            ? <ChevronUp size={16} className="text-white/40" />
            : <ChevronDown size={16} className="text-white/40" />
          }
        </div>
      </button>

      {/* Expanded panel */}
      {!isCollapsed && (
        <div className="flex flex-col" style={{ height: 250 }}>
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.06] shrink-0">
            <Filter size={14} className="text-white/40 shrink-0" />

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-white/[0.05] border border-white/[0.1] text-white/60 text-xs rounded px-2 py-1 outline-none focus:border-[#F47B20]/50"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t} className="bg-[#1a1a2e] text-white">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CommentStatus | 'all')}
              className="bg-white/[0.05] border border-white/[0.1] text-white/60 text-xs rounded px-2 py-1 outline-none focus:border-[#F47B20]/50"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">All Statuses</option>
              {STATUS_FILTER_OPTIONS.map(s => (
                <option key={s} value={s} className="bg-[#1a1a2e] text-white">
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <span className="text-white/30 text-xs ml-auto">
              {sortedRows.length} of {totalCount}
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1a1a2e] z-10">
                <tr className="border-b border-white/[0.06]">
                  <th
                    onClick={() => handleSort('index')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-10"
                  >
                    #{renderSortIndicator('index')}
                  </th>
                  <th
                    onClick={() => handleSort('type')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-20"
                  >
                    Type{renderSortIndicator('type')}
                  </th>
                  <th
                    onClick={() => handleSort('page')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-14"
                  >
                    Page{renderSortIndicator('page')}
                  </th>
                  <th
                    onClick={() => handleSort('label')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none"
                  >
                    Label{renderSortIndicator('label')}
                  </th>
                  <th
                    onClick={() => handleSort('color')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-14"
                  >
                    Color{renderSortIndicator('color')}
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-20"
                  >
                    Status{renderSortIndicator('status')}
                  </th>
                  <th
                    onClick={() => handleSort('date')}
                    className="text-left text-white/50 font-medium px-3 py-1.5 cursor-pointer hover:text-white/80 select-none w-28"
                  >
                    Date{renderSortIndicator('date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-white/30 py-8">
                      No markups found
                    </td>
                  </tr>
                ) : (
                  sortedRows.map(row => {
                    const IconComponent = getAnnotationIcon(row.type)
                    const isSelected = row.id === selectedId

                    return (
                      <tr
                        key={row.id}
                        onClick={() => onSelectAnnotation(row.id, row.page)}
                        className={`border-b border-white/[0.03] cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#F47B20]/10'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <td className="px-3 py-1.5 text-white/40">{row.index}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <IconComponent size={13} />
                            <span className="text-white/60 capitalize">{row.type}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-white/60">{row.page}</td>
                        <td className="px-3 py-1.5 text-white/70">
                          {row.label ? truncate(row.label, 40) : <span className="text-white/20 italic">--</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className="inline-block w-4 h-4 rounded border border-white/[0.1]"
                            style={{ backgroundColor: row.color }}
                            title={row.color}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          {row.status !== 'none' ? (
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: COMMENT_STATUS_COLORS[row.status] }}
                              />
                              <span className="text-white/60">{STATUS_LABELS[row.status]}</span>
                            </span>
                          ) : (
                            <span className="text-white/20">--</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-white/40">
                          {formatDate(row.date)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
