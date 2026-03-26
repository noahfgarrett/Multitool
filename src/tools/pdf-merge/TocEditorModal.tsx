import { useState, useRef, useCallback, useEffect } from 'react'
import { Modal } from '@/components/common/Modal.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { extractPageTitleCandidate } from '@/utils/pdf.ts'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ListOrdered, Lightbulb, Pencil, MoreHorizontal, ChevronLeft, ChevronRight,
  GripVertical, Plus, Trash2, Copy,
} from 'lucide-react'
import type { TocEntry, TocNumbering } from './tocUtils.ts'
import { formatEntryNumber } from './tocUtils.ts'

// ── Props ──────────────────────────────────────────

interface TocEditorModalProps {
  open: boolean
  onClose: () => void
  entries: TocEntry[]
  onEntriesChange: (entries: TocEntry[]) => void
  numbering: TocNumbering
  onNumberingChange: (n: TocNumbering) => void
  customPrefix: string
  onCustomPrefixChange: (p: string) => void
  files: { id: string; name: string; file: File; pageCount: number; pages: { excluded: boolean }[] }[]
  estimatedTocPageCount: number
}

// ── Numbering presets ──────────────────────────────

const NUMBERING_PRESETS: { value: TocNumbering; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'numeric', label: '1, 2, 3' },
  { value: 'alpha', label: 'A, B, C' },
  { value: 'roman', label: 'I, II, III' },
  { value: 'custom', label: 'Custom...' },
]

// ── Sortable row ───────────────────────────────────

interface SortableRowProps {
  entry: TocEntry
  entryNumber: string
  finalPage: number
  isSelected: boolean
  isEditing: boolean
  onToggleSelect: (id: string, shiftKey: boolean) => void
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, value: string) => void
  onCancelEdit: () => void
  onMenuAction: (id: string, action: 'add-child' | 'delete' | 'duplicate') => void
}

function SortableRow({
  entry,
  entryNumber,
  finalPage,
  isSelected,
  isEditing,
  onToggleSelect,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onMenuAction,
}: SortableRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [editValue, setEditValue] = useState(entry.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Reset editValue when editing starts
  useEffect(() => {
    if (isEditing) setEditValue(entry.label)
  }, [isEditing, entry.label])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const isParent = entry.indent === 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-1 px-2 rounded-md transition-colors
        ${isParent ? 'py-2' : 'py-1.5'}
        ${isSelected ? 'bg-[#F47B20]/[0.04]' : 'hover:bg-white/[0.02]'}
      `}
    >
      {/* Checkbox */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => onToggleSelect(entry.id, e.shiftKey)}
          className={`
            w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center
            ${isSelected
              ? 'bg-[#F47B20] border-[#F47B20]'
              : 'border-white/20 hover:border-white/40'
            }
          `}
        >
          {isSelected && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Drag handle */}
      <div
        className="w-7 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/15 hover:text-white/30"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </div>

      {/* Number */}
      <div className={`w-[50px] flex-shrink-0 text-xs tabular-nums ${isParent ? 'font-bold text-white/70' : 'text-white/40'}`}>
        {entryNumber}
      </div>

      {/* Description */}
      <div
        className={`flex-1 min-w-0 flex items-center gap-1.5 group ${entry.indent === 1 ? 'pl-6' : ''}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onCommitEdit(entry.id, editValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCommitEdit(entry.id, editValue)
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                onCancelEdit()
              }
            }}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-0.5 text-sm text-white outline-none focus:border-[#F47B20]/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(entry.id)}
            className={`
              truncate text-left flex items-center gap-1.5
              ${isParent ? 'text-sm font-semibold text-white/90' : 'text-xs text-white/60'}
            `}
          >
            <span className="truncate">{entry.label}</span>
            {entry.autoDetected && (
              <span className="text-[10px] italic text-white/25 flex-shrink-0">(auto)</span>
            )}
            <Pencil size={10} className="opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
          </button>
        )}
      </div>

      {/* Pages (count) */}
      <div className="w-[50px] flex-shrink-0 text-xs text-white/30 text-center tabular-nums">
        {entry.pageCount}
      </div>

      {/* Page (final number) */}
      <div className="w-[60px] flex-shrink-0 text-xs text-white/40 text-center tabular-nums">
        {finalPage}
      </div>

      {/* Actions */}
      <div className="w-[30px] flex-shrink-0 flex items-center justify-center relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-0.5 rounded text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-dark-elevated border border-white/10 rounded-lg shadow-dark-xl py-1 min-w-[140px]">
            <button
              type="button"
              onClick={() => { onMenuAction(entry.id, 'add-child'); setMenuOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] flex items-center gap-2"
            >
              <Plus size={12} /> Add child
            </button>
            <button
              type="button"
              onClick={() => { onMenuAction(entry.id, 'duplicate'); setMenuOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] flex items-center gap-2"
            >
              <Copy size={12} /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => { onMenuAction(entry.id, 'delete'); setMenuOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-white/[0.06] flex items-center gap-2"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────

export function TocEditorModal({
  open,
  onClose,
  entries,
  onEntriesChange,
  numbering,
  onNumberingChange,
  customPrefix,
  onCustomPrefixChange,
  files,
  estimatedTocPageCount,
}: TocEditorModalProps): React.JSX.Element | null {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectProgress, setDetectProgress] = useState<{ current: number; total: number } | null>(null)

  const lastClickedRef = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ── Compute numbering indices ──────────────────

  const entryNumbers = useCallback((): Map<string, string> => {
    const map = new Map<string, string>()
    let parentIdx = 0
    let childIdx = 0

    for (const e of entries) {
      if (e.indent === 0) {
        parentIdx++
        childIdx = 0
        map.set(e.id, formatEntryNumber(numbering, customPrefix, parentIdx))
      } else {
        childIdx++
        map.set(e.id, formatEntryNumber(numbering, customPrefix, parentIdx, childIdx))
      }
    }
    return map
  }, [entries, numbering, customPrefix])

  const numberMap = entryNumbers()

  // ── Selection ──────────────────────────────────

  const toggleSelect = useCallback((id: string, shiftKey: boolean): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shiftKey && lastClickedRef.current) {
        const lastIdx = entries.findIndex((e) => e.id === lastClickedRef.current)
        const currIdx = entries.findIndex((e) => e.id === id)
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx)
          const end = Math.max(lastIdx, currIdx)
          for (let i = start; i <= end; i++) {
            next.add(entries[i].id)
          }
          return next
        }
      }
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    lastClickedRef.current = id
  }, [entries])

  const selectAll = useCallback((): void => {
    if (selected.size === entries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(entries.map((e) => e.id)))
    }
  }, [entries, selected.size])

  // ── Indent / Outdent ───────────────────────────

  const indentSelected = useCallback((): void => {
    onEntriesChange(
      entries.map((e) =>
        selected.has(e.id) && e.indent === 0 ? { ...e, indent: 1 } : e,
      ),
    )
  }, [entries, selected, onEntriesChange])

  const outdentSelected = useCallback((): void => {
    onEntriesChange(
      entries.map((e) =>
        selected.has(e.id) && e.indent === 1 ? { ...e, indent: 0 } : e,
      ),
    )
  }, [entries, selected, onEntriesChange])

  // ── Keyboard ───────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (editingId) return // let Tab behave normally when editing

    if (e.key === 'Tab' && selected.size > 0) {
      e.preventDefault()
      if (e.shiftKey) {
        outdentSelected()
      } else {
        indentSelected()
      }
    }
  }, [editingId, selected.size, indentSelected, outdentSelected])

  // ── Inline edit ────────────────────────────────

  const startEdit = useCallback((id: string): void => {
    setEditingId(id)
  }, [])

  const commitEdit = useCallback((id: string, value: string): void => {
    const trimmed = value.trim()
    if (trimmed) {
      onEntriesChange(
        entries.map((e) =>
          e.id === id ? { ...e, label: trimmed, autoDetected: false } : e,
        ),
      )
    }
    setEditingId(null)
  }, [entries, onEntriesChange])

  const cancelEdit = useCallback((): void => {
    setEditingId(null)
  }, [])

  // ── Drag reorder ───────────────────────────────

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = entries.findIndex((e) => e.id === active.id)
    const newIdx = entries.findIndex((e) => e.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const entry = entries[oldIdx]

    if (entry.indent === 0) {
      // Drag parent with its children as a group
      let groupEnd = oldIdx + 1
      while (groupEnd < entries.length && entries[groupEnd].indent > 0) {
        groupEnd++
      }
      const group = entries.slice(oldIdx, groupEnd)
      const remaining = [...entries.slice(0, oldIdx), ...entries.slice(groupEnd)]
      // Find the new insertion index in the remaining array
      let insertAt = remaining.findIndex((e) => e.id === over.id)
      if (insertAt === -1) insertAt = remaining.length
      if (newIdx > oldIdx) insertAt++ // insert after if moving down
      const result = [...remaining.slice(0, insertAt), ...group, ...remaining.slice(insertAt)]
      onEntriesChange(result)
    } else {
      // Children can only reorder within their parent
      // Find parent boundaries
      let parentIdx = oldIdx - 1
      while (parentIdx >= 0 && entries[parentIdx].indent > 0) parentIdx--
      let groupEnd = parentIdx + 1
      while (groupEnd < entries.length && (groupEnd === parentIdx || entries[groupEnd].indent > 0)) {
        groupEnd++
      }

      // Only reorder if over target is within same parent group
      if (newIdx > parentIdx && newIdx < groupEnd) {
        onEntriesChange(arrayMove(entries, oldIdx, newIdx))
      }
    }
  }, [entries, onEntriesChange])

  // ── Menu actions ───────────────────────────────

  const handleMenuAction = useCallback((id: string, action: 'add-child' | 'delete' | 'duplicate'): void => {
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) return
    const entry = entries[idx]

    if (action === 'add-child') {
      // Find where to insert: after the parent's last child
      let insertAt = idx + 1
      while (insertAt < entries.length && entries[insertAt].indent > 0) {
        insertAt++
      }
      const child: TocEntry = {
        id: crypto.randomUUID(),
        label: `${entry.label} - Page ${insertAt}`,
        pageIndex: entry.pageIndex,
        pageCount: 1,
        indent: 1,
        autoDetected: false,
        sourceFileId: entry.sourceFileId,
      }
      const next = [...entries]
      next.splice(insertAt, 0, child)
      onEntriesChange(next)
    } else if (action === 'delete') {
      if (entry.indent === 0) {
        // Promote children to indent 0
        const next = entries.map((e, i) => {
          if (i === idx) return null
          if (i > idx && e.indent > 0) {
            // Check if still child of deleted parent
            let isChild = true
            for (let j = i - 1; j > idx; j--) {
              if (entries[j].indent === 0) { isChild = false; break }
            }
            if (isChild) return { ...e, indent: 0 }
          }
          return e
        }).filter((e): e is TocEntry => e !== null)
        onEntriesChange(next)
      } else {
        onEntriesChange(entries.filter((e) => e.id !== id))
      }
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else if (action === 'duplicate') {
      const clone: TocEntry = {
        ...entry,
        id: crypto.randomUUID(),
      }
      const next = [...entries]
      next.splice(idx + 1, 0, clone)
      onEntriesChange(next)
    }
  }, [entries, onEntriesChange])

  // ── Add entry ──────────────────────────────────

  const addEntry = useCallback((): void => {
    const lastEntry = entries[entries.length - 1]
    const pageIndex = lastEntry ? lastEntry.pageIndex + lastEntry.pageCount : 0
    const newEntry: TocEntry = {
      id: crypto.randomUUID(),
      label: 'Untitled',
      pageIndex,
      pageCount: 1,
      indent: 0,
      autoDetected: false,
      sourceFileId: '',
    }
    onEntriesChange([...entries, newEntry])
    setEditingId(newEntry.id)
  }, [entries, onEntriesChange])

  // ── Auto-detect names ──────────────────────────

  const autoDetectNames = useCallback(async (): Promise<void> => {
    setDetecting(true)
    const fileMap = new Map(files.map((f) => [f.id, f]))
    let updated = 0
    let skipped = 0
    const total = entries.length
    setDetectProgress({ current: 0, total })

    const nextEntries = [...entries]

    for (let i = 0; i < nextEntries.length; i++) {
      const entry = nextEntries[i]
      const sourceFile = fileMap.get(entry.sourceFileId)

      // Skip manually edited entries
      const defaultLabel = sourceFile
        ? sourceFile.name.replace(/\.pdf$/i, '')
        : ''
      if (entry.label !== defaultLabel) {
        skipped++
        setDetectProgress({ current: i + 1, total })
        continue
      }

      if (!sourceFile) {
        setDetectProgress({ current: i + 1, total })
        continue
      }

      try {
        const pageNum = entry.sourcePageNumber ?? 1
        const title = await extractPageTitleCandidate(sourceFile.file, pageNum)
        if (title) {
          nextEntries[i] = { ...entry, label: title, autoDetected: true }
          updated++
        } else {
          nextEntries[i] = { ...entry, autoDetected: true }
        }
      } catch {
        // Extraction failed — leave as-is
        nextEntries[i] = { ...entry, autoDetected: true }
      }

      setDetectProgress({ current: i + 1, total })
    }

    onEntriesChange(nextEntries)
    setDetecting(false)
    setDetectProgress(null)

    useAppStore.getState().addToast({
      type: 'success',
      message: `Updated ${updated} of ${total} entries (${skipped} were manually edited)`,
    })
  }, [entries, files, onEntriesChange])

  // ── Clear selection on close ───────────────────

  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setEditingId(null)
    }
  }, [open])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} width="3xl">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onKeyDown={handleKeyDown}>
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ListOrdered size={18} className="text-[#F47B20]" />
              <h3 className="text-sm font-semibold text-white">Table of Contents</h3>
            </div>
            <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full tabular-nums">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <button
            type="button"
            onClick={autoDetectNames}
            disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            <Lightbulb size={12} />
            {detecting
              ? `Detecting... ${detectProgress ? `${detectProgress.current}/${detectProgress.total}` : ''}`
              : 'Auto-detect Names'
            }
          </button>
        </div>

        {/* ── Toolbar ───────────────────────── */}
        <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
          {/* Numbering pills */}
          <div className="flex items-center gap-1.5">
            {NUMBERING_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onNumberingChange(preset.value)}
                className={`
                  px-2.5 py-1 text-[11px] rounded-md border transition-colors
                  ${numbering === preset.value
                    ? 'bg-[#F47B20]/10 border-[#F47B20]/30 text-[#F47B20]'
                    : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white/60'
                  }
                `}
              >
                {preset.label}
              </button>
            ))}
            {numbering === 'custom' && (
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => onCustomPrefixChange(e.target.value)}
                placeholder="Prefix"
                className="ml-1 w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#F47B20]/40"
              />
            )}
          </div>

          {/* Right toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1 text-[11px] rounded-md bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={indentSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={12} /> Indent
            </button>
            <button
              type="button"
              onClick={outdentSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={12} /> Outdent
            </button>
          </div>
        </div>

        {/* ── Column headers ────────────────── */}
        <div className="flex items-center gap-1 px-2 py-2 border-t border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30 select-none">
          <div className="w-7 flex-shrink-0" />
          <div className="w-7 flex-shrink-0" />
          <div className="w-[50px] flex-shrink-0">No.</div>
          <div className="flex-1">Description</div>
          <div className="w-[50px] flex-shrink-0 text-center">Pages</div>
          <div className="w-[60px] flex-shrink-0 text-center">Page</div>
          <div className="w-[30px] flex-shrink-0" />
        </div>

        {/* ── Entry list ────────────────────── */}
        <div className="max-h-[50vh] overflow-y-auto border-t border-white/[0.06]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {entries.map((entry) => (
                <SortableRow
                  key={entry.id}
                  entry={entry}
                  entryNumber={numberMap.get(entry.id) ?? ''}
                  finalPage={entry.pageIndex + estimatedTocPageCount + 1}
                  isSelected={selected.has(entry.id)}
                  isEditing={editingId === entry.id}
                  onToggleSelect={toggleSelect}
                  onStartEdit={startEdit}
                  onCommitEdit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onMenuAction={handleMenuAction}
                />
              ))}
            </SortableContext>
          </DndContext>

          {entries.length === 0 && (
            <div className="py-12 text-center text-sm text-white/20">
              No entries. Click "Add Entry" to create one.
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/20">
            Tab to indent &middot; Shift+Tab to outdent &middot; Click to edit
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-white/[0.04] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <Plus size={12} /> Add Entry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded-md bg-[#F47B20] text-white font-medium hover:bg-[#F47B20]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
