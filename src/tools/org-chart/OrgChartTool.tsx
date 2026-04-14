import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useOrgChartStore } from './orgChartStore.ts'
import { Canvas } from './Canvas.tsx'
import { Toolbar } from './Toolbar.tsx'
import { PropertiesPanel } from './PropertiesPanel.tsx'
import { ConnectorTypesModal } from './ConnectorTypesModal.tsx'
import { ConnectModeBanner } from './ConnectModeBanner.tsx'
import { ConnectorTypePopover } from './ConnectorTypePopover.tsx'
import { attachShortcuts } from './shortcuts.ts'
import { exportPNG, exportSVG, exportJSON, exportCSV, importJSON, copyPNGToClipboard } from './export.ts'
import { TEMPLATES } from './templates.ts'
import type { OrgChartState } from './types.ts'
import { Modal } from '@/components/common/Modal.tsx'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import {
  Image as ImageIcon, FileJson, FileCode, Clipboard, FileSpreadsheet, Users,
  ZoomIn, ZoomOut, ChevronDown, ChevronRight,
} from 'lucide-react'

// ── Helper: trigger fitToContent via window bridge ──────────

function triggerFitToContent() {
  setTimeout(() => {
    const fn = (window as unknown as Record<string, unknown>).__orgChartFitToContent as (() => void) | undefined
    fn?.()
  }, 100)
}

// ── Component ───────────────────────────────────────────────

export default function OrgChartTool() {
  const store = useOrgChartStore()
  const { addToast } = useAppStore()

  // ── Dev-only test hooks (tree-shaken out of production) ──
  // storeRef is updated synchronously every render so registerStore can
  // expose a live getter — e2e tests always see the latest store snapshot.
  const storeRef = useRef(store)
  storeRef.current = store
  useEffect(() => {
    void import('./testHooks.ts').then(({ installTestHooks, registerStore }) => {
      installTestHooks()
      registerStore(() => storeRef.current)
    })
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    return attachShortcuts(store, () => setShowExport(true))
  }, [store])

  // ── Modal state ────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showConnectorTypes, setShowConnectorTypes] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Export color overrides ────────────────────────────────
  // Null = use the theme defaults (#0a0a14 background, primary ConnectorType
  // color). Non-null = override applied at export time only, never mutates
  // store state. Kept in-memory per session; not persisted across reloads.
  const [exportCustomize, setExportCustomize] = useState(false)
  const [exportBgColor, setExportBgColor] = useState('#0a0a14')
  const [exportPrimaryColor, setExportPrimaryColor] = useState('#9ca3af')

  // Memoize versions list to re-read when panel opens or after mutations
  const versions = useMemo(
    () => showVersions ? store.getVersions() : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showVersions, versionRefresh, store],
  )

  // ── Export handlers ────────────────────────────────────────
  // Centralize full-state snapshot so every export sees the same fields.
  const getFullState = useCallback((): OrgChartState => ({
    nodes: store.nodes,
    connections: store.connections,
    connectorTypes: store.connectorTypes,
    legend: store.legend,
  }), [store.nodes, store.connections, store.connectorTypes, store.legend])

  // Build the export-options object only when the user has opted into
  // customization. Leaving this empty falls through to the renderer's
  // defaults so baseline exports are unchanged for users who ignore the
  // Customize panel.
  const getExportOptions = useCallback(() => {
    if (!exportCustomize) return {}
    return { bgColor: exportBgColor, primaryColor: exportPrimaryColor }
  }, [exportCustomize, exportBgColor, exportPrimaryColor])

  const handleExportPNG = useCallback(async () => {
    try {
      await exportPNG(getFullState(), undefined, getExportOptions())
      addToast({ type: 'success', message: 'PNG exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [getFullState, getExportOptions, addToast])

  const handleCopyPNG = useCallback(async () => {
    try {
      await copyPNGToClipboard(getFullState(), getExportOptions())
      addToast({ type: 'success', message: 'Copied to clipboard' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Copy failed' })
    }
    setShowExport(false)
  }, [getFullState, getExportOptions, addToast])

  const handleExportSVG = useCallback(async () => {
    try {
      await exportSVG(getFullState(), undefined, getExportOptions())
      addToast({ type: 'success', message: 'SVG exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [getFullState, getExportOptions, addToast])

  const handleExportJSON = useCallback(() => {
    try {
      exportJSON(getFullState())
      addToast({ type: 'success', message: 'JSON saved successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [getFullState, addToast])

  const handleExportCSV = useCallback(() => {
    try {
      exportCSV(getFullState())
      addToast({ type: 'success', message: 'CSV exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [getFullState, addToast])

  // ── Import JSON handler ───────────────────────────────────
  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const state = importJSON(reader.result as string)
        store.loadDiagram(state)
        triggerFitToContent()
        addToast({ type: 'success', message: `Loaded ${state.nodes.length} people` })
      } catch (err) {
        addToast({ type: 'error', message: err instanceof Error ? err.message : 'Invalid JSON file' })
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [store, addToast])

  // ── Template handler ──────────────────────────────────────
  const handleSelectTemplate = useCallback((templateIdx: number) => {
    const template = TEMPLATES[templateIdx]
    if (!template) return
    store.loadDiagram(template.build())
    triggerFitToContent()
    setShowTemplates(false)
    addToast({ type: 'success', message: `Loaded "${template.name}" template (${template.nodeCount} people)` })
  }, [store, addToast])

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Toolbar
        store={store}
        onExport={() => setShowExport(true)}
        onImportJSON={() => fileInputRef.current?.click()}
        onTemplates={() => setShowTemplates(true)}
        onConnectorTypes={() => setShowConnectorTypes(true)}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
      />

      {/* Main area: Canvas | VersionsPanel | PropertiesPanel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Canvas store={store} />

          {/* Connect mode banner + type picker popover */}
          <ConnectModeBanner store={store} />
          <ConnectorTypePopover store={store} />

          {/* Floating zoom buttons for touch / tablet */}
          <div className="absolute bottom-3 left-3 flex items-center gap-0.5 bg-dark-elevated/80 rounded-lg border border-white/[0.06] p-0.5">
            <button
              onClick={() => store.setViewport(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.25) }))}
              title="Zoom in"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => store.setViewport(prev => ({ ...prev, zoom: Math.max(0.25, prev.zoom - 0.25) }))}
              title="Zoom out"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => store.setViewport(prev => ({ ...prev, zoom: 1 }))}
              title="Reset zoom"
              className="text-xs text-white/40 hover:text-white/80 px-1.5 py-0.5 rounded hover:bg-white/[0.06] tabular-nums"
            >
              {Math.round(store.viewport.zoom * 100)}%
            </button>
          </div>

          {/* Versions panel */}
          {showVersions && (
            <div className="absolute right-0 top-0 w-72 max-h-[calc(100%-12px)] overflow-y-auto bg-dark-elevated border border-white/10 rounded-lg shadow-xl z-50 p-3 m-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Version History</h3>
                <button
                  onClick={() => {
                    const name = prompt('Version name:', `Version ${versions.length + 1}`)
                    if (name) {
                      store.saveVersion(name)
                      setVersionRefresh(v => v + 1)
                    }
                  }}
                  className="text-xs px-2 py-1 bg-[#14B8A6] text-white rounded hover:bg-[#14B8A6]/80 transition-colors"
                >
                  Save Current
                </button>
              </div>
              {versions.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">No saved versions yet</p>
              ) : (
                <div className="space-y-2">
                  {versions.map(v => (
                    <div key={v.id} className="p-2 rounded bg-white/[0.03] border border-white/[0.06] group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white truncate">{v.name}</span>
                        <span className="text-[10px] text-white/30">{v.nodeCount} people</span>
                      </div>
                      <div className="text-[10px] text-white/30 mt-0.5">
                        {new Date(v.timestamp).toLocaleDateString()} {new Date(v.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            if (confirm('Restore this version? Current chart will be replaced.')) {
                              store.restoreVersion(v.id)
                              triggerFitToContent()
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            const newName = prompt('Rename version:', v.name)
                            if (newName) {
                              store.renameVersion(v.id, newName)
                              setVersionRefresh(ver => ver + 1)
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50 rounded hover:bg-white/10 transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this version?')) {
                              store.deleteVersion(v.id)
                              setVersionRefresh(ver => ver + 1)
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state overlay */}
          {store.nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center space-y-3 pointer-events-auto">
                <p className="text-sm text-white/30">Start by clicking "Add Person" or pick a template</p>
              </div>
            </div>
          )}
        </div>

        <PropertiesPanel store={store} />
      </div>

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />

      {/* ── Export modal ──────────────────────────────── */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Org Chart" width="sm">
        <div className="space-y-2">
          {/* Customize colors disclosure — applies to PNG + SVG + Copy. */}
          <button
            type="button"
            onClick={() => setExportCustomize(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded transition-colors"
            data-testid="export-customize-toggle"
          >
            {exportCustomize ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Customize colors</span>
            {exportCustomize && (
              <span className="ml-auto text-[9px] text-white/30 uppercase tracking-wide">Applies to PNG · Copy · SVG</span>
            )}
          </button>
          {exportCustomize && (
            <div className="px-3 pt-1 pb-3 space-y-3 bg-white/[0.02] rounded-md border border-white/[0.06]">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-white/50 mb-1.5">Background</label>
                <ColorPicker value={exportBgColor} onChange={setExportBgColor} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-white/50 mb-1.5">Primary line color</label>
                <ColorPicker value={exportPrimaryColor} onChange={setExportPrimaryColor} />
              </div>
              <p className="text-[10px] text-white/40 leading-snug">
                Secondary connector types (dotted-line, supports, collaborates) keep
                their own colors so relationship meaning stays clear.
              </p>
            </div>
          )}
          <ExportButton
            icon={ImageIcon}
            label="Export as PNG"
            description="High-resolution raster image (2x scale)"
            onClick={handleExportPNG}
            disabled={store.nodes.length === 0}
          />
          <ExportButton
            icon={Clipboard}
            label="Copy as PNG"
            description="Copy diagram image to clipboard"
            onClick={handleCopyPNG}
            disabled={store.nodes.length === 0}
          />
          <ExportButton
            icon={FileCode}
            label="Export as SVG"
            description="Scalable vector graphic with avatars"
            onClick={handleExportSVG}
            disabled={store.nodes.length === 0}
          />
          <ExportButton
            icon={FileJson}
            label="Save as JSON"
            description="Re-importable diagram data"
            onClick={handleExportJSON}
            disabled={store.nodes.length === 0}
          />
          <ExportButton
            icon={FileSpreadsheet}
            label="Export as CSV"
            description="Spreadsheet-compatible format"
            onClick={handleExportCSV}
            disabled={store.nodes.length === 0}
          />
        </div>
      </Modal>

      {/* ── Templates modal ──────────────────────────── */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Templates" width="md">
        <div className="space-y-2">
          {TEMPLATES.map((t, i) => (
            <TemplateCard
              key={t.name}
              name={t.name}
              description={t.description}
              nodeCount={t.nodeCount}
              onClick={() => handleSelectTemplate(i)}
            />
          ))}
        </div>
      </Modal>

      {/* ── Connector Types modal ──────────────────────── */}
      <ConnectorTypesModal
        store={store}
        isOpen={showConnectorTypes}
        onClose={() => setShowConnectorTypes(false)}
      />
    </div>
  )
}

// ── Export button row ────────────────────────────────────────

function ExportButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: typeof ImageIcon
  label: string
  description: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
        ${disabled
          ? 'opacity-30 pointer-events-none'
          : 'hover:bg-white/[0.04]'
        }
      `}
    >
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-white/40" />
      </div>
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-[10px] text-white/30">{description}</p>
      </div>
    </button>
  )
}

// ── Template card ────────────────────────────────────────────

function TemplateCard({
  name,
  description,
  nodeCount,
  onClick,
}: {
  name: string
  description: string
  nodeCount: number
  onClick: () => void
}) {
  // Slug from the name so e2e can target a specific card deterministically.
  const testId = `template-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center flex-shrink-0">
        <Users size={14} className="text-[#14B8A6]" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{name}</p>
        <p className="text-[10px] text-white/30">{description}</p>
      </div>
      <span className="text-[10px] text-white/20">{nodeCount} people</span>
    </button>
  )
}
