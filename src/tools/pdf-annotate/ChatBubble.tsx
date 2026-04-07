import { useState, useRef, useCallback, useEffect } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { X, Send, Reply, ChevronDown } from 'lucide-react'
import type { CommentThread, CommentStatus, Comment } from './types'
import { COMMENT_STATUS_COLORS, genId } from './types'
import type { UserProfile } from '@/utils/userProfile'

// ── Utility ──────────────────────────────────────────

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Constants ────────────────────────────────────────

const STATUS_ORDER: CommentStatus[] = ['none', 'open', 'accepted', 'rejected', 'resolved']

const STATUS_LABELS: Record<CommentStatus, string> = {
  none: 'None',
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

const BUBBLE_WIDTH = 340
const POINTER_SIZE = 10

// ── Props ────────────────────────────────────────────

interface ChatBubbleProps {
  thread: CommentThread | null
  annotationId: string
  userProfile: UserProfile
  position: { x: number; y: number }
  onAddComment: (annotationId: string, text: string, parentId?: string) => void
  onStatusChange: (annotationId: string, status: CommentStatus) => void
  onClose: () => void
}

// ── Component ────────────────────────────────────────

export function ChatBubble({
  thread,
  annotationId,
  userProfile,
  position,
  onAddComment,
  onStatusChange,
  onClose,
}: ChatBubbleProps): React.JSX.Element {
  // Drag state
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Input state
  const [inputText, setInputText] = useState('')
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const currentStatus: CommentStatus = thread?.status ?? 'none'
  const comments: Comment[] = thread?.comments ?? []
  const shortId = annotationId.slice(0, 8)

  // Fade+scale in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false)
      }
    }
    if (isStatusOpen) {
      document.addEventListener('pointerdown', handleClick)
      return () => document.removeEventListener('pointerdown', handleClick)
    }
  }, [isStatusOpen])

  // ── Drag handlers ──

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [offset])

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // ── Submit handler ──

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    onAddComment(annotationId, trimmed, replyTarget?.id)
    setInputText('')
    setReplyTarget(null)
    inputRef.current?.focus()
  }, [inputText, annotationId, replyTarget, onAddComment])

  // ── Status selection ──

  const handleStatusSelect = useCallback((status: CommentStatus) => {
    onStatusChange(annotationId, status)
    setIsStatusOpen(false)
  }, [annotationId, onStatusChange])

  // ── Render helpers ──

  function renderComment(comment: Comment): React.JSX.Element {
    const isReply = comment.parentId !== undefined
    const initialsColor = stringToColor(comment.authorName)

    return (
      <div
        key={comment.id}
        className={`flex gap-2 py-2 ${isReply ? 'ml-6 pl-3 border-l-2 border-white/[0.1]' : ''}`}
      >
        {/* Author initials circle */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: initialsColor }}
        >
          {comment.authorInitials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name + timestamp */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white truncate">
              {comment.authorName}
            </span>
            <span className="text-[10px] text-white/40 flex-shrink-0">
              {formatRelativeTime(comment.timestamp)}
            </span>
          </div>

          {/* Comment text */}
          <p className="text-xs text-white/80 mt-0.5 break-words whitespace-pre-wrap">
            {comment.text}
          </p>

          {/* Reply button */}
          <button
            className="flex items-center gap-1 mt-1 text-[10px] text-white/30 hover:text-[#14B8A6] transition-colors"
            onClick={() => {
              setReplyTarget(comment)
              inputRef.current?.focus()
            }}
          >
            <Reply size={10} />
            Reply
          </button>
        </div>
      </div>
    )
  }

  // ── Position calculation ──

  const left = position.x + offset.x
  const top = position.y + offset.y + POINTER_SIZE + 4

  return (
    <div
      className="fixed z-[9999] select-none"
      style={{
        left,
        top,
        width: BUBBLE_WIDTH,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transformOrigin: 'top left',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      }}
    >
      {/* Triangle pointer */}
      <div
        className="absolute"
        style={{
          top: -POINTER_SIZE,
          left: 20,
          width: 0,
          height: 0,
          borderLeft: `${POINTER_SIZE}px solid transparent`,
          borderRight: `${POINTER_SIZE}px solid transparent`,
          borderBottom: `${POINTER_SIZE}px solid #1a1a2e`,
        }}
      />

      {/* Main bubble */}
      <div className="bg-[#1a1a2e] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden">
        {/* Header — draggable */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-white/[0.1] cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Short annotation ID */}
            <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
              #{shortId}
            </span>

            {/* Status badge with dropdown */}
            <div className="relative" ref={statusRef}>
              <button
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white/80 bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsStatusOpen((prev) => !prev)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COMMENT_STATUS_COLORS[currentStatus] }}
                />
                {STATUS_LABELS[currentStatus]}
                <ChevronDown size={10} className="text-white/40" />
              </button>

              {/* Status dropdown */}
              {isStatusOpen && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/[0.1] rounded-md shadow-xl overflow-hidden z-10">
                  {STATUS_ORDER.map((status) => (
                    <button
                      key={status}
                      className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors ${
                        status === currentStatus
                          ? 'bg-white/[0.1] text-white'
                          : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusSelect(status)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COMMENT_STATUS_COLORS[status] }}
                      />
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            className="flex-shrink-0 p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable comment list */}
        <div
          ref={scrollRef}
          className="max-h-[300px] overflow-y-auto px-3 divide-y divide-white/[0.06]"
        >
          {comments.length === 0 ? (
            <div className="py-6 text-center text-xs text-white/30">
              No comments yet
            </div>
          ) : (
            comments.map((c) => renderComment(c))
          )}
        </div>

        {/* Reply indicator */}
        {replyTarget && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-t border-white/[0.06]">
            <span className="text-[10px] text-white/50">
              Replying to <span className="text-[#14B8A6] font-medium">{replyTarget.authorName}</span>
            </span>
            <button
              className="text-[10px] text-white/30 hover:text-white transition-colors"
              onClick={() => setReplyTarget(null)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Input area */}
        <form
          className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.1]"
          onSubmit={handleSubmit}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#14B8A6]/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex-shrink-0 p-1.5 rounded-md bg-[#14B8A6] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0D9488] transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Helper: deterministic color from string ──────────

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 55%, 45%)`
}


