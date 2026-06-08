// src/tools/image-bg-remove/BgRemoveTool.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { readFileAsDataURL } from '@/utils/fileReader.ts'
import { loadImage, canvasToBlob } from '@/utils/imageProcessing.ts'
import { downloadBlob } from '@/utils/download.ts'
import { X } from 'lucide-react'
import { ControlPanel } from './ControlPanel'
import { Workspace } from './Workspace'
import { useMaskHistory } from './useMaskHistory'
import {
  removalFromColor, removalFromWand, combineMax, rasterizeStrokes, collectBgColors, applyMaskInto, renderMask,
} from './maskEngine'
import type { Tool, Point, PreviewBackground, BrushStroke, MaskDoc } from './types'

const PREVIEW_MAX_EDGE = 1600
const MAX_MEGAPIXELS = 64

interface BufferCache {
  data: Uint8ClampedArray
  width: number
  height: number
}

const yieldToUI = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/** Async full-res render with progress, reusing the engine pieces. */
async function renderMaskChunked(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  doc: MaskDoc,
  onProgress: (p: number) => void,
): Promise<Uint8ClampedArray> {
  const colorR = removalFromColor(src, width, height, doc.samples, doc.tolerance, doc.softness)
  onProgress(0.15)
  await yieldToUI()
  const scaledSeeds = doc.wandSeeds.map((s) => ({ x: s.x, y: s.y })) // scale = 1 at native res
  const wandR = removalFromWand(src, width, height, scaledSeeds, doc.tolerance, doc.softness)
  onProgress(0.4)
  await yieldToUI()
  const removal = combineMax(colorR, wandR)
  const manual = rasterizeStrokes(width, height, doc.strokes, 1)
  const bgColors = collectBgColors(src, width, height, doc.samples, scaledSeeds)
  onProgress(0.5)
  await yieldToUI()

  const out = new Uint8ClampedArray(src.length)
  const band = Math.max(1, Math.floor(height / 20))
  for (let y0 = 0; y0 < height; y0 += band) {
    const y1 = Math.min(height, y0 + band)
    applyMaskInto(out, src, width, removal, manual, bgColors, doc.defringe, y0, y1)
    onProgress(0.5 + 0.5 * (y1 / height))
    await yieldToUI()
  }
  return out
}

export default function BgRemoveTool() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('wand')
  const [brushSize, setBrushSize] = useState(40)
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('checkerboard')
  const [showOriginal, setShowOriginal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })
  const [previewReady, setPreviewReady] = useState(false)
  const [renderVersion, setRenderVersion] = useState(0)

  const history = useMaskHistory()
  const { doc } = history
  const docRef = useRef(doc)
  docRef.current = doc

  const nativeRef = useRef<BufferCache | null>(null)
  const previewRef = useRef<(BufferCache & { scale: number }) | null>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // ── Live preview (rAF-coalesced) ──
  // The guard coalesces bursts of doc changes into one render per frame; the
  // rAF reads docRef so it always renders the LATEST doc, never a stale closure.
  useEffect(() => {
    if (!previewReady) return
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pv = previewRef.current
      const masked = maskedCanvasRef.current
      if (!pv || !masked) return
      const out = renderMask(pv.data, pv.width, pv.height, docRef.current, pv.scale)
      masked.getContext('2d')!.putImageData(new ImageData(out, pv.width, pv.height), 0, 0)
      setRenderVersion((v) => v + 1)
    })
  }, [doc, previewReady])

  // Cancel any pending preview render on unmount only.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  const resetCaches = useCallback(() => {
    nativeRef.current = null
    previewRef.current = null
    originalCanvasRef.current = null
    maskedCanvasRef.current = null
    setPreviewReady(false)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError(null)
    setOutputSize(null)
    setShowOriginal(false)
    setTool('wand')
    try {
      const dataUrl = await readFileAsDataURL(file)
      const img = await loadImage(dataUrl)
      let nw = img.naturalWidth
      let nh = img.naturalHeight
      setOriginalSize({ width: nw, height: nh })

      let capNote = false
      if (nw * nh > MAX_MEGAPIXELS * 1_000_000) {
        const f = Math.sqrt((MAX_MEGAPIXELS * 1_000_000) / (nw * nh))
        nw = Math.round(nw * f)
        nh = Math.round(nh * f)
        capNote = true
      }

      // native working buffer
      const nativeCanvas = document.createElement('canvas')
      nativeCanvas.width = nw
      nativeCanvas.height = nh
      const nctx = nativeCanvas.getContext('2d', { willReadFrequently: true })!
      nctx.drawImage(img, 0, 0, nw, nh)
      nativeRef.current = { data: nctx.getImageData(0, 0, nw, nh).data, width: nw, height: nh }

      // preview buffer
      const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(nw, nh))
      const pw = Math.max(1, Math.round(nw * scale))
      const ph = Math.max(1, Math.round(nh * scale))
      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = pw
      previewCanvas.height = ph
      const pctx = previewCanvas.getContext('2d', { willReadFrequently: true })!
      pctx.imageSmoothingEnabled = true
      pctx.imageSmoothingQuality = 'high'
      pctx.drawImage(img, 0, 0, pw, ph)
      previewRef.current = { data: pctx.getImageData(0, 0, pw, ph).data, width: pw, height: ph, scale: pw / nw }
      originalCanvasRef.current = previewCanvas

      const masked = document.createElement('canvas')
      masked.width = pw
      masked.height = ph
      // seed masked with the original so first paint isn't blank
      masked.getContext('2d')!.drawImage(previewCanvas, 0, 0)
      maskedCanvasRef.current = masked

      history.clear()
      setImageFile(file)
      setPreviewReady(true)
      setError(capNote ? `Image is very large — processing capped at ~${MAX_MEGAPIXELS} MP.` : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load image: ${msg}`)
      setImageFile(null)
      resetCaches()
    }
  }, [history, resetCaches])

  const handlePickColor = useCallback((p: Point) => {
    const nd = nativeRef.current
    if (!nd) return
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (x < 0 || y < 0 || x >= nd.width || y >= nd.height) return
    const i = (y * nd.width + x) * 4
    history.addSample({ r: nd.data[i], g: nd.data[i + 1], b: nd.data[i + 2] })
  }, [history])

  const handleWandClick = useCallback((p: Point) => {
    const nd = nativeRef.current
    if (!nd) return
    if (p.x < 0 || p.y < 0 || p.x >= nd.width || p.y >= nd.height) return
    history.addWandSeed({ x: p.x, y: p.y })
  }, [history])

  const handleStroke = useCallback((stroke: BrushStroke) => {
    history.addStroke(stroke)
  }, [history])

  const handleExport = useCallback(async () => {
    const nd = nativeRef.current
    if (!nd || !imageFile) return
    setIsExporting(true)
    setExportProgress(0)
    setError(null)
    try {
      const out = await renderMaskChunked(nd.data, nd.width, nd.height, doc, setExportProgress)
      const canvas = document.createElement('canvas')
      canvas.width = nd.width
      canvas.height = nd.height
      canvas.getContext('2d')!.putImageData(new ImageData(out, nd.width, nd.height), 0, 0)
      const blob = await canvasToBlob(canvas, 'image/png', 1)
      setOutputSize(blob.size)
      const baseName = imageFile.name.replace(/\.[^.]+$/, '')
      downloadBlob(blob, `${baseName}-nobg.png`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [doc, imageFile])

  const handleLoadNew = useCallback(() => {
    setImageFile(null)
    setOutputSize(null)
    history.clear()
    resetCaches()
  }, [history, resetCaches])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!imageFile) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        history.redo()
        return
      }
      if (typing || mod) return
      switch (e.key.toLowerCase()) {
        case 'w': setTool('wand'); break
        case 'i': setTool('picker'); break
        case 'e': setTool('erase'); break
        case 'r': setTool('restore'); break
        case '[': setBrushSize((s) => Math.max(2, s - 4)); break
        case ']': setBrushSize((s) => Math.min(300, s + 4)); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imageFile, history])

  if (!imageFile) {
    return (
      <div className="h-full flex flex-col gap-4">
        <FileDropZone
          onFiles={handleFiles}
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          multiple={false}
          label="Drop an image here"
          description="PNG, JPEG, WebP, GIF, or BMP"
          className="h-full"
        />
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 rounded text-red-400/60 hover:text-red-400 transition-colors" aria-label="Dismiss error">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex gap-6">
      <ControlPanel
        tool={tool}
        onToolChange={setTool}
        doc={doc}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onRemoveSample={history.removeSample}
        onSliderChange={history.setSlider}
        onSliderGestureStart={history.beginGesture}
        onSliderGestureEnd={history.endGesture}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onReset={history.reset}
        onExport={handleExport}
        onLoadNew={handleLoadNew}
        isExporting={isExporting}
        exportProgress={exportProgress}
        outputSize={outputSize}
        originalSize={originalSize}
        fileSize={imageFile.size}
        previewBg={previewBg}
        onPreviewBgChange={setPreviewBg}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((s) => !s)}
        error={error}
        onDismissError={() => setError(null)}
      />
      {previewReady && originalCanvasRef.current && maskedCanvasRef.current && (
        <Workspace
          originalCanvas={originalCanvasRef.current}
          maskedCanvas={maskedCanvasRef.current}
          imageWidth={nativeRef.current!.width}
          imageHeight={nativeRef.current!.height}
          tool={tool}
          brushSize={brushSize}
          previewBg={previewBg}
          showOriginal={showOriginal}
          renderVersion={renderVersion}
          onPickColor={handlePickColor}
          onWandClick={handleWandClick}
          onStroke={handleStroke}
        />
      )}
    </div>
  )
}
