import { useState, useRef, useEffect } from 'react'
import type { FormStore } from './formStore.ts'
import type { PageSize } from './types.ts'
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Plus, Minus, Download, Upload, Trash2, Save, LayoutGrid, FolderOpen,
  Pencil, Printer, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Rows, Columns, Group, Ungroup,
} from 'lucide-react'

// ── Component ───────────────────────────────────────────────

export function Toolbar({
  store,
  onExport,
  onImportJSON,
  onTemplates,
  onSavedForms,
  onSave,
  showTabOrder,
  onToggleTabOrder,
}: {
  store: FormStore
  onExport: () => void
  onImportJSON: () => void
  onTemplates: () => void
  onSavedForms: () => void
  onSave: () => void
  showTabOrder: boolean
  onToggleTabOrder: () => void
}) {
  const {
    viewport, canUndo, canRedo, undo, redo,
    zoomIn, zoomOut,
    doc, setTitle, setPageSize, addPage, removePage, selectedIds, removeSelectedElements,
    alignElements, groupSelected, ungroupSelected,
  } = store

  const canDelete = selectedIds.size > 0
  const canAlign = selectedIds.size >= 2
  const canGroup = selectedIds.size >= 2
  const canUngroup = (() => {
    for (const el of doc.elements) {
      if (selectedIds.has(el.id) && el.groupId) return true
    }
    return false
  })()

  const fitToContent = () => {
    const fn = (window as unknown as Record<string, unknown>).__formFitToContent as (() => void) | undefined
    fn?.()
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-dark-elevated border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
      {/* ── Undo / Redo ──────────────────────────── */}
      <ToolbarGroup>
        <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} />
        <ToolbarButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo} />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Form title ───────────────────────────── */}
      <InlineTitle value={doc.title} onChange={setTitle} />

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

      {/* ── Page controls ────────────────────────── */}
      <ToolbarGroup>
        <select
          value={doc.pageSize}
          onChange={e => setPageSize(e.target.value as PageSize)}
          className="px-1.5 py-1 text-[10px] bg-dark-surface border border-white/[0.08] rounded text-white/60 focus:outline-none focus:border-[#F47B20]/40"
        >
          <option value="letter">Letter</option>
          <option value="a4">A4</option>
        </select>
        <span className="text-[10px] text-white/30 mx-1">
          {doc.pageCount} pg{doc.pageCount !== 1 ? 's' : ''}
        </span>
        <ToolbarButton icon={Plus} label="Add Page" onClick={addPage} />
        <ToolbarButton
          icon={Minus}
          label="Remove Last Page"
          disabled={doc.pageCount <= 1}
          onClick={() => removePage(doc.pageCount - 1)}
        />
      </ToolbarGroup>

      {/* ── Alignment (when multi-selected) ────── */}
      {canAlign && (
        <>
          <ToolbarDivider />
          <ToolbarGroup>
            <ToolbarButton icon={AlignLeft} label="Align Left" onClick={() => alignElements('left')} />
            <ToolbarButton icon={AlignCenter} label="Align Center" onClick={() => alignElements('center-h')} />
            <ToolbarButton icon={AlignRight} label="Align Right" onClick={() => alignElements('right')} />
            <ToolbarButton icon={AlignStartVertical} label="Align Top" onClick={() => alignElements('top')} />
            <ToolbarButton icon={AlignCenterVertical} label="Align Middle" onClick={() => alignElements('center-v')} />
            <ToolbarButton icon={AlignEndVertical} label="Align Bottom" onClick={() => alignElements('bottom')} />
            {selectedIds.size >= 3 && (
              <>
                <ToolbarButton icon={Columns} label="Distribute Horizontal" onClick={() => alignElements('distribute-h')} />
                <ToolbarButton icon={Rows} label="Distribute Vertical" onClick={() => alignElements('distribute-v')} />
              </>
            )}
            <ToolbarButton icon={Group} label="Group (Ctrl+G)" onClick={groupSelected} />
            {canUngroup && <ToolbarButton icon={Ungroup} label="Ungroup (Ctrl+Shift+G)" onClick={ungroupSelected} />}
          </ToolbarGroup>
        </>
      )}

      {/* ── Spacer ─────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Actions ────────────────────────────── */}
      <ToolbarGroup>
        <button
          onClick={onTemplates}
          className="px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] rounded transition-colors flex items-center gap-1"
        >
          <LayoutGrid size={12} />
          Templates
        </button>
        <button
          onClick={onSavedForms}
          className="px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] rounded transition-colors flex items-center gap-1"
        >
          <FolderOpen size={12} />
          Saved
        </button>
        <button
          onClick={onImportJSON}
          className="px-2.5 py-1 text-[10px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] rounded transition-colors flex items-center gap-1"
        >
          <Upload size={12} />
          Import
        </button>
        <button
          onClick={onToggleTabOrder}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors flex items-center gap-1 ${
            showTabOrder ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <ListOrdered size={12} />
          Tab Order
        </button>
        <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} />
        <ToolbarButton icon={Save} label="Save (Ctrl+S)" onClick={onSave} />
        <ToolbarButton icon={Download} label="Export" onClick={onExport} />
        {canDelete && (
          <ToolbarButton
            icon={Trash2}
            label="Delete Selected"
            onClick={removeSelectedElements}
            danger
          />
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
  disabled = false,
  danger = false,
  onClick,
}: {
  icon: typeof ZoomIn
  label: string
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
        ${danger
          ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
          : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
        }
      `}
    >
      <Icon size={15} />
    </button>
  )
}

function InlineTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    const trimmed = draft.trim()
    onChange(trimmed || 'Untitled Form')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/70 hover:text-white rounded hover:bg-white/[0.04] transition-colors max-w-[200px] truncate"
        title="Rename form"
      >
        <span className="truncate">{value}</span>
        <Pencil size={10} className="text-white/30 flex-shrink-0" />
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className="px-2 py-1 text-xs bg-dark-surface border border-[#F47B20]/40 rounded text-white focus:outline-none max-w-[200px]"
    />
  )
}
