import { useState, useRef, useCallback } from 'react'
import type {
  OrgNode, OrgChartState, OrgChartVersion, Viewport, LayoutDirection,
  Connection, ConnectorType, ConnectorTypeId, LegendConfig, LegendPosition,
} from './types.ts'
import {
  createNode, createDefaultConnectorTypes, createDefaultLegend, mergeWithDefaults,
  DEFAULT_VIEWPORT, MIN_ZOOM, MAX_ZOOM, MAX_VERSIONS, genId,
} from './types.ts'

const MAX_HISTORY = 50
const VERSIONS_KEY = 'mt-orgchart-versions'

function isLegendPosition(v: string): v is LegendPosition {
  return v === 'top-left' || v === 'top-right' || v === 'bottom-left' || v === 'bottom-right'
}

// `upgradeSnapshot` validates the outer shape of a version snapshot and repairs
// missing top-level fields with defaults. Array contents (nodes[], connections[])
// are trusted to be well-formed because localStorage is same-origin and written
// only by this app; downstream code (getConnectorType fallback, renderer skip
// for missing node refs) provides safety nets for stale/corrupt entries. Exported
// for direct unit testing from e2e page.evaluate hooks.
export function upgradeSnapshot(snapshot: unknown): OrgChartState {
  // Old shape: snapshot was OrgNode[] directly
  if (Array.isArray(snapshot)) {
    return {
      nodes: snapshot as OrgNode[],
      connections: [],
      connectorTypes: createDefaultConnectorTypes(),
      legend: createDefaultLegend(),
    }
  }
  // New shape: snapshot is already OrgChartState; repair missing fields
  if (snapshot && typeof snapshot === 'object') {
    const s = snapshot as Record<string, unknown>
    const rawLegend = s.legend
    const legendPos: LegendPosition = (
      rawLegend
      && typeof rawLegend === 'object'
      && typeof (rawLegend as Record<string, unknown>).position === 'string'
      && isLegendPosition((rawLegend as Record<string, unknown>).position as string)
    )
      ? ((rawLegend as Record<string, unknown>).position as LegendPosition)
      : 'bottom-right'
    return {
      nodes: Array.isArray(s.nodes) ? s.nodes as OrgNode[] : [],
      connections: Array.isArray(s.connections) ? s.connections as Connection[] : [],
      connectorTypes: 'connectorTypes' in s
        ? mergeWithDefaults(s.connectorTypes)
        : createDefaultConnectorTypes(),
      legend: { position: legendPos },
    }
  }
  // Totally malformed — return empty default
  return {
    nodes: [],
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: createDefaultLegend(),
  }
}

function loadVersions(): OrgChartVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((v: unknown) => {
      const obj = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
      return {
        id: typeof obj.id === 'string' ? obj.id : genId(),
        name: typeof obj.name === 'string' ? obj.name : 'Untitled',
        timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
        nodeCount: typeof obj.nodeCount === 'number' ? obj.nodeCount : 0,
        snapshot: upgradeSnapshot(obj.snapshot),
      }
    })
  } catch { return [] }
}

function persistVersions(versions: OrgChartVersion[]): void {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions))
}

// ── Hook: useOrgChartStore ──────────────────────────────────

export function useOrgChartStore() {
  // ── Core state ──────────────────────────────────────────
  const [nodes, setNodes] = useState<OrgNode[]>(() => [
    createNode({ id: 'root', name: 'CEO', title: 'Chief Executive Officer', reportsTo: '' }),
  ])
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectorTypes, setConnectorTypes] = useState<ConnectorType[]>(() => createDefaultConnectorTypes())
  const [legend, setLegend] = useState<LegendConfig>(() => createDefaultLegend())
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('top-down')

  // Derived: first selected node ID for backward compat (PropertiesPanel)
  const selectedNodeId = selectedNodeIds.size > 0 ? [...selectedNodeIds][0] : null

  // Ref to track latest nodes for commitMove
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const connectorTypesRef = useRef(connectorTypes)
  connectorTypesRef.current = connectorTypes
  const legendRef = useRef(legend)
  legendRef.current = legend

  // ── Undo/redo (ref-based, structuredClone) ──────────────
  // Initialize history with the same root node as the initial state
  const historyRef = useRef<OrgChartState[]>([{
    nodes: [createNode({ id: 'root', name: 'CEO', title: 'Chief Executive Officer', reportsTo: '' })],
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: createDefaultLegend(),
  }])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  const pushHistory = useCallback((override?: Partial<OrgChartState>) => {
    const state: OrgChartState = {
      nodes: override?.nodes ?? nodesRef.current,
      connections: override?.connections ?? connectionsRef.current,
      connectorTypes: override?.connectorTypes ?? connectorTypesRef.current,
      legend: override?.legend ?? legendRef.current,
    }
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(structuredClone(state))
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
    setConnections(state.connections)
    setConnectorTypes(state.connectorTypes)
    setLegend(state.legend)
    setSelectedNodeIds(new Set())
    setSelectedConnectionId(null)
    forceRender(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const state = structuredClone(historyRef.current[historyIdxRef.current])
    setNodes(state.nodes)
    setConnections(state.connections)
    setConnectorTypes(state.connectorTypes)
    setLegend(state.legend)
    setSelectedNodeIds(new Set())
    setSelectedConnectionId(null)
    forceRender(v => v + 1)
  }, [])

  // ── Node CRUD ─────────────────────────────────────────

  const addNode = useCallback((parentId: string, overrides?: Partial<OrgNode>) => {
    const node = createNode({ reportsTo: parentId, ...overrides })
    const nextNodes = [...nodes, node]
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
    setSelectedNodeIds(new Set([node.id]))
    return node
  }, [nodes, pushHistory])

  const updateNode = useCallback((id: string, updates: Partial<OrgNode>) => {
    const nextNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
  }, [nodes, pushHistory])

  const removeNode = useCallback((id: string) => {
    // Don't allow removing the LAST root node
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const roots = nodes.filter(n => !n.reportsTo)
    if (!node.reportsTo && roots.length <= 1) return

    // Cascade delete: find all descendants
    const toRemove = new Set<string>([id])
    let found = true
    while (found) {
      found = false
      for (const n of nodes) {
        if (!toRemove.has(n.id) && toRemove.has(n.reportsTo)) {
          toRemove.add(n.id)
          found = true
        }
      }
    }

    const nextNodes = nodes.filter(n => !toRemove.has(n.id))
    const nextConnections = connections.filter(c => !toRemove.has(c.fromId) && !toRemove.has(c.toId))
    setNodes(nextNodes)
    setConnections(nextConnections)
    pushHistory({ nodes: nextNodes, connections: nextConnections })
    setSelectedNodeIds(prev => {
      const next = new Set(prev)
      for (const rid of toRemove) next.delete(rid)
      return next.size !== prev.size ? next : prev
    })
  }, [nodes, connections, pushHistory])

  const removeSelectedNodes = useCallback(() => {
    const roots = nodes.filter(n => !n.reportsTo)
    const toRemove = new Set<string>()
    // Count how many roots are being removed
    let rootsBeingRemoved = 0
    for (const id of selectedNodeIds) {
      const node = nodes.find(n => n.id === id)
      if (!node) continue
      if (!node.reportsTo) {
        // Allow removing root only if at least 1 root remains
        if (rootsBeingRemoved < roots.length - 1) {
          toRemove.add(id)
          rootsBeingRemoved++
        }
      } else {
        toRemove.add(id)
      }
    }
    // Cascade
    let found = true
    while (found) {
      found = false
      for (const n of nodes) {
        if (!toRemove.has(n.id) && toRemove.has(n.reportsTo)) {
          toRemove.add(n.id)
          found = true
        }
      }
    }
    if (toRemove.size === 0) return
    const nextNodes = nodes.filter(n => !toRemove.has(n.id))
    const nextConnections = connections.filter(c => !toRemove.has(c.fromId) && !toRemove.has(c.toId))
    setNodes(nextNodes)
    setConnections(nextConnections)
    pushHistory({ nodes: nextNodes, connections: nextConnections })
    setSelectedNodeIds(new Set())
  }, [nodes, connections, selectedNodeIds, pushHistory])

  const reparentNode = useCallback((nodeId: string, newParentId: string) => {
    // Prevent self-parenting
    if (nodeId === newParentId) return

    // Prevent parenting to a descendant (would create cycle)
    if (isDescendant(nodes, nodeId, newParentId)) return

    const nextNodes = nodes.map(n =>
      n.id === nodeId ? { ...n, reportsTo: newParentId } : n,
    )
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
  }, [nodes, pushHistory])

  /** Atomically revert drag offsets + reparent selected nodes (uses nodesRef for latest state).
   *  Preserves internal hierarchy: only "top-level" selected nodes (whose parent is NOT
   *  also in the selection) get reparented. Internal relationships stay intact. */
  const reparentAfterDrag = useCallback((
    draggedIds: Set<string>,
    newParentId: string,
    revertDx: number,
    revertDy: number,
  ) => {
    const current = nodesRef.current

    // Find top-level selected nodes: those whose parent is NOT also selected.
    // Internal nodes (parent is in selection) keep their existing reportsTo.
    const topLevel = new Set<string>()
    for (const id of draggedIds) {
      const node = current.find(n => n.id === id)
      if (!node || !node.reportsTo) continue // skip root
      if (draggedIds.has(node.reportsTo)) continue // internal — parent is also selected
      topLevel.add(id)
    }

    // Validate top-level nodes for reparent (no self-parenting, no cycles)
    const canReparent = new Set<string>()
    for (const id of topLevel) {
      if (id === newParentId) continue
      if (isDescendant(current, id, newParentId)) continue
      canReparent.add(id)
    }
    if (canReparent.size === 0) return

    const nextNodes = current.map(n => {
      if (canReparent.has(n.id)) {
        // Top-level reparented: change parent + reset offsets
        return { ...n, reportsTo: newParentId, offsetX: 0, offsetY: 0 }
      }
      if (draggedIds.has(n.id)) {
        if (draggedIds.has(n.reportsTo)) {
          // Internal node (parent also selected): subtree follows, reset offsets
          return { ...n, offsetX: 0, offsetY: 0 }
        }
        // Not internal, not reparented (e.g. root): revert drag offsets
        return { ...n, offsetX: n.offsetX + revertDx, offsetY: n.offsetY + revertDy }
      }
      return n
    })
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
    setSelectedNodeIds(draggedIds)
  }, [pushHistory])

  // ── Selection ─────────────────────────────────────────

  const selectNode = useCallback((id: string | null, additive = false) => {
    if (id === null) {
      setSelectedNodeIds(new Set())
      return
    }
    if (additive) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedNodeIds(new Set([id]))
    }
  }, [])

  const selectAll = useCallback(() => {
    setSelectedNodeIds(new Set(nodes.map(n => n.id)))
  }, [nodes])

  const selectNodes = useCallback((ids: string[]) => {
    setSelectedNodeIds(new Set(ids))
  }, [])

  // ── Move operations (no history push during drag) ─────

  const moveNodes = useCallback((ids: Set<string>, dx: number, dy: number) => {
    setNodes(prev => prev.map(n =>
      ids.has(n.id) ? { ...n, offsetX: n.offsetX + dx, offsetY: n.offsetY + dy } : n,
    ))
  }, [])

  const commitMove = useCallback(() => {
    pushHistory()
  }, [pushHistory])

  const resetLayout = useCallback(() => {
    const hasOffsets = nodes.some(n => n.offsetX !== 0 || n.offsetY !== 0)
    if (!hasOffsets) return
    const nextNodes = nodes.map(n => ({ ...n, offsetX: 0, offsetY: 0 }))
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
  }, [nodes, pushHistory])

  const hasManualOffsets = nodes.some(n => n.offsetX !== 0 || n.offsetY !== 0)

  // ── Diagram operations ────────────────────────────────

  const loadDiagram = useCallback((state: OrgChartState) => {
    setNodes(state.nodes)
    setConnections(state.connections)
    setConnectorTypes(state.connectorTypes)
    setLegend(state.legend)
    setSelectedNodeIds(new Set())
    setSelectedConnectionId(null)
    historyRef.current = [structuredClone(state)]
    historyIdxRef.current = 0
    forceRender(v => v + 1)
    setViewport(DEFAULT_VIEWPORT)
  }, [])

  const clearDiagram = useCallback(() => {
    loadDiagram({
      nodes: [createNode({ id: 'root', name: 'CEO', title: 'Chief Executive Officer', reportsTo: '' })],
      connections: [],
      connectorTypes: createDefaultConnectorTypes(),
      legend: createDefaultLegend(),
    })
  }, [loadDiagram])

  // ── Section actions ──────────────────────────────────

  const addSection = useCallback(() => {
    const newRoot = createNode({
      name: 'Department Head',
      title: 'Head of Department',
      reportsTo: '',
      sectionTitle: 'New Section',
    })
    const nextNodes = [...nodes, newRoot]
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
    setSelectedNodeIds(new Set([newRoot.id]))
  }, [nodes, pushHistory])

  const updateSectionTitle = useCallback((rootId: string, title: string) => {
    const nextNodes = nodes.map(n =>
      n.id === rootId ? { ...n, sectionTitle: title } : n,
    )
    setNodes(nextNodes)
    pushHistory({ nodes: nextNodes })
  }, [nodes, pushHistory])

  // ── Connector type actions ────────────────────────────

  const updateConnectorType = useCallback((
    id: ConnectorTypeId,
    updates: Partial<Pick<ConnectorType, 'label' | 'color'>>,
  ) => {
    const nextTypes = connectorTypes.map(t =>
      t.id === id ? { ...t, ...updates } : t,
    )
    setConnectorTypes(nextTypes)
    pushHistory({ connectorTypes: nextTypes })
  }, [connectorTypes, pushHistory])

  const resetConnectorType = useCallback((id: ConnectorTypeId) => {
    const defaults = createDefaultConnectorTypes()
    const defaultForId = defaults.find(d => d.id === id)
    if (!defaultForId) return
    const nextTypes = connectorTypes.map(t =>
      t.id === id ? defaultForId : t,
    )
    setConnectorTypes(nextTypes)
    pushHistory({ connectorTypes: nextTypes })
  }, [connectorTypes, pushHistory])

  const resetAllConnectorTypes = useCallback(() => {
    const nextTypes = createDefaultConnectorTypes()
    setConnectorTypes(nextTypes)
    pushHistory({ connectorTypes: nextTypes })
  }, [pushHistory])

  // ── Legend actions ────────────────────────────────────

  const setLegendPosition = useCallback((position: LegendPosition) => {
    const nextLegend: LegendConfig = { position }
    setLegend(nextLegend)
    pushHistory({ legend: nextLegend })
  }, [pushHistory])

  // ── Version control ──────────────────────────────────

  const getVersions = useCallback((): OrgChartVersion[] => loadVersions(), [])

  const saveVersion = useCallback((name: string) => {
    const versions = loadVersions()
    if (versions.length >= MAX_VERSIONS) {
      versions.pop() // remove oldest (last in array)
    }
    const version: OrgChartVersion = {
      id: genId(),
      name,
      timestamp: Date.now(),
      nodeCount: nodes.length,
      snapshot: structuredClone({
        nodes,
        connections,
        connectorTypes,
        legend,
      }),
    }
    versions.unshift(version) // newest first
    persistVersions(versions)
  }, [nodes, connections, connectorTypes, legend])

  const restoreVersion = useCallback((versionId: string) => {
    const versions = loadVersions()
    const version = versions.find(v => v.id === versionId)
    if (!version) return
    const restored = structuredClone(version.snapshot)
    setNodes(restored.nodes)
    setConnections(restored.connections)
    setConnectorTypes(restored.connectorTypes)
    setLegend(restored.legend)
    pushHistory({
      nodes: restored.nodes,
      connections: restored.connections,
      connectorTypes: restored.connectorTypes,
      legend: restored.legend,
    })
    setSelectedNodeIds(new Set())
    setSelectedConnectionId(null)
  }, [pushHistory])

  const deleteVersion = useCallback((versionId: string) => {
    const versions = loadVersions().filter(v => v.id !== versionId)
    persistVersions(versions)
  }, [])

  const renameVersion = useCallback((versionId: string, newName: string) => {
    const versions = loadVersions()
    const version = versions.find(v => v.id === versionId)
    if (version) {
      version.name = newName
      persistVersions(versions)
    }
  }, [])

  // ── Viewport helpers ──────────────────────────────────

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

  // fitToContent needs to be called from Canvas where we know the container size
  // We expose setViewport so Canvas can compute and apply the fit

  // ── Return ────────────────────────────────────────────

  return {
    // State
    nodes, connections, connectorTypes, legend,
    selectedNodeIds, selectedNodeId, selectedConnectionId,
    viewport, layoutDirection,
    canUndo, canRedo, hasManualOffsets,

    // Setters
    setViewport, setLayoutDirection,

    // Node actions
    addNode, updateNode, removeNode, removeSelectedNodes, reparentNode, reparentAfterDrag,

    // Selection
    selectNode, selectAll, selectNodes,

    // Move
    moveNodes, commitMove, resetLayout,

    // Diagram actions
    loadDiagram, clearDiagram,

    // Section actions
    addSection, updateSectionTitle,

    // Connector type actions
    updateConnectorType, resetConnectorType, resetAllConnectorTypes,

    // Legend actions
    setLegendPosition,

    // Version control
    getVersions, saveVersion, restoreVersion, deleteVersion, renameVersion,

    // History
    undo, redo,

    // Zoom
    zoomIn, zoomOut, resetZoom, zoomTo,
  }
}

export type OrgChartStore = ReturnType<typeof useOrgChartStore>

// ── Utility ─────────────────────────────────────────────────

/** Check if `ancestorId` is an ancestor of `nodeId` in the tree. */
function isDescendant(nodes: OrgNode[], ancestorId: string, nodeId: string): boolean {
  let current = nodeId
  const visited = new Set<string>()
  while (current) {
    if (current === ancestorId) return true
    if (visited.has(current)) return false // safety: break cycles
    visited.add(current)
    const node = nodes.find(n => n.id === current)
    current = node?.reportsTo || ''
  }
  return false
}
