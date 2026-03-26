import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { Button } from '@/components/common/Button.tsx'
import { ProgressBar } from '@/components/common/ProgressBar.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { loadPDFFile, generateThumbnail, mergePDFs, removePDFFromCache, addPdfBookmarks } from '@/utils/pdf.ts'
import { downloadBlob } from '@/utils/download.ts'
import { formatFileSize } from '@/utils/fileReader.ts'
import type { PDFFile } from '@/types'
import {
  DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Download, Trash2, GripVertical, Plus,
  ChevronDown, ChevronRight, Loader2, Eye, EyeOff, ZoomIn, ZoomOut, Copy,
  RotateCw, RotateCcw, Lock, FileText, Save, FolderOpen, ListOrdered,
} from 'lucide-react'

import { PDFDocument } from 'pdf-lib'
import { TocEditorModal } from './TocEditorModal.tsx'
import {
  type TocEntry, type TocNumbering,
  buildInitialEntries, recalcPageIndices, estimateTocPageCount,
  renderTocPages, entriesToNestedBookmarks,
} from './tocUtils.ts'

const GridStitchMode = lazy(() => import('./GridStitchMode.tsx'))

/* ── Types ── */

interface PageEntry {
  uid: string
  pageNumber: number
  thumbnail: string
  excluded: boolean
  copiedFrom?: number
  rotation: number  // 0, 90, 180, 270
}

interface MergeFile extends PDFFile {
  thumbnail?: string
  pages: PageEntry[]
  expanded: boolean
  loadingPages: boolean
}

/* ── Helpers ── */

let _pageUid = 0
function makePageUid(): string {
  return `pg-${++_pageUid}`
}

/* ── Sortable page thumbnail ── */

interface SortablePageItemProps {
  page: PageEntry
  pageIdx: number
  fileId: string
  isSelected: boolean
  isCopiedSource: boolean
  onContextMenu: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
  onToggleExclude: (e: React.MouseEvent) => void
  onRotate: (dir: 90 | -90) => void
  scrollRoot: HTMLDivElement | null
  onThumbnailNeeded: () => void
}

function SortablePageItem({
  page, pageIdx, isSelected, isCopiedSource,
  onContextMenu, onClick, onToggleExclude, onRotate,
  scrollRoot, onThumbnailNeeded,
}: SortablePageItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: page.uid })

  const nodeRef = useRef<HTMLDivElement | null>(null)
  const thumbCbRef = useRef(onThumbnailNeeded)
  thumbCbRef.current = onThumbnailNeeded

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Lazy thumbnail via IntersectionObserver with generous 600px buffer
  useEffect(() => {
    if (page.thumbnail) return
    const el = nodeRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          thumbCbRef.current()
          observer.disconnect()
        }
      },
      { root: scrollRoot, rootMargin: '600px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [page.thumbnail, scrollRoot])

  return (
    <div
      ref={(node) => { setNodeRef(node); nodeRef.current = node }}
      data-uid={page.uid}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
      onClick={onClick}
      className={`
        relative group rounded-lg border p-1.5 transition-shadow flex items-center justify-center
        ${isDragging ? 'opacity-30 z-10' : 'cursor-grab active:cursor-grabbing'}
        ${isSelected && !isDragging ? 'border-[#F47B20] ring-2 ring-[#F47B20]/30' : ''}
        ${!isSelected && !isDragging && page.excluded ? 'opacity-30 border-white/[0.04]' : ''}
        ${!isSelected && !isDragging && !page.excluded ? 'border-white/[0.08] hover:border-[#F47B20]/30' : ''}
      `}
      title={`Page ${page.pageNumber}${page.excluded ? ' (excluded)' : ''}${page.copiedFrom ? ` (copy of p${page.copiedFrom})` : ''} · Click to select · Right-click to toggle`}
    >
      {page.thumbnail ? (
        <img
          src={page.thumbnail}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-auto rounded object-contain"
          draggable={false}
          style={page.rotation !== 0 ? { transform: `rotate(${page.rotation}deg)` } : undefined}
        />
      ) : (
        <div className="w-full aspect-[8.5/11] rounded bg-white/[0.04] animate-pulse flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-white/20" />
        </div>
      )}

      {/* Original page number badge (bottom-left) */}
      <div className={`
        absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5
        ${page.excluded
          ? 'bg-red-500/60 text-white/80 line-through'
          : page.copiedFrom
            ? 'bg-purple-500/70 text-white/90'
            : 'bg-black/60 text-white/80'
        }
      `}>
        {page.copiedFrom && <Copy size={8} />}
        p{page.pageNumber}
      </div>

      {/* Current position badge (top-left) — always shown; orange when reordered or copied */}
      <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
        pageIdx + 1 !== page.pageNumber || page.copiedFrom ? 'bg-[#F47B20]/80' : 'bg-black/50'
      }`}>
        #{pageIdx + 1}
      </div>

      {/* "Copied!" flash overlay */}
      {isCopiedSource && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-[#F47B20]/20 animate-pulse pointer-events-none">
          <span className="text-[#F47B20] text-xs font-bold bg-black/60 px-2 py-1 rounded">Copied!</span>
        </div>
      )}

      {/* Excluded overlay */}
      {page.excluded && (
        <div className="absolute inset-1.5 rounded flex items-center justify-center">
          <EyeOff size={20} className="text-white/40" />
        </div>
      )}

      {/* Rotation buttons on hover */}
      <div className="absolute bottom-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onRotate(-90) }}
          className="p-1 rounded bg-black/50 text-white/70 hover:text-white transition-colors"
          title="Rotate left 90°"
        >
          <RotateCcw size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRotate(90) }}
          className="p-1 rounded bg-black/50 text-white/70 hover:text-white transition-colors"
          title="Rotate right 90°"
        >
          <RotateCw size={10} />
        </button>
      </div>

      {/* Rotation badge */}
      {page.rotation !== 0 && (
        <div className="absolute top-2 right-8 px-1 py-0.5 rounded text-[9px] font-bold bg-blue-500/70 text-white pointer-events-none">
          {page.rotation}°
        </div>
      )}

      {/* Quick toggle on hover */}
      <button
        onClick={onToggleExclude}
        className="absolute top-2 right-2 p-1 rounded bg-black/50 text-white/0 group-hover:text-white/70 hover:!text-white transition-colors"
        title={page.excluded ? 'Include page' : 'Exclude page'}
      >
        {page.excluded ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </div>
  )
}

/* ── Sortable File Row (dnd-kit wrapper) ── */

function SortableFileRow({ id, children }: {
  id: string
  children: (opts: { handleProps: Record<string, unknown>; isDragging: boolean }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  )
}

/* ── Password Modal ── */

function PasswordModal({ fileName, onSubmit, onCancel }: {
  fileName: string
  onSubmit: (password: string) => void
  onCancel: () => void
}) {
  const [pw, setPw] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[#00171F] border border-white/[0.12] rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#F47B20]/15 flex items-center justify-center">
            <Lock size={20} className="text-[#F47B20]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Password Protected</h3>
            <p className="text-xs text-white/40 truncate max-w-[240px]">{fileName}</p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (pw) onSubmit(pw) }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter PDF password"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.12] text-sm text-white placeholder-white/30 outline-none focus:border-[#F47B20]/50 mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={!pw}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#F47B20] text-white hover:bg-[#E06D15] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Component ── */

type MergeMode = 'merge' | 'gridStitch'

export default function PdfMergeTool() {
  const [mode, setMode] = useState<MergeMode>('merge')
  const [files, setFiles] = useState<MergeFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Password prompt queue
  const [passwordPrompt, setPasswordPrompt] = useState<{ file: File; resolve: (pw: string | null) => void } | null>(null)

  // Preview mode
  const [showPreview, setShowPreview] = useState(false)

  // File-level dnd-kit
  const [fileDragId, setFileDragId] = useState<string | null>(null)
  const fileSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Page selection & copy/paste
  const [selectedPage, setSelectedPage] = useState<{ fileId: string; pageIdx: number } | null>(null)
  const [copiedPage, setCopiedPage] = useState<{ fileId: string; page: PageEntry } | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  // TOC state
  const [tocEnabled, setTocEnabled] = useState(false)
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([])
  const [tocNumbering, setTocNumbering] = useState<TocNumbering>('numeric')
  const [tocCustomPrefix, setTocCustomPrefix] = useState('')
  const [tocModalOpen, setTocModalOpen] = useState(false)

  // dnd-kit page-level drag
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragWidth, setActiveDragWidth] = useState(0)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Thumbnail zoom — controls columns per row
  const MIN_COLS = 2
  const MAX_COLS = 10
  const [zoomCols, setZoomCols] = useState(5)
  const zoomIn = () => setZoomCols((c) => Math.max(c - 1, MIN_COLS))
  const zoomOut = () => setZoomCols((c) => Math.min(c + 1, MAX_COLS))

  // Thumbnail resolution
  const RES_LEVELS = [
    { label: 'Low', height: 150, quality: 0.5 },
    { label: 'Med', height: 300, quality: 0.7 },
    { label: 'High', height: 600, quality: 0.85 },
  ]
  const [resIdx, setResIdx] = useState(1) // default Medium
  const resRef = useRef(RES_LEVELS[1].height)
  resRef.current = RES_LEVELS[resIdx].height
  const qualityRef = useRef(RES_LEVELS[1].quality)
  qualityRef.current = RES_LEVELS[resIdx].quality

  // Scroll container ref
  const scrollRef = useRef<HTMLDivElement>(null)

  // Lazy thumbnail loading refs
  const filesRef = useRef(files)
  filesRef.current = files
  const loadingThumbs = useRef(new Set<string>())
  const MAX_LOADING_THUMBS = 1000

  // Memory estimation
  const MAX_MEMORY_MB = 4096
  const memoryMB = useMemo(() => {
    let bytes = 0
    for (const f of files) {
      // File reference costs ~0 bytes. Estimate pdfjs cached doc as ~1x file size.
      bytes += f.size
      if (f.thumbnail) bytes += f.thumbnail.length * 2
      for (const p of f.pages) {
        if (p.thumbnail) bytes += p.thumbnail.length * 2
      }
    }
    return bytes / (1024 * 1024)
  }, [files])

  const memoryPct = Math.min((memoryMB / MAX_MEMORY_MB) * 100, 100)
  const memoryColor = memoryPct < 50 ? '#22c55e' : memoryPct < 75 ? '#F47B20' : '#ef4444'

  /* ── Estimated output size ── */

  const estimatedSize = useMemo(() => {
    let bytes = 0
    for (const f of files) {
      if (f.pages.length > 0) {
        const included = f.pages.filter((p) => !p.excluded).length
        if (included > 0) bytes += f.size * (included / f.pageCount)
      } else {
        bytes += f.size
      }
    }
    return bytes
  }, [files])

  /* ── Smart filename ── */

  const smartFilename = useMemo((): string => {
    const names = files.map((f) => f.name.replace(/\.pdf$/i, ''))
    if (names.length === 0) return 'merged.pdf'
    if (names.length === 1) return `${names[0]}_combined.pdf`
    if (names.length <= 3) {
      const joined = names.join('_')
      return (joined.length > 80 ? joined.slice(0, 77) + '...' : joined) + '.pdf'
    }
    const base = names[0]
    return (base.length > 60 ? base.slice(0, 57) + '...' : base) + `_and_${names.length - 1}_more.pdf`
  }, [files])

  /* ── Lazy thumbnail loader ── */

  const loadPageThumbnail = useCallback(async (fileId: string, pageUid: string, pageNumber: number) => {
    if (loadingThumbs.current.has(pageUid)) return
    // Evict oldest entries if Set exceeds max size
    if (loadingThumbs.current.size >= MAX_LOADING_THUMBS) {
      const iter = loadingThumbs.current.values()
      for (let i = 0; i < 100; i++) loadingThumbs.current.delete(iter.next().value!)
    }
    loadingThumbs.current.add(pageUid)

    const file = filesRef.current.find((f) => f.id === fileId)
    if (!file) return

    try {
      const thumbnail = await generateThumbnail(file, pageNumber, resRef.current, qualityRef.current)
      setFiles((prev) => prev.map((f) => {
        if (f.id !== fileId) return f
        return { ...f, pages: f.pages.map((p) => p.uid === pageUid ? { ...p, thumbnail } : p) }
      }))
    } catch {
      loadingThumbs.current.delete(pageUid)
    }
  }, [])

  /* ── File handling ── */

  const handleFiles = useCallback(async (newFiles: File[]) => {
    setIsLoading(true)
    try {
      const pdfFiles: MergeFile[] = []
      for (const file of newFiles) {
        if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.startsWith('image/')) continue
        try {
          if (file.type.startsWith('image/')) continue
          let pdfFile: PDFFile
          try {
            pdfFile = await loadPDFFile(file)
          } catch (loadErr: unknown) {
            // Check for password-protected PDF
            const errMsg = loadErr instanceof Error ? loadErr.message : String(loadErr)
            if (errMsg.toLowerCase().includes('password')) {
              const password = await new Promise<string | null>((resolve) => {
                setPasswordPrompt({ file, resolve })
              })
              setPasswordPrompt(null)
              if (!password) continue // user skipped
              try {
                pdfFile = await loadPDFFile(file, password)
              } catch {
                useAppStore.getState().addToast({ type: 'error', message: `Incorrect password for ${file.name}` })
                continue
              }
            } else {
              throw loadErr
            }
          }
          const thumbnail = await generateThumbnail(pdfFile, 1, 120)
          pdfFiles.push({
            ...pdfFile,
            thumbnail,
            pages: [],
            expanded: false,
            loadingPages: false,
          })
        } catch {
          useAppStore.getState().addToast({ type: 'error', message: `Failed to load ${file.name}` })
        }
      }
      setFiles((prev) => [...prev, ...pdfFiles])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeFile = (id: string) => {
    removePDFFromCache(id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const moveFile = (idx: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      const target = idx + dir
      if (target < 0 || target >= newFiles.length) return prev
      ;[newFiles[idx], newFiles[target]] = [newFiles[target], newFiles[idx]]
      return newFiles
    })
  }

  /* ── File-level dnd-kit reorder ── */

  const handleFileDragStart = (event: DragStartEvent) => {
    setFileDragId(event.active.id as string)
  }

  const handleFileDragEnd = (event: DragEndEvent) => {
    setFileDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFiles((prev) => {
      const oldIdx = prev.findIndex((f) => f.id === active.id)
      const newIdx = prev.findIndex((f) => f.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  /* ── Page rotation ── */

  const rotatePage = (fileId: string, pageIdx: number, dir: 90 | -90) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f
      const newPages = [...f.pages]
      const current = newPages[pageIdx].rotation
      newPages[pageIdx] = { ...newPages[pageIdx], rotation: ((current + dir) % 360 + 360) % 360 }
      return { ...f, pages: newPages }
    }))
  }

  /* ── Expand / collapse — pages created instantly, thumbnails lazy-loaded ── */

  const toggleExpand = useCallback((fileId: string) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f
      if (f.expanded) return { ...f, expanded: false }
      if (f.pages.length > 0) return { ...f, expanded: true }
      // Create all page entries immediately with empty thumbnails — IO loads them lazily
      const pages: PageEntry[] = Array.from({ length: f.pageCount }, (_, i) => ({
        uid: makePageUid(),
        pageNumber: i + 1,
        thumbnail: '',
        excluded: false,
        rotation: 0,
      }))
      return { ...f, expanded: true, loadingPages: false, pages }
    }))
  }, [])

  /* ── Resolution change — clears thumbnails so IO re-generates at new quality ── */

  const changeResolution = (newIdx: number) => {
    setResIdx(newIdx)
    loadingThumbs.current.clear()
    setFiles((prev) => prev.map((f) => ({
      ...f,
      pages: f.pages.map((p) => ({ ...p, thumbnail: '' })),
    })))
  }

  /* ── Page-level dnd-kit drag (ghost animation) ── */

  const handlePageDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
    // Measure the source element so the overlay matches its size
    const el = document.querySelector(`[data-uid="${event.active.id}"]`) as HTMLElement
    if (el) setActiveDragWidth(el.getBoundingClientRect().width)
    setSelectedPage(null)
  }

  const handlePageDragEnd = (event: DragEndEvent, fileId: string) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f
      const oldIdx = f.pages.findIndex((p) => p.uid === active.id)
      const newIdx = f.pages.findIndex((p) => p.uid === over.id)
      if (oldIdx === -1 || newIdx === -1) return f
      return { ...f, pages: arrayMove(f.pages, oldIdx, newIdx) }
    }))
  }

  /* ── Page exclude/include ── */

  const togglePageExclude = (fileId: string, pageIdx: number) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f
      const newPages = [...f.pages]
      newPages[pageIdx] = { ...newPages[pageIdx], excluded: !newPages[pageIdx].excluded }
      return { ...f, pages: newPages }
    }))
  }

  /* ── Right-click toggles exclude ── */

  const handlePageContextMenu = (e: React.MouseEvent, fileId: string, pageIdx: number) => {
    e.preventDefault()
    e.stopPropagation()
    togglePageExclude(fileId, pageIdx)
  }

  /* ── Page selection & copy/paste ── */

  const handlePageClick = (e: React.MouseEvent, fileId: string, pageIdx: number) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    setSelectedPage((prev) =>
      prev?.fileId === fileId && prev.pageIdx === pageIdx ? null : { fileId, pageIdx }
    )
  }

  // Selected file index for keyboard navigation
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        setSelectedPage(null)
        setSelectedFileIdx(null)
        return
      }

      // File-level keyboard shortcuts
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFileIdx !== null && files[selectedFileIdx]) {
          e.preventDefault()
          removeFile(files[selectedFileIdx].id)
          setSelectedFileIdx(null)
          return
        }
      }

      if (e.key === 'ArrowUp' && !selectedPage && selectedFileIdx !== null) {
        e.preventDefault()
        setSelectedFileIdx(Math.max(0, selectedFileIdx - 1))
        return
      }
      if (e.key === 'ArrowDown' && !selectedPage && selectedFileIdx !== null) {
        e.preventDefault()
        setSelectedFileIdx(Math.min(files.length - 1, selectedFileIdx + 1))
        return
      }

      if (!selectedPage) return
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'c') {
        const file = files.find((f) => f.id === selectedPage.fileId)
        if (!file) return
        const page = file.pages[selectedPage.pageIdx]
        if (!page) return
        setCopiedPage({ fileId: selectedPage.fileId, page: { ...page } })
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 1500)
        e.preventDefault()
      }

      if (mod && e.key === 'v') {
        if (!copiedPage) return
        if (selectedPage.fileId !== copiedPage.fileId) return
        const pastedPage: PageEntry = {
          ...copiedPage.page,
          uid: makePageUid(),
          excluded: false,
          copiedFrom: copiedPage.page.copiedFrom ?? copiedPage.page.pageNumber,
          rotation: copiedPage.page.rotation,
        }
        setFiles((prev) => prev.map((f) => {
          if (f.id !== selectedPage.fileId) return f
          const newPages = [...f.pages]
          newPages.splice(selectedPage.pageIdx + 1, 0, pastedPage)
          return { ...f, pages: newPages }
        }))
        setSelectedPage({ fileId: selectedPage.fileId, pageIdx: selectedPage.pageIdx + 1 })
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPage, copiedPage, files])

  // Sync TOC entries when files change
  useEffect(() => {
    if (!tocEnabled) return
    setTocEntries((prev) => {
      if (prev.length === 0) {
        return buildInitialEntries(files)
      }
      const fileIds = new Set(files.map((f) => f.id))
      const filtered = prev.filter((e) => fileIds.has(e.sourceFileId))
      const existingFileIds = new Set(filtered.map((e) => e.sourceFileId))
      const newFiles = files.filter((f) => !existingFileIds.has(f.id))
      const newEntries = buildInitialEntries(newFiles)
      return recalcPageIndices([...filtered, ...newEntries])
    })
  }, [tocEnabled, files])

  /* ── Merge ── */

  const handleMerge = useCallback(async () => {
    if (files.length < 1) return
    setIsMerging(true)
    setMergeError(null)
    setProgress(0)
    try {
      // Build merge inputs with rotation data
      const mergeInputs = files
        .map((f) => {
          if (f.pages.length > 0) {
            const included = f.pages.filter((p) => !p.excluded)
            if (included.length === 0) return null
            const pages = included.map((p) => p.pageNumber)
            const rotations: Record<number, number> = {}
            for (const p of included) {
              if (p.rotation !== 0) rotations[p.pageNumber] = p.rotation
            }
            return { file: f.file, pages, rotations, fileName: f.name }
          }
          return { file: f.file, fileName: f.name }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (mergeInputs.length === 0) {
        setIsMerging(false)
        return
      }

      // Build bookmark entries (file name → first page index)
      const bookmarks: { title: string; pageIndex: number }[] = []
      let pageOffset = 0
      for (const input of mergeInputs) {
        const title = input.fileName.replace(/\.pdf$/i, '')
        bookmarks.push({ title, pageIndex: pageOffset })
        if ('pages' in input && input.pages) {
          pageOffset += input.pages.length
        } else {
          const mf = files.find((f) => f.file === input.file)
          pageOffset += mf?.pageCount ?? 0
        }
      }

      const result = await mergePDFs(
        mergeInputs.map((input) => {
          const base: { file: File; pages?: number[]; rotations?: Record<number, number> } = { file: input.file }
          if ('pages' in input && input.pages) base.pages = input.pages
          if ('rotations' in input && input.rotations) base.rotations = input.rotations
          return base
        }),
        (current, total) => { setProgress(Math.round((current / total) * 100)) },
        !tocEnabled && bookmarks.length > 1 ? bookmarks : undefined,
      )

      let finalBytes = result

      // If TOC enabled, load merged doc, insert TOC pages, add nested bookmarks
      if (tocEnabled && tocEntries.length > 0) {
        const tocDoc = await PDFDocument.load(result)
        const tocPageCount = await renderTocPages(tocDoc, tocEntries, tocNumbering, tocCustomPrefix)
        const nestedBookmarks = entriesToNestedBookmarks(tocEntries, tocNumbering, tocCustomPrefix, tocPageCount)
        addPdfBookmarks(tocDoc, nestedBookmarks)
        finalBytes = await tocDoc.save()
      }

      const blob = new Blob([finalBytes], { type: 'application/pdf' })

      if ('showSaveFilePicker' in window) {
        try {
          type PickerFn = (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>
          const handle = await (window as unknown as { showSaveFilePicker: PickerFn }).showSaveFilePicker({
            suggestedName: smartFilename,
            types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
        } catch (e: unknown) {
          if (e instanceof Error && e.name === 'AbortError') return   // user cancelled
          throw e
        }
      } else {
        downloadBlob(blob, smartFilename)
      }
    } catch (err) {
      console.error('Merge failed:', err)
      setMergeError(err instanceof Error ? err.message : 'Merge failed — check that all PDFs are valid')
    } finally {
      setIsMerging(false)
      setProgress(0)
    }
  }, [files, smartFilename, tocEnabled, tocEntries, tocNumbering, tocCustomPrefix])

  /* ── Helper: get included page count ── */

  const getIncludedPageInfo = (file: MergeFile): { text: string; hasExclusions: boolean } => {
    if (file.pages.length === 0) {
      return { text: `${file.pageCount} page${file.pageCount !== 1 ? 's' : ''}`, hasExclusions: false }
    }
    const included = file.pages.filter((p) => !p.excluded).length
    const hasExclusions = included < file.pages.length
    return { text: `${included}/${file.pages.length} pages`, hasExclusions }
  }

  /* ── Native file drop on the main view ── */

  const [fileDragOver, setFileDragOver] = useState(false)
  const fileDragCounterRef = useRef(0)

  const onNativeFileDragEnter = useCallback((e: React.DragEvent) => {
    // Only respond to external file drops, not internal dnd-kit drags
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    fileDragCounterRef.current++
    setFileDragOver(true)
  }, [])

  const onNativeFileDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onNativeFileDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    fileDragCounterRef.current--
    if (fileDragCounterRef.current <= 0) {
      fileDragCounterRef.current = 0
      setFileDragOver(false)
    }
  }, [])

  const onNativeFileDrop = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    fileDragCounterRef.current = 0
    setFileDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) handleFiles(droppedFiles)
  }, [handleFiles])

  /* ── Tab bar (shared across modes) ── */

  const tabBar = (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setMode('merge')}
        className={`
          px-4 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'merge'
            ? 'bg-[#F47B20] text-white shadow-md shadow-[#F47B20]/20'
            : 'bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.08]'
          }
        `}
      >
        Merge
      </button>
      <button
        onClick={() => setMode('gridStitch')}
        className={`
          px-4 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'gridStitch'
            ? 'bg-[#F47B20] text-white shadow-md shadow-[#F47B20]/20'
            : 'bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.08]'
          }
        `}
      >
        Grid Stitch
      </button>
    </div>
  )

  /* ── Grid Stitch mode ── */

  if (mode === 'gridStitch') {
    return (
      <div className="h-full min-h-0 flex flex-col gap-3">
        {tabBar}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading...</div>}>
          <GridStitchMode />
        </Suspense>
      </div>
    )
  }

  /* ── Merge mode: empty state ── */

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col gap-4">
        {tabBar}
        <FileDropZone
          onFiles={handleFiles}
          accept="application/pdf"
          multiple
          label="Drop PDF files here"
          description="Add 2 or more PDFs to merge"
          className="h-full"
        />
        {isLoading && (
          <div className="text-center text-sm text-white/40">Loading files...</div>
        )}
      </div>
    )
  }

  /* ── Merge mode: main view ── */

  return (
    <div
      className="h-full min-h-0 flex flex-col gap-4 relative"
      onDragEnter={onNativeFileDragEnter}
      onDragOver={onNativeFileDragOver}
      onDragLeave={onNativeFileDragLeave}
      onDrop={onNativeFileDrop}
    >
      {/* File drop overlay */}
      {fileDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-[#F47B20] bg-[#F47B20]/10 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Plus size={32} className="mx-auto text-[#F47B20] mb-2" />
            <p className="text-sm font-medium text-[#F47B20]">Drop PDFs to add</p>
          </div>
        </div>
      )}
      {/* Tab bar + Toolbar */}
      {tabBar}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm text-white/60">
          {files.length} file{files.length !== 1 ? 's' : ''} ·{' '}
          {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))} total
        </span>

        {/* Memory meter */}
        <div className="flex flex-col gap-0.5" title={`Estimated memory: ${memoryMB.toFixed(1)} MB / ${MAX_MEMORY_MB} MB`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">
              {memoryMB < 1 ? `${(memoryMB * 1024).toFixed(0)} KB` : `${memoryMB.toFixed(0)} MB`}
            </span>
            <span className="text-[10px] text-white/25 ml-2">
              {(MAX_MEMORY_MB / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="w-28 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${memoryPct}%`, backgroundColor: memoryColor }}
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoomCols >= MAX_COLS}
            className="p-1 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Zoom out (more columns)"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-white/30 min-w-[28px] text-center">{zoomCols}col</span>
          <button
            onClick={zoomIn}
            disabled={zoomCols <= MIN_COLS}
            className="p-1 rounded text-white/30 hover:text-white/70 disabled:opacity-20 disabled:pointer-events-none transition-colors"
            title="Zoom in (fewer columns)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Resolution slider */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/25">Res</span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={resIdx}
            onChange={(e) => changeResolution(Number(e.target.value))}
            className="w-14 h-1 accent-[#F47B20] cursor-pointer"
            title={`Thumbnail resolution: ${RES_LEVELS[resIdx].label} (${RES_LEVELS[resIdx].height}px)`}
          />
          <span className="text-[10px] text-white/30 min-w-[20px]">{RES_LEVELS[resIdx].label}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'application/pdf'
            input.multiple = true
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement
              if (target.files) handleFiles(Array.from(target.files))
            }
            input.click()
          }}
        >
          Add Files
        </Button>
        {/* Preview toggle */}
        <button
          onClick={() => {
            setShowPreview((p) => {
              if (!p) {
                // Entering preview — auto-expand all files so thumbnails load
                setFiles((prev) => prev.map((f) => {
                  if (f.pages.length > 0) return f
                  const pages: PageEntry[] = Array.from({ length: f.pageCount }, (_, i) => ({
                    uid: makePageUid(),
                    pageNumber: i + 1,
                    thumbnail: '',
                    excluded: false,
                    rotation: 0,
                  }))
                  return { ...f, expanded: true, loadingPages: false, pages }
                }))
              }
              return !p
            })
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            showPreview ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/40 hover:text-white/60'
          }`}
          title={showPreview ? 'Back to file list' : 'Preview merge order'}
        >
          <FileText size={12} />
          Preview
        </button>

        <button
          onClick={() => {
            if (!tocEnabled) {
              setTocEnabled(true)
              setTocModalOpen(true)
            } else {
              setTocModalOpen(true)
            }
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            tocEnabled ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/40 hover:text-white/60'
          }`}
          title="Table of Contents"
        >
          <ListOrdered size={12} />
          TOC
          {tocEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#F47B20]" />}
        </button>

        <Button
          onClick={handleMerge}
          disabled={files.length < 1 || isMerging}
          icon={<Download size={14} />}
        >
          {isMerging ? 'Merging...' : 'Merge & Download'}
        </Button>
      </div>

      {/* Estimated output size + smart filename */}
      {files.length > 0 && !isMerging && (
        <div className="flex items-center gap-3 text-xs text-white/40 flex-shrink-0">
          <span>Estimated output: ~{formatFileSize(estimatedSize)}</span>
          <span className="text-white/20">·</span>
          <span className="truncate max-w-[300px]" title={smartFilename}>{smartFilename}</span>
        </div>
      )}

      {/* Progress bar */}
      {isMerging && (
        <ProgressBar value={progress} max={100} label="Merging PDFs..." />
      )}

      {/* Merge error */}
      {mergeError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-red-400">{mergeError}</span>
          <button
            onClick={() => setMergeError(null)}
            className="ml-auto text-xs text-white/40 hover:text-white/70"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Preview mode — flat view of all included pages in merge order */}
      {showPreview ? (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPage(null) }}>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${zoomCols}, 1fr)` }}>
            {/* TOC page preview cards */}
            {tocEnabled && tocEntries.length > 0 && (() => {
              const tocPages = estimateTocPageCount(tocEntries.length)
              return Array.from({ length: tocPages }, (_, i) => (
                <div key={`toc-page-${i}`} className="relative rounded-lg border border-[#F47B20]/20 bg-[#F47B20]/[0.04] p-1.5 flex items-center justify-center">
                  <div className="w-full aspect-[8.5/11] rounded bg-white/[0.06] flex flex-col items-center justify-center gap-1">
                    <ListOrdered size={16} className="text-[#F47B20]/60" />
                    <span className="text-[9px] text-[#F47B20]/60 font-medium">
                      {i === 0 ? 'TABLE OF CONTENTS' : 'TOC (continued)'}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-[#F47B20]/80">#{i + 1}</div>
                </div>
              ))
            })()}
            {(() => {
              let pos = tocEnabled && tocEntries.length > 0 ? estimateTocPageCount(tocEntries.length) : 0
              return files.flatMap((file) => {
                if (file.pages.length > 0) {
                  return file.pages
                    .filter((p) => !p.excluded)
                    .map((page) => {
                      pos++
                      return (
                        <div key={`${file.id}-${page.uid}`} className="relative rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 flex items-center justify-center">
                          {page.thumbnail ? (
                            <img src={page.thumbnail} className="w-full h-auto rounded object-contain" draggable={false} style={page.rotation !== 0 ? { transform: `rotate(${page.rotation}deg)` } : undefined} />
                          ) : (
                            <div className="w-full aspect-[8.5/11] rounded bg-white/[0.04]" />
                          )}
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-[#F47B20]/80">#{pos}</div>
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] text-white/60 bg-black/60 truncate max-w-[90%]">{file.name} p{page.pageNumber}</div>
                          {page.rotation !== 0 && <div className="absolute top-2 right-2 px-1 py-0.5 rounded text-[9px] font-bold bg-blue-500/70 text-white">{page.rotation}°</div>}
                        </div>
                      )
                    })
                } else {
                  return Array.from({ length: file.pageCount }, (_, i) => {
                    pos++
                    return (
                      <div key={`${file.id}-all-${i}`} className="relative rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 flex items-center justify-center">
                        <div className="w-full aspect-[8.5/11] rounded bg-white/[0.04] flex items-center justify-center text-[10px] text-white/20">p{i + 1}</div>
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-[#F47B20]/80">#{pos}</div>
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] text-white/60 bg-black/60 truncate max-w-[90%]">{file.name}</div>
                      </div>
                    )
                  })
                }
              })
            })()}
          </div>
        </div>
      ) : (
        /* File list with dnd-kit sortable */
        <DndContext
          sensors={fileSensors}
          collisionDetection={closestCenter}
          onDragStart={handleFileDragStart}
          onDragEnd={handleFileDragEnd}
        >
          <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-1.5" onClick={(e) => { if (e.target === e.currentTarget) { setSelectedPage(null); setSelectedFileIdx(null) } }}>
              {files.map((file, idx) => {
                const pageInfo = getIncludedPageInfo(file)
                return (
                  <SortableFileRow key={file.id} id={file.id}>
                    {({ handleProps, isDragging }) => (
                      <div
                        className={`
                          rounded-lg border transition-all
                          ${isDragging ? 'border-[#F47B20]/40 bg-[#F47B20]/5 opacity-40' : 'border-white/[0.06] bg-white/[0.03]'}
                          hover:border-white/[0.12]
                        `}
                      >
                        {/* File row */}
                        <div
                          className={`flex items-center gap-3 p-3 cursor-pointer ${selectedFileIdx === idx ? 'bg-white/[0.04]' : ''}`}
                          onClick={() => setSelectedFileIdx(idx)}
                        >
                          {/* Drag handle */}
                          <div {...handleProps} className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                          </div>

                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleExpand(file.id)}
                            className="p-1 rounded text-white/30 hover:text-[#F47B20] transition-colors"
                            title={file.expanded ? 'Collapse pages' : 'Expand pages'}
                          >
                            {file.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* Order number */}
                          <div className="w-6 h-6 rounded-md bg-[#F47B20]/15 text-[#F47B20] text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </div>

                          {/* Thumbnail */}
                          {file.thumbnail && (
                            <img
                              src={file.thumbnail}
                              alt=""
                              className="h-14 w-auto rounded border border-white/[0.08] flex-shrink-0"
                            />
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{file.name}</p>
                            <p className="text-xs text-white/40">
                              <span className={pageInfo.hasExclusions ? 'text-[#F47B20]' : ''}>{pageInfo.text}</span>
                              {' · '}
                              {formatFileSize(file.size)}
                            </p>
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={() => removeFile(file.id)}
                            aria-label={`Remove ${file.name}`}
                            className="p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Expanded page grid with dnd-kit sortable */}
                        {file.expanded && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="border-t border-white/[0.06] pt-3">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handlePageDragStart}
                                onDragEnd={(event) => handlePageDragEnd(event, file.id)}
                              >
                                <SortableContext items={file.pages.map((p) => p.uid)} strategy={rectSortingStrategy}>
                                  <div
                                    className="grid gap-2"
                                    style={{ gridTemplateColumns: `repeat(${zoomCols}, 1fr)` }}
                                  >
                                    {file.pages.map((page, pageIdx) => (
                                      <SortablePageItem
                                        key={page.uid}
                                        page={page}
                                        pageIdx={pageIdx}
                                        fileId={file.id}
                                        isSelected={selectedPage?.fileId === file.id && selectedPage.pageIdx === pageIdx}
                                        isCopiedSource={showCopied && selectedPage?.fileId === file.id && selectedPage.pageIdx === pageIdx}
                                        onContextMenu={(e) => handlePageContextMenu(e, file.id, pageIdx)}
                                        onClick={(e) => handlePageClick(e, file.id, pageIdx)}
                                        onToggleExclude={(e) => { e.stopPropagation(); togglePageExclude(file.id, pageIdx) }}
                                        onRotate={(dir) => rotatePage(file.id, pageIdx, dir)}
                                        scrollRoot={scrollRef.current}
                                        onThumbnailNeeded={() => loadPageThumbnail(file.id, page.uid, page.pageNumber)}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                                <DragOverlay adjustScale={false}>
                                  {activeDragId && (() => {
                                    const dragPage = file.pages.find((p) => p.uid === activeDragId)
                                    if (!dragPage) return null
                                    return (
                                      <div
                                        className="rounded-lg border-2 border-[#F47B20] p-1.5 bg-[#00171F]/90 shadow-lg shadow-[#F47B20]/20"
                                        style={activeDragWidth ? { width: activeDragWidth } : undefined}
                                      >
                                        {dragPage.thumbnail ? (
                                          <img src={dragPage.thumbnail} className="w-full h-auto rounded object-contain" draggable={false} />
                                        ) : (
                                          <div className="w-full aspect-[8.5/11] rounded bg-white/[0.08]" />
                                        )}
                                      </div>
                                    )
                                  })()}
                                </DragOverlay>
                              </DndContext>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableFileRow>
                )
              })}
            </div>
          </SortableContext>
          <DragOverlay adjustScale={false}>
            {fileDragId && (() => {
              const dragFile = files.find((f) => f.id === fileDragId)
              if (!dragFile) return null
              return (
                <div className="rounded-lg border-2 border-[#F47B20] bg-[#00171F]/90 shadow-lg shadow-[#F47B20]/20 p-3 flex items-center gap-3">
                  {dragFile.thumbnail && <img src={dragFile.thumbnail} className="h-10 w-auto rounded" />}
                  <span className="text-sm text-white truncate max-w-[200px]">{dragFile.name}</span>
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      )}

      {/* Footer hint */}
      <p className="text-[10px] text-white/25 text-center flex-shrink-0">
        Drag handle to reorder files · Expand to manage pages · Right-click to exclude · Hover for rotate · Ctrl/Cmd+C/V to copy-paste pages · Del to remove file
      </p>

      {/* Password modal */}
      {passwordPrompt && (
        <PasswordModal
          fileName={passwordPrompt.file.name}
          onSubmit={(pw) => passwordPrompt.resolve(pw)}
          onCancel={() => passwordPrompt.resolve(null)}
        />
      )}

      <TocEditorModal
        open={tocModalOpen}
        onClose={() => setTocModalOpen(false)}
        entries={tocEntries}
        onEntriesChange={setTocEntries}
        numbering={tocNumbering}
        onNumberingChange={setTocNumbering}
        customPrefix={tocCustomPrefix}
        onCustomPrefixChange={setTocCustomPrefix}
        files={files}
        estimatedTocPageCount={estimateTocPageCount(tocEntries.length)}
      />

    </div>
  )
}
