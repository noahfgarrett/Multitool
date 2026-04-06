import { useEffect } from 'react'
import type { ToolType, Point, Annotation, PageAnnotations, Measurement, PolyMeasurement } from './types.ts'
import { DRAW_TYPES, TEXT_TYPES, genId } from './types.ts'
import type { SelectTextToolbar, ContextMenuState } from './usePdfAnnotateState.ts'
import type { Toast } from '@/types/common.ts'

// ── Parameter interface ──────────────────────────────────

export interface KeyboardShortcutsParams {
  // State values
  editingTextId: string | null
  annotations: PageAnnotations
  selectedAnnId: string | null
  selectedMeasureId: string | null
  selectedArrowIdx: number | null
  activeTool: ToolType
  findOpen: boolean
  findMatches: { pageNum: number; matchX: number; matchW: number }[]
  contextMenu: ContextMenuState | null
  selectTextToolbar: SelectTextToolbar | null
  focusMode: boolean

  // Refs
  activePageRef: React.RefObject<number>
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  zoomRef: React.RefObject<number>
  spaceHeldRef: React.MutableRefObject<boolean>
  panRef: React.MutableRefObject<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>
  measureStartRef: React.MutableRefObject<Point | null>
  measurePreviewRef: React.MutableRefObject<Point | null>
  polyPointsRef: React.MutableRefObject<Point[]>
  polyPreviewRef: React.MutableRefObject<Point | null>
  currentPtsRef: React.MutableRefObject<Point[]>
  cloudPreviewRef: React.MutableRefObject<Point | null>
  ocrAbortRef: React.MutableRefObject<AbortController | null>
  selectTextStartRef: React.MutableRefObject<Point | null>
  selectTextRectsRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }[]>
  clipboardRef: React.MutableRefObject<Annotation | null>
  pdfFileRef: React.RefObject<{ pageCount: number } | null>
  focusModeRef: React.RefObject<boolean>
  findInputRef: React.RefObject<HTMLInputElement | null>

  // Setters
  setBold: (v: boolean) => void
  setItalic: (v: boolean) => void
  setUnderline: (v: boolean) => void
  setStrikethrough: (v: boolean) => void
  setFindOpen: (fn: boolean | ((v: boolean) => boolean)) => void
  setFindIdx: (fn: number | ((v: number) => number)) => void
  setFindQuery: (v: string) => void
  setFindCommittedQuery: (v: string) => void
  setFindMatches: (v: never[]) => void
  setOcrScanning: (v: boolean) => void
  setContextMenu: (v: ContextMenuState | null) => void
  setSelectTextToolbar: (v: SelectTextToolbar | null) => void
  setSelectedAnnId: (v: string | null) => void
  setSelectedMeasureId: (v: string | null) => void
  setSelectedArrowIdx: (v: number | null) => void
  setMeasurements: (fn: (prev: Record<number, Measurement[]>) => Record<number, Measurement[]>) => void
  setPolyMeasurements: (fn: (prev: Record<number, PolyMeasurement[]>) => Record<number, PolyMeasurement[]>) => void
  setAnnotations: (v: PageAnnotations) => void
  setActiveTool: (v: ToolType) => void
  setActiveDraw: (v: ToolType) => void
  setActiveText: (v: ToolType) => void
  setActiveHighlight: (v: 'highlighter' | 'textHighlight' | 'textStrikethrough') => void
  setCanvasCursor: (v: string | null) => void
  setFocusMode: (v: boolean) => void

  // Callbacks
  undo: () => void
  redo: () => void
  removeAnnotation: (id: string) => void
  commitAnnotation: (ann: Annotation) => void
  updateAnnotation: (id: string, update: Partial<Annotation>) => void
  pushHistory: (next: PageAnnotations) => void
  redrawAll: () => void
  redrawPage: (pageNum: number) => void
  fitToWindow: () => void
  navigateToPage: (page: number | ((p: number) => number)) => void
  zoomAtCenter: (newZoom: number) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
}

// ── Hook ──────────────────────────────────────────────────

export function useKeyboardShortcuts(params: KeyboardShortcutsParams): void {
  const {
    editingTextId, annotations, selectedAnnId, selectedMeasureId,
    selectedArrowIdx, activeTool, findOpen, findMatches, contextMenu,
    selectTextToolbar, focusMode,
    activePageRef, textareaRef, zoomRef, spaceHeldRef, panRef,
    measureStartRef, measurePreviewRef, polyPointsRef, polyPreviewRef,
    currentPtsRef, cloudPreviewRef, ocrAbortRef,
    selectTextStartRef, selectTextRectsRef, clipboardRef,
    pdfFileRef, focusModeRef, findInputRef,
    setBold, setItalic, setUnderline, setStrikethrough,
    setFindOpen, setFindIdx, setFindQuery, setFindCommittedQuery,
    setFindMatches, setOcrScanning, setContextMenu, setSelectTextToolbar,
    setSelectedAnnId, setSelectedMeasureId, setSelectedArrowIdx,
    setMeasurements, setPolyMeasurements, setAnnotations,
    setActiveTool, setActiveDraw, setActiveText, setActiveHighlight,
    setCanvasCursor, setFocusMode,
    undo, redo, removeAnnotation, commitAnnotation, updateAnnotation,
    pushHistory, redrawAll, redrawPage, fitToWindow, navigateToPage,
    zoomAtCenter, addToast,
  } = params

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // ── Ctrl+B/I/U while editing text ──
      if (editingTextId && mod) {
        const k = e.key.toLowerCase()
        if (k === 'b' || k === 'i' || k === 'u') {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === editingTextId)
          if (!ann) return
          const ta = textareaRef.current
          const selStart = ta?.selectionStart ?? 0
          const selEnd = ta?.selectionEnd ?? 0
          if (k === 'b') { const v = !ann.bold; setBold(v); updateAnnotation(editingTextId, { bold: v }) }
          if (k === 'i') { const v = !ann.italic; setItalic(v); updateAnnotation(editingTextId, { italic: v }) }
          if (k === 'u') { const v = !ann.underline; setUnderline(v); updateAnnotation(editingTextId, { underline: v }) }
          requestAnimationFrame(() => {
            textareaRef.current?.focus({ preventScroll: true })
            textareaRef.current?.setSelectionRange(selStart, selEnd)
          })
          return
        }
        if (k === 'x' && e.shiftKey) {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === editingTextId)
          if (!ann) return
          const ta = textareaRef.current
          const selStart = ta?.selectionStart ?? 0
          const selEnd = ta?.selectionEnd ?? 0
          const v = !ann.strikethrough; setStrikethrough(v); updateAnnotation(editingTextId, { strikethrough: v })
          requestAnimationFrame(() => {
            textareaRef.current?.focus({ preventScroll: true })
            textareaRef.current?.setSelectionRange(selStart, selEnd)
          })
          return
        }
      }
      if (editingTextId) return // Don't intercept other keys while editing text

      // ── Ctrl+F: find | F3/Shift+F3: next/prev match ──
      if (mod && e.key === 'f') {
        e.preventDefault()
        setFindOpen((o: boolean) => { if (!o) setTimeout(() => findInputRef.current?.focus(), 50); return true })
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        if (!findOpen) { setFindOpen(true); setTimeout(() => findInputRef.current?.focus(), 50); return }
        setFindIdx((i: number) => e.shiftKey ? (i - 1 + Math.max(1, findMatches.length)) % Math.max(1, findMatches.length) : (i + 1) % Math.max(1, findMatches.length))
        return
      }

      // ── Escape: context-dependent ──
      if (e.key === 'Escape') {
        e.preventDefault()
        if (contextMenu) { setContextMenu(null); return }
        if (findOpen) { setFindOpen(false); setFindQuery(''); setFindCommittedQuery(''); setFindMatches([]); ocrAbortRef.current?.abort(); setOcrScanning(false); return }
        if (selectTextToolbar) {
          setSelectTextToolbar(null); selectTextStartRef.current = null; selectTextRectsRef.current = []; redrawAll(); return
        }
        if (activeTool === 'measure') {
          if (measureStartRef.current) {
            measureStartRef.current = null; measurePreviewRef.current = null; redrawAll(); return
          }
          if (polyPointsRef.current.length > 0) {
            polyPointsRef.current = []; polyPreviewRef.current = null; redrawAll(); return
          }
        }
        if ((activeTool === 'cloud' || activeTool === 'polygon') && currentPtsRef.current.length > 0) {
          currentPtsRef.current = []; cloudPreviewRef.current = null; redrawAll(); return
        }
        if (selectedAnnId) { setSelectedAnnId(null); return }
        if (selectedMeasureId) { setSelectedMeasureId(null); return }
        return
      }

      if (findOpen) return

      // ── Undo/Redo ──
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return }
      if (mod && e.key === 'y') { e.preventDefault(); redo(); return }

      // ── Delete ──
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && (activeTool === 'cloud' || activeTool === 'polygon') && currentPtsRef.current.length > 0) {
          e.preventDefault()
          currentPtsRef.current.pop()
          redrawPage(activePageRef.current)
          return
        }
        if (selectedMeasureId) {
          e.preventDefault()
          setMeasurements(prev => {
            const updated = { ...prev }
            for (const [page, list] of Object.entries(updated)) {
              updated[Number(page)] = list.filter(m => m.id !== selectedMeasureId)
            }
            return updated
          })
          setPolyMeasurements(prev => {
            const updated = { ...prev }
            for (const [page, list] of Object.entries(updated)) {
              updated[Number(page)] = list.filter(m => m.id !== selectedMeasureId)
            }
            return updated
          })
          setSelectedMeasureId(null)
          return
        }
        if (selectedArrowIdx !== null && selectedAnnId) {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
          if (ann && ann.arrows && selectedArrowIdx < ann.arrows.length) {
            const newArrows = ann.arrows.filter((_, i) => i !== selectedArrowIdx)
            updateAnnotation(selectedAnnId, { arrows: newArrows })
            setSelectedArrowIdx(null)
          }
          return
        }
        if (selectedAnnId) {
          e.preventDefault()
          removeAnnotation(selectedAnnId)
          setSelectedAnnId(null)
          setSelectedArrowIdx(null)
          addToast({ type: 'info', message: 'Annotation deleted' })
          return
        }
      }

      // ── Ctrl+D: Duplicate selected annotation ──
      if (mod && e.key === 'd' && selectedAnnId) {
        e.preventDefault()
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) {
          const dup: Annotation = {
            ...structuredClone(ann),
            id: genId(),
            points: ann.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
            arrows: ann.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          }
          commitAnnotation(dup)
          setSelectedAnnId(dup.id)
        }
        return
      }

      // ── Ctrl+C: Copy selected annotation ──
      if (mod && e.key === 'c' && selectedAnnId) {
        e.preventDefault()
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) clipboardRef.current = structuredClone(ann)
        return
      }

      // ── Ctrl+V: Paste annotation from clipboard ──
      if (mod && e.key === 'v' && clipboardRef.current) {
        e.preventDefault()
        const src = clipboardRef.current
        const pasted: Annotation = {
          ...structuredClone(src),
          id: genId(),
          points: src.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          arrows: src.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
        }
        commitAnnotation(pasted)
        setSelectedAnnId(pasted.id)
        return
      }

      // ── Arrow key nudge ──
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedAnnId) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) {
          updateAnnotation(selectedAnnId, {
            points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
            arrows: ann.arrows?.map(p => ({ x: p.x + dx, y: p.y + dy })),
          })
        }
        return
      }

      // ── Tab / Shift+Tab: cycle through text/callout boxes ──
      if (e.key === 'Tab') {
        const textAnns = (annotations[activePageRef.current] || []).filter(a => a.type === 'text' || a.type === 'callout')
        if (textAnns.length > 0) {
          e.preventDefault()
          const curIdx = selectedAnnId ? textAnns.findIndex(a => a.id === selectedAnnId) : -1
          const next = e.shiftKey
            ? (curIdx <= 0 ? textAnns.length - 1 : curIdx - 1)
            : (curIdx >= textAnns.length - 1 ? 0 : curIdx + 1)
          setSelectedAnnId(textAnns[next].id)
        }
        return
      }

      // ── Zoom shortcuts ──
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.min(4.0, zoomRef.current + 0.25) * 100) / 100)
        return
      }
      if (mod && e.key === '-') {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.max(0.25, zoomRef.current - 0.25) * 100) / 100)
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        fitToWindow()
        return
      }

      // ── Page navigation ──
      if (e.key === 'PageDown') {
        e.preventDefault()
        navigateToPage(p => Math.min(pdfFileRef.current?.pageCount || p, p + 1))
        return
      }
      if (e.key === 'PageUp') {
        e.preventDefault()
        navigateToPage(p => Math.max(1, p - 1))
        return
      }

      // ── Shift+H: text highlight tool ──
      if (e.shiftKey && !mod && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setActiveTool('textHighlight')
        setActiveHighlight('textHighlight')
        return
      }

      // ── Shift+X: text strikethrough tool ──
      if (e.shiftKey && !mod && !e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        setActiveTool('textStrikethrough')
        setActiveHighlight('textStrikethrough')
        return
      }

      // ── Space: temporary pan mode ──
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        spaceHeldRef.current = true
        setCanvasCursor('grab')
        return
      }

      // ── Ctrl+]: Bring to front ──
      if (mod && e.key === ']' && selectedAnnId) {
        e.preventDefault()
        const ap = activePageRef.current
        const pageAnns = annotations[ap] || []
        const idx = pageAnns.findIndex(a => a.id === selectedAnnId)
        if (idx >= 0 && idx < pageAnns.length - 1) {
          const next = [...pageAnns]
          const [item] = next.splice(idx, 1)
          next.push(item)
          const result = { ...annotations, [ap]: next }
          setAnnotations(result)
          pushHistory(result)
        }
        return
      }

      // ── Ctrl+[: Send to back ──
      if (mod && e.key === '[' && selectedAnnId) {
        e.preventDefault()
        const ap = activePageRef.current
        const pageAnns = annotations[ap] || []
        const idx = pageAnns.findIndex(a => a.id === selectedAnnId)
        if (idx > 0) {
          const next = [...pageAnns]
          const [item] = next.splice(idx, 1)
          next.unshift(item)
          const result = { ...annotations, [ap]: next }
          setAnnotations(result)
          pushHistory(result)
        }
        return
      }

      // ── F: Fit to page ──
      if (!mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        fitToWindow()
        return
      }

      // ── +/-: Zoom without modifier (10% steps) ──
      if (!mod && !e.shiftKey && !e.altKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.min(4.0, zoomRef.current + 0.1) * 100) / 100)
        return
      }
      if (!mod && !e.shiftKey && !e.altKey && e.key === '-') {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.max(0.25, zoomRef.current - 0.1) * 100) / 100)
        return
      }

      // ── Ctrl+A: Select all annotations on current page ──
      if (mod && e.key === 'a' && !editingTextId) {
        e.preventDefault()
        const pageAnns = annotations[activePageRef.current] || []
        if (pageAnns.length > 0) {
          setSelectedAnnId(pageAnns[pageAnns.length - 1].id)
          setActiveTool('select')
        }
        return
      }

      // ── Single-letter tool switching (no modifier) ──
      if (!mod && !e.shiftKey && !e.altKey) {
        const toolMap: Record<string, ToolType> = {
          s: 'select', p: 'pencil', l: 'line', a: 'arrow', r: 'rectangle', c: 'circle', k: 'cloud',
          t: 'text', o: 'callout', e: 'eraser', h: 'highlighter', m: 'measure',
          g: 'stamp', x: 'crop', n: 'note',
        }
        const mapped = toolMap[e.key.toLowerCase()]
        if (mapped) {
          e.preventDefault()
          setActiveTool(mapped)
          if (DRAW_TYPES.has(mapped)) setActiveDraw(mapped)
          if (TEXT_TYPES.has(mapped)) setActiveText(mapped)
          if (mapped === 'highlighter') setActiveHighlight('highlighter')
          return
        }
      }
      // Shift+K → Polygon tool
      if (!mod && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setActiveTool('polygon')
        setActiveDraw('polygon')
        return
      }
      // Shift+F → Focus mode toggle
      if (e.shiftKey && e.key === 'F') {
        e.preventDefault()
        const next = !focusModeRef.current
        setFocusMode(next)
        if (next && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {})
        } else if (!next && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        return
      }
    }
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceHeldRef.current = false
        panRef.current = null
        setCanvasCursor(null)
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', keyUpHandler)
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', keyUpHandler) }
  }, [undo, redo, selectedAnnId, editingTextId, removeAnnotation, activeTool, selectedMeasureId,
      redrawAll, redrawPage, annotations, commitAnnotation, updateAnnotation, fitToWindow, selectedArrowIdx, navigateToPage, selectTextToolbar, zoomAtCenter, pushHistory, addToast,
      contextMenu, findOpen, findMatches, focusMode, setFocusMode,
      // Additional deps from params
      activePageRef, textareaRef, zoomRef, spaceHeldRef, panRef,
      measureStartRef, measurePreviewRef, polyPointsRef, polyPreviewRef,
      currentPtsRef, cloudPreviewRef, ocrAbortRef, selectTextStartRef,
      selectTextRectsRef, clipboardRef, pdfFileRef, focusModeRef, findInputRef,
      setBold, setItalic, setUnderline, setStrikethrough,
      setFindOpen, setFindIdx, setFindQuery, setFindCommittedQuery,
      setFindMatches, setOcrScanning, setContextMenu, setSelectTextToolbar,
      setSelectedAnnId, setSelectedMeasureId, setSelectedArrowIdx,
      setMeasurements, setPolyMeasurements, setAnnotations,
      setActiveTool, setActiveDraw, setActiveText, setActiveHighlight,
      setCanvasCursor])
}
