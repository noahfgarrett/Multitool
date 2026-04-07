import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { FlowchartStore } from './flowchartStore.ts'
import { X, ChevronDown, ChevronUp, Replace } from 'lucide-react'

// ── Component ───────────────────────────────────────────────

export function FindReplace({
  store,
  onClose,
}: {
  store: FlowchartStore
  onClose: () => void
}) {
  const { nodes, edges, updateNode, updateEdge, batchUpdateNodes, batchUpdateEdges, setSelection, pushHistory, setViewport, viewport } = store
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Focus search input on mount
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // ── Find matches ────────────────────────────────────────

  interface MatchResult {
    type: 'node' | 'edge'
    id: string
    label: string
  }

  const matches: MatchResult[] = useMemo(() => {
    if (!query.trim()) return []

    const lowerQuery = query.toLowerCase()
    const results: MatchResult[] = []

    for (const node of nodes) {
      if (node.label.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'node', id: node.id, label: node.label })
      }
    }

    for (const edge of edges) {
      if (edge.label && edge.label.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'edge', id: edge.id, label: edge.label })
      }
    }

    return results
  }, [query, nodes, edges])

  // Reset index when matches change
  useEffect(() => {
    setCurrentMatchIdx(0)
  }, [matches.length])

  // ── Highlight current match ─────────────────────────────

  const currentMatch = matches[currentMatchIdx] ?? null

  // Select and pan to current match
  useEffect(() => {
    if (!currentMatch) {
      setSelection({ nodeIds: new Set(), edgeIds: new Set() })
      return
    }

    if (currentMatch.type === 'node') {
      setSelection({ nodeIds: new Set([currentMatch.id]), edgeIds: new Set() })

      // Pan to center the node
      const node = nodes.find(n => n.id === currentMatch.id)
      if (node) {
        setViewport(prev => ({
          ...prev,
          panX: -(node.x + node.width / 2) * prev.zoom + 400,
          panY: -(node.y + node.height / 2) * prev.zoom + 300,
        }))
      }
    } else {
      setSelection({ nodeIds: new Set(), edgeIds: new Set([currentMatch.id]) })
    }
  }, [currentMatch, nodes, setSelection, setViewport])

  // ── Navigate matches ────────────────────────────────────

  const goToNext = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatchIdx(prev => (prev + 1) % matches.length)
  }, [matches.length])

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return
    setCurrentMatchIdx(prev => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  // ── Replace ─────────────────────────────────────────────

  const replaceOne = useCallback(() => {
    if (!currentMatch || !replacement) return

    pushHistory(nodes, edges)

    if (currentMatch.type === 'node') {
      const newLabel = currentMatch.label.replace(new RegExp(escapeRegex(query), 'i'), replacement)
      updateNode(currentMatch.id, { label: newLabel })
    } else {
      const newLabel = currentMatch.label.replace(new RegExp(escapeRegex(query), 'i'), replacement)
      updateEdge(currentMatch.id, { label: newLabel })
    }
  }, [currentMatch, query, replacement, nodes, edges, pushHistory, updateNode, updateEdge])

  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replacement) return

    const regex = new RegExp(escapeRegex(query), 'gi')

    const nodeUpdates = new Map<string, Partial<import('./types.ts').DiagramNode>>()
    const edgeUpdates = new Map<string, Partial<import('./types.ts').DiagramEdge>>()

    for (const match of matches) {
      const newLabel = match.label.replace(regex, replacement)
      if (match.type === 'node') {
        nodeUpdates.set(match.id, { label: newLabel })
      } else {
        edgeUpdates.set(match.id, { label: newLabel })
      }
    }

    if (nodeUpdates.size > 0) batchUpdateNodes(nodeUpdates)
    if (edgeUpdates.size > 0) batchUpdateEdges(edgeUpdates)
  }, [matches, query, replacement, batchUpdateNodes, batchUpdateEdges])

  // ── Keyboard handling ───────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrev()
      } else {
        goToNext()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      goToNext()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      goToPrev()
      return
    }
  }, [onClose, goToNext, goToPrev])

  return (
    <div
      className="absolute top-2 right-2 z-30 bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden"
      style={{ width: 320 }}
      onKeyDown={handleKeyDown}
    >
      {/* Search row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06]">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find in diagram..."
          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none px-1"
        />
        <span className="text-[10px] text-white/30 tabular-nums min-w-[40px] text-center">
          {matches.length > 0 ? `${currentMatchIdx + 1}/${matches.length}` : '0/0'}
        </span>
        <button
          onClick={goToPrev}
          disabled={matches.length === 0}
          title="Previous (Shift+Enter)"
          className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={goToNext}
          disabled={matches.length === 0}
          title="Next (Enter)"
          className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
          className={`p-0.5 transition-colors ${showReplace ? 'text-[#14B8A6]' : 'text-white/40 hover:text-white'}`}
        >
          <Replace size={14} />
        </button>
        <button
          onClick={onClose}
          title="Close (Escape)"
          className="p-0.5 text-white/40 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06]">
          <input
            type="text"
            value={replacement}
            onChange={e => setReplacement(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none px-1"
          />
          <button
            onClick={replaceOne}
            disabled={!currentMatch || !replacement}
            title="Replace current"
            className="px-2 py-0.5 text-[10px] text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded disabled:opacity-30 transition-colors"
          >
            Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={matches.length === 0 || !replacement}
            title="Replace all"
            className="px-2 py-0.5 text-[10px] text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded disabled:opacity-30 transition-colors"
          >
            All
          </button>
        </div>
      )}
    </div>
  )
}

// ── Utility ─────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
