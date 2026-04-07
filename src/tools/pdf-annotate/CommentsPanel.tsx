import { useMemo, useState } from 'react'
import {
  MessageSquare, Filter, ChevronRight, StickyNote as StickyNoteIcon, X,
} from 'lucide-react'
import type {
  CommentThread, CommentStatus, Comment, StickyNote, Annotation,
} from './types'
import { COMMENT_STATUS_COLORS } from './types'

// ── Helpers ──────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getAnnotationPage(
  annotationId: string,
  annotations: Record<number, Annotation[]>,
  stickyNotes: Record<number, StickyNote[]>,
): number {
  for (const [page, anns] of Object.entries(annotations)) {
    if (anns.some(a => a.id === annotationId)) return Number(page)
  }
  for (const [page, notes] of Object.entries(stickyNotes)) {
    if (notes.some(n => n.id === annotationId)) return Number(page)
  }
  return 1
}

function getAnnotationType(
  annotationId: string,
  annotations: Record<number, Annotation[]>,
  stickyNotes: Record<number, StickyNote[]>,
): 'sticky' | string {
  for (const anns of Object.values(annotations)) {
    const found = anns.find(a => a.id === annotationId)
    if (found) return found.type
  }
  for (const notes of Object.values(stickyNotes)) {
    if (notes.some(n => n.id === annotationId)) return 'sticky'
  }
  return 'unknown'
}

function getLatestComment(thread: CommentThread): Comment | undefined {
  if (thread.comments.length === 0) return undefined
  return thread.comments.reduce((latest, c) =>
    c.timestamp > latest.timestamp ? c : latest,
    thread.comments[0],
  )
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

const STATUS_LABELS: Record<CommentStatus, string> = {
  none: 'All',
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

const FILTER_OPTIONS: CommentStatus[] = ['none', 'open', 'accepted', 'rejected', 'resolved']

// ── Component ────────────────────────────────────────

interface CommentsPanelProps {
  isOpen: boolean
  onClose: () => void
  threads: CommentThread[]
  stickyNotes: Record<number, StickyNote[]>
  annotations: Record<number, Annotation[]>
  onSelectThread: (annotationId: string, page: number) => void
  onStatusChange: (annotationId: string, status: CommentStatus) => void
}

export default function CommentsPanel({
  isOpen,
  onClose,
  threads,
  stickyNotes,
  annotations,
  onSelectThread,
  onStatusChange,
}: CommentsPanelProps): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<CommentStatus>('none')

  // Count threads per status
  const statusCounts = useMemo(() => {
    const counts: Record<CommentStatus, number> = {
      none: threads.length,
      open: 0,
      accepted: 0,
      rejected: 0,
      resolved: 0,
    }
    for (const t of threads) {
      if (t.status !== 'none') {
        counts[t.status]++
      }
    }
    return counts
  }, [threads])

  // Filter and sort threads
  const filteredThreads = useMemo(() => {
    const filtered = activeFilter === 'none'
      ? threads
      : threads.filter(t => t.status === activeFilter)

    return [...filtered].sort((a, b) => {
      const latestA = getLatestComment(a)
      const latestB = getLatestComment(b)
      const timeA = latestA?.timestamp ?? 0
      const timeB = latestB?.timestamp ?? 0
      return timeB - timeA
    })
  }, [threads, activeFilter])

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[320px] bg-[#1a1a2e] border-l border-white/[0.1] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.1] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#14B8A6]" />
          <span className="text-white font-semibold text-sm">Comments</span>
          <span className="bg-white/[0.1] text-white/70 text-xs px-2 py-0.5 rounded-full">
            {threads.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors p-1 rounded hover:bg-white/[0.05]"
          aria-label="Close comments panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.1] shrink-0 overflow-x-auto">
        <Filter size={14} className="text-white/40 shrink-0" />
        {FILTER_OPTIONS.map(status => {
          const isActive = activeFilter === status
          const count = statusCounts[status]
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#14B8A6]/20 text-[#14B8A6]'
                  : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
              }`}
            >
              {status !== 'none' && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COMMENT_STATUS_COLORS[status] }}
                />
              )}
              {STATUS_LABELS[status]}
              <span className={`${isActive ? 'text-[#14B8A6]/70' : 'text-white/30'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
            <MessageSquare size={40} strokeWidth={1} />
            <span className="text-sm">No comments yet</span>
          </div>
        ) : (
          filteredThreads.map(thread => {
            const latest = getLatestComment(thread)
            const page = getAnnotationPage(thread.annotationId, annotations, stickyNotes)
            const annType = getAnnotationType(thread.annotationId, annotations, stickyNotes)
            const isStickyNote = annType === 'sticky'

            return (
              <button
                key={thread.annotationId}
                onClick={() => onSelectThread(thread.annotationId, page)}
                className="w-full text-left px-4 py-3 border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors group"
              >
                {/* Top row: type + page + status + count */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {isStickyNote ? (
                      <StickyNoteIcon size={14} className="text-[#14B8A6]" />
                    ) : (
                      <MessageSquare size={14} className="text-[#14B8A6]" />
                    )}
                    <span className="text-white/50 text-xs">
                      {isStickyNote ? 'Note' : annType} — p.{page}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COMMENT_STATUS_COLORS[thread.status] }}
                      title={thread.status}
                    />
                    <span className="bg-white/[0.1] text-white/50 text-xs px-1.5 py-0.5 rounded-full">
                      {thread.comments.length}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-white/20 group-hover:text-white/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Comment preview */}
                {latest && (
                  <>
                    <p className="text-white/80 text-sm leading-snug mb-1">
                      {truncate(latest.text, 80)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{latest.authorName}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(latest.timestamp)}</span>
                    </div>
                  </>
                )}

                {/* Status selector */}
                <div className="mt-2">
                  <select
                    value={thread.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      e.stopPropagation()
                      onStatusChange(thread.annotationId, e.target.value as CommentStatus)
                    }}
                    className="bg-white/[0.05] border border-white/[0.1] text-white/60 text-xs rounded px-1.5 py-0.5 outline-none focus:border-[#14B8A6]/50"
                  >
                    {FILTER_OPTIONS.map(s => (
                      <option key={s} value={s} className="bg-[#1a1a2e] text-white">
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
