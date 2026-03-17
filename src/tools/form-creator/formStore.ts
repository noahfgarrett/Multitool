import { useState, useRef, useCallback } from 'react'
import type { FormElement, FormDocument, Viewport, PageSize, FormElementType } from './types.ts'
import { createElement, createDocument, DEFAULT_VIEWPORT, MIN_ZOOM, MAX_ZOOM, PAGE_SIZES, PAGE_MARGIN, ELEMENT_DEFAULTS } from './types.ts'

const MAX_HISTORY = 50

// ── Hook: useFormStore ──────────────────────────────────────

export function useFormStore() {
  // ── Core state ──────────────────────────────────────────
  const [doc, setDoc] = useState<FormDocument>(() => createDocument())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [clipboard, setClipboard] = useState<FormElement[]>([])

  // Derived
  const selectedId = selectedIds.size > 0 ? [...selectedIds][0] : null

  // Ref to track latest doc for commitMove
  const docRef = useRef(doc)
  docRef.current = doc

  // ── Undo/redo (ref-based, structuredClone) ──────────────
  const historyRef = useRef<FormDocument[]>([structuredClone(doc)])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  const pushHistory = useCallback((nextDoc: FormDocument) => {
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(structuredClone(nextDoc))
    if (h.length > MAX_HISTORY) h.shift()
    historyRef.current = h
    historyIdxRef.current = h.length - 1
    forceRender(v => v + 1)
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const state = structuredClone(historyRef.current[historyIdxRef.current])
    setDoc(state)
    setSelectedIds(new Set())
    forceRender(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const state = structuredClone(historyRef.current[historyIdxRef.current])
    setDoc(state)
    setSelectedIds(new Set())
    forceRender(v => v + 1)
  }, [])

  // ── Document helpers ────────────────────────────────────

  const updateDoc = useCallback((updater: (prev: FormDocument) => FormDocument) => {
    setDoc(prev => {
      const next = { ...updater(prev), updatedAt: Date.now() }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  /** Update doc without pushing history (for live drag). */
  const updateDocSilent = useCallback((updater: (prev: FormDocument) => FormDocument) => {
    setDoc(prev => ({ ...updater(prev), updatedAt: Date.now() }))
  }, [])

  const setTitle = useCallback((title: string) => {
    updateDoc(prev => ({ ...prev, title }))
  }, [updateDoc])

  const setPageSize = useCallback((pageSize: PageSize) => {
    updateDoc(prev => ({ ...prev, pageSize }))
  }, [updateDoc])

  // ── Page management ─────────────────────────────────────

  const addPage = useCallback(() => {
    updateDoc(prev => ({ ...prev, pageCount: prev.pageCount + 1 }))
  }, [updateDoc])

  const removePage = useCallback((pageIndex: number) => {
    updateDoc(prev => {
      if (prev.pageCount <= 1) return prev
      // Remove elements on that page, shift elements on later pages
      const elements = prev.elements
        .filter(el => el.pageIndex !== pageIndex)
        .map(el => el.pageIndex > pageIndex ? { ...el, pageIndex: el.pageIndex - 1 } : el)
      return { ...prev, pageCount: prev.pageCount - 1, elements }
    })
    setSelectedIds(new Set())
  }, [updateDoc])

  // ── Element CRUD ────────────────────────────────────────

  const addElement = useCallback((type: FormElementType, pageIndex: number, overrides?: Partial<FormElement>) => {
    const pageDim = PAGE_SIZES[docRef.current.pageSize]
    // Find a non-overlapping Y position
    const pageElements = docRef.current.elements.filter(el => el.pageIndex === pageIndex)
    const defaults = ELEMENT_DEFAULTS[type]
    let y = PAGE_MARGIN
    if (pageElements.length > 0) {
      const maxBottom = Math.max(...pageElements.map(el => el.y + el.height))
      y = Math.min(maxBottom + 16, pageDim.heightPx - PAGE_MARGIN - defaults.height)
    }
    // Full-width elements should span the content area
    const contentWidth = pageDim.widthPx - 2 * PAGE_MARGIN
    const fullWidthOverride = (type === 'divider' || type === 'heading') ? { width: contentWidth } : {}
    const el = createElement(type, pageIndex, {
      x: PAGE_MARGIN,
      y: Math.max(PAGE_MARGIN, y),
      ...fullWidthOverride,
      ...overrides,
    })
    updateDoc(prev => ({ ...prev, elements: [...prev.elements, el] }))
    setSelectedIds(new Set([el.id]))
    return el
  }, [updateDoc])

  const updateElement = useCallback((id: string, updates: Partial<FormElement>) => {
    updateDoc(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el),
    }))
  }, [updateDoc])

  const removeElement = useCallback((id: string) => {
    updateDoc(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
    }))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next.size !== prev.size ? next : prev
    })
  }, [updateDoc])

  const removeSelectedElements = useCallback(() => {
    if (selectedIds.size === 0) return
    updateDoc(prev => ({
      ...prev,
      elements: prev.elements.filter(el => !selectedIds.has(el.id)),
    }))
    setSelectedIds(new Set())
  }, [selectedIds, updateDoc])

  // ── Selection ───────────────────────────────────────────

  const selectElement = useCallback((id: string | null, additive = false) => {
    if (id === null) {
      setSelectedIds(new Set())
      return
    }
    if (additive) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set([id]))
    }
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(doc.elements.map(el => el.id)))
  }, [doc.elements])

  const selectElements = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  // ── Move operations (no history push during drag) ───────

  const moveElements = useCallback((ids: Set<string>, dx: number, dy: number) => {
    updateDocSilent(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        ids.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el,
      ),
    }))
  }, [updateDocSilent])

  const commitMove = useCallback(() => {
    pushHistory(docRef.current)
  }, [pushHistory])

  // ── Resize ──────────────────────────────────────────────

  const resizeElement = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    updateDocSilent(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, x, y, width, height } : el,
      ),
    }))
  }, [updateDocSilent])

  const commitResize = useCallback(() => {
    pushHistory(docRef.current)
  }, [pushHistory])

  // ── Clipboard ───────────────────────────────────────────

  const copySelected = useCallback(() => {
    const selected = doc.elements.filter(el => selectedIds.has(el.id))
    if (selected.length === 0) return
    setClipboard(structuredClone(selected))
  }, [doc.elements, selectedIds])

  const pasteClipboard = useCallback((targetPageIndex?: number) => {
    if (clipboard.length === 0) return
    const page = targetPageIndex ?? clipboard[0].pageIndex
    const offset = 20 // offset pasted elements slightly
    const newElements = clipboard.map(el => ({
      ...el,
      id: crypto.randomUUID(),
      pageIndex: page,
      x: el.x + offset,
      y: el.y + offset,
    }))
    updateDoc(prev => ({
      ...prev,
      elements: [...prev.elements, ...newElements],
    }))
    setSelectedIds(new Set(newElements.map(el => el.id)))
  }, [clipboard, updateDoc])

  const duplicateSelected = useCallback(() => {
    const selected = doc.elements.filter(el => selectedIds.has(el.id))
    if (selected.length === 0) return
    const newElements = selected.map(el => ({
      ...el,
      id: crypto.randomUUID(),
      x: el.x + 20,
      y: el.y + 20,
    }))
    updateDoc(prev => ({
      ...prev,
      elements: [...prev.elements, ...newElements],
    }))
    setSelectedIds(new Set(newElements.map(el => el.id)))
  }, [doc.elements, selectedIds, updateDoc])

  // ── Alignment operations ───────────────────────────────

  const alignElements = useCallback((direction: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v') => {
    if (selectedIds.size < 2) return
    const selected = doc.elements.filter(el => selectedIds.has(el.id))
    if (selected.length < 2) return
    updateDoc(prev => {
      const els = prev.elements.filter(el => selectedIds.has(el.id))
      const updates = new Map<string, Partial<FormElement>>()

      switch (direction) {
        case 'left': {
          const minX = Math.min(...els.map(e => e.x))
          for (const e of els) updates.set(e.id, { x: minX })
          break
        }
        case 'right': {
          const maxRight = Math.max(...els.map(e => e.x + e.width))
          for (const e of els) updates.set(e.id, { x: maxRight - e.width })
          break
        }
        case 'center-h': {
          const minX = Math.min(...els.map(e => e.x))
          const maxRight = Math.max(...els.map(e => e.x + e.width))
          const cx = (minX + maxRight) / 2
          for (const e of els) updates.set(e.id, { x: cx - e.width / 2 })
          break
        }
        case 'top': {
          const minY = Math.min(...els.map(e => e.y))
          for (const e of els) updates.set(e.id, { y: minY })
          break
        }
        case 'bottom': {
          const maxBottom = Math.max(...els.map(e => e.y + e.height))
          for (const e of els) updates.set(e.id, { y: maxBottom - e.height })
          break
        }
        case 'center-v': {
          const minY = Math.min(...els.map(e => e.y))
          const maxBottom = Math.max(...els.map(e => e.y + e.height))
          const cy = (minY + maxBottom) / 2
          for (const e of els) updates.set(e.id, { y: cy - e.height / 2 })
          break
        }
        case 'distribute-h': {
          if (els.length < 3) break
          const sorted = [...els].sort((a, b) => a.x - b.x)
          const totalWidth = sorted.reduce((s, e) => s + e.width, 0)
          const totalSpan = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x
          const gap = (totalSpan - totalWidth) / (sorted.length - 1)
          let cx = sorted[0].x + sorted[0].width + gap
          for (let i = 1; i < sorted.length - 1; i++) {
            updates.set(sorted[i].id, { x: cx })
            cx += sorted[i].width + gap
          }
          break
        }
        case 'distribute-v': {
          if (els.length < 3) break
          const sorted = [...els].sort((a, b) => a.y - b.y)
          const totalHeight = sorted.reduce((s, e) => s + e.height, 0)
          const totalSpan = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height - sorted[0].y
          const gap = (totalSpan - totalHeight) / (sorted.length - 1)
          let cy = sorted[0].y + sorted[0].height + gap
          for (let i = 1; i < sorted.length - 1; i++) {
            updates.set(sorted[i].id, { y: cy })
            cy += sorted[i].height + gap
          }
          break
        }
      }

      return {
        ...prev,
        elements: prev.elements.map(el => {
          const u = updates.get(el.id)
          return u ? { ...el, ...u } : el
        }),
      }
    })
  }, [selectedIds, doc.elements, updateDoc])

  // ── Grouping operations ───────────────────────────────

  const groupSelected = useCallback(() => {
    if (selectedIds.size < 2) return
    const gid = crypto.randomUUID()
    updateDoc(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        selectedIds.has(el.id) ? { ...el, groupId: gid } : el,
      ),
    }))
  }, [selectedIds, updateDoc])

  const ungroupSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    const groupIds = new Set<string>()
    for (const el of doc.elements) {
      if (selectedIds.has(el.id) && el.groupId) groupIds.add(el.groupId)
    }
    if (groupIds.size === 0) return
    updateDoc(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el,
      ),
    }))
  }, [selectedIds, doc.elements, updateDoc])

  // ── Diagram operations ──────────────────────────────────

  const loadDocument = useCallback((newDoc: FormDocument) => {
    setDoc(newDoc)
    setSelectedIds(new Set())
    historyRef.current = [structuredClone(newDoc)]
    historyIdxRef.current = 0
    forceRender(v => v + 1)
    setViewport(DEFAULT_VIEWPORT)
  }, [])

  const clearDocument = useCallback(() => {
    loadDocument(createDocument())
  }, [loadDocument])

  // ── Viewport helpers ────────────────────────────────────

  const zoomTo = useCallback((newZoom: number, center?: { x: number; y: number }) => {
    setViewport(prev => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
      if (center) {
        const scale = clampedZoom / prev.zoom
        return {
          panX: center.x - (center.x - prev.panX) * scale,
          panY: center.y - (center.y - prev.panY) * scale,
          zoom: clampedZoom,
        }
      }
      return { ...prev, zoom: clampedZoom }
    })
  }, [])

  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom * 1.2),
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom / 1.2),
    }))
  }, [])

  const resetZoom = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT)
  }, [])

  // ── Return ──────────────────────────────────────────────

  return {
    // State
    doc, selectedIds, selectedId, viewport, clipboard,
    canUndo, canRedo,

    // Setters
    setViewport, setTitle, setPageSize,

    // Page actions
    addPage, removePage,

    // Element actions
    addElement, updateElement, removeElement, removeSelectedElements,

    // Selection
    selectElement, selectAll, selectElements,

    // Move / resize
    moveElements, commitMove, resizeElement, commitResize,

    // Clipboard
    copySelected, pasteClipboard, duplicateSelected,

    // Diagram actions
    loadDocument, clearDocument,

    // History
    undo, redo,

    // Zoom
    zoomIn, zoomOut, resetZoom, zoomTo,

    // Alignment
    alignElements,

    // Grouping
    groupSelected, ungroupSelected,
  }
}

export type FormStore = ReturnType<typeof useFormStore>
