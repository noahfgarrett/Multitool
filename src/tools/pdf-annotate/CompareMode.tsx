import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Upload, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Layers,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import '@/utils/pdfWorkerSetup.ts'

// ── Types ──────────────────────────────────────────────

interface CompareModeProps {
  onClose: () => void
}

type CompareView = 'side-by-side' | 'overlay' | 'diff'

interface LoadedPdf {
  doc: pdfjsLib.PDFDocumentProxy
  name: string
}

// ── Helpers ────────────────────────────────────────────

async function loadPdfFromFile(file: File): Promise<LoadedPdf> {
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise
  return { doc, name: file.name }
}

async function renderPageToCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({ canvasContext: ctx, viewport }).promise
}

function computePixelDiff(
  imgA: ImageData,
  imgB: ImageData,
  output: ImageData,
  threshold: number,
): void {
  const len = imgA.data.length
  for (let i = 0; i < len; i += 4) {
    const rA = imgA.data[i]
    const gA = imgA.data[i + 1]
    const bA = imgA.data[i + 2]
    const rB = imgB.data[i]
    const gB = imgB.data[i + 1]
    const bB = imgB.data[i + 2]

    const dr = Math.abs(rA - rB)
    const dg = Math.abs(gA - gB)
    const db = Math.abs(bA - bB)
    const diff = dr + dg + db

    if (diff > threshold) {
      const brightnessA = rA + gA + bA
      const brightnessB = rB + gB + bB
      if (brightnessB > brightnessA) {
        // New content (brighter in revised) → red
        output.data[i] = 220
        output.data[i + 1] = 40
        output.data[i + 2] = 40
        output.data[i + 3] = 200
      } else {
        // Removed content (brighter in original) → blue
        output.data[i] = 40
        output.data[i + 1] = 80
        output.data[i + 2] = 220
        output.data[i + 3] = 200
      }
    } else {
      // Identical — show faded grayscale
      const gray = Math.round((rA + gA + bA) / 3)
      output.data[i] = gray
      output.data[i + 1] = gray
      output.data[i + 2] = gray
      output.data[i + 3] = 255
    }
  }
}

// ── Component ──────────────────────────────────────────

export function CompareMode({ onClose }: CompareModeProps): React.ReactNode {
  const [view, setView] = useState<CompareView>('side-by-side')
  const [originalPdf, setOriginalPdf] = useState<LoadedPdf | null>(null)
  const [revisedPdf, setRevisedPdf] = useState<LoadedPdf | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leftCanvasRef = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)
  const scrollContainerLeftRef = useRef<HTMLDivElement>(null)
  const scrollContainerRightRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  const totalPages = Math.max(
    originalPdf?.doc.numPages ?? 0,
    revisedPdf?.doc.numPages ?? 0,
  )

  const bothLoaded = originalPdf !== null && revisedPdf !== null

  // ── File handling ──────────────────────────────────

  const handleFileDrop = useCallback(
    async (file: File, target: 'original' | 'revised') => {
      if (file.type !== 'application/pdf') {
        setError('Please drop a PDF file.')
        return
      }
      setError(null)
      setIsLoading(true)
      try {
        const loaded = await loadPdfFromFile(file)
        if (target === 'original') {
          setOriginalPdf(loaded)
        } else {
          setRevisedPdf(loaded)
        }
        setCurrentPage(1)
      } catch {
        setError(`Failed to load ${target} PDF.`)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const handleDrop = useCallback(
    (target: 'original' | 'revised') =>
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) void handleFileDrop(file, target)
      },
    [handleFileDrop],
  )

  const handleFileInput = useCallback(
    (target: 'original' | 'revised') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) void handleFileDrop(file, target)
      },
    [handleFileDrop],
  )

  // ── Render pages ───────────────────────────────────

  useEffect(() => {
    if (!bothLoaded) return

    let cancelled = false

    async function render(): Promise<void> {
      if (!originalPdf || !revisedPdf) return

      if (view === 'side-by-side') {
        const leftCanvas = leftCanvasRef.current
        const rightCanvas = rightCanvasRef.current
        if (!leftCanvas || !rightCanvas) return

        if (currentPage <= originalPdf.doc.numPages) {
          await renderPageToCanvas(originalPdf.doc, currentPage, leftCanvas, scale)
        } else {
          leftCanvas.width = 100
          leftCanvas.height = 100
          const ctx = leftCanvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#1a1a2e'
            ctx.fillRect(0, 0, 100, 100)
          }
        }
        if (cancelled) return

        if (currentPage <= revisedPdf.doc.numPages) {
          await renderPageToCanvas(revisedPdf.doc, currentPage, rightCanvas, scale)
        } else {
          rightCanvas.width = 100
          rightCanvas.height = 100
          const ctx = rightCanvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#1a1a2e'
            ctx.fillRect(0, 0, 100, 100)
          }
        }
      } else if (view === 'overlay') {
        const canvas = overlayCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Render original to offscreen
        const offA = document.createElement('canvas')
        if (currentPage <= originalPdf.doc.numPages) {
          await renderPageToCanvas(originalPdf.doc, currentPage, offA, scale)
        }
        if (cancelled) return

        const offB = document.createElement('canvas')
        if (currentPage <= revisedPdf.doc.numPages) {
          await renderPageToCanvas(revisedPdf.doc, currentPage, offB, scale)
        }
        if (cancelled) return

        const w = Math.max(offA.width, offB.width)
        const h = Math.max(offA.height, offB.height)
        canvas.width = w
        canvas.height = h

        // Draw original normally
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(offA, 0, 0)

        // Draw revised with difference blending
        ctx.globalCompositeOperation = 'difference'
        ctx.drawImage(offB, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        // Diff mode
        const canvas = diffCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const offA = document.createElement('canvas')
        if (currentPage <= originalPdf.doc.numPages) {
          await renderPageToCanvas(originalPdf.doc, currentPage, offA, scale)
        }
        if (cancelled) return

        const offB = document.createElement('canvas')
        if (currentPage <= revisedPdf.doc.numPages) {
          await renderPageToCanvas(revisedPdf.doc, currentPage, offB, scale)
        }
        if (cancelled) return

        const w = Math.max(offA.width, offB.width)
        const h = Math.max(offA.height, offB.height)
        canvas.width = w
        canvas.height = h

        // Get pixel data from both (pad smaller to match)
        const ctxA = offA.getContext('2d')
        const ctxB = offB.getContext('2d')
        if (!ctxA || !ctxB) return

        // Ensure both offscreen canvases are the same size
        if (offA.width !== w || offA.height !== h) {
          const tmp = ctxA.getImageData(0, 0, offA.width, offA.height)
          offA.width = w
          offA.height = h
          ctxA.fillStyle = '#fff'
          ctxA.fillRect(0, 0, w, h)
          ctxA.putImageData(tmp, 0, 0)
        }
        if (offB.width !== w || offB.height !== h) {
          const tmp = ctxB.getImageData(0, 0, offB.width, offB.height)
          offB.width = w
          offB.height = h
          ctxB.fillStyle = '#fff'
          ctxB.fillRect(0, 0, w, h)
          ctxB.putImageData(tmp, 0, 0)
        }

        const imgA = ctxA.getImageData(0, 0, w, h)
        const imgB = ctxB.getImageData(0, 0, w, h)
        const output = ctx.createImageData(w, h)

        computePixelDiff(imgA, imgB, output, 30)
        ctx.putImageData(output, 0, 0)
      }
    }

    void render()
    return () => { cancelled = true }
  }, [bothLoaded, originalPdf, revisedPdf, currentPage, scale, view])

  // ── Synchronized scroll ────────────────────────────

  const handleScroll = useCallback(
    (source: 'left' | 'right') => () => {
      if (isSyncingScroll.current) return
      isSyncingScroll.current = true

      const from = source === 'left' ? scrollContainerLeftRef.current : scrollContainerRightRef.current
      const to = source === 'left' ? scrollContainerRightRef.current : scrollContainerLeftRef.current

      if (from && to) {
        to.scrollTop = from.scrollTop
        to.scrollLeft = from.scrollLeft
      }

      requestAnimationFrame(() => { isSyncingScroll.current = false })
    },
    [],
  )

  // ── Page navigation ────────────────────────────────

  function handlePrevPage(): void {
    setCurrentPage((p) => Math.max(1, p - 1))
  }

  function handleNextPage(): void {
    setCurrentPage((p) => Math.min(totalPages, p + 1))
  }

  // ── Zoom ───────────────────────────────────────────

  function handleZoomIn(): void {
    setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))
  }

  function handleZoomOut(): void {
    setScale((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))
  }

  // ── Upload zone ────────────────────────────────────

  function renderUploadZone(
    label: string,
    target: 'original' | 'revised',
    loaded: LoadedPdf | null,
  ): React.ReactNode {
    const inputId = `compare-file-${target}`

    if (loaded) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-[#14B8A6]/40 bg-[#14B8A6]/5 min-h-[180px]">
          <div className="text-sm font-medium text-[#14B8A6]">{label}</div>
          <div className="text-xs text-white/60 truncate max-w-[200px]">{loaded.name}</div>
          <div className="text-xs text-white/40">{loaded.doc.numPages} page{loaded.doc.numPages !== 1 ? 's' : ''}</div>
          <button
            type="button"
            onClick={() => {
              if (target === 'original') setOriginalPdf(null)
              else setRevisedPdf(null)
            }}
            className="mt-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove
          </button>
        </div>
      )
    }

    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop(target)}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-white/20 hover:border-[#14B8A6]/50 bg-white/[0.02] hover:bg-[#14B8A6]/5 transition-all cursor-pointer min-h-[180px]"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <Upload size={32} className="text-white/30" />
        <div className="text-sm font-medium text-white/70">{label}</div>
        <div className="text-xs text-white/40">Drop PDF here or click to browse</div>
        <input
          id={inputId}
          type="file"
          accept="application/pdf"
          onChange={handleFileInput(target)}
          className="hidden"
        />
      </div>
    )
  }

  // ── View mode tabs ─────────────────────────────────

  const VIEW_MODES: { value: CompareView; label: string }[] = [
    { value: 'side-by-side', label: 'Side-by-side' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'diff', label: 'Diff' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#00171F]">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.1] bg-[#00171F]/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#14B8A6]" />
            <h1 className="text-sm font-semibold text-white">Compare PDFs</h1>
          </div>

          {/* Mode toggle */}
          {bothLoaded && (
            <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setView(m.value)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${view === m.value
                      ? 'bg-[#14B8A6] text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }
                  `}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          {bothLoaded && (
            <div className="flex items-center gap-1 mr-2">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white/50 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          {/* Page navigation */}
          {bothLoaded && totalPages > 0 && (
            <div className="flex items-center gap-1 mr-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-white/50 min-w-[4rem] text-center">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-white/50">Loading PDF...</div>
          </div>
        )}

        {/* Upload zones — show when not both loaded */}
        {!bothLoaded && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-6 p-8">
              {renderUploadZone('Original PDF', 'original', originalPdf)}
              <div className="flex items-center">
                <div className="text-sm text-white/30 font-medium">vs</div>
              </div>
              {renderUploadZone('Revised PDF', 'revised', revisedPdf)}
            </div>
          </div>
        )}

        {/* Comparison views */}
        {bothLoaded && !isLoading && (
          <>
            {/* Side-by-side */}
            {view === 'side-by-side' && (
              <div className="flex h-full">
                {/* Left (original) */}
                <div className="flex-1 flex flex-col border-r border-white/[0.1]">
                  <div className="px-3 py-1.5 text-xs text-white/40 font-medium bg-white/[0.03] border-b border-white/[0.06]">
                    Original — {originalPdf.name}
                  </div>
                  <div
                    ref={scrollContainerLeftRef}
                    onScroll={handleScroll('left')}
                    className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#0a0f14]"
                  >
                    <canvas ref={leftCanvasRef} className="shadow-lg" />
                  </div>
                </div>

                {/* Right (revised) */}
                <div className="flex-1 flex flex-col">
                  <div className="px-3 py-1.5 text-xs text-white/40 font-medium bg-white/[0.03] border-b border-white/[0.06]">
                    Revised — {revisedPdf.name}
                  </div>
                  <div
                    ref={scrollContainerRightRef}
                    onScroll={handleScroll('right')}
                    className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#0a0f14]"
                  >
                    <canvas ref={rightCanvasRef} className="shadow-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* Overlay mode */}
            {view === 'overlay' && (
              <div className="h-full overflow-auto flex items-start justify-center p-4 bg-[#0a0f14]">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xs text-white/30">
                    Identical areas appear black — changes glow bright
                  </div>
                  <canvas ref={overlayCanvasRef} className="shadow-lg" />
                </div>
              </div>
            )}

            {/* Diff mode */}
            {view === 'diff' && (
              <div className="h-full overflow-auto flex items-start justify-center p-4 bg-[#0a0f14]">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-red-500/80" />
                      New / Added
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-blue-500/80" />
                      Removed
                    </span>
                  </div>
                  <canvas ref={diffCanvasRef} className="shadow-lg" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
