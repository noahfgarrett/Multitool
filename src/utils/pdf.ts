/**
 * Browser-adapted PDF utilities for Multitool.
 * Uses pdfjs-dist for rendering and pdf-lib for manipulation.
 * No Electron/filesystem dependencies - works entirely with File objects and Uint8Arrays.
 */

import { PDFDocument, PDFDict, PDFName, PDFHexString, PDFArray, PDFNumber, PDFRef, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist'
import type { PDFFile, PDFPage, PageRangeValidation } from '@/types'

// Centralized PDF.js worker setup (side-effect import)
import '@/utils/pdfWorkerSetup.ts'

// Simple LRU cache for loaded PDF.js documents (max 10)
interface CachedDoc {
  doc: pdfjsLib.PDFDocumentProxy
  lastAccess: number
}

const docCache = new Map<string, CachedDoc>()
const MAX_CACHE_SIZE = 10

function evictOldest() {
  if (docCache.size <= MAX_CACHE_SIZE) return
  let oldestKey: string | null = null
  let oldestTime = Infinity
  for (const [key, val] of docCache) {
    if (val.lastAccess < oldestTime) {
      oldestTime = val.lastAccess
      oldestKey = key
    }
  }
  if (oldestKey) {
    const old = docCache.get(oldestKey)
    old?.doc.destroy()
    docCache.delete(oldestKey)
  }
}

/** Get or load a pdfjs document from cache */
async function getCachedDoc(fileId: string, file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const cached = docCache.get(fileId)
  if (cached) {
    cached.lastAccess = Date.now()
    return cached.doc
  }

  // Cache miss — read bytes from disk, parse, cache, let bytes GC
  evictOldest()
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  docCache.set(fileId, { doc, lastAccess: Date.now() })
  return doc
}

export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Read raw bytes from a PDFFile's underlying File object.
 * Each call reads from disk — the returned Uint8Array is ephemeral.
 * Callers should let it GC after use (do not store in state).
 */
export async function getPDFBytes(pdfFile: PDFFile): Promise<Uint8Array> {
  const buffer = await pdfFile.file.arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Load a PDF file from a browser File object.
 * Returns metadata and a reference to the File (bytes are NOT retained in memory).
 */
export async function loadPDFFile(file: File, password?: string): Promise<PDFFile> {
  if (file.size === 0) {
    throw new Error('File is empty')
  }

  // Read bytes once for initial pdfjs parse, then let them GC.
  // pdfjs copies data to its worker internally.
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)

  const opts: { data: Uint8Array; password?: string } = { data }
  if (password) opts.password = password
  const doc = await pdfjsLib.getDocument(opts).promise
  const pageCount = doc.numPages

  if (pageCount === 0) {
    throw new Error('PDF has no pages')
  }

  const id = generateId()

  // Cache the document
  docCache.set(id, { doc, lastAccess: Date.now() })
  evictOldest()

  return {
    id,
    name: file.name,
    file,
    pageCount,
    size: file.size,
  }
}

/**
 * Generate a thumbnail for a specific page of a PDF.
 * Returns a data URL string.
 */
/** Encode canvas to a data URL, preferring WebP with JPEG fallback. */
export function canvasToThumbnailDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality)
  // If browser doesn't support WebP, toDataURL returns a PNG fallback
  if (webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/jpeg', quality)
}

export async function generateThumbnail(
  pdfFile: PDFFile,
  pageNumber: number,
  targetHeight: number = 200,
  quality: number = 0.7,
): Promise<string> {
  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)

  if (pageNumber < 1 || pageNumber > doc.numPages) {
    throw new Error(`Invalid page number ${pageNumber}`)
  }

  const page = await doc.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1.0 })
  const scale = Math.min(targetHeight / baseViewport.height, 0.5)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Failed to get canvas context')

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  await page.render({
    canvasContext: ctx,
    viewport,
    intent: 'display',
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
  }).promise
  const dataUrl = canvasToThumbnailDataUrl(canvas, quality)

  page.cleanup()
  canvas.width = 0
  canvas.height = 0

  return dataUrl
}

/**
 * Generate thumbnails for all pages of a PDF.
 * Returns an array of PDFPage objects with thumbnails.
 */
export async function generateAllThumbnails(
  pdfFile: PDFFile,
  targetHeight: number = 200,
  onProgress?: (current: number, total: number) => void,
): Promise<PDFPage[]> {
  const pages: PDFPage[] = []

  for (let i = 1; i <= pdfFile.pageCount; i++) {
    const thumbnail = await generateThumbnail(pdfFile, i, targetHeight)
    pages.push({
      id: `${pdfFile.id}-p${i}`,
      fileId: pdfFile.id,
      fileName: pdfFile.name,
      pageNumber: i,
      thumbnail,
    })
    onProgress?.(i, pdfFile.pageCount)
  }

  return pages
}

/**
 * Serializes concurrent renders targeting the same canvas. Without this,
 * racing renders on one canvas (triggered by zoom changes, rotation, or
 * IntersectionObserver re-entry while a previous render is in flight)
 * produce black pages — the second render clears the canvas while the first
 * is mid-draw — or upside-down pages — two viewport transforms composed, each
 * with its own Y-flip, cancelling out the intended flip.
 *
 * The generation counter closes the early-await window: a later caller bumps
 * the generation synchronously on entry, and every earlier caller checks its
 * own generation after each await. A stale generation aborts the earlier
 * caller with a cancellation-shaped error before it can touch the canvas.
 */
const activeRenderTasks = new WeakMap<HTMLCanvasElement, RenderTask>()
const renderGenerations = new WeakMap<HTMLCanvasElement, number>()

/**
 * Maximum total canvas pixel area for a single rendered page.
 *
 * Mirrors Mozilla's own pdf.js viewer behaviour (see
 * `pdfjs-dist/web/pdf_viewer.mjs` — `compatParams.set("maxCanvasPixels",
 * 5242880)`): iOS/Android WebKit caps a single `<canvas>` at ~5 MP before
 * the canvas becomes unusable. On iPad at high zoom the contents vanish
 * entirely without this cap.
 *
 * When a requested render scale would exceed the cap, we clamp the scale
 * down so the pixel buffer fits the limit. The CSS layout still shows the
 * content at the requested visual size — the clamped raster just gets
 * stretched by the parent `transform: scale(zoom)`. Text becomes
 * progressively blurrier at very high zoom instead of disappearing, which
 * is the exact tradeoff pdf.js's own viewer makes.
 */
const IS_IOS_OR_ANDROID = (() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const maxTouch = navigator.maxTouchPoints || 1
  const isIOS = /\b(iPad|iPhone|iPod)(?=;)/.test(ua)
    || (platform === 'MacIntel' && maxTouch > 1)
  const isAndroid = /Android/.test(ua)
  return isIOS || isAndroid
})()
const MAX_CANVAS_PIXELS = IS_IOS_OR_ANDROID ? 5_242_880 : 16_777_216

/**
 * Returns the largest render scale that will keep a page's pixel buffer
 * under MAX_CANVAS_PIXELS. Callers should clamp their requested scale with
 * this value so downstream coordinate math (stored in pageRenderScaleRef,
 * used by hit-testing and drawing) agrees with what was actually rendered.
 */
export function getMaxRenderScale(naturalWidth: number, naturalHeight: number): number {
  const area = naturalWidth * naturalHeight
  if (area <= 0) return Infinity
  return Math.sqrt(MAX_CANVAS_PIXELS / area)
}

/**
 * Matches pdf.js's RenderingCancelledException shape so the shared
 * isRenderingCancelled() check catches both.
 */
class StaleRenderError extends Error {
  override name = 'RenderingCancelledException'
  constructor() {
    super('Render superseded by a newer call on the same canvas')
  }
}

/**
 * Render a PDF page to a canvas at a given scale.
 *
 * Uses an offscreen canvas internally so the visible canvas keeps showing
 * its previous content (CSS-scaled by the parent transform) until the new
 * render is fully ready. At that point the visible canvas is resized and
 * the offscreen buffer is blitted over in a single atomic `drawImage`.
 * Without this, re-rendering on zoom change produces a ~100–500 ms blank
 * black frame per page while pdf.js is rasterizing.
 *
 * Cancels any in-flight render on the same canvas before starting.
 * Throws a cancellation-shaped error if a newer call on the same canvas
 * preempts this one — callers must swallow that via isRenderingCancelled().
 */
export async function renderPageToCanvas(
  pdfFile: PDFFile,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotation: number = 0,
): Promise<void> {
  // Claim a generation synchronously. Any earlier in-flight call that sees a
  // newer generation on its next await checkpoint will bail out.
  const gen = (renderGenerations.get(canvas) ?? 0) + 1
  renderGenerations.set(canvas, gen)

  // Cancel any pdf.js render already in flight on this canvas. pdf.js rejects
  // the previous .promise with a RenderingCancelledException, which propagates
  // out of this function.
  const previous = activeRenderTasks.get(canvas)
  if (previous) {
    previous.cancel()
    activeRenderTasks.delete(canvas)
  }

  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  if (renderGenerations.get(canvas) !== gen) throw new StaleRenderError()

  const page = await doc.getPage(pageNumber)
  if (renderGenerations.get(canvas) !== gen) throw new StaleRenderError()

  // Per PDF.js best practices: get viewport at logical scale, then use a
  // transform matrix to handle HiDPI. This keeps viewport dimensions in
  // CSS-pixel space and multiplies the pixel buffer by outputScale.
  const outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

  // Clamp the render scale so the resulting canvas fits within
  // MAX_CANVAS_PIXELS. Compute the base (scale=1) dimensions first, then
  // cap the requested scale if the pixel area would exceed the limit.
  // This is exactly the algorithm pdf.js's own viewer uses — see
  // `pdf_viewer.mjs` around the `maxCanvasPixels` branch.
  const baseViewport = page.getViewport({ scale: 1, rotation })
  const basePixels = baseViewport.width * baseViewport.height
  const maxAllowedScale = Math.sqrt(MAX_CANVAS_PIXELS / basePixels)
  const effectiveScale = Math.min(scale, maxAllowedScale)

  const viewport = page.getViewport({ scale: effectiveScale / outputScale, rotation })

  const targetWidth = Math.floor(viewport.width * outputScale)
  const targetHeight = Math.floor(viewport.height * outputScale)

  // Render into an offscreen buffer first — keeps the visible canvas
  // displaying its old content (CSS-scaled) during the render.
  // alpha: false — canvas has a white background; disabling alpha compositing
  // gives sharper text rendering and eliminates premultiplied-alpha artifacts.
  const offscreen = document.createElement('canvas')
  offscreen.width = targetWidth
  offscreen.height = targetHeight
  const offCtx = offscreen.getContext('2d', { alpha: false })
  if (!offCtx) throw new Error('Failed to get offscreen canvas context')

  const transform: [number, number, number, number, number, number] | undefined =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

  const renderTask = page.render({
    canvasContext: offCtx,
    viewport,
    transform,
    // 'print' intent renders at full fidelity (no display-specific shortcuts),
    // producing sharper text edges and more accurate colors.
    intent: 'print',
    // Disable PDF-native annotations — our own annotation layer handles everything.
    // Without this, native PDF stamps/comments render on the same canvas and
    // conflict with our annotation system.
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
  })
  activeRenderTasks.set(canvas, renderTask)

  try {
    await renderTask.promise
  } finally {
    // Only clear the map if we're still the current task. A newer render may
    // have already replaced us; don't wipe its entry.
    if (activeRenderTasks.get(canvas) === renderTask) {
      activeRenderTasks.delete(canvas)
    }
  }

  // Another call may have superseded us while pdf.js was rasterizing — if
  // so, don't touch the visible canvas; the newer call owns it.
  if (renderGenerations.get(canvas) !== gen) throw new StaleRenderError()

  // Atomic swap: resize the visible canvas (this clears it, but we
  // immediately drawImage into it on the same frame) and copy the finished
  // offscreen buffer over. The user never sees the blank intermediate state.
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Failed to get canvas context')
  canvas.width = targetWidth
  canvas.height = targetHeight
  ctx.drawImage(offscreen, 0, 0)

  page.cleanup()
}

/** True if the error is pdf.js's RenderingCancelledException (or our own stale-render variant). */
export function isRenderingCancelled(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'RenderingCancelledException'
}

/**
 * Render a sub-region (tile) of a PDF page into a tile-sized canvas.
 *
 * Used by the tiled-rendering path at high zoom levels — when the full
 * page would exceed the per-canvas pixel cap, we split the page into a
 * grid of tiles, each under the cap, and render them independently via
 * this function.
 *
 * How the math works:
 *   - Full-page viewport is computed at the effective render scale.
 *   - `transform = [outputScale, 0, 0, outputScale, -tileX, -tileY]` is
 *     applied BEFORE the viewport transform by pdf.js (see
 *     `legacy/build/pdf.mjs:12714`). The `outputScale` on the diagonal
 *     keeps HiDPI rendering intact; the `-tileX, -tileY` translation
 *     shifts the full-page content so the tile's top-left lands at
 *     canvas (0,0). pdf.js then draws the whole page but only pixels
 *     inside the tile canvas bounds actually commit.
 *
 * Cancellation and generation tracking reuse the same WeakMaps that
 * renderPageToCanvas uses — one WeakMap entry per canvas, and each tile
 * canvas is its own entry.
 *
 * tileX, tileY, tileW, tileH are in FULL-page pixel-buffer coordinates
 * (not CSS pixels). `scale` is the effective render scale — RENDER_SCALE
 * * zoom typically, without any maxCanvasPixels clamping.
 */
export async function renderPageTile(
  pdfFile: PDFFile,
  pageNumber: number,
  tileCanvas: HTMLCanvasElement,
  scale: number,
  rotation: number,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
): Promise<void> {
  const gen = (renderGenerations.get(tileCanvas) ?? 0) + 1
  renderGenerations.set(tileCanvas, gen)

  const previous = activeRenderTasks.get(tileCanvas)
  if (previous) {
    previous.cancel()
    activeRenderTasks.delete(tileCanvas)
  }

  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  if (renderGenerations.get(tileCanvas) !== gen) throw new StaleRenderError()

  const page = await doc.getPage(pageNumber)
  if (renderGenerations.get(tileCanvas) !== gen) throw new StaleRenderError()

  const outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  // Viewport is for the FULL page at the effective scale. We then use
  // `transform` to both re-scale for HiDPI (outputScale on the diagonal)
  // and shift the page content by -tileX/-tileY so the tile's top-left
  // lands at canvas (0,0). Pdf.js draws the full page but only pixels
  // inside the tile canvas commit — anything outside is clipped.
  const viewport = page.getViewport({ scale: scale / outputScale, rotation })

  tileCanvas.width = tileW
  tileCanvas.height = tileH

  const ctx = tileCanvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Failed to get tile canvas context')

  const transform: [number, number, number, number, number, number] =
    [outputScale, 0, 0, outputScale, -tileX, -tileY]

  const renderTask = page.render({
    canvasContext: ctx,
    viewport,
    transform,
    intent: 'print',
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
  })
  activeRenderTasks.set(tileCanvas, renderTask)

  try {
    await renderTask.promise
  } finally {
    if (activeRenderTasks.get(tileCanvas) === renderTask) {
      activeRenderTasks.delete(tileCanvas)
    }
  }

  if (renderGenerations.get(tileCanvas) !== gen) throw new StaleRenderError()

  page.cleanup()
}

/** Expose the current canvas pixel cap for callers that need to compute tile grids. */
export function getMaxCanvasPixels(): number {
  return MAX_CANVAS_PIXELS
}

/**
 * Extract the most likely title text from a PDF page.
 * Finds the largest-font text item on the page.
 * Returns null if no good candidate found.
 */
export async function extractPageTitleCandidate(
  file: File,
  pageNumber: number,
): Promise<string | null> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data: data.slice() }).promise

  try {
    if (pageNumber < 1 || pageNumber > doc.numPages) return null
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()

    let maxFontSize = 0
    let bestText = ''

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const fontSize = Math.abs(item.transform[0]) || 12
      if (fontSize > maxFontSize) {
        maxFontSize = fontSize
        bestText = item.str.trim()
      }
    }

    page.cleanup()

    if (!bestText) return null

    let cleaned = bestText
      .replace(/\bSHEET\s+\d+\s+OF\s+\d+\b/gi, '')
      .replace(/\bPAGE\s+\d+\b/gi, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '')
      .trim()

    if (cleaned.length < 3 || cleaned.length > 80) return null
    return cleaned
  } finally {
    doc.destroy()
  }
}

// ============================================
// Page Range Parsing
// ============================================

export function validatePageRange(rangeStr: string, maxPages: number): PageRangeValidation {
  const trimmed = rangeStr.trim()
  if (!trimmed) return { valid: true, pages: [] }

  if (!/^[\d,\-\s]+$/.test(trimmed)) {
    return { valid: false, error: 'Only numbers, commas, hyphens, and spaces allowed', pages: [] }
  }

  const pages: number[] = []
  const parts = trimmed.split(',')

  for (const part of parts) {
    const p = part.trim()
    if (!p) continue

    if (p.includes('-')) {
      const segments = p.split('-').filter((s) => s.trim() !== '')
      if (segments.length !== 2) {
        return { valid: false, error: `Invalid range: "${p}"`, pages: [] }
      }
      const start = parseInt(segments[0].trim(), 10)
      const end = parseInt(segments[1].trim(), 10)

      if (isNaN(start) || isNaN(end)) {
        return { valid: false, error: `Invalid numbers in range: "${p}"`, pages: [] }
      }
      if (start < 1 || end < 1) {
        return { valid: false, error: 'Pages start at 1', pages: [] }
      }
      if (start > maxPages || end > maxPages) {
        return { valid: false, error: `Page exceeds max (${maxPages})`, pages: [] }
      }

      if (start <= end) {
        for (let i = start; i <= end; i++) pages.push(i)
      } else {
        for (let i = start; i >= end; i--) pages.push(i)
      }
    } else {
      const page = parseInt(p, 10)
      if (isNaN(page)) {
        return { valid: false, error: `Invalid page number: "${p}"`, pages: [] }
      }
      if (page < 1) {
        return { valid: false, error: 'Pages start at 1', pages: [] }
      }
      if (page > maxPages) {
        return { valid: false, error: `Page ${page} exceeds max (${maxPages})`, pages: [] }
      }
      pages.push(page)
    }
  }

  return { valid: true, pages }
}

export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  return validatePageRange(rangeStr, maxPages).pages
}

// ============================================
// Merge
// ============================================

/**
 * Merge multiple PDFs (or subsets of pages) into a single PDF.
 * Supports per-page rotation and optional bookmarks.
 * Operates on raw Uint8Array data - no filesystem needed.
 */
export async function mergePDFs(
  files: { file: File; pages?: number[]; rotations?: Record<number, number> }[],
  onProgress?: (current: number, total: number) => void,
  bookmarks?: { title: string; pageIndex: number; children?: { title: string; pageIndex: number }[] }[],
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    const { file, pages, rotations } = files[i]
    // Read bytes on demand — each file's buffer is GC-eligible after this iteration
    const buffer = await file.arrayBuffer()
    const sourcePdf = await PDFDocument.load(new Uint8Array(buffer))

    const pagesToCopy = pages
      ? pages.map((p) => p - 1)
      : Array.from({ length: sourcePdf.getPageCount() }, (_, j) => j)

    const copiedPages = await mergedPdf.copyPages(sourcePdf, pagesToCopy)
    for (let j = 0; j < copiedPages.length; j++) {
      const page = copiedPages[j]
      // Apply rotation if specified
      if (rotations) {
        const pageNum = pages ? pages[j] : j + 1
        const rot = rotations[pageNum]
        if (rot) page.setRotation(degrees(rot))
      }
      mergedPdf.addPage(page)
    }

    onProgress?.(i + 1, total)
  }

  // Add bookmarks (PDF outline) if provided
  if (bookmarks && bookmarks.length > 0) {
    addPdfBookmarks(mergedPdf, bookmarks)
  }

  return mergedPdf.save()
}

interface NestedBookmarkInput {
  title: string
  pageIndex: number
  children?: NestedBookmarkInput[]
}

/**
 * Add bookmarks (PDF outline) to a PDF document.
 * Supports one level of nesting (parent → children).
 */
export function addPdfBookmarks(
  pdfDoc: PDFDocument,
  bookmarks: NestedBookmarkInput[],
): void {
  if (bookmarks.length === 0) return
  const ctx = pdfDoc.context

  function createItem(bm: NestedBookmarkInput): PDFRef {
    const pageRef = pdfDoc.getPage(bm.pageIndex).ref
    const dest = PDFArray.withContext(ctx)
    dest.push(pageRef)
    dest.push(PDFName.of('Fit'))

    const item = PDFDict.withContext(ctx)
    item.set(PDFName.of('Title'), PDFHexString.fromText(bm.title))
    item.set(PDFName.of('Dest'), dest)
    return ctx.register(item)
  }

  const topRefs: PDFRef[] = []

  for (const bm of bookmarks) {
    const parentRef = createItem(bm)
    topRefs.push(parentRef)

    if (bm.children && bm.children.length > 0) {
      const childRefs = bm.children.map((c) => createItem(c))

      for (let i = 0; i < childRefs.length; i++) {
        const dict = ctx.lookup(childRefs[i]) as PDFDict
        dict.set(PDFName.of('Parent'), parentRef)
        if (i > 0) dict.set(PDFName.of('Prev'), childRefs[i - 1])
        if (i < childRefs.length - 1) dict.set(PDFName.of('Next'), childRefs[i + 1])
      }

      const parentDict = ctx.lookup(parentRef) as PDFDict
      parentDict.set(PDFName.of('First'), childRefs[0])
      parentDict.set(PDFName.of('Last'), childRefs[childRefs.length - 1])
      parentDict.set(PDFName.of('Count'), PDFNumber.of(childRefs.length))
    }
  }

  for (let i = 0; i < topRefs.length; i++) {
    const dict = ctx.lookup(topRefs[i]) as PDFDict
    if (i > 0) dict.set(PDFName.of('Prev'), topRefs[i - 1])
    if (i < topRefs.length - 1) dict.set(PDFName.of('Next'), topRefs[i + 1])
  }

  const root = PDFDict.withContext(ctx)
  root.set(PDFName.of('Type'), PDFName.of('Outlines'))
  root.set(PDFName.of('First'), topRefs[0])
  root.set(PDFName.of('Last'), topRefs[topRefs.length - 1])
  root.set(PDFName.of('Count'), PDFNumber.of(topRefs.length))
  const rootRef = ctx.register(root)

  for (const ref of topRefs) {
    (ctx.lookup(ref) as PDFDict).set(PDFName.of('Parent'), rootRef)
  }

  pdfDoc.catalog.set(PDFName.of('Outlines'), rootRef)
}

/**
 * Merge pages from multiple PDFs in a custom order.
 * Each entry specifies a source file and a single page number.
 */
export async function mergePDFPages(
  entries: { file: File; pageNumber: number }[],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  // Cache loaded PDFs by File reference to avoid re-parsing
  const pdfCache = new Map<File, PDFDocument>()

  for (let i = 0; i < entries.length; i++) {
    const { file, pageNumber } = entries[i]

    if (!pdfCache.has(file)) {
      const buffer = await file.arrayBuffer()
      pdfCache.set(file, await PDFDocument.load(new Uint8Array(buffer)))
    }

    const sourcePdf = pdfCache.get(file)!
    const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [pageNumber - 1])
    mergedPdf.addPage(copiedPage)

    onProgress?.(i + 1, entries.length)
  }

  return mergedPdf.save()
}

// ============================================
// Split
// ============================================

/**
 * Extract specific pages from a PDF into a new PDF.
 * Returns the new PDF as Uint8Array.
 */
export async function extractPages(
  file: File,
  pageNumbers: number[],
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(new Uint8Array(buffer))
  const newPdf = await PDFDocument.create()

  const indices = pageNumbers.map((p) => p - 1)
  const copiedPages = await newPdf.copyPages(sourcePdf, indices)

  for (const page of copiedPages) {
    newPdf.addPage(page)
  }

  return newPdf.save()
}

/**
 * Split a PDF into multiple files, each containing a subset of pages.
 * Returns an array of { name, data } objects.
 */
export async function splitPDF(
  file: File,
  baseName: string,
  splits: { pages: number[]; name?: string }[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ name: string; data: Uint8Array }[]> {
  const buffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(new Uint8Array(buffer))
  const results: { name: string; data: Uint8Array }[] = []

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i]
    const newPdf = await PDFDocument.create()
    const indices = split.pages.map((p) => p - 1)
    const copiedPages = await newPdf.copyPages(sourcePdf, indices)

    for (const page of copiedPages) {
      newPdf.addPage(page)
    }

    const pdfBytes = await newPdf.save()
    const name = split.name || `${baseName}_part${i + 1}.pdf`
    results.push({ name, data: pdfBytes })

    onProgress?.(i + 1, splits.length)
  }

  return results
}

/**
 * Split every page into its own PDF.
 */
export async function splitToSinglePages(
  file: File,
  baseName: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ name: string; data: Uint8Array }[]> {
  const buffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(new Uint8Array(buffer))
  const totalPages = sourcePdf.getPageCount()
  const results: { name: string; data: Uint8Array }[] = []
  const pad = String(totalPages).length

  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create()
    const [copiedPage] = await newPdf.copyPages(sourcePdf, [i])
    newPdf.addPage(copiedPage)

    const pdfBytes = await newPdf.save()
    const num = String(i + 1).padStart(pad, '0')
    results.push({ name: `${baseName}_page${num}.pdf`, data: pdfBytes })

    onProgress?.(i + 1, totalPages)
  }

  return results
}

// ============================================
// Text Extraction (embedded text via pdf.js)
// ============================================

/**
 * Extract embedded text from a specific page.
 */
export async function extractPageText(
  pdfFile: PDFFile,
  pageNumber: number,
): Promise<string> {
  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  const page = await doc.getPage(pageNumber)
  const textContent = await page.getTextContent()

  let lastY: number | null = null
  let text = ''

  for (const item of textContent.items) {
    if ('str' in item) {
      const y = (item as { transform: number[] }).transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += '\n'
      }
      text += item.str
      lastY = y
    }
  }

  return text
}

/**
 * Extract text from all pages of a PDF.
 */
export async function extractAllText(
  pdfFile: PDFFile,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const parts: string[] = []

  for (let i = 1; i <= pdfFile.pageCount; i++) {
    const pageText = await extractPageText(pdfFile, i)
    if (pageText.trim()) {
      parts.push(`--- Page ${i} ---\n${pageText}`)
    }
    onProgress?.(i, pdfFile.pageCount)
  }

  return parts.join('\n\n')
}

/**
 * Check if a PDF has meaningful embedded text.
 * Returns true if average chars per page exceeds threshold.
 */
export async function hasEmbeddedText(
  pdfFile: PDFFile,
  samplePages: number = 3,
  minCharsPerPage: number = 50,
): Promise<boolean> {
  const pagesToCheck = Math.min(samplePages, pdfFile.pageCount)
  let totalChars = 0

  for (let i = 1; i <= pagesToCheck; i++) {
    const text = await extractPageText(pdfFile, i)
    totalChars += text.trim().length
  }

  return (totalChars / pagesToCheck) >= minCharsPerPage
}

/**
 * Extract positioned text items from a page (with coordinates for table/layout extraction).
 */
export async function extractPositionedText(
  pdfFile: PDFFile,
  pageNumber: number,
  rotation: number = 0,
): Promise<{
  items: { text: string; x: number; y: number; width: number; height: number; page: number }[]
  viewport: { width: number; height: number }
}> {
  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1, rotation })
  const content = await page.getTextContent()
  const items: { text: string; x: number; y: number; width: number; height: number; page: number }[] = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const h = Math.abs(item.transform[0]) || 12
    items.push({
      text: item.str,
      x: item.transform[4],
      y: viewport.height - item.transform[5] - h * 0.85, // transform[5] is baseline; ascent ≈ 85% of em size
      width: item.width ?? 0,
      height: h,
      page: pageNumber,
    })
  }
  return { items, viewport: { width: viewport.width, height: viewport.height } }
}

// ============================================
// Line / Rule Extraction (for table grid detection)
// ============================================

export interface PageLine {
  x1: number; y1: number
  x2: number; y2: number
}

/**
 * Extract horizontal and vertical line segments drawn on a PDF page.
 * Uses the page's operator list to find stroke paths (table rules, borders).
 * Coordinates are in doc-space (top-down Y, same as extractPositionedText).
 */
export async function extractPageLines(
  pdfFile: PDFFile,
  pageNumber: number,
): Promise<{ horizontal: PageLine[]; vertical: PageLine[] }> {
  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const ops = await page.getOperatorList()

  const rawLines: { x1: number; y1: number; x2: number; y2: number }[] = []

  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.constructPath) {
      const subOps = ops.argsArray[i][0] as number[]
      const args = ops.argsArray[i][1] as number[]

      let argIdx = 0
      let curX = 0, curY = 0
      let startX = 0, startY = 0

      for (const op of subOps) {
        if (op === pdfjsLib.OPS.moveTo) {
          curX = args[argIdx++]; curY = args[argIdx++]
          startX = curX; startY = curY
        } else if (op === pdfjsLib.OPS.lineTo) {
          const x = args[argIdx++]; const y = args[argIdx++]
          rawLines.push({
            x1: curX, y1: viewport.height - curY,
            x2: x, y2: viewport.height - y,
          })
          curX = x; curY = y
        } else if (op === pdfjsLib.OPS.rectangle) {
          const rx = args[argIdx++]; const ry = args[argIdx++]
          const rw = args[argIdx++]; const rh = args[argIdx++]
          const top = viewport.height - (ry + rh)
          const bot = viewport.height - ry
          // 4 edges of the rectangle
          rawLines.push(
            { x1: rx, y1: top, x2: rx + rw, y2: top },         // top
            { x1: rx, y1: bot, x2: rx + rw, y2: bot },         // bottom
            { x1: rx, y1: top, x2: rx, y2: bot },              // left
            { x1: rx + rw, y1: top, x2: rx + rw, y2: bot },   // right
          )
          curX = rx; curY = ry
        } else if (op === pdfjsLib.OPS.curveTo) {
          argIdx += 6
          curX = args[argIdx - 2]; curY = args[argIdx - 1]
        } else if (op === pdfjsLib.OPS.curveTo2 || op === pdfjsLib.OPS.curveTo3) {
          argIdx += 4
          curX = args[argIdx - 2]; curY = args[argIdx - 1]
        } else if (op === pdfjsLib.OPS.closePath) {
          if (curX !== startX || curY !== startY) {
            rawLines.push({
              x1: curX, y1: viewport.height - curY,
              x2: startX, y2: viewport.height - startY,
            })
            curX = startX; curY = startY
          }
        }
      }
    }
  }

  const tolerance = 2   // max deviation to classify as horizontal/vertical
  const minLength = 10  // minimum length to count as a table rule

  const horizontal: PageLine[] = []
  const vertical: PageLine[] = []

  for (const l of rawLines) {
    const dx = Math.abs(l.x2 - l.x1)
    const dy = Math.abs(l.y2 - l.y1)
    if (dy <= tolerance && dx >= minLength) {
      horizontal.push({ x1: Math.min(l.x1, l.x2), y1: (l.y1 + l.y2) / 2, x2: Math.max(l.x1, l.x2), y2: (l.y1 + l.y2) / 2 })
    } else if (dx <= tolerance && dy >= minLength) {
      vertical.push({ x1: (l.x1 + l.x2) / 2, y1: Math.min(l.y1, l.y2), x2: (l.x1 + l.x2) / 2, y2: Math.max(l.y1, l.y2) })
    }
  }

  return { horizontal, vertical }
}

// ============================================
// Page Dimensions (batch)
// ============================================

/**
 * Get the viewport dimensions for all pages without rendering pixels.
 * Returns a Map of page number → { width, height } in canvas-pixel space at the given scale.
 */
export async function getAllPageDimensions(
  pdfFile: PDFFile,
  scale: number,
  rotations: Record<number, number> = {},
): Promise<Map<number, { width: number; height: number }>> {
  const doc = await getCachedDoc(pdfFile.id, pdfFile.file)
  const dims = new Map<number, { width: number; height: number }>()
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const rotation = rotations[i] || 0
    const viewport = page.getViewport({ scale, rotation })
    dims.set(i, { width: Math.floor(viewport.width), height: Math.floor(viewport.height) })
  }
  return dims
}

// ============================================
// Cleanup
// ============================================

/**
 * Remove a specific PDF from the cache.
 */
export function removePDFFromCache(fileId: string): void {
  const cached = docCache.get(fileId)
  if (cached) {
    cached.doc.destroy()
    docCache.delete(fileId)
  }
}

/**
 * Clear all cached PDF documents.
 */
export function clearPDFCache(): void {
  for (const [, val] of docCache) {
    val.doc.destroy()
  }
  docCache.clear()
}
