import { useState, useRef, useCallback } from 'react'
import type {
  DiagramNode, DiagramEdge, DiagramState, DiagramPage, DiagramLayer,
  ToolMode, SelectionState, Viewport, Point, ShapeType, PortPosition,
  NodeStyle,
} from './types.ts'
import {
  genId, emptySelection, DEFAULT_VIEWPORT, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE,
  DEFAULT_LAYER, MIN_ZOOM, MAX_ZOOM,
} from './types.ts'
import { getShapeDef } from './shapes.ts'
import { autoDetectPorts } from './connectors.ts'
import type { FlowchartTheme } from './themes.ts'
import { THEMES } from './themes.ts'
import { autoLayout, type LayoutDirection } from './layout.ts'

// ── Alignment types (Agent B) ───────────────────────────────

export type AlignAxis = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type DistributeAxis = 'horizontal' | 'vertical'

const MAX_HISTORY = 50

// ── Hook: useFlowchartStore ─────────────────────────────────

export function useFlowchartStore() {
  // ── Core state ──────────────────────────────────────────
  const [nodes, setNodes] = useState<DiagramNode[]>([])
  const [edges, setEdges] = useState<DiagramEdge[]>([])
  const [selection, setSelection] = useState<SelectionState>(emptySelection)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [gridEnabled, setGridEnabled] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [gridSize, setGridSize] = useState(20)
  // Agent A: theme + format painter
  const [activeTheme, setActiveTheme] = useState<FlowchartTheme>(THEMES[0])
  const copiedStyleRef = useRef<NodeStyle | null>(null)
  // Agent C: sketch mode + layers + pages
  const [sketchMode, setSketchMode] = useState(false)
  const [layers, setLayers] = useState<DiagramLayer[]>([{ ...DEFAULT_LAYER }])

  // ── Multi-page state (Agent C) ─────────────────────────
  const [pages, setPages] = useState<DiagramPage[]>(() => [{
    id: genId(),
    name: 'Page 1',
    nodes: [],
    edges: [],
    viewport: { ...DEFAULT_VIEWPORT },
    layers: [{ ...DEFAULT_LAYER }],
  }])
  const [activePageId, setActivePageId] = useState<string>(() => pages[0]?.id ?? '')

  // ── Undo/redo (ref-based, same pattern as pdf-annotate) ──
  const historyRef = useRef<DiagramState[]>([{ nodes: [], edges: [] }])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  const pushHistory = useCallback((nextNodes: DiagramNode[], nextEdges: DiagramEdge[]) => {
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(structuredClone({ nodes: nextNodes, edges: nextEdges }))
    if (h.length > MAX_HISTORY) h.shift()
    historyRef.current = h
    historyIdxRef.current = h.length - 1
    forceRender(v => v + 1)
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const state = structuredClone(historyRef.current[historyIdxRef.current])
    setNodes(state.nodes)
    setEdges(state.edges)
    setSelection(emptySelection())
    setEditingNodeId(null)
    forceRender(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const state = structuredClone(historyRef.current[historyIdxRef.current])
    setNodes(state.nodes)
    setEdges(state.edges)
    setSelection(emptySelection())
    setEditingNodeId(null)
    forceRender(v => v + 1)
  }, [])

  // ── Node operations ─────────────────────────────────────

  const addNode = useCallback((type: ShapeType, x: number, y: number) => {
    const def = getShapeDef(type)
    const styleOverrides = def.styleOverrides ?? {}
    const node: DiagramNode = {
      id: genId(),
      type,
      label: def.label,
      x: x - def.defaultWidth / 2,
      y: y - def.defaultHeight / 2,
      width: def.defaultWidth,
      height: def.defaultHeight,
      style: {
        ...DEFAULT_NODE_STYLE,
        ...styleOverrides,
        fill: activeTheme.nodeFill,
        stroke: activeTheme.nodeStroke,
        fontColor: activeTheme.textColor,
      },
      zIndex: nodes.length,
      rotation: 0,
      groupId: null,
      layerId: 'default',
    }
    const nextNodes = [...nodes, node]
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
    setSelection({ nodeIds: new Set([node.id]), edgeIds: new Set() })
    return node
  }, [nodes, edges, pushHistory, activeTheme])

  const updateNode = useCallback((id: string, updates: Partial<DiagramNode>) => {
    const nextNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, pushHistory])

  /** Apply partial updates to multiple nodes in a single batch (avoids stale-closure overwrites). */
  const batchUpdateNodes = useCallback((updates: Map<string, Partial<DiagramNode>>) => {
    const nextNodes = nodes.map(n => {
      const patch = updates.get(n.id)
      return patch ? { ...n, ...patch } : n
    })
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, pushHistory])

  const moveNodes = useCallback((ids: Set<string>, dx: number, dy: number) => {
    const nextNodes = nodes.map(n =>
      ids.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
    )
    setNodes(nextNodes)
    // Don't push history on every move frame — only on mouse up
    return nextNodes
  }, [nodes])

  const commitMove = useCallback((currentNodes: DiagramNode[]) => {
    pushHistory(currentNodes, edges)
  }, [edges, pushHistory])

  const resizeNode = useCallback((id: string, width: number, height: number, x: number, y: number) => {
    const nextNodes = nodes.map(n =>
      n.id === id ? { ...n, width: Math.max(40, width), height: Math.max(30, height), x, y } : n,
    )
    setNodes(nextNodes)
    return nextNodes
  }, [nodes])

  const commitResize = useCallback((currentNodes: DiagramNode[]) => {
    pushHistory(currentNodes, edges)
  }, [edges, pushHistory])

  // ── Edge operations ─────────────────────────────────────

  const addEdge = useCallback((
    sourceId: string,
    sourcePort: PortPosition,
    targetId: string,
    targetPort: PortPosition,
  ) => {
    // Prevent self-connecting edges
    if (sourceId === targetId) return

    // Prevent duplicate edges between same source+target ports
    const exists = edges.some(e =>
      e.sourceId === sourceId && e.sourcePort === sourcePort &&
      e.targetId === targetId && e.targetPort === targetPort,
    )
    if (exists) return

    const edge: DiagramEdge = {
      id: genId(),
      sourceId,
      sourcePort,
      targetId,
      targetPort,
      label: '',
      routeType: 'orthogonal',
      style: { ...DEFAULT_EDGE_STYLE, stroke: activeTheme.edgeColor },
      waypoints: [],
      labelPosition: 0.5,
    }
    const nextEdges = [...edges, edge]
    setEdges(nextEdges)
    pushHistory(nodes, nextEdges)
    setSelection({ nodeIds: new Set(), edgeIds: new Set([edge.id]) })
  }, [nodes, edges, pushHistory, activeTheme])

  const addEdgeAutoPort = useCallback((sourceId: string, targetId: string) => {
    const source = nodes.find(n => n.id === sourceId)
    const target = nodes.find(n => n.id === targetId)
    if (!source || !target) return
    const { sourcePort, targetPort } = autoDetectPorts(source, target)
    addEdge(sourceId, sourcePort, targetId, targetPort)
  }, [nodes, addEdge])

  const updateEdge = useCallback((id: string, updates: Partial<DiagramEdge>) => {
    const nextEdges = edges.map(e => e.id === id ? { ...e, ...updates } : e)
    setEdges(nextEdges)
    pushHistory(nodes, nextEdges)
  }, [nodes, edges, pushHistory])

  /** Apply partial updates to multiple edges in a single batch (avoids stale-closure overwrites). */
  const batchUpdateEdges = useCallback((updates: Map<string, Partial<DiagramEdge>>) => {
    const nextEdges = edges.map(e => {
      const patch = updates.get(e.id)
      return patch ? { ...e, ...patch } : e
    })
    setEdges(nextEdges)
    pushHistory(nodes, nextEdges)
  }, [nodes, edges, pushHistory])

  // ── Delete selected ─────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selection.nodeIds.size === 0 && selection.edgeIds.size === 0) return
    const nextNodes = nodes.filter(n => !selection.nodeIds.has(n.id))
    // Also remove edges connected to deleted nodes
    const nextEdges = edges.filter(e =>
      !selection.edgeIds.has(e.id) &&
      !selection.nodeIds.has(e.sourceId) &&
      !selection.nodeIds.has(e.targetId),
    )
    setNodes(nextNodes)
    setEdges(nextEdges)
    setSelection(emptySelection())
    setEditingNodeId(null)
    pushHistory(nextNodes, nextEdges)
  }, [nodes, edges, selection, pushHistory])

  // ── Copy / Paste ────────────────────────────────────────

  const clipboardRef = useRef<{ nodes: DiagramNode[]; edges: DiagramEdge[] } | null>(null)

  const copySelected = useCallback(() => {
    const copiedNodes = nodes.filter(n => selection.nodeIds.has(n.id))
    const copiedEdges = edges.filter(e =>
      selection.edgeIds.has(e.id) ||
      (selection.nodeIds.has(e.sourceId) && selection.nodeIds.has(e.targetId)),
    )
    if (copiedNodes.length === 0 && copiedEdges.length === 0) return
    clipboardRef.current = structuredClone({ nodes: copiedNodes, edges: copiedEdges })
  }, [nodes, edges, selection])

  const paste = useCallback(() => {
    if (!clipboardRef.current) return
    const { nodes: clipNodes, edges: clipEdges } = clipboardRef.current

    // Generate new IDs and offset positions
    const idMap = new Map<string, string>()
    const offset = 30

    const newNodes = clipNodes.map((n, i) => {
      const newId = genId()
      idMap.set(n.id, newId)
      return {
        ...structuredClone(n),
        id: newId,
        x: n.x + offset,
        y: n.y + offset,
        zIndex: nodes.length + i,
      }
    })

    const newEdges = clipEdges
      .filter(e => idMap.has(e.sourceId) && idMap.has(e.targetId))
      .map(e => ({
        ...structuredClone(e),
        id: genId(),
        sourceId: idMap.get(e.sourceId)!,
        targetId: idMap.get(e.targetId)!,
      }))

    const nextNodes = [...nodes, ...newNodes]
    const nextEdges = [...edges, ...newEdges]
    setNodes(nextNodes)
    setEdges(nextEdges)
    pushHistory(nextNodes, nextEdges)
    setSelection({
      nodeIds: new Set(newNodes.map(n => n.id)),
      edgeIds: new Set(newEdges.map(e => e.id)),
    })
  }, [nodes, edges, pushHistory])

  // ── Duplicate selected ──────────────────────────────────

  const duplicateSelected = useCallback(() => {
    copySelected()
    paste()
  }, [copySelected, paste])

  // ── Select all ──────────────────────────────────────────

  const selectAll = useCallback(() => {
    setSelection({
      nodeIds: new Set(nodes.map(n => n.id)),
      edgeIds: new Set(edges.map(e => e.id)),
    })
  }, [nodes, edges])

  // ── Load diagram state (from import or JSON) ───────────

  const loadDiagram = useCallback((state: DiagramState) => {
    setNodes(state.nodes)
    setEdges(state.edges)
    setSelection(emptySelection())
    setEditingNodeId(null)
    // Reset history
    historyRef.current = [structuredClone(state)]
    historyIdxRef.current = 0
    forceRender(v => v + 1)
    // Reset viewport
    setViewport(DEFAULT_VIEWPORT)
  }, [])

  // ── Clear ───────────────────────────────────────────────

  const clearDiagram = useCallback(() => {
    loadDiagram({ nodes: [], edges: [] })
  }, [loadDiagram])

  // ── Viewport helpers ────────────────────────────────────

  const zoomTo = useCallback((newZoom: number, center?: Point) => {
    setViewport(prev => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
      if (center) {
        // Zoom toward the cursor position
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

  const fitToContent = useCallback(() => {
    if (nodes.length === 0) {
      resetZoom()
      return
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }

    // We'll compute the proper fit when we know the container size
    // For now, just center the content
    const contentW = maxX - minX
    const contentH = maxY - minY
    const zoom = Math.min(1, 800 / (contentW + 100), 600 / (contentH + 100))

    setViewport({
      panX: -(minX - 50) * zoom,
      panY: -(minY - 50) * zoom,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    })
  }, [nodes, resetZoom])

  // ── Z-index operations ──────────────────────────────────

  const bringToFront = useCallback(() => {
    if (selection.nodeIds.size === 0) return
    const maxZ = Math.max(0, ...nodes.map(n => n.zIndex))
    let z = maxZ + 1
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id) ? { ...n, zIndex: z++ } : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  const sendToBack = useCallback(() => {
    if (selection.nodeIds.size === 0) return
    const minZ = Math.min(0, ...nodes.map(n => n.zIndex))
    let z = minZ - selection.nodeIds.size
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id) ? { ...n, zIndex: z++ } : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  // ── Snap helper ─────────────────────────────────────────

  const snapToGrid = useCallback((val: number): number => {
    if (!snapEnabled) return val
    return Math.round(val / gridSize) * gridSize
  }, [snapEnabled, gridSize])

  // ── Waypoint operations ───────────────────────────────

  const addWaypoint = useCallback((edgeId: string, point: Point, index?: number) => {
    const nextEdges = edges.map(e => {
      if (e.id !== edgeId) return e
      const wp = [...e.waypoints]
      if (index !== undefined) {
        wp.splice(index, 0, point)
      } else {
        wp.push(point)
      }
      return { ...e, waypoints: wp }
    })
    setEdges(nextEdges)
    pushHistory(nodes, nextEdges)
  }, [nodes, edges, pushHistory])

  const moveWaypoint = useCallback((edgeId: string, index: number, point: Point) => {
    const nextEdges = edges.map(e => {
      if (e.id !== edgeId) return e
      const wp = [...e.waypoints]
      wp[index] = point
      return { ...e, waypoints: wp }
    })
    setEdges(nextEdges)
    return nextEdges
  }, [edges])

  const commitWaypointMove = useCallback((currentEdges: DiagramEdge[]) => {
    pushHistory(nodes, currentEdges)
  }, [nodes, pushHistory])

  const removeWaypoint = useCallback((edgeId: string, index: number) => {
    const nextEdges = edges.map(e => {
      if (e.id !== edgeId) return e
      const wp = [...e.waypoints]
      wp.splice(index, 1)
      return { ...e, waypoints: wp }
    })
    setEdges(nextEdges)
    pushHistory(nodes, nextEdges)
  }, [nodes, edges, pushHistory])

  // ── Theme operations (Agent A) ─────────────────────────

  const applyTheme = useCallback((theme: FlowchartTheme) => {
    setActiveTheme(theme)
    const nextNodes = nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        fill: theme.nodeFill,
        stroke: theme.nodeStroke,
        fontColor: theme.textColor,
      },
    }))
    const nextEdges = edges.map(e => ({
      ...e,
      style: { ...e.style, stroke: theme.edgeColor },
    }))
    setNodes(nextNodes)
    setEdges(nextEdges)
    pushHistory(nextNodes, nextEdges)
  }, [nodes, edges, pushHistory])

  // ── Format painter (Agent A) ────────────────────────────

  const copyStyle = useCallback(() => {
    const selectedNode = nodes.find(n => selection.nodeIds.has(n.id))
    if (!selectedNode) return
    copiedStyleRef.current = { ...selectedNode.style }
  }, [nodes, selection])

  const pasteStyle = useCallback(() => {
    const style = copiedStyleRef.current
    if (!style || selection.nodeIds.size === 0) return
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id) ? { ...n, style: { ...style } } : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  // ── Rotation (Agent A) ─────────────────────────────────

  const rotateSelected = useCallback((degrees: number) => {
    if (selection.nodeIds.size === 0) return
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id)
        ? { ...n, rotation: ((n.rotation ?? 0) + degrees) % 360 }
        : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  // ── Auto-layout (Agent B) ──────────────────────────────

  const applyAutoLayout = useCallback((direction: LayoutDirection = 'TB') => {
    if (nodes.length === 0) return

    const result = autoLayout(nodes, edges, direction)

    const nextNodes = nodes.map(n => {
      const pos = result.positions.get(n.id)
      if (!pos) return n
      return { ...n, x: pos.x, y: pos.y }
    })

    // Clear all edge waypoints
    const nextEdges = edges.map(e => ({ ...e, waypoints: [] }))

    setNodes(nextNodes)
    setEdges(nextEdges)
    pushHistory(nextNodes, nextEdges)
  }, [nodes, edges, pushHistory])

  // ── Alignment tools (Agent B) ─────────────────────────

  const alignNodes = useCallback((axis: AlignAxis) => {
    const selectedIds = selection.nodeIds
    if (selectedIds.size < 2) return

    const selected = nodes.filter(n => selectedIds.has(n.id))
    if (selected.length < 2) return

    let targetValue: number

    switch (axis) {
      case 'left':
        targetValue = Math.min(...selected.map(n => n.x))
        break
      case 'center':
        targetValue = selected.reduce((sum, n) => sum + n.x + n.width / 2, 0) / selected.length
        break
      case 'right':
        targetValue = Math.max(...selected.map(n => n.x + n.width))
        break
      case 'top':
        targetValue = Math.min(...selected.map(n => n.y))
        break
      case 'middle':
        targetValue = selected.reduce((sum, n) => sum + n.y + n.height / 2, 0) / selected.length
        break
      case 'bottom':
        targetValue = Math.max(...selected.map(n => n.y + n.height))
        break
    }

    const nextNodes = nodes.map(n => {
      if (!selectedIds.has(n.id)) return n
      switch (axis) {
        case 'left':   return { ...n, x: targetValue }
        case 'center': return { ...n, x: targetValue - n.width / 2 }
        case 'right':  return { ...n, x: targetValue - n.width }
        case 'top':    return { ...n, y: targetValue }
        case 'middle': return { ...n, y: targetValue - n.height / 2 }
        case 'bottom': return { ...n, y: targetValue - n.height }
      }
    })

    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  const distributeNodes = useCallback((axis: DistributeAxis) => {
    const selectedIds = selection.nodeIds
    if (selectedIds.size < 3) return

    const selected = nodes.filter(n => selectedIds.has(n.id))
    if (selected.length < 3) return

    if (axis === 'horizontal') {
      const sorted = [...selected].sort((a, b) => a.x - b.x)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const totalSpace = (last.x + last.width) - first.x
      const totalNodeWidth = sorted.reduce((sum, n) => sum + n.width, 0)
      const gap = (totalSpace - totalNodeWidth) / (sorted.length - 1)

      let currentX = first.x
      const posMap = new Map<string, number>()
      for (const node of sorted) {
        posMap.set(node.id, currentX)
        currentX += node.width + gap
      }

      const nextNodes = nodes.map(n => {
        const newX = posMap.get(n.id)
        if (newX === undefined) return n
        return { ...n, x: newX }
      })

      setNodes(nextNodes)
      pushHistory(nextNodes, edges)
    } else {
      const sorted = [...selected].sort((a, b) => a.y - b.y)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const totalSpace = (last.y + last.height) - first.y
      const totalNodeHeight = sorted.reduce((sum, n) => sum + n.height, 0)
      const gap = (totalSpace - totalNodeHeight) / (sorted.length - 1)

      let currentY = first.y
      const posMap = new Map<string, number>()
      for (const node of sorted) {
        posMap.set(node.id, currentY)
        currentY += node.height + gap
      }

      const nextNodes = nodes.map(n => {
        const newY = posMap.get(n.id)
        if (newY === undefined) return n
        return { ...n, y: newY }
      })

      setNodes(nextNodes)
      pushHistory(nextNodes, edges)
    }
  }, [nodes, edges, selection, pushHistory])

  // ── Create connected node (Agent B) ────────────────────

  const createConnectedNode = useCallback((
    sourceId: string,
    direction: 'up' | 'right' | 'down' | 'left',
  ): DiagramNode | null => {
    const source = nodes.find(n => n.id === sourceId)
    if (!source) return null

    const offset = 200
    const def = getShapeDef('rectangle')
    let x: number, y: number
    let sourcePort: PortPosition, targetPort: PortPosition

    switch (direction) {
      case 'up':
        x = source.x + source.width / 2 - def.defaultWidth / 2
        y = source.y - offset - def.defaultHeight
        sourcePort = 'top'
        targetPort = 'bottom'
        break
      case 'right':
        x = source.x + source.width + offset
        y = source.y + source.height / 2 - def.defaultHeight / 2
        sourcePort = 'right'
        targetPort = 'left'
        break
      case 'down':
        x = source.x + source.width / 2 - def.defaultWidth / 2
        y = source.y + source.height + offset
        sourcePort = 'bottom'
        targetPort = 'top'
        break
      case 'left':
        x = source.x - offset - def.defaultWidth
        y = source.y + source.height / 2 - def.defaultHeight / 2
        sourcePort = 'left'
        targetPort = 'right'
        break
    }

    const newNode: DiagramNode = {
      id: genId(),
      type: 'rectangle',
      label: '',
      x,
      y,
      width: def.defaultWidth,
      height: def.defaultHeight,
      style: {
        ...DEFAULT_NODE_STYLE,
        fill: activeTheme.nodeFill,
        stroke: activeTheme.nodeStroke,
        fontColor: activeTheme.textColor,
      },
      zIndex: nodes.length,
      rotation: 0,
      groupId: null,
      layerId: 'default',
    }

    const newEdge: DiagramEdge = {
      id: genId(),
      sourceId: sourceId,
      sourcePort,
      targetId: newNode.id,
      targetPort,
      label: '',
      routeType: 'orthogonal',
      style: { ...DEFAULT_EDGE_STYLE, stroke: activeTheme.edgeColor },
      waypoints: [],
      labelPosition: 0.5,
    }

    const nextNodes = [...nodes, newNode]
    const nextEdges = [...edges, newEdge]
    setNodes(nextNodes)
    setEdges(nextEdges)
    pushHistory(nextNodes, nextEdges)
    setSelection({ nodeIds: new Set([newNode.id]), edgeIds: new Set() })
    setEditingNodeId(newNode.id)

    return newNode
  }, [nodes, edges, pushHistory, activeTheme, setSelection, setEditingNodeId])

  // ── Grouping operations (Agent C) ─────────────────────

  const groupSelected = useCallback(() => {
    if (selection.nodeIds.size < 2) return
    const gid = genId()
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id) ? { ...n, groupId: gid } : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  const ungroupSelected = useCallback(() => {
    if (selection.nodeIds.size === 0) return
    const nextNodes = nodes.map(n =>
      selection.nodeIds.has(n.id) ? { ...n, groupId: null } : n,
    )
    setNodes(nextNodes)
    pushHistory(nextNodes, edges)
  }, [nodes, edges, selection, pushHistory])

  // ── Layer operations (Agent C) ─────────────────────────

  const addLayer = useCallback((name: string) => {
    const newLayer: DiagramLayer = {
      id: genId(),
      name,
      isVisible: true,
      isLocked: false,
    }
    setLayers(prev => [...prev, newLayer])
  }, [])

  const updateLayer = useCallback((id: string, updates: Partial<DiagramLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [])

  const deleteLayer = useCallback((id: string) => {
    if (id === 'default') return // Cannot delete default layer
    // Move nodes on this layer to default
    const nextNodes = nodes.map(n =>
      n.layerId === id ? { ...n, layerId: 'default' } : n,
    )
    setNodes(nextNodes)
    setLayers(prev => prev.filter(l => l.id !== id))
    pushHistory(nextNodes, edges)
  }, [nodes, edges, pushHistory])

  // ── Multi-page operations (Agent C) ───────────────────

  const saveCurrentPage = useCallback(() => {
    setPages(prev => prev.map(p =>
      p.id === activePageId
        ? { ...p, nodes: structuredClone(nodes), edges: structuredClone(edges), viewport: { ...viewport }, layers: structuredClone(layers) }
        : p,
    ))
  }, [activePageId, nodes, edges, viewport, layers])

  const switchPage = useCallback((pageId: string) => {
    // Save current page state first
    setPages(prev => {
      const updated = prev.map(p =>
        p.id === activePageId
          ? { ...p, nodes: structuredClone(nodes), edges: structuredClone(edges), viewport: { ...viewport }, layers: structuredClone(layers) }
          : p,
      )
      // Load target page
      const target = updated.find(p => p.id === pageId)
      if (target) {
        setNodes(structuredClone(target.nodes))
        setEdges(structuredClone(target.edges))
        setViewport({ ...target.viewport })
        setLayers(structuredClone(target.layers))
        setSelection(emptySelection())
        setEditingNodeId(null)
        // Reset history for new page
        historyRef.current = [structuredClone({ nodes: target.nodes, edges: target.edges })]
        historyIdxRef.current = 0
        forceRender(v => v + 1)
      }
      return updated
    })
    setActivePageId(pageId)
  }, [activePageId, nodes, edges, viewport, layers])

  const addPage = useCallback(() => {
    // Save current page state first
    saveCurrentPage()
    const newPageId = genId()
    const newPage: DiagramPage = {
      id: newPageId,
      name: `Page ${pages.length + 1}`,
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_VIEWPORT },
      layers: [{ ...DEFAULT_LAYER }],
    }
    setPages(prev => [...prev, newPage])
    // Switch to new page
    setNodes([])
    setEdges([])
    setViewport(DEFAULT_VIEWPORT)
    setLayers([{ ...DEFAULT_LAYER }])
    setSelection(emptySelection())
    setEditingNodeId(null)
    historyRef.current = [{ nodes: [], edges: [] }]
    historyIdxRef.current = 0
    setActivePageId(newPageId)
    forceRender(v => v + 1)
  }, [pages, saveCurrentPage])

  const renamePage = useCallback((pageId: string, name: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name } : p,
    ))
  }, [])

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return // Must keep at least one page
    const remaining = pages.filter(p => p.id !== pageId)
    setPages(remaining)
    if (activePageId === pageId) {
      // Switch to first remaining page
      const target = remaining[0]
      setNodes(structuredClone(target.nodes))
      setEdges(structuredClone(target.edges))
      setViewport({ ...target.viewport })
      setLayers(structuredClone(target.layers))
      setSelection(emptySelection())
      setEditingNodeId(null)
      historyRef.current = [structuredClone({ nodes: target.nodes, edges: target.edges })]
      historyIdxRef.current = 0
      setActivePageId(target.id)
      forceRender(v => v + 1)
    }
  }, [pages, activePageId])

  // ── Return all state and actions ────────────────────────

  return {
    // State
    nodes, edges, selection, toolMode, viewport,
    editingNodeId, gridEnabled, snapEnabled, gridSize,
    canUndo, canRedo, activeTheme,
    sketchMode, layers,
    pages, activePageId,

    // State setters
    setNodes, setEdges, setSelection, setToolMode, setViewport,
    setEditingNodeId, setGridEnabled, setSnapEnabled, setGridSize,
    setSketchMode,

    // Node actions
    addNode, updateNode, batchUpdateNodes, moveNodes, commitMove, resizeNode, commitResize,

    // Edge actions
    addEdge, addEdgeAutoPort, updateEdge, batchUpdateEdges,

    // Waypoint actions
    addWaypoint, moveWaypoint, commitWaypointMove, removeWaypoint,

    // Selection actions
    deleteSelected, copySelected, paste, duplicateSelected, selectAll,

    // Grouping (Agent C)
    groupSelected, ungroupSelected,

    // Layers (Agent C)
    addLayer, updateLayer, deleteLayer,

    // Multi-page (Agent C)
    switchPage, addPage, renamePage, deletePage, saveCurrentPage,

    // Diagram actions
    loadDiagram, clearDiagram,

    // History
    undo, redo, pushHistory,

    // Viewport
    zoomTo, zoomIn, zoomOut, resetZoom, fitToContent,

    // Z-index
    bringToFront, sendToBack,

    // Grid/Snap
    snapToGrid,

    // Theme (Agent A)
    applyTheme,

    // Format painter (Agent A)
    copyStyle, pasteStyle,

    // Rotation (Agent A)
    rotateSelected,

    // Layout (Agent B)
    applyAutoLayout,

    // Alignment (Agent B)
    alignNodes, distributeNodes,

    // Connected node creation (Agent B)
    createConnectedNode,
  }
}

export type FlowchartStore = ReturnType<typeof useFlowchartStore>
