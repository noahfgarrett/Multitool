import { useState, useEffect, useCallback, useRef } from 'react'
import { useFlowchartStore } from './flowchartStore.ts'
import { Canvas } from './Canvas.tsx'
import { Toolbar } from './Toolbar.tsx'
import { ShapeLibrary } from './ShapeLibrary.tsx'
import { PropertiesPanel } from './PropertiesPanel.tsx'
import { Minimap } from './Minimap.tsx'
import { FindReplace } from './FindReplace.tsx'
import { attachShortcuts } from './shortcuts.ts'
import { exportPNG, exportSVG, exportSVGString, exportJSON, exportPDF, importJSON, copyPNGToClipboard } from './export.ts'
import { importFromText, TEMPLATES } from './textImport.ts'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import type { PdfPageSize, DiagramLayer } from './types.ts'
import {
  Upload, FileJson, Image as ImageIcon, FileCode, ChevronDown, Clipboard,
  FileText, Plus, Eye, EyeOff, Lock, Unlock, Trash2, X,
} from 'lucide-react'

// ── Component ───────────────────────────────────────────────

export default function FlowchartTool() {
  const store = useFlowchartStore()
  const { addToast } = useAppStore()

  // ── Export modal ────────────────────────────────────────
  const [showExport, setShowExport] = useState(false)
  const [showImportText, setShowImportText] = useState(false)
  const [importText, setImportText] = useState(TEMPLATES[1].text)
  const [showTemplates, setShowTemplates] = useState(false)
  const [pdfPageSize, setPdfPageSize] = useState<PdfPageSize>('auto')
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Page tab context menu ──────────────────────────────
  const [pageContextMenu, setPageContextMenu] = useState<{
    pageId: string
    x: number
    y: number
  } | null>(null)
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null)

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    return attachShortcuts(
      store,
      () => setShowExport(true),
      () => setShowFindReplace(prev => !prev),
    )
  }, [store])

  // Close page context menu on click outside
  useEffect(() => {
    if (!pageContextMenu) return
    const handler = () => setPageContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [pageContextMenu])

  // ── Export handlers ─────────────────────────────────────
  const handleExportPNG = useCallback(async () => {
    try {
      await exportPNG(store.nodes, store.edges)
      addToast({ type: 'success', message: 'PNG exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [store.nodes, store.edges, addToast])

  const handleExportSVG = useCallback(() => {
    try {
      exportSVG(store.nodes, store.edges)
      addToast({ type: 'success', message: 'SVG exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [store.nodes, store.edges, addToast])

  const handleExportJSON = useCallback(() => {
    try {
      exportJSON(store.nodes, store.edges)
      addToast({ type: 'success', message: 'JSON saved successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [store.nodes, store.edges, addToast])

  const handleExportPDF = useCallback(async () => {
    try {
      await exportPDF(store.nodes, store.edges, pdfPageSize)
      addToast({ type: 'success', message: 'PDF exported successfully' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    }
    setShowExport(false)
  }, [store.nodes, store.edges, pdfPageSize, addToast])

  const handleCopyPNG = useCallback(async () => {
    try {
      await copyPNGToClipboard(store.nodes, store.edges)
      addToast({ type: 'success', message: 'Copied to clipboard' })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Copy failed' })
    }
    setShowExport(false)
  }, [store.nodes, store.edges, addToast])

  // ── Print handler ──────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (store.nodes.length === 0) {
      addToast({ type: 'error', message: 'Nothing to print' })
      return
    }

    // Generate SVG with white background for printing
    const svgString = exportSVGString(store.nodes, store.edges, '#ffffff')

    // Determine orientation
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of store.nodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x + n.width)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y + n.height)
    }
    const isLandscape = (maxX - minX) > (maxY - minY)
    const orientation = isLandscape ? 'landscape' : 'portrait'

    // Create a print-specific iframe
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '-9999px'
    iframe.style.width = '0'
    iframe.style.height = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) {
      document.body.removeChild(iframe)
      addToast({ type: 'error', message: 'Failed to open print dialog' })
      return
    }

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Flowchart Print</title>
          <style>
            @page { size: ${orientation}; margin: 0.5in; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            svg { max-width: 100%; max-height: 100vh; }
          </style>
        </head>
        <body>${svgString}</body>
      </html>
    `)
    doc.close()

    // Wait for iframe to load, then print
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print()
      } catch {
        addToast({ type: 'error', message: 'Print dialog blocked by browser' })
      }
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }
  }, [store.nodes, store.edges, addToast])

  // ── Import handlers ─────────────────────────────────────
  const handleImportText = useCallback(() => {
    try {
      const state = importFromText(importText)
      store.loadDiagram(state)
      store.fitToContent()
      setShowImportText(false)
      addToast({ type: 'success', message: `Imported ${state.nodes.length} nodes` })
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Import failed' })
    }
  }, [importText, store, addToast])

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const state = importJSON(reader.result as string)
        store.loadDiagram(state)
        store.fitToContent()
        addToast({ type: 'success', message: `Loaded ${state.nodes.length} nodes` })
      } catch (err) {
        addToast({ type: 'error', message: err instanceof Error ? err.message : 'Invalid JSON file' })
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [store, addToast])

  // ── Template categories ────────────────────────────────
  const generalTemplates = TEMPLATES.filter(t => t.category === 'general')
  const constructionTemplates = TEMPLATES.filter(t => t.category === 'construction')

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Toolbar
        store={store}
        onExport={() => setShowExport(true)}
        onImportText={() => setShowImportText(true)}
        onPrint={handlePrint}
      />

      {/* Main area: ShapeLibrary | Canvas+Layers | PropertiesPanel */}
      <div className="flex-1 flex overflow-hidden">
        <ShapeLibrary store={store} />

        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <Canvas store={store} />

            {/* Minimap (Agent B) */}
            <Minimap store={store} />

            {/* Find & Replace (Agent B) */}
            {showFindReplace && (
              <FindReplace store={store} onClose={() => setShowFindReplace(false)} />
            )}

            {/* Empty state overlay */}
            {store.nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-center space-y-3 pointer-events-auto">
                  <p className="text-sm text-white/30">Start by placing shapes from the left panel</p>
                  <p className="text-xs text-white/20">or</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Upload size={12} />}
                      onClick={() => setShowImportText(true)}
                    >
                      Import from Text
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FileJson size={12} />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Load JSON
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Layer panel toggle button */}
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className={`
                absolute bottom-12 right-3 px-2 py-1 rounded text-[10px] font-medium transition-colors z-10
                ${showLayerPanel
                  ? 'bg-[#F47B20]/20 text-[#F47B20]'
                  : 'bg-dark-elevated/80 text-white/40 hover:text-white'
                }
              `}
            >
              Layers
            </button>

            {/* Layer panel overlay */}
            {showLayerPanel && (
              <LayerPanel
                layers={store.layers}
                onAddLayer={store.addLayer}
                onUpdateLayer={store.updateLayer}
                onDeleteLayer={store.deleteLayer}
                onClose={() => setShowLayerPanel(false)}
              />
            )}
          </div>

          {/* Page tabs bar */}
          <div className="flex items-center gap-0.5 px-2 py-1 bg-dark-elevated border-t border-white/[0.06] overflow-x-auto flex-shrink-0">
            {store.pages.map(page => (
              <button
                key={page.id}
                onClick={() => store.switchPage(page.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setPageContextMenu({ pageId: page.id, x: e.clientX, y: e.clientY })
                }}
                onDoubleClick={() => setRenamingPageId(page.id)}
                className={`
                  px-3 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap
                  ${store.activePageId === page.id
                    ? 'bg-[#F47B20]/15 text-[#F47B20]'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                  }
                `}
              >
                {renamingPageId === page.id ? (
                  <input
                    autoFocus
                    type="text"
                    defaultValue={page.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      store.renamePage(page.id, e.target.value || page.name)
                      setRenamingPageId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setRenamingPageId(null)
                    }}
                    className="w-16 px-1 py-0 bg-dark-surface border border-[#F47B20]/40 rounded text-[10px] text-white outline-none"
                  />
                ) : (
                  page.name
                )}
              </button>
            ))}
            <button
              onClick={store.addPage}
              className="px-1.5 py-1 text-white/25 hover:text-white/50 transition-colors"
              title="Add page"
            >
              <Plus size={12} />
            </button>
          </div>
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

      {/* Page tab context menu */}
      {pageContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPageContextMenu(null)} />
          <div
            className="fixed z-50 bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden py-1 min-w-[120px]"
            style={{ left: pageContextMenu.x, top: pageContextMenu.y - 60 }}
          >
            <button
              onClick={() => {
                setRenamingPageId(pageContextMenu.pageId)
                setPageContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => {
                store.deletePage(pageContextMenu.pageId)
                setPageContextMenu(null)
              }}
              disabled={store.pages.length <= 1}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* ── Export modal ──────────────────────────────── */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Diagram" width="sm">
        <div className="space-y-2">
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
            description="Scalable vector graphic"
            onClick={handleExportSVG}
            disabled={store.nodes.length === 0}
          />

          {/* PDF export with page size selector */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden">
            <ExportButton
              icon={FileText}
              label="Export as PDF"
              description="Print-ready document"
              onClick={handleExportPDF}
              disabled={store.nodes.length === 0}
            />
            {store.nodes.length > 0 && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <span className="text-[10px] text-white/30">Page size:</span>
                <select
                  value={pdfPageSize}
                  onChange={e => setPdfPageSize(e.target.value as PdfPageSize)}
                  className="px-2 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white/60 focus:outline-none"
                >
                  <option value="auto">Auto (fit content)</option>
                  <option value="letter">Letter (8.5 x 11)</option>
                  <option value="tabloid">Tabloid (11 x 17)</option>
                  <option value="a4">A4 (210 x 297mm)</option>
                </select>
              </div>
            )}
          </div>

          <ExportButton
            icon={FileJson}
            label="Save as JSON"
            description="Re-importable diagram data"
            onClick={handleExportJSON}
            disabled={store.nodes.length === 0}
          />
        </div>
      </Modal>

      {/* ── Import from Text modal ────────────────────── */}
      <Modal open={showImportText} onClose={() => setShowImportText(false)} title="Import from Text" width="lg">
        <div className="space-y-3">
          {/* Syntax guide */}
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/40 space-y-1">
            <p><span className="text-green-400/60">START</span> — Start node</p>
            <p><span className="text-white/60">Plain text</span> — Process step</p>
            <p><span className="text-[#F47B20]/60">IF</span> — Decision (diamond)</p>
            <p><span className="text-[#F47B20]/60">THEN / YES</span> — Yes branch</p>
            <p><span className="text-[#F47B20]/60">OR / NO / ELSE</span> — No branch</p>
            <p><span className="text-red-400/60">END</span> — End node</p>
          </div>

          {/* Template dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:border-white/[0.15] transition-colors"
            >
              Templates <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
                {/* General category */}
                <div className="px-3 py-1.5 text-[9px] font-semibold text-white/25 uppercase tracking-wider border-b border-white/[0.06]">
                  General
                </div>
                {generalTemplates.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setImportText(t.text); setShowTemplates(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
                {/* Construction category */}
                <div className="px-3 py-1.5 text-[9px] font-semibold text-white/25 uppercase tracking-wider border-t border-b border-white/[0.06]">
                  Construction
                </div>
                {constructionTemplates.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setImportText(t.text); setShowTemplates(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text input */}
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={10}
            placeholder="Type your flowchart here..."
            className="w-full px-3 py-2 text-sm bg-dark-surface border border-white/[0.1] rounded-lg text-white font-mono leading-relaxed resize-none focus:outline-none focus:border-[#F47B20]/40"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowImportText(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImportText}>
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Layer panel ──────────────────────────────────────────────

function LayerPanel({
  layers,
  onAddLayer,
  onUpdateLayer,
  onDeleteLayer,
  onClose,
}: {
  layers: DiagramLayer[]
  onAddLayer: (name: string) => void
  onUpdateLayer: (id: string, updates: Partial<DiagramLayer>) => void
  onDeleteLayer: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute bottom-12 right-3 w-[200px] bg-dark-surface border border-white/[0.1] rounded-lg shadow-xl z-20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Layers</span>
        <button onClick={onClose} className="text-white/25 hover:text-white/50 transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="max-h-[200px] overflow-y-auto">
        {layers.map(layer => (
          <div
            key={layer.id}
            className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/[0.03] transition-colors"
          >
            <button
              onClick={() => onUpdateLayer(layer.id, { isVisible: !layer.isVisible })}
              className="text-white/30 hover:text-white/60 transition-colors"
              title={layer.isVisible ? 'Hide layer' : 'Show layer'}
            >
              {layer.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              onClick={() => onUpdateLayer(layer.id, { isLocked: !layer.isLocked })}
              className="text-white/30 hover:text-white/60 transition-colors"
              title={layer.isLocked ? 'Unlock layer' : 'Lock layer'}
            >
              {layer.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <span className="flex-1 text-[11px] text-white/60 truncate">{layer.name}</span>
            {layer.id !== 'default' && (
              <button
                onClick={() => onDeleteLayer(layer.id)}
                className="text-white/20 hover:text-red-400 transition-colors"
                title="Delete layer"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="px-2 py-1.5 border-t border-white/[0.06]">
        <button
          onClick={() => {
            const name = `Layer ${layers.length + 1}`
            onAddLayer(name)
          }}
          className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded transition-colors"
        >
          <Plus size={10} /> Add Layer
        </button>
      </div>
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
