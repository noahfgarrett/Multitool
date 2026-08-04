import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import type { OrgChartStore } from './orgChartStore.ts'
import type {
  OrgNode, LayoutNode, ConnectorType, Connection, ConnectorTypeId,
} from './types.ts'
import {
  NODE_WIDTH, NODE_HEIGHT, AVATAR_SIZE, MIN_ZOOM, MAX_ZOOM,
  SECTION_TITLE_HEIGHT,
  getConnectorType,
} from './types.ts'
import { drawStyledLine, routePrimaryEdge, routeSecondaryEdge, hitTestPath } from './connectorStyle.ts'
import { loadImage } from '@/utils/imageProcessing.ts'
import { buildOrgChartLayout, getSectionNodes } from './layout.ts'
import { ensureVisibleConnectorType, readableForeground } from './legend.ts'

// ── Constants ───────────────────────────────────────────────

const SELECTION_COLOR = '#3B82F6'
const NODE_BG = '#1a1a24'
const NODE_BORDER = 'rgba(255,255,255,0.08)'
const HOVER_BG = '#1e1e2a'
const ADD_BTN_SIZE = 18
const MOVE_THRESHOLD = 5 // px before drag starts
const ALIGN_THRESHOLD = 6 // px in diagram space for snap + guide display
const GUIDE_COLOR = 'rgba(59,130,246,0.5)'

// ── Alignment guides ────────────────────────────────────────

interface AlignGuide {
  type: 'h' | 'v'
  pos: number
}

// ── Drag state ──────────────────────────────────────────────

interface DragState {
  type: 'pan' | 'move' | 'marquee'
  startX: number
  startY: number
  currentX: number
  currentY: number
  // Move-specific
  sourceNodeId?: string    // node that was clicked to start the move
  canvasStartX?: number    // canvas-space coords at start (for move/marquee)
  canvasStartY?: number
  canvasCurrentX?: number
  canvasCurrentY?: number
  moved?: boolean          // has the drag exceeded the threshold?
  totalDx?: number         // accumulated canvas-space delta (for reparent revert)
  totalDy?: number
  // Marquee-specific
  shiftHeld?: boolean      // was shift held when marquee started?
  priorSelection?: Set<string> // selection before marquee started
}

interface ContextMenuState {
  x: number // screen coords
  y: number
  nodeId: string | null  // null = canvas right-click (no node)
}

interface ConnectionTypeMenuState {
  x: number
  y: number
  connectionId: string
}

// ── Component ───────────────────────────────────────────────

export function Canvas({ store }: { store: OrgChartStore }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<LayoutNode[]>([])
  const flatLayoutRef = useRef<LayoutNode[]>([])
  const layout = useMemo(
    () => buildOrgChartLayout(store.nodes, store.layoutDirection),
    [store.layoutDirection, store.nodes],
  )

  // Render tick — bumped by handlePointerMove to force re-paint of ghost
  // previews and hover ring while cursor moves over empty canvas space.
  const [renderTick, forceUpdate] = useState(0)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const guidesRef = useRef<AlignGuide[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [connectionTypeMenu, setConnectionTypeMenu] = useState<ConnectionTypeMenuState | null>(null)
  const [reparentTarget, setReparentTarget] = useState<string | null>(null)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')

  // ── Shift-drag bypass (Task 17) ───────────────────────────
  interface ShiftDragState {
    sourceId: string
    currentX: number  // canvas coords
    currentY: number
  }
  const [shiftDrag, setShiftDrag] = useState<ShiftDragState | null>(null)
  const shiftDragRef = useRef<ShiftDragState | null>(null)
  shiftDragRef.current = shiftDrag

  // Mouse position in canvas coords — used for the ghost edge during
  // connect-mode `awaiting-target`. Lives in a ref so re-renders don't
  // thrash React state on every pointermove.
  const mousePosRef = useRef<[number, number] | null>(null)
  const hoveredTargetIdRef = useRef<string | null>(null)

  // ── Space key for pan mode ────────────────────────────────
  const spaceHeldRef = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceHeldRef.current) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        spaceHeldRef.current = true
        setSpaceHeld(true)
      }
      // Escape cancels an active Shift-drag without closing anything else.
      if (e.key === 'Escape' && shiftDragRef.current) {
        setShiftDrag(null)
      }
      if (e.key === 'Escape') {
        setConnectionTypeMenu(null)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false
        setSpaceHeld(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // ── Image cache ─────────────────────────────────────────
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const [imageCacheVer, setImageCacheVer] = useState(0)

  useEffect(() => {
    const newCache = new Map<string, HTMLImageElement>()
    const promises: Promise<void>[] = []

    for (const node of store.nodes) {
      if (!node.imageDataUrl) continue
      const existing = imageCacheRef.current.get(node.imageDataUrl)
      if (existing) {
        newCache.set(node.imageDataUrl, existing)
      } else {
        const url = node.imageDataUrl
        promises.push(
          loadImage(url).then(img => {
            newCache.set(url, img)
          }).catch(() => { /* skip broken images */ }),
        )
      }
    }

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        imageCacheRef.current = newCache
        setImageCacheVer(v => v + 1)
      })
    } else {
      imageCacheRef.current = newCache
    }
  }, [store.nodes])

  // ── Coordinate conversion ───────────────────────────────

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const { panX, panY, zoom } = store.viewport
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    }
  }, [store.viewport])

  // ── Hit testing ─────────────────────────────────────────

  const hitTestNode = useCallback((pt: { x: number; y: number }): LayoutNode | null => {
    for (const node of flatLayoutRef.current) {
      if (pt.x >= node.x && pt.x <= node.x + node.width &&
          pt.y >= node.y && pt.y <= node.y + node.height) {
        return node
      }
    }
    return null
  }, [])

  const hitTestAddButton = useCallback((pt: { x: number; y: number }): string | null => {
    for (const node of flatLayoutRef.current) {
      const bx = node.x + node.width / 2
      const by = node.y + node.height + ADD_BTN_SIZE / 2 + 4
      const dist = Math.hypot(pt.x - bx, pt.y - by)
      if (dist <= ADD_BTN_SIZE / 2 + 2) return node.id
    }
    return null
  }, [])

  // ── Pointer handlers ────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId)
    ;(e.currentTarget as HTMLCanvasElement).focus({ preventScroll: true })
    if (contextMenu) setContextMenu(null)
    if (connectionTypeMenu) setConnectionTypeMenu(null)
    if (e.button === 1) {
      // Middle click → pan
      setDrag({ type: 'pan', startX: e.clientX - store.viewport.panX, startY: e.clientY - store.viewport.panY, currentX: e.clientX, currentY: e.clientY })
      e.preventDefault()
      return
    }

    if (e.button !== 0) return

    // Space+drag → pan
    if (spaceHeldRef.current) {
      setDrag({ type: 'pan', startX: e.clientX - store.viewport.panX, startY: e.clientY - store.viewport.panY, currentX: e.clientX, currentY: e.clientY })
      e.preventDefault()
      return
    }

    // ── Connect mode intercept (Task 16) ──────────────────
    // Runs BEFORE any drag/marquee/move logic so normal pointer
    // handling is fully short-circuited while connect mode is active.
    if (store.connectMode.state !== 'off') {
      const cmPt = screenToCanvas(e.clientX, e.clientY)
      const clickedNode = hitTestNode(cmPt)

      if (store.connectMode.state === 'awaiting-source') {
        if (clickedNode) store.setConnectSource(clickedNode.id)
        return
      }

      if (store.connectMode.state === 'awaiting-target') {
        if (clickedNode && clickedNode.id !== store.connectMode.sourceId) {
          store.setConnectTarget(clickedNode.id, [e.clientX, e.clientY])
        }
        return
      }

      // picking-type: popover handles it — ignore canvas clicks
      return
    }

    // ── Shift-drag bypass (Task 17) ───────────────────────
    // Shift + click on a node starts a shift-drag that opens the
    // type picker at the release point. Shift + click on empty space
    // still falls through to the existing additive marquee logic.
    if (e.shiftKey) {
      const sdPt = screenToCanvas(e.clientX, e.clientY)
      const sdNode = hitTestNode(sdPt)
      if (sdNode) {
        setShiftDrag({ sourceId: sdNode.id, currentX: sdPt.x, currentY: sdPt.y })
        return
      }
      // Shift + empty: fall through to existing additive marquee path
    }

    const pt = screenToCanvas(e.clientX, e.clientY)

    // Check add button first
    const addBtnNode = hitTestAddButton(pt)
    if (addBtnNode) {
      store.addNode(addBtnNode)
      return
    }

    const hit = hitTestNode(pt)

    // ── Connection hit-test (Task 18) ─────────────────────
    // Only for empty-space clicks (no node hit), no shift held,
    // and only when connect mode is off. If a connection is hit we
    // select it and return early; otherwise we fall through to the
    // existing drag/marquee path so plain empty clicks still work.
    if (!hit && !e.shiftKey) {
      const tolerance = 6 / store.viewport.zoom
      const nodeById = new Map<string, LayoutNode>()
      for (const n of flatLayoutRef.current) nodeById.set(n.id, n)

      let connHit = false
      for (const conn of store.connections) {
        const from = nodeById.get(conn.fromId)
        const to = nodeById.get(conn.toId)
        if (!from || !to) continue
        const path = routeSecondaryEdge(from, to)
        if (path.length === 0) continue
        if (hitTestPath(pt.x, pt.y, path, tolerance)) {
          store.selectConnection(conn.id)
          setConnectionTypeMenu({ connectionId: conn.id, x: e.clientX, y: e.clientY })
          connHit = true
          break
        }
      }

      if (connHit) return
      if (store.selectedConnectionId !== null) {
        store.selectConnection(null)
      }
    }
    if (hit) {
      // Selecting a node implicitly deselects any selected connection
      // (mirrors the store's reverse behavior for selectConnection).
      if (store.selectedConnectionId !== null) {
        store.selectConnection(null)
      }
      // Select the hit node (shift for multi-select toggle)
      if (e.shiftKey) {
        store.selectNode(hit.id, true)
      } else if (!store.selectedNodeIds.has(hit.id)) {
        store.selectNode(hit.id)
      }
      // Start move drag for all selected nodes
      setDrag({
        type: 'move',
        startX: e.clientX, startY: e.clientY,
        currentX: e.clientX, currentY: e.clientY,
        canvasStartX: pt.x, canvasStartY: pt.y,
        canvasCurrentX: pt.x, canvasCurrentY: pt.y,
        moved: false,
        sourceNodeId: hit.id,
        totalDx: 0, totalDy: 0,
      })
    } else {
      // Click empty area
      if (e.shiftKey) {
        // Shift+click empty → start marquee (additive)
        setDrag({
          type: 'marquee',
          startX: e.clientX, startY: e.clientY,
          currentX: e.clientX, currentY: e.clientY,
          canvasStartX: pt.x, canvasStartY: pt.y,
          canvasCurrentX: pt.x, canvasCurrentY: pt.y,
          shiftHeld: true,
          priorSelection: new Set(store.selectedNodeIds),
        })
      } else {
        // Plain click empty → start marquee (replace selection)
        store.selectNode(null)
        setDrag({
          type: 'marquee',
          startX: e.clientX, startY: e.clientY,
          currentX: e.clientX, currentY: e.clientY,
          canvasStartX: pt.x, canvasStartY: pt.y,
          canvasCurrentX: pt.x, canvasCurrentY: pt.y,
          shiftHeld: false,
          priorSelection: new Set(),
        })
      }
    }
  }, [screenToCanvas, hitTestNode, hitTestAddButton, store, contextMenu, connectionTypeMenu])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pt = screenToCanvas(e.clientX, e.clientY)

    // ── Track mouse for connect-mode ghost edge (Task 16) ──
    if (store.connectMode.state === 'awaiting-target') {
      mousePosRef.current = [pt.x, pt.y]
      const hoveredNode = hitTestNode(pt)
      hoveredTargetIdRef.current = hoveredNode && hoveredNode.id !== store.connectMode.sourceId
        ? hoveredNode.id
        : null
      // Trigger a re-render so the ghost edge / green ring repaint.
      forceUpdate(v => v + 1)
      setHoveredNodeId(hoveredNode?.id ?? null)
      return
    }

    // ── Track Shift-drag cursor (Task 17) ──────────────────
    if (shiftDragRef.current) {
      setShiftDrag({ ...shiftDragRef.current, currentX: pt.x, currentY: pt.y })
      // Also refresh the hovered node highlight so the user sees the
      // card under the cursor as a potential target.
      const hoveredNode = hitTestNode(pt)
      setHoveredNodeId(
        hoveredNode && hoveredNode.id !== shiftDragRef.current.sourceId ? hoveredNode.id : null,
      )
      return
    }

    // ── Short-circuit while connect mode is active ────────
    if (store.connectMode.state !== 'off') {
      return
    }

    const hit = hitTestNode(pt)
    const addBtn = hitTestAddButton(pt)
    setHoveredNodeId(hit?.id ?? addBtn ?? null)

    const d = dragRef.current
    if (!d) return

    if (d.type === 'pan') {
      store.setViewport(prev => ({
        ...prev,
        panX: e.clientX - d.startX,
        panY: e.clientY - d.startY,
      }))
      return
    }

    if (d.type === 'move') {
      const screenDx = e.clientX - d.currentX
      const screenDy = e.clientY - d.currentY
      const rawDx = screenDx / store.viewport.zoom
      const rawDy = screenDy / store.viewport.zoom

      const totalDist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      const hasMoved = d.moved || totalDist > MOVE_THRESHOLD

      let appliedDx = 0
      let appliedDy = 0

      if (hasMoved) {
        const selectedIds = store.selectedNodeIds

        // Check if cursor is over a non-selected node (potential reparent target)
        // Allow reparent if any selected non-root node exists
        const canReparent = [...selectedIds].some(id => {
          const n = store.nodes.find(node => node.id === id)
          return n && !!n.reportsTo
        })
        const dropTarget = canReparent
          ? flatLayoutRef.current.find(n =>
            !selectedIds.has(n.id) &&
            pt.x >= n.x && pt.x <= n.x + n.width &&
            pt.y >= n.y && pt.y <= n.y + n.height,
          )
          : null

        if (dropTarget) {
          // Over a reparent target — move but hide snap guides
          setReparentTarget(dropTarget.id)
          guidesRef.current = []
          store.moveNodes(selectedIds, rawDx, rawDy)
          appliedDx = rawDx
          appliedDy = rawDy
        } else {
          // Not over a target — compute snap guides
          setReparentTarget(null)
          const movingProjected = flatLayoutRef.current
            .filter(n => selectedIds.has(n.id))
            .map(n => ({ ...n, x: n.x + rawDx, y: n.y + rawDy }))
          const others = flatLayoutRef.current.filter(n => !selectedIds.has(n.id))
          const { guides, snapDx, snapDy } = computeAlignSnap(movingProjected, others, ALIGN_THRESHOLD)
          guidesRef.current = guides
          store.moveNodes(selectedIds, rawDx + snapDx, rawDy + snapDy)
          appliedDx = rawDx + snapDx
          appliedDy = rawDy + snapDy
        }
      }

      setDrag({
        ...d,
        currentX: e.clientX, currentY: e.clientY,
        canvasCurrentX: pt.x, canvasCurrentY: pt.y,
        moved: hasMoved,
        totalDx: (d.totalDx ?? 0) + appliedDx,
        totalDy: (d.totalDy ?? 0) + appliedDy,
      })
      return
    }

    if (d.type === 'marquee') {
      setDrag({
        ...d,
        currentX: e.clientX, currentY: e.clientY,
        canvasCurrentX: pt.x, canvasCurrentY: pt.y,
      })

      // Compute marquee rect in canvas coords
      const x1 = Math.min(d.canvasStartX!, pt.x)
      const y1 = Math.min(d.canvasStartY!, pt.y)
      const x2 = Math.max(d.canvasStartX!, pt.x)
      const y2 = Math.max(d.canvasStartY!, pt.y)

      // Find all nodes intersecting the marquee
      const marqueeIds: string[] = []
      for (const node of flatLayoutRef.current) {
        if (node.x + node.width >= x1 && node.x <= x2 &&
            node.y + node.height >= y1 && node.y <= y2) {
          marqueeIds.push(node.id)
        }
      }

      // Combine with prior selection if shift held
      if (d.shiftHeld) {
        const combined = new Set(d.priorSelection)
        for (const id of marqueeIds) combined.add(id)
        store.selectNodes([...combined])
      } else {
        store.selectNodes(marqueeIds)
      }
      return
    }
  }, [screenToCanvas, hitTestNode, hitTestAddButton, store])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // ── Shift-drag release (Task 17) ─────────────────────
    if (shiftDragRef.current) {
      const sourceId = shiftDragRef.current.sourceId
      // On pointerleave, cancel silently; only pointerup triggers the
      // target hit test and opens the type picker.
      if (e.type !== 'pointerup') {
        setShiftDrag(null)
        return
      }
      const pt = screenToCanvas(e.clientX, e.clientY)
      const target = hitTestNode(pt)
      setShiftDrag(null)

      if (target && target.id !== sourceId) {
        store.setConnectModeDirect({
          state: 'picking-type',
          sourceId,
          targetId: target.id,
          anchorScreenXY: [e.clientX, e.clientY],
        })
      }
      return
    }

    const d = dragRef.current

    if (d?.type === 'move' && d.moved) {
      if (reparentTarget) {
        // Drop on node → reparent all selected nodes
        store.reparentAfterDrag(
          store.selectedNodeIds,
          reparentTarget,
          -(d.totalDx ?? 0),
          -(d.totalDy ?? 0),
        )
      } else {
        // Drop on empty → commit position change
        store.commitMove()
      }
    }

    guidesRef.current = []
    setDrag(null)
    setReparentTarget(null)
  }, [store, reparentTarget, screenToCanvas, hitTestNode])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, store.viewport.zoom * (1 + delta)))
    store.zoomTo(newZoom, { x: e.clientX, y: e.clientY })
  }, [store])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pt = screenToCanvas(e.clientX, e.clientY)

    // Check if double-click is on a section title
    const roots = flatLayoutRef.current.filter(n => !n.reportsTo && n.sectionTitle)
    for (const root of roots) {
      const titleX = root.x + root.width / 2
      const titleY = root.y - SECTION_TITLE_HEIGHT / 2
      if (Math.abs(pt.x - titleX) < 120 && Math.abs(pt.y - titleY) < 20) {
        setEditingTitleId(root.id)
        setEditingTitleValue(root.sectionTitle)
        return
      }
    }

    const hit = hitTestNode(pt)
    if (hit) {
      store.selectNode(hit.id)
      // Focus the name input in PropertiesPanel (panel will auto-focus when selectedNodeId changes)
    }
  }, [screenToCanvas, hitTestNode, store])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setConnectionTypeMenu(null)
    const pt = screenToCanvas(e.clientX, e.clientY)
    const hit = hitTestNode(pt)
    if (hit) {
      store.selectNode(hit.id)
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: hit.id })
    } else {
      // Right-click on empty canvas
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null })
    }
  }, [screenToCanvas, hitTestNode, store])

  // ── Fit to content ──────────────────────────────────────

  const fitToContent = useCallback(() => {
    const trees = layoutRef.current
    if (trees.length === 0 || !containerRef.current) return
    const flat = flatLayoutRef.current
    if (flat.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of flat) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }

    // Include secondary edge anchor points so fit-to-content captures diagonals
    if (store.connections.length > 0) {
      const byId = new Map<string, LayoutNode>()
      for (const n of flat) byId.set(n.id, n)
      for (const conn of store.connections) {
        const from = byId.get(conn.fromId)
        const to = byId.get(conn.toId)
        if (!from || !to) continue
        const path = routeSecondaryEdge(from, to)
        for (const [px, py] of path) {
          minX = Math.min(minX, px)
          minY = Math.min(minY, py)
          maxX = Math.max(maxX, px)
          maxY = Math.max(maxY, py)
        }
      }
    }

    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const contentW = maxX - minX + 80
    const contentH = maxY - minY + 80
    const zoom = Math.max(MIN_ZOOM, Math.min(1.5, Math.min(cw / contentW, ch / contentH)))

    store.setViewport({
      panX: (cw - contentW * zoom) / 2 - minX * zoom + 40 * zoom,
      panY: (ch - contentH * zoom) / 2 - minY * zoom + 40 * zoom,
      zoom,
    })
  }, [store])

  // Expose fitToContent via a ref for Toolbar to call
  const fitToContentRef = useRef(fitToContent)
  fitToContentRef.current = fitToContent

  // ── Render loop ─────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const cw = Math.max(1, Math.round(rect.width))
    const ch = Math.max(1, Math.round(rect.height))

    const targetWidth = Math.round(cw * dpr)
    const targetHeight = Math.round(ch * dpr)
    if (canvas.width !== targetWidth) canvas.width = targetWidth
    if (canvas.height !== targetHeight) canvas.height = targetHeight
    if (canvas.style.width !== `${cw}px`) canvas.style.width = `${cw}px`
    if (canvas.style.height !== `${ch}px`) canvas.style.height = `${ch}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Shared live/export layout, memoized across hover and connect-mode repaints.
    const trees = layout.trees
    layoutRef.current = trees
    const allFlat = layout.flat
    flatLayoutRef.current = allFlat

    // Clear
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = store.background.color
    ctx.fillRect(0, 0, cw, ch)

    if (trees.length === 0) return

    // Apply viewport
    const panX = Math.round(store.viewport.panX * dpr) / dpr
    const panY = Math.round(store.viewport.panY * dpr) / dpr
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(store.viewport.zoom, store.viewport.zoom)

    const renderMargin = 120 / store.viewport.zoom
    const visibleBounds: CanvasBounds = {
      left: -panX / store.viewport.zoom - renderMargin,
      top: -panY / store.viewport.zoom - renderMargin,
      right: (cw - panX) / store.viewport.zoom + renderMargin,
      bottom: (ch - panY) / store.viewport.zoom + renderMargin,
    }

    const imageCache = imageCacheRef.current

    // Draw connectors for each tree
    const primaryType = ensureVisibleConnectorType(
      getConnectorType(store.connectorTypes, 'primary'),
      store.background.color,
    )
    for (const tree of trees) {
      drawConnectors(
        ctx,
        tree,
        primaryType,
        store.layoutDirection,
        store.viewport.zoom,
        visibleBounds,
      )
    }

    // Draw secondary edges (store.connections)
    if (store.connections.length > 0) {
      const nodeById = new Map<string, LayoutNode>()
      for (const n of flatLayoutRef.current) nodeById.set(n.id, n)

      for (const conn of store.connections) {
        const from = nodeById.get(conn.fromId)
        const to = nodeById.get(conn.toId)
        if (!from || !to) continue
        const path = routeSecondaryEdge(from, to)
        if (path.length === 0) continue
        if (!pathIntersectsBounds(path, visibleBounds)) continue
        const type = ensureVisibleConnectorType(
          getConnectorType(store.connectorTypes, conn.typeId),
          store.background.color,
        )
        drawStyledLine(ctx, path, type, store.viewport.zoom)
      }
    }

    // ── Selection halo for the selected connection (Task 18) ──
    // Drawn AFTER secondary edges and BEFORE nodes so the node
    // cards visually cover the endpoints cleanly.
    if (store.selectedConnectionId) {
      const conn = store.connections.find(c => c.id === store.selectedConnectionId)
      if (conn) {
        const fromNode = flatLayoutRef.current.find(n => n.id === conn.fromId)
        const toNode = flatLayoutRef.current.find(n => n.id === conn.toId)
        if (fromNode && toNode) {
          const path = routeSecondaryEdge(fromNode, toNode)
          if (path.length > 0) {
            ctx.save()
            ctx.strokeStyle = '#3B82F6'
            ctx.lineWidth = 4 / store.viewport.zoom
            ctx.globalAlpha = 0.4
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(path[0][0], path[0][1])
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1])
            ctx.stroke()
            ctx.restore()
          }
        }
      }
    }

    // ── Ghost preview edge — connect mode awaiting-target (Task 16) ──
    if (store.connectMode.state === 'awaiting-target' && mousePosRef.current) {
      const sourceId = store.connectMode.sourceId
      const source = flatLayoutRef.current.find(n => n.id === sourceId)
      if (source) {
        const sourceCx = source.x + source.width / 2
        const sourceCy = source.y + source.height / 2
        const [mx, my] = mousePosRef.current
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 1.5 / store.viewport.zoom
        ctx.setLineDash([6 / store.viewport.zoom, 4 / store.viewport.zoom])
        ctx.beginPath()
        ctx.moveTo(sourceCx, sourceCy)
        ctx.lineTo(mx, my)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // ── Ghost preview edge — Shift-drag (Task 17) ────────────
    if (shiftDrag) {
      const source = flatLayoutRef.current.find(n => n.id === shiftDrag.sourceId)
      if (source) {
        const sourceCx = source.x + source.width / 2
        const sourceCy = source.y + source.height / 2
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 1.5 / store.viewport.zoom
        ctx.setLineDash([6 / store.viewport.zoom, 4 / store.viewport.zoom])
        ctx.beginPath()
        ctx.moveTo(sourceCx, sourceCy)
        ctx.lineTo(shiftDrag.currentX, shiftDrag.currentY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // ── Green hover ring on connect-mode target (Task 16) ────
    if (store.connectMode.state === 'awaiting-target' && hoveredTargetIdRef.current) {
      const target = flatLayoutRef.current.find(n => n.id === hoveredTargetIdRef.current)
      if (target) {
        ctx.save()
        ctx.strokeStyle = '#22C55E'
        ctx.lineWidth = 2.5 / store.viewport.zoom
        ctx.strokeRect(target.x - 2, target.y - 2, target.width + 4, target.height + 4)
        ctx.restore()
      }
    }

    // Draw section titles and dividers
    const rootNodes = allFlat.filter(n => !n.reportsTo)
    rootNodes.forEach((root, idx) => {
      if (root.sectionTitle) {
        ctx.save()
        ctx.font = 'bold 18px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = readableForeground(store.background.color)
        ctx.globalAlpha = 0.82
        ctx.textAlign = 'center'
        const titleX = root.x + root.width / 2
        const titleY = root.y - SECTION_TITLE_HEIGHT / 2 + 4
        ctx.fillText(root.sectionTitle, titleX, titleY)
        ctx.restore()
      }

      if (idx < rootNodes.length - 1) {
        const sectionNodes = getSectionNodes(root, allFlat)
        const nextRoot = rootNodes[idx + 1]

        ctx.save()
        ctx.strokeStyle = readableForeground(store.background.color)
        ctx.globalAlpha = 0.14
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.beginPath()

        if (store.layoutDirection === 'top-down') {
          let maxRight = root.x + root.width
          for (const node of sectionNodes) maxRight = Math.max(maxRight, node.x + node.width)
          const dividerX = (maxRight + nextRoot.x) / 2
          ctx.moveTo(dividerX, visibleBounds.top)
          ctx.lineTo(dividerX, visibleBounds.bottom)
        } else {
          let maxBottom = root.y + root.height
          for (const node of sectionNodes) maxBottom = Math.max(maxBottom, node.y + node.height)
          const dividerY = (maxBottom + nextRoot.y) / 2
          ctx.moveTo(visibleBounds.left, dividerY)
          ctx.lineTo(visibleBounds.right, dividerY)
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    })

    // Draw nodes
    const flat = allFlat
    for (const node of flat) {
      if (!nodeIntersectsBounds(node, visibleBounds)) continue
      const isSelected = store.selectedNodeIds.has(node.id)
      const isHovered = node.id === hoveredNodeId
      const isReparentDrop = node.id === reparentTarget
      drawNode(ctx, node, isSelected, isHovered, isReparentDrop, imageCache, store.viewport.zoom)
    }

    // Draw hover add button
    if (hoveredNodeId) {
      const hNode = flat.find(n => n.id === hoveredNodeId)
      if (hNode) drawAddButton(ctx, hNode)
    }

    // Draw snap alignment guides
    const currentGuides = guidesRef.current
    if (currentGuides.length > 0) {
      ctx.save()
      ctx.strokeStyle = GUIDE_COLOR
      ctx.lineWidth = 1 / store.viewport.zoom
      ctx.setLineDash([4 / store.viewport.zoom, 3 / store.viewport.zoom])
      for (const guide of currentGuides) {
        ctx.beginPath()
        if (guide.type === 'v') {
          ctx.moveTo(guide.pos, -10000)
          ctx.lineTo(guide.pos, 10000)
        } else {
          ctx.moveTo(-10000, guide.pos)
          ctx.lineTo(10000, guide.pos)
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()
    }

    // Draw marquee selection rectangle
    if (drag?.type === 'marquee' && drag.canvasStartX != null && drag.canvasCurrentX != null) {
      const x1 = Math.min(drag.canvasStartX, drag.canvasCurrentX)
      const y1 = Math.min(drag.canvasStartY!, drag.canvasCurrentY!)
      const x2 = Math.max(drag.canvasStartX, drag.canvasCurrentX)
      const y2 = Math.max(drag.canvasStartY!, drag.canvasCurrentY!)
      const w = x2 - x1
      const h = y2 - y1

      if (w > 2 || h > 2) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
        ctx.fillRect(x1, y1, w, h)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
        ctx.lineWidth = 1 / store.viewport.zoom
        ctx.setLineDash([4 / store.viewport.zoom, 4 / store.viewport.zoom])
        ctx.strokeRect(x1, y1, w, h)
        ctx.setLineDash([])
      }
    }

    ctx.restore()
  }, [
    store.nodes, store.connections, store.connectorTypes, store.background, store.viewport,
    store.selectedNodeIds, store.selectedConnectionId, store.layoutDirection,
    store.connectMode, shiftDrag, layout,
    hoveredNodeId, reparentTarget, drag, imageCacheVer, screenToCanvas,
    renderTick,
  ])

  // ── Resize observer ─────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => forceUpdate(v => v + 1))
    ro.observe(container)
    return () => ro.disconnect()
  }, [])


  // Auto-fit on first load
  useEffect(() => {
    if (store.nodes.length > 0) {
      const timer = setTimeout(() => fitToContentRef.current(), 100)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cursor ──────────────────────────────────────────────

  let cursor = 'default'
  if (drag?.type === 'pan') cursor = 'grabbing'
  else if (drag?.type === 'move' && drag.moved) cursor = 'grabbing'
  else if (drag?.type === 'marquee') cursor = 'crosshair'
  else if (spaceHeld) cursor = 'grab'
  else if (shiftDrag) cursor = 'crosshair'
  else if (store.connectMode.state !== 'off') cursor = 'crosshair'
  else if (hoveredNodeId) cursor = 'pointer'

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ cursor, backgroundColor: store.background.color }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        tabIndex={0}
        role="application"
        aria-label={`Interactive organization chart with ${store.nodes.length} people. Use Tab to browse people and arrow keys to navigate the selected hierarchy.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      <div className="sr-only" aria-label="Organization chart people">
        <ul>
          {store.nodes.map(node => {
            const manager = node.reportsTo
              ? store.nodes.find(candidate => candidate.id === node.reportsTo)?.name
              : null
            return (
              <li key={node.id}>
                <button
                  type="button"
                  onFocus={() => store.selectNode(node.id)}
                  onClick={() => store.selectNode(node.id)}
                  aria-pressed={store.selectedNodeIds.has(node.id)}
                >
                  {node.name}, {node.title || 'no title'}
                  {node.department ? `, ${node.department}` : ''}
                  {manager ? `, reports to ${manager}` : ', top-level'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-dark-elevated/80 text-[10px] text-white/40 pointer-events-none">
        {Math.round(store.viewport.zoom * 100)}%
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl py-1 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.nodeId ? (
              <>
                <ContextMenuItem label="Add Report" onClick={() => { store.addNode(contextMenu.nodeId!); setContextMenu(null) }} />
                <ContextMenuItem label="Select" onClick={() => { store.selectNode(contextMenu.nodeId); setContextMenu(null) }} />
                <div className="h-px bg-white/[0.06] mx-1 my-0.5" />
                {(() => {
                  const node = store.nodes.find(n => n.id === contextMenu.nodeId)
                  const roots = store.nodes.filter(n => !n.reportsTo)
                  const canDelete = node && (node.reportsTo || roots.length > 1)
                  return canDelete ? (
                    <ContextMenuItem label="Delete" danger onClick={() => { store.removeNode(contextMenu.nodeId!); setContextMenu(null) }} />
                  ) : null
                })()}
              </>
            ) : (
              <>
                <ContextMenuItem label="Add New Section" onClick={() => { store.addSection(); setContextMenu(null) }} />
              </>
            )}
          </div>
        </>
      )}

      {connectionTypeMenu && (
        <ConnectionTypeMenu
          menu={connectionTypeMenu}
          store={store}
          onClose={() => setConnectionTypeMenu(null)}
        />
      )}

      {/* Inline section title editor */}
      {editingTitleId && (() => {
        const root = flatLayoutRef.current.find(n => n.id === editingTitleId)
        if (!root) return null
        const { panX, panY, zoom } = store.viewport
        const titleX = (root.x + root.width / 2) * zoom + panX
        const titleY = (root.y - SECTION_TITLE_HEIGHT / 2 - 6) * zoom + panY
        return (
          <input
            autoFocus
            value={editingTitleValue}
            onChange={e => setEditingTitleValue(e.target.value)}
            onBlur={() => {
              if (editingTitleValue.trim()) {
                store.updateSectionTitle(editingTitleId, editingTitleValue.trim())
              }
              setEditingTitleId(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (editingTitleValue.trim()) {
                  store.updateSectionTitle(editingTitleId, editingTitleValue.trim())
                }
                setEditingTitleId(null)
              } else if (e.key === 'Escape') {
                setEditingTitleId(null)
              }
            }}
            className="absolute z-50 bg-dark-surface border border-[#14B8A6]/40 rounded px-2 py-1 text-sm text-white font-bold text-center focus:outline-none focus:border-[#14B8A6]"
            style={{
              left: titleX - 100,
              top: titleY - 12,
              width: 200,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
        )
      })()}

      {/* Fit-to-content ref exposed */}
      <FitToContentBridge fitRef={fitToContentRef} />
    </div>
  )
}

// ── Bridge to expose fitToContent ───────────────────────────

function FitToContentBridge({ fitRef }: { fitRef: React.MutableRefObject<() => void> }) {
  // Store the ref globally so Toolbar can access it
  ;(window as unknown as Record<string, unknown>).__orgChartFitToContent = fitRef.current
  return null
}

// ── Context menu item ───────────────────────────────────────

function ContextMenuItem({
  label, onClick, danger = false,
}: {
  label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      {label}
    </button>
  )
}

// ── Connection type menu ────────────────────────────────────

function ConnectionTypeMenu({
  menu,
  store,
  onClose,
}: {
  menu: ConnectionTypeMenuState
  store: OrgChartStore
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const connection = store.connections.find(c => c.id === menu.connectionId) ?? null

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const outsideListenerTimer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown)
    }, 0)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(outsideListenerTimer)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  if (!connection) return null

  const pickType = (typeId: ConnectorTypeId) => {
    store.updateConnection(connection.id, { typeId })
    onClose()
  }

  return (
    <div
      ref={menuRef}
      data-testid="connection-type-menu"
      className="fixed z-50 min-w-[210px] rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: Math.min(menu.x, window.innerWidth - 230),
        top: Math.min(menu.y, window.innerHeight - 240),
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="px-3 py-2 text-[10px] uppercase tracking-wide"
        style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        Line Type
      </div>
      {store.connectorTypes.map(type => {
        const active = connection.typeId === type.id
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => pickType(type.id)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
            style={{ background: active ? 'rgba(20, 184, 166, 0.12)' : undefined }}
            data-testid={`connection-type-menu-row-${type.id}`}
          >
            <ConnectionLineSample type={type} />
            <span className="flex-1 text-[12px]" style={{ color: 'var(--text-primary)' }}>
              {type.label}
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: active ? '#14B8A6' : 'transparent' }}
            />
          </button>
        )
      })}
    </div>
  )
}

function ConnectionLineSample({ type }: { type: ConnectorType }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(46 * dpr)
    canvas.height = Math.round(12 * dpr)
    canvas.style.width = '46px'
    canvas.style.height = '12px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, 46, 12)
    drawStyledLine(ctx, [[2, 6], [44, 6]], type, 1)
  }, [type])

  return <canvas ref={ref} className="flex-shrink-0" aria-hidden="true" />
}

// ── Drawing functions ───────────────────────────────────────

function drawConnectors(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  primaryType: ConnectorType,
  direction: 'top-down' | 'left-right',
  zoom: number,
  visibleBounds: CanvasBounds,
) {
  for (const child of node.children) {
    const path = routePrimaryEdge(node, child, direction)
    if (pathIntersectsBounds(path, visibleBounds)) {
      drawStyledLine(ctx, path, primaryType, zoom)
    }
    drawConnectors(ctx, child, primaryType, direction, zoom, visibleBounds)
  }
}

interface CanvasBounds {
  left: number
  top: number
  right: number
  bottom: number
}

function nodeIntersectsBounds(node: LayoutNode, bounds: CanvasBounds): boolean {
  return node.x + node.width >= bounds.left
    && node.x <= bounds.right
    && node.y + node.height >= bounds.top
    && node.y <= bounds.bottom
}

function pathIntersectsBounds(path: [number, number][], bounds: CanvasBounds): boolean {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of path) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return maxX >= bounds.left && minX <= bounds.right
    && maxY >= bounds.top && minY <= bounds.bottom
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  isSelected: boolean,
  isHovered: boolean,
  isReparentDrop: boolean,
  imageCache: Map<string, HTMLImageElement>,
  zoom: number,
) {
  ctx.save()
  ctx.translate(node.x, node.y)
  drawNodeCard(ctx, node, isSelected, isHovered, isReparentDrop, imageCache, zoom)
  ctx.restore()
}

function drawNodeCard(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode | OrgNode & { width: number; height: number },
  isSelected: boolean,
  isHovered: boolean,
  isReparentDrop: boolean,
  imageCache: Map<string, HTMLImageElement>,
  zoom: number,
) {
  const w = NODE_WIDTH
  const h = NODE_HEIGHT
  const radius = 8

  // Background
  drawRoundedRect(ctx, 0, 0, w, h, radius)
  ctx.fillStyle = isHovered ? HOVER_BG : NODE_BG
  ctx.fill()

  // Border
  if (isReparentDrop) {
    ctx.strokeStyle = '#22C55E'
    ctx.lineWidth = 2.5
  } else if (isSelected) {
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = NODE_BORDER
    ctx.lineWidth = 1
  }
  ctx.stroke()

  // Top accent bar (clipped to card shape so corners don't poke out)
  ctx.save()
  drawRoundedRect(ctx, 0, 0, w, h, radius)
  ctx.clip()
  ctx.fillStyle = node.nodeColor
  ctx.fillRect(0, 0, w, 3)
  ctx.restore()

  // Avatar area
  const avatarX = 14
  const avatarY = h / 2
  const avatarR = AVATAR_SIZE / 2
  const img = node.imageDataUrl ? imageCache.get(node.imageDataUrl) : null

  if (img) {
    // Circular clipped avatar
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, avatarX, avatarY - avatarR, AVATAR_SIZE, AVATAR_SIZE)
    ctx.restore()

    // Avatar border
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
  } else {
    // Initials circle
    const initials = getInitials(node.name)
    ctx.beginPath()
    ctx.arc(avatarX + avatarR, avatarY, avatarR, 0, Math.PI * 2)
    ctx.fillStyle = node.nodeColor + '30' // 30 = ~19% opacity hex
    ctx.fill()
    ctx.strokeStyle = node.nodeColor + '50'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = `600 ${13}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = node.nodeColor
    ctx.fillText(initials, avatarX + avatarR, avatarY)
  }

  // Text area (to the right of avatar)
  const textX = avatarX + AVATAR_SIZE + 12
  const maxTextW = w - textX - 10

  // Name
  ctx.font = `600 13px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(truncateText(ctx, node.name, maxTextW), textX, 15)

  // Title
  ctx.font = `400 11px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.64)'
  ctx.fillText(truncateText(ctx, node.title, maxTextW), textX, 34)

  // Department
  if (node.department) {
    ctx.font = `400 10px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.fillText(truncateText(ctx, node.department, maxTextW), textX, 52)
  }
}

function drawAddButton(ctx: CanvasRenderingContext2D, node: LayoutNode) {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height + ADD_BTN_SIZE / 2 + 4
  const r = ADD_BTN_SIZE / 2

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1a24'
  ctx.fill()
  ctx.strokeStyle = 'rgba(244,123,32,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Plus sign
  const s = 4
  ctx.beginPath()
  ctx.moveTo(cx - s, cy)
  ctx.lineTo(cx + s, cy)
  ctx.moveTo(cx, cy - s)
  ctx.lineTo(cx, cy + s)
  ctx.strokeStyle = '#14B8A6'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

// ── Drawing helpers ─────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}

// ── Alignment snap computation ──────────────────────────────

function computeAlignSnap(
  movingNodes: { x: number; y: number; width: number; height: number; id: string }[],
  otherNodes: { x: number; y: number; width: number; height: number; id: string }[],
  threshold: number,
): { guides: AlignGuide[]; snapDx: number; snapDy: number } {
  const unique = new Map<string, AlignGuide>()

  let bestSnapX = Infinity
  let bestDistX = threshold
  let bestSnapY = Infinity
  let bestDistY = threshold

  for (const moving of movingNodes) {
    const mx1 = moving.x
    const mx2 = moving.x + moving.width
    const mcx = moving.x + moving.width / 2
    const my1 = moving.y
    const my2 = moving.y + moving.height
    const mcy = moving.y + moving.height / 2

    for (const other of otherNodes) {
      const ox1 = other.x
      const ox2 = other.x + other.width
      const ocx = other.x + other.width / 2
      const oy1 = other.y
      const oy2 = other.y + other.height
      const ocy = other.y + other.height / 2

      // Vertical guides (X alignment): left-left, right-right, center-center, left-right, right-left
      const xChecks: [number, number][] = [
        [mx1, ox1], [mx2, ox2], [mcx, ocx], [mx1, ox2], [mx2, ox1],
      ]
      for (const [a, b] of xChecks) {
        const dist = Math.abs(a - b)
        if (dist < threshold) {
          unique.set(`v:${Math.round(b)}`, { type: 'v', pos: b })
          if (dist < bestDistX) {
            bestDistX = dist
            bestSnapX = b - a
          }
        }
      }

      // Horizontal guides (Y alignment): top-top, bottom-bottom, center-center, top-bottom, bottom-top
      const yChecks: [number, number][] = [
        [my1, oy1], [my2, oy2], [mcy, ocy], [my1, oy2], [my2, oy1],
      ]
      for (const [a, b] of yChecks) {
        const dist = Math.abs(a - b)
        if (dist < threshold) {
          unique.set(`h:${Math.round(b)}`, { type: 'h', pos: b })
          if (dist < bestDistY) {
            bestDistY = dist
            bestSnapY = b - a
          }
        }
      }
    }
  }

  return {
    guides: [...unique.values()],
    snapDx: bestSnapX !== Infinity ? bestSnapX : 0,
    snapDy: bestSnapY !== Infinity ? bestSnapY : 0,
  }
}
