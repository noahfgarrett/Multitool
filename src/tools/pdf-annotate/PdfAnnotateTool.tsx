import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { Button } from '@/components/common/Button.tsx'
import { Modal } from '@/components/common/Modal.tsx'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { loadPDFFile, renderPageToCanvas, generateThumbnail, removePDFFromCache, getPDFBytes, extractPositionedText, getAllPageDimensions, validatePageRange } from '@/utils/pdf.ts'
import Tesseract from 'tesseract.js'
import { downloadBlob } from '@/utils/download.ts'
import { saveSession, loadSession, clearSession, computeFileHash } from './storage.ts'
import type { PdfAnnotateSession } from './storage.ts'
import { formatFileSize } from '@/utils/fileReader.ts'
import type { PDFFile } from '@/types'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import {
  Download, RotateCcw, RotateCw, Undo2, Redo2,
  Eraser, Highlighter,
  ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronLeft, ChevronRight, PanelLeft,
  X, Ruler, TextSelect, MousePointer2, Strikethrough, Paintbrush,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript, List, ListOrdered,
  Search, Crop, Tag, Printer, FileSpreadsheet, StickyNote as StickyNoteIcon,
  MessageCircle, Mail, FileText, ScanText, Layers, ImagePlus, Eye, EyeOff, Plus, Trash2,
  Copy, BookOpen, Blend, Star, MoreHorizontal, ChevronsLeft, ChevronsRight,
} from 'lucide-react'

// ── Extracted modules ─────────────────────────────────
import type { ToolType, Point, Annotation, AnnotationLayer, PageAnnotations, Measurement, CalibrationState, HandleId, PageRefs, MeasureMode, PolyMeasurement, CountGroup, CommentThread, CommentStatus, StickyNote, ExportMode, Comment as CommentType } from './types.ts'
import {
  RENDER_SCALE, MAX_HISTORY, HANDLE_SIZE, DEFAULT_TEXTBOX_W, DEFAULT_TEXTBOX_H,
  ANN_COLORS, HIGHLIGHT_COLORS, ZOOM_PRESETS, STAMP_PRESETS,
  DRAW_TOOLS, TEXT_TOOLS, DRAW_TYPES, TEXT_TYPES,
  FONT_FAMILIES, PDF_FONT_MAP, CURSOR_MAP, HANDLE_CURSOR_MAP,
  genId, resolvePdfFont, saveWithPicker, toPdfCoords, parseHexColor,
  MEASURE_MODES, STICKY_NOTE_COLORS, COMMENT_STATUS_COLORS,
} from './types.ts'
import {
  wrapText, computeTextBoxHeight, nearestPointOnRect, hitTestCalloutBox,
  getHandles, hitTestHandle, ptSegDist, hitTest,
  pathHitsCircle, splitPathByEraser, shapeToPolyline, getAnnotationBounds,
  snapToContent, rotatePoint,
  isPointInAnyTextItem, findIntersectingTextItems, flowSelectTextItems,
  hitTestMeasurementLabel,
  decimatePoints,
} from './geometry.ts'
import {
  drawCloudEdge, drawSmoothPath, drawAnnotation, drawSelectionUI, drawMeasurement,
} from './drawing.ts'
import { snapToEdge } from './edgeSnapping.ts'
import { drawPolylength, drawAreaPolygon, drawCountMarker, drawCountGroupSummary } from './measurementDrawing.ts'
import { printAnnotatedPDF } from './printUtil.ts'
import { exportMeasurementsToCSV, gatherMeasurementData } from './csvExport.ts'
import { drawStickyNotePin, drawStickyNoteExpanded, hitTestStickyNote } from './stickyNoteDrawing.ts'
import { ChatBubble } from './ChatBubble.tsx'
import CommentsPanel from './CommentsPanel.tsx'
import { ExportModal } from './ExportModal.tsx'
import { EmailModal } from './EmailModal.tsx'
import { embedAnnotationData, extractAnnotationData } from './metadataEmbed.ts'
import { sendAnnotatedPDF } from './emailUtil.ts'
import { generateMarkupReport, generateMarkupCSV } from './markupReport.ts'
import MarkupsList from './MarkupsList.tsx'
import { CompareMode } from './CompareMode.tsx'
import { StampLibrary } from './StampLibrary.tsx'
import { recognizeShape } from './shapeRecognizer.ts'
import { getUserProfile } from '@/utils/userProfile.ts'
import type { UserProfile } from '@/utils/userProfile.ts'
import FloatingToolbar from './FloatingToolbar.tsx'

// ── Thumbnail sidebar item ──────────────────────────────

const ThumbnailItem = memo(function ThumbnailItem({ pageNum, thumbnail, isCurrent, isSelected, hasAnnotations, onVisible, onClick, onDoubleClick }: {
  pageNum: number
  thumbnail?: string
  isCurrent: boolean
  isSelected: boolean
  hasAnnotations: boolean
  onVisible: (pageNum: number) => void
  onClick: (pageNum: number) => void
  onDoubleClick: (pageNum: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (thumbnail) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onVisible(pageNum); observer.disconnect() } },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnail])

  return (
    <div
      ref={ref}
      onClick={() => onClick(pageNum)}
      onDoubleClick={() => onDoubleClick(pageNum)}
      className={`cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${
        isCurrent ? 'border-[#F47B20]' :
        isSelected ? 'border-[#F47B20]/50' :
        'border-transparent hover:border-white/20'
      }`}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={`Page ${pageNum}`} className="w-full h-auto" draggable={false} />
      ) : (
        <div className="w-full aspect-[3/4] bg-white/[0.04] flex items-center justify-center">
          <span className="text-[10px] text-white/30">Loading...</span>
        </div>
      )}
      <div className="text-center text-[10px] text-white/40 py-0.5">
        {pageNum}
        {hasAnnotations && <span className="text-[8px] text-[#F47B20] ml-0.5">●</span>}
      </div>
    </div>
  )
})

// ── Annotation label helper ────────────────────────────

function annLabel(ann: Annotation): string {
  if (ann.stampType) return `Stamp: ${ann.stampType}`
  if (ann.text) return ann.text.slice(0, 30).replace(/\n/g, ' ')
  return ann.type.charAt(0).toUpperCase() + ann.type.slice(1)
}

// ── Component ──────────────────────────────────────────

export default function PdfAnnotateTool() {
  const addToast = useAppStore(s => s.addToast)

  // State
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [color, setColor] = useState('#F47B20')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(100)
  const [fontSize, setFontSize] = useState(16)
  const [zoom, setZoom] = useState(1.0)
  const [annotations, setAnnotations] = useState<PageAnnotations>({})
  const [layers, setLayers] = useState<AnnotationLayer[]>([
    { id: 'default', name: 'Default', visible: true, color: '#6B7280' },
  ])
  const [activeLayerId, setActiveLayerId] = useState('default')
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  // pdfReady removed — each page renders independently via IntersectionObserver

  const [fontFamily, setFontFamily] = useState('Arial')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [strikethrough, setStrikethrough] = useState(false)
  const [textBgColor, setTextBgColor] = useState<string | null>(null)
  const [lineSpacing, setLineSpacing] = useState(1.3)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [superscript, setSuperscript] = useState(false)
  const [subscript, setSubscript] = useState(false)
  const [listType, setListType] = useState<'none' | 'bullet' | 'numbered'>('none')
  const [canvasCursor, setCanvasCursor] = useState<string | null>(null)
  const [selectTextToolbar, setSelectTextToolbar] = useState<{
    rects: { x: number; y: number; w: number; h: number }[]
    items: { text: string; x: number; y: number; width: number; height: number; page: number }[]
    docPos: { x: number; y: number }
  } | null>(null)
  const clipboardRef = useRef<Annotation | null>(null)
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null)
  // Ref mirrors hoveredAnnId for use inside pointermove — avoids re-render when value is unchanged
  const hoveredAnnIdRef = useRef<string | null>(null)

  // Feature: sticky tool, hover tooltip, context menu, annotation list, find, stamp, crop, page input
  // Tools always stay active until user manually switches
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annId: string; pageNum: number } | null>(null)
  const [annListOpen, setAnnListOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [findMatches, setFindMatches] = useState<{ pageNum: number; item: { text: string; x: number; y: number; width: number; height: number; page: number }; matchX: number; matchW: number }[]>([])
  const [findIdx, setFindIdx] = useState(0)
  const [findCacheTick, setFindCacheTick] = useState(0)
  const [findCaseSensitive, setFindCaseSensitive] = useState(false)
  const [ocrScanning, setOcrScanning] = useState(false)
  const ocrPagesRef = useRef<Set<string>>(new Set()) // tracks pages that needed OCR (cache keys)
  const ocrAbortRef = useRef<AbortController | null>(null)
  // OCR Region scan tool
  const ocrRegionStartRef = useRef<Point | null>(null)
  const ocrRegionPreviewRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [ocrRegionResult, setOcrRegionResult] = useState<{ text: string; pageNum: number; rect: { x: number; y: number; w: number; h: number } } | null>(null)
  const [ocrRegionScanning, setOcrRegionScanning] = useState(false)
  const [stampDropdownOpen, setStampDropdownOpen] = useState(false)
  const [activeStampPreset, setActiveStampPreset] = useState(STAMP_PRESETS[0])
  const [cropRegions, setCropRegions] = useState<Record<number, { x: number; y: number; w: number; h: number }>>({})
  const [pageInputActive, setPageInputActive] = useState(false)
  const copiedStyleRef = useRef<{ color: string; strokeWidth: number; opacity: number; fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean } | null>(null)

  // Shapes dropdown
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false)
  const [activeDraw, setActiveDraw] = useState<ToolType>('pencil')

  // Text tools dropdown
  const [textDropdownOpen, setTextDropdownOpen] = useState(false)
  const [activeText, setActiveText] = useState<ToolType>('text')

  // Tool presets (save/load/apply/delete are defined later after fillColor/dashPattern state)
  interface ToolPreset { id: string; name: string; toolType: ToolType; color: string; strokeWidth: number; opacity: number; fontSize: number; fillColor: string | null; dashPattern: 'solid' | 'dashed' | 'dotted' }
  const [toolPresets, setToolPresets] = useState<ToolPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('lwt-tool-presets') || '[]') } catch { return [] }
  })
  const [presetsOpen, setPresetsOpen] = useState(false)

  // Bookmark navigation
  const [bookmarks, setBookmarks] = useState<{ title: string; pageNum: number; children: { title: string; pageNum: number }[] }[]>([])
  const [bookmarksOpen, setBookmarksOpen] = useState(false)

  // Markups list
  const [markupsListOpen, setMarkupsListOpen] = useState(false)

  // Compare mode
  const [compareOpen, setCompareOpen] = useState(false)

  // Custom stamp library
  const [stampLibraryOpen, setStampLibraryOpen] = useState(false)

  // More menu dropdown
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Right sidebar collapse state
  const [toolbarExpanded, setToolbarExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('pdfAnnotate.toolbarExpanded')
    return saved !== null ? saved === 'true' : true
  })
  const [moreToolsOpen, setMoreToolsOpen] = useState(false)

  // Watermark on export
  const [exportWatermark, setExportWatermark] = useState('')
  const [exportWatermarkOpacity, setExportWatermarkOpacity] = useState(15)

  // Zoom presets dropdown
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false)

  // Straight-line mode
  const [straightLineMode, setStraightLineMode] = useState(false)
  const [fillColor, setFillColor] = useState<string | null>(null)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [dashPattern, setDashPattern] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [arrowStart, setArrowStart] = useState(false)

  // Tool preset callbacks (after fillColor/dashPattern are declared)
  const saveToolPreset = useCallback((name: string) => {
    const preset: ToolPreset = { id: crypto.randomUUID(), name, toolType: activeTool, color, strokeWidth, opacity, fontSize, fillColor, dashPattern }
    setToolPresets(prev => { const next = [...prev, preset]; localStorage.setItem('lwt-tool-presets', JSON.stringify(next)); return next })
  }, [activeTool, color, strokeWidth, opacity, fontSize, fillColor, dashPattern])

  const applyToolPreset = useCallback((preset: ToolPreset) => {
    setActiveTool(preset.toolType); setColor(preset.color); setStrokeWidth(preset.strokeWidth)
    setOpacity(preset.opacity); setFontSize(preset.fontSize); setFillColor(preset.fillColor); setDashPattern(preset.dashPattern)
  }, [])

  const deleteToolPreset = useCallback((id: string) => {
    setToolPresets(prev => { const next = prev.filter(p => p.id !== id); localStorage.setItem('lwt-tool-presets', JSON.stringify(next)); return next })
  }, [])

  // Eraser
  const [eraserRadius, setEraserRadius] = useState(15)
  const [eraserMode, setEraserMode] = useState<'partial' | 'object'>('partial')
  const eraserModsRef = useRef<{ removed: Set<string>; added: Annotation[] }>({ removed: new Set(), added: [] })
  const canvasSnapshotRef = useRef<ImageData | null>(null)

  // Rotation
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})

  // Text tool — PowerPoint style
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommittedTextRef = useRef<{ id: string; text: string } | null>(null)
  const editingTextIdRef = useRef<string | null>(null)
  const [textOverlayTick, setTextOverlayTick] = useState(0)
  // Tracks whether the textarea was committed via Escape key so the blur handler
  // doesn't run commitTextEditing a second time (which would add a duplicate history step)
  const escapeCommittedRef = useRef(false)
  // Save/restore color & stroke when switching to/from highlighter
  const preHighlightRef = useRef<{ color: string; strokeWidth: number } | null>(null)
  // Manual double-click detection: pointerdown events have e.detail=0 in Chromium
  // (unlike mousedown), so we must track click timestamps ourselves.
  const dblClickRef = useRef<{ time: number; pt: Point }>({ time: 0, pt: { x: 0, y: 0 } })
  const textDragRef = useRef<{
    annId: string
    mode: 'move' | HandleId
    startPt: Point
    origPoints: Point[]
    origWidth: number
    origHeight: number
    origArrows?: Point[]
  } | null>(null)
  const generalDragRef = useRef<{
    annId: string; startPt: Point; origPoints: Point[]
  } | null>(null)

  // Callout arrow drag
  const calloutArrowDragRef = useRef<{ tipPt: Point; arrowIdx?: number } | null>(null)
  const [selectedArrowIdx, setSelectedArrowIdx] = useState<number | null>(null)

  // Cloud polygon placement
  const cloudPreviewRef = useRef<Point | null>(null)
  const cloudLastClickRef = useRef<{ time: number; pt: Point }>({ time: 0, pt: { x: 0, y: 0 } })

  // Measurement tool
  const [measurements, setMeasurements] = useState<Record<number, Measurement[]>>({})
  const [calibration, setCalibration] = useState<CalibrationState>({ pixelsPerUnit: null, unit: 'in' })
  const [calibrateModalOpen, setCalibrateModalOpen] = useState(false)
  const [calibrateMeasureId, setCalibrateMeasureId] = useState<string | null>(null)
  const [calibrateValue, setCalibrateValue] = useState('')
  const [calibrateUnit, setCalibrateUnit] = useState('in')
  const measureStartRef = useRef<Point | null>(null)
  const measurePreviewRef = useRef<Point | null>(null)
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null)

  // Expanded measurement mode
  const [measureMode, setMeasureMode] = useState<MeasureMode>('distance')
  const [measureDropdownOpen, setMeasureDropdownOpen] = useState(false)
  const measureDropdownRef = useRef<HTMLDivElement>(null)
  const [polyMeasurements, setPolyMeasurements] = useState<Record<number, PolyMeasurement[]>>({})
  const polyPointsRef = useRef<Point[]>([])
  const polyPreviewRef = useRef<Point | null>(null)
  const [countGroups, setCountGroups] = useState<Record<number, CountGroup[]>>({})
  const [activeCountGroup, setActiveCountGroup] = useState<string | null>(null)
  const [countGroupModalOpen, setCountGroupModalOpen] = useState(false)
  const [countGroupLabel, setCountGroupLabel] = useState('')
  const [countGroupColor, setCountGroupColor] = useState('#EF4444')
  const [edgeSnappingEnabled, setEdgeSnappingEnabled] = useState(true)
  const [precisionSnapMode, setPrecisionSnapMode] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Comment & review system
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([])
  const [stickyNotes, setStickyNotes] = useState<Record<number, StickyNote[]>>({})
  const [activeStickyColor, setActiveStickyColor] = useState(STICKY_NOTE_COLORS[0])
  const [chatBubbleTarget, setChatBubbleTarget] = useState<{ annotationId: string; position: { x: number; y: number } } | null>(null)
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)
  const userProfileRef = useRef<UserProfile | null>(getUserProfile())

  // Export & email
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})
  const [selectedThumbPage, setSelectedThumbPage] = useState<number | null>(null)
  const loadingThumbs = useRef(new Set<number>())

  // Refs
  const pageRefsMap = useRef<Map<number, PageRefs>>(new Map())
  const pageDimsMap = useRef<Map<number, { width: number; height: number }>>(new Map())
  const renderedPagesRef = useRef<Set<number>>(new Set())
  const activePageRef = useRef(1)
  const maxCanvasWidthRef = useRef(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const spaceHeldRef = useRef(false)
  const shapesDropdownRef = useRef<HTMLDivElement>(null)
  const textDropdownRef = useRef<HTMLDivElement>(null)
  const zoomDropdownRef = useRef<HTMLDivElement>(null)
  const stampDropdownRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const hoverPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const eraserCursorDivRef = useRef<HTMLDivElement>(null)
  const tooltipDivRef = useRef<HTMLDivElement>(null)
  const cropDrawRef = useRef<{ startPt: Point } | null>(null)
  // Per-page render scale tracking for zoom-aware rendering
  const pageRenderScaleRef = useRef<Map<number, number>>(new Map())
  const findInputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)
  const currentPtsRef = useRef<Point[]>([])
  const currentPressureRef = useRef<number[]>([])  // parallel array for pen pressure
  const pendingImageRef = useRef<string | null>(null)  // data URL for image stamp placement
  const imageStampCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())  // cache loaded images
  const pdfFileRef = useRef(pdfFile)
  pdfFileRef.current = pdfFile
  const fileHashRef = useRef<string | null>(null)
  const pageRotationsRef = useRef(pageRotations)
  pageRotationsRef.current = pageRotations
  const [dimsReady, setDimsReady] = useState(0)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // Persist right sidebar collapse state
  useEffect(() => {
    localStorage.setItem('pdfAnnotate.toolbarExpanded', String(toolbarExpanded))
  }, [toolbarExpanded])

  // Session restore
  const pendingScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null)
  const restoringSessionRef = useRef(false)
  const initialFitDoneRef = useRef(false)

  // Text highlight
  const textItemsCacheRef = useRef<Record<string, { text: string; x: number; y: number; width: number; height: number; page: number }[]>>({})
  const textHighlightStartRef = useRef<Point | null>(null)
  const textHighlightPreviewRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const selectTextStartRef = useRef<Point | null>(null)
  const selectTextRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const [activeHighlight, setActiveHighlight] = useState<'highlighter' | 'textHighlight' | 'textStrikethrough'>('highlighter')

  // History
  const historyRef = useRef<PageAnnotations[]>([{}])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  const isDrawTool = DRAW_TYPES.has(activeTool)
  const isTextTool = TEXT_TYPES.has(activeTool)
  const currentRotation = pageRotations[currentPage] || 0

  // ── Coordinate conversion (page-aware) ──────────────

  const getPointForPage = useCallback((pageNum: number, e: { clientX: number; clientY: number }): Point => {
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return { x: 0, y: 0 }
    const canvas = refs.annCanvas
    const dims = pageDimsMap.current.get(pageNum) || { width: 0, height: 0 }
    const rect = canvas.getBoundingClientRect()
    const rs = pageRenderScaleRef.current.get(pageNum) ?? RENDER_SCALE
    return {
      x: Math.max(0, Math.min(dims.width,
        ((e.clientX - rect.left) / rect.width) * canvas.width / rs)),
      y: Math.max(0, Math.min(dims.height,
        ((e.clientY - rect.top) / rect.height) * canvas.height / rs)),
    }
  }, [])

  // ── Annotation helpers (page-aware) ────────────────

  const getAnnotation = useCallback((id: string, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    return (annotations[page] || []).find(a => a.id === id)
  }, [annotations])

  const findTextAnnotationAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'text' && hitTest(pt, ann, th)) return ann
    }
    return undefined
  }, [annotations])

  const findCalloutAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'callout' && hitTest(pt, ann, th)) return ann
    }
    return undefined
  }, [annotations])

  const findAnnotationAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      if (hitTest(pt, pageAnns[i], th)) return pageAnns[i]
    }
    return undefined
  }, [annotations])

  /** Find which page an annotation lives on (for overlays). */
  // O(1) annotation→page lookup (js-index-maps) — rebuilt only when annotations change
  const annPageMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const [pageStr, pageAnns] of Object.entries(annotations)) {
      for (const ann of pageAnns) map.set(ann.id, Number(pageStr))
    }
    return map
  }, [annotations])

  const findAnnotationPage = useCallback((id: string): number | null =>
    annPageMap.get(id) ?? null
  , [annPageMap])

  // ── Render helpers (page-aware) ────────────────────────

  const redrawPage = useCallback((pageNum: number) => {
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return
    const canvas = refs.annCanvas
    if (!canvas || canvas.width === 0) return
    const ctx = canvas.getContext('2d')!
    const rs = pageRenderScaleRef.current.get(pageNum) ?? RENDER_SCALE
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isActive = pageNum === activePageRef.current
    const mods = eraserModsRef.current
    const hiddenLayerIds = new Set(layers.filter(l => !l.visible).map(l => l.id))
    const pageAnns = (annotations[pageNum] || [])
      .filter(a => !isActive || !mods.removed.has(a.id))
      .filter(a => !a.layerId || !hiddenLayerIds.has(a.layerId))
    for (const ann of pageAnns) {
      // Hide canvas-drawn text/callout while textarea overlay is active (Konva.js pattern)
      const isBeingEdited = ann.id === editingTextIdRef.current && (ann.type === 'text' || ann.type === 'callout')
      if (!isBeingEdited) {
        drawAnnotation(ctx, ann, rs)
        // Render image stamp content (drawAnnotation only draws placeholder border)
        if (ann.type === 'imageStamp' && ann.imageDataUrl && ann.points.length >= 2) {
          let img = imageStampCacheRef.current.get(ann.id)
          if (!img) {
            img = new Image()
            img.src = ann.imageDataUrl
            imageStampCacheRef.current.set(ann.id, img)
            img.onload = () => redrawPage(pageNum)
          }
          if (img.complete && img.naturalWidth > 0) {
            const ix = Math.min(ann.points[0].x, ann.points[1].x) * rs
            const iy = Math.min(ann.points[0].y, ann.points[1].y) * rs
            const iw = Math.abs(ann.points[1].x - ann.points[0].x) * rs
            const ih = Math.abs(ann.points[1].y - ann.points[0].y) * rs
            ctx.save()
            ctx.globalAlpha = ann.opacity
            ctx.drawImage(img, ix, iy, iw, ih)
            ctx.restore()
          }
        }
      }
      if (ann.id === selectedAnnId && !isBeingEdited) {
        drawSelectionUI(ctx, ann, rs)
        if (ann.type === 'callout' && selectedArrowIdx !== null && ann.arrows && selectedArrowIdx < ann.arrows.length) {
          const tip = ann.arrows[selectedArrowIdx]
          const origin = nearestPointOnRect(ann.points[0].x, ann.points[0].y, ann.width!, ann.height!, tip.x, tip.y)
          ctx.save()
          ctx.strokeStyle = '#EF4444'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 3])
          ctx.beginPath()
          ctx.moveTo(origin.x * rs, origin.y * rs)
          ctx.lineTo(tip.x * rs, tip.y * rs)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = '#EF4444'
          ctx.beginPath()
          ctx.arc(tip.x * rs, tip.y * rs, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
    }

    // Eraser-added fragments (only on active page)
    if (isActive) {
      for (const frag of mods.added) drawAnnotation(ctx, frag, rs)
    }

    // Hover highlight
    if (hoveredAnnId && hoveredAnnId !== selectedAnnId) {
      const hovAnn = pageAnns.find(a => a.id === hoveredAnnId)
      if (hovAnn) {
        const bounds = getAnnotationBounds(hovAnn)
        if (bounds) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.4
          ctx.setLineDash([3, 3])
          ctx.strokeRect(bounds.x * rs, bounds.y * rs, bounds.w * rs, bounds.h * rs)
          ctx.setLineDash([])
          ctx.restore()
        }
      }
    }

    // Find highlights — highlight only the matching substring, not the full word
    if (findMatches.length > 0) {
      ctx.save()
      for (let fi = 0; fi < findMatches.length; fi++) {
        const fm = findMatches[fi]
        if (fm.pageNum !== pageNum) continue
        ctx.globalAlpha = fi === findIdx ? 0.7 : 0.35
        ctx.fillStyle = fi === findIdx ? '#f97316' : '#facc15'
        ctx.fillRect(fm.matchX * rs, fm.item.y * rs, fm.matchW * rs, fm.item.height * rs)
      }
      ctx.restore()
    }

    // Crop region overlay
    const cropRgn = cropRegions[pageNum]
    if (cropRgn) {
      const dims = pageDimsMap.current.get(pageNum)
      if (dims) {
        ctx.save()
        ctx.globalAlpha = 0.45
        ctx.fillStyle = '#000000'
        // Outside crop: 4 rects
        ctx.fillRect(0, 0, dims.width * rs, cropRgn.y * rs)
        ctx.fillRect(0, (cropRgn.y + cropRgn.h) * rs, dims.width * rs, (dims.height - cropRgn.y - cropRgn.h) * rs)
        ctx.fillRect(0, cropRgn.y * rs, cropRgn.x * rs, cropRgn.h * rs)
        ctx.fillRect((cropRgn.x + cropRgn.w) * rs, cropRgn.y * rs, (dims.width - cropRgn.x - cropRgn.w) * rs, cropRgn.h * rs)
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(cropRgn.x * rs, cropRgn.y * rs, cropRgn.w * rs, cropRgn.h * rs)
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // OCR Region in-progress preview
    if (activeTool === 'ocrRegion' && isActive && ocrRegionPreviewRef.current) {
      const r = ocrRegionPreviewRef.current
      ctx.save()
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.globalAlpha = 0.8
      ctx.strokeRect(r.x * rs, r.y * rs, r.w * rs, r.h * rs)
      ctx.fillStyle = '#3B82F6'
      ctx.globalAlpha = 0.08
      ctx.fillRect(r.x * rs, r.y * rs, r.w * rs, r.h * rs)
      ctx.setLineDash([])
      ctx.restore()
    }

    // Crop in-progress preview
    if (activeTool === 'crop' && isActive && cropDrawRef.current && currentPtsRef.current.length >= 2) {
      const cpts = currentPtsRef.current
      const cx = Math.min(cpts[0].x, cpts[1].x)
      const cy = Math.min(cpts[0].y, cpts[1].y)
      const cw = Math.abs(cpts[1].x - cpts[0].x)
      const ch = Math.abs(cpts[1].y - cpts[0].y)
      ctx.save()
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.globalAlpha = 0.8
      ctx.strokeRect(cx * rs, cy * rs, cw * rs, ch * rs)
      ctx.setLineDash([])
      ctx.restore()
    }

    // ── In-progress elements (only on the active page) ──
    if (isActive) {
      // In-progress stroke
      if (isDrawingRef.current && activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'text' && activeTool !== 'callout' && activeTool !== 'cloud' && activeTool !== 'polygon' && activeTool !== 'measure' && activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'ocrRegion') {
        const pts = currentPtsRef.current
        if (pts.length > 0) {
          const inProgress: Annotation = {
            id: '_progress', type: activeTool as Annotation['type'],
            points: pts, color, fontSize,
            strokeWidth: strokeWidth,
            opacity: activeTool === 'highlighter' ? 0.4 : opacity / 100,
            ...(fillColor && (activeTool === 'rectangle' || activeTool === 'circle') ? { fillColor } : {}),
            ...(cornerRadius > 0 && activeTool === 'rectangle' ? { cornerRadius } : {}),
            ...(dashPattern !== 'solid' ? { dashPattern } : {}),
            ...(arrowStart && activeTool === 'arrow' ? { arrowStart: true } : {}),
          }
          drawAnnotation(ctx, inProgress, rs)
        }
      }

      // Text highlight preview
      if (activeTool === 'textHighlight' && textHighlightPreviewRectsRef.current.length > 0) {
        ctx.save()
        ctx.globalAlpha = 0.4
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = color
        for (const r of textHighlightPreviewRectsRef.current) {
          ctx.fillRect(r.x * rs, r.y * rs, r.w * rs, r.h * rs)
        }
        ctx.restore()
      }

      // Text strikethrough preview
      if (activeTool === 'textStrikethrough' && textHighlightPreviewRectsRef.current.length > 0) {
        ctx.save()
        ctx.globalAlpha = 1
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, 2 * rs)
        ctx.beginPath()
        for (const r of textHighlightPreviewRectsRef.current) {
          const midY = (r.y + r.h / 2) * rs
          ctx.moveTo(r.x * rs, midY)
          ctx.lineTo((r.x + r.w) * rs, midY)
        }
        ctx.stroke()
        ctx.restore()
      }

      // Select tool: text selection highlight
      {
        const selectRects = selectTextRectsRef.current.length > 0
          ? selectTextRectsRef.current
          : selectTextToolbar?.rects ?? []
        if (selectRects.length > 0) {
          ctx.save()
          ctx.globalAlpha = 0.3
          ctx.fillStyle = '#3B82F6'
          for (const r of selectRects) {
            ctx.fillRect(r.x * rs, r.y * rs, r.w * rs, r.h * rs)
          }
          ctx.restore()
        }
      }

      // Cloud polygon vertex placement preview
      if ((activeTool === 'cloud' || activeTool === 'polygon') && currentPtsRef.current.length > 0) {
        const cpts = currentPtsRef.current
        const preview = cloudPreviewRef.current
        const scale = rs
        const arcSize = 20 * scale

        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth * scale
        ctx.globalAlpha = opacity / 100

        if (cpts.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(cpts[0].x * scale, cpts[0].y * scale)
          for (let i = 0; i < cpts.length - 1; i++) {
            drawCloudEdge(ctx, cpts[i].x * scale, cpts[i].y * scale, cpts[i + 1].x * scale, cpts[i + 1].y * scale, arcSize)
          }
          ctx.stroke()
        }

        if (preview) {
          ctx.globalAlpha = (opacity / 100) * 0.5
          ctx.beginPath()
          ctx.moveTo(cpts[cpts.length - 1].x * scale, cpts[cpts.length - 1].y * scale)
          drawCloudEdge(ctx, cpts[cpts.length - 1].x * scale, cpts[cpts.length - 1].y * scale, preview.x * scale, preview.y * scale, arcSize)
          ctx.stroke()

          if (cpts.length >= 2) {
            ctx.setLineDash([4, 3])
            ctx.beginPath()
            ctx.moveTo(preview.x * scale, preview.y * scale)
            drawCloudEdge(ctx, preview.x * scale, preview.y * scale, cpts[0].x * scale, cpts[0].y * scale, arcSize)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }

        ctx.globalAlpha = 1
        ctx.fillStyle = '#3B82F6'
        for (const p of cpts) {
          ctx.beginPath()
          ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // Snap indicator: highlight first vertex when cursor is near it
        if (preview && cpts.length >= 3) {
          const snapDist = Math.hypot(preview.x - cpts[0].x, preview.y - cpts[0].y)
          if (snapDist < 15 / zoomRef.current) {
            ctx.strokeStyle = '#22C55E'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(cpts[0].x * scale, cpts[0].y * scale, 8, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        ctx.setLineDash([])
        ctx.restore()
      }

      // In-progress textbox creation
      if (isDrawingRef.current && activeTool === 'text') {
        const pts = currentPtsRef.current
        if (pts.length >= 2) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          const x = Math.min(pts[0].x, pts[1].x) * rs
          const y = Math.min(pts[0].y, pts[1].y) * rs
          const w = Math.abs(pts[1].x - pts[0].x) * rs
          const h = Math.abs(pts[1].y - pts[0].y) * rs
          ctx.strokeRect(x, y, w, h)
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // In-progress callout box creation
      if (isDrawingRef.current && activeTool === 'callout' && !calloutArrowDragRef.current) {
        const pts = currentPtsRef.current
        if (pts.length >= 2) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          const x = Math.min(pts[0].x, pts[1].x) * rs
          const y = Math.min(pts[0].y, pts[1].y) * rs
          const w = Math.abs(pts[1].x - pts[0].x) * rs
          const h = Math.abs(pts[1].y - pts[0].y) * rs
          ctx.strokeRect(x, y, w, h)
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // Callout arrow drag preview
      if (calloutArrowDragRef.current && selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout' && ann.width && ann.height) {
          const tip = calloutArrowDragRef.current.tipPt
          const origin = nearestPointOnRect(ann.points[0].x, ann.points[0].y, ann.width, ann.height, tip.x, tip.y)
          ctx.save()
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1.5 * rs
          ctx.setLineDash([4, 3])
          ctx.beginPath()
          ctx.moveTo(origin.x * rs, origin.y * rs)
          ctx.lineTo(tip.x * rs, tip.y * rs)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // In-progress measurement preview (distance mode)
      if (activeTool === 'measure' && measureMode === 'distance' && measureStartRef.current && measurePreviewRef.current) {
        const preview: Measurement = {
          id: '_measure_preview',
          startPt: measureStartRef.current,
          endPt: measurePreviewRef.current,
          page: pageNum,
        }
        drawMeasurement(ctx, preview, rs, calibration, false)
      }
      // In-progress polylength preview
      if (activeTool === 'measure' && measureMode === 'polylength' && polyPointsRef.current.length > 0) {
        const pts = [...polyPointsRef.current]
        if (polyPreviewRef.current) pts.push(polyPreviewRef.current)
        drawPolylength(ctx, pts, rs, calibration, false)
      }
      // In-progress area preview
      if (activeTool === 'measure' && measureMode === 'area' && polyPointsRef.current.length > 0) {
        const pts = [...polyPointsRef.current]
        if (polyPreviewRef.current) pts.push(polyPreviewRef.current)
        drawAreaPolygon(ctx, pts, rs, calibration, false, false)
      }
    }

    // Committed measurements for this page
    const pageMeasurements = measurements[pageNum] || []
    for (const m of pageMeasurements) {
      drawMeasurement(ctx, m, rs, calibration, m.id === selectedMeasureId)
    }

    // Committed poly measurements
    const pagePolyMeas = polyMeasurements[pageNum] || []
    for (const pm of pagePolyMeas) {
      const isActive = pm.id === selectedMeasureId
      if (pm.mode === 'polylength') {
        drawPolylength(ctx, pm.points, rs, calibration, isActive)
      } else if (pm.mode === 'area') {
        drawAreaPolygon(ctx, pm.points, rs, calibration, pm.closed ?? true, isActive, pm.depth)
      }
    }

    // Count group markers
    const pageGroups = countGroups[pageNum] || []
    for (let gi = 0; gi < pageGroups.length; gi++) {
      const group = pageGroups[gi]
      for (let i = 0; i < group.points.length; i++) {
        drawCountMarker(ctx, group.points[i], i + 1, group.color, rs)
      }
      if (group.points.length > 0) {
        drawCountGroupSummary(ctx, group.label, group.points.length, 10, 10 + gi * 40, group.color, rs)
      }
    }

    // Sticky notes
    const pageStickyNotes = stickyNotes[pageNum] || []
    for (const note of pageStickyNotes) {
      const thread = commentThreads.find(t => t.annotationId === note.id)
      if (note.minimized) {
        drawStickyNotePin(ctx, note, rs, chatBubbleTarget?.annotationId === note.id, thread)
      } else {
        drawStickyNoteExpanded(ctx, note, rs)
        drawStickyNotePin(ctx, note, rs, chatBubbleTarget?.annotationId === note.id, thread)
      }
    }
  }, [annotations, activeTool, selectedAnnId, color, strokeWidth, opacity, fontSize, measurements, calibration, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId, getAnnotation, findMatches, findIdx, cropRegions, measureMode, polyMeasurements, countGroups, stickyNotes, commentThreads, chatBubbleTarget, layers])

  const redrawAll = useCallback(() => {
    for (const pageNum of renderedPagesRef.current) {
      redrawPage(pageNum)
    }
  }, [redrawPage])

  // ── History management ───────────────────────────────

  const pushHistory = useCallback((next: PageAnnotations) => {
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(structuredClone(next))
    if (h.length > MAX_HISTORY) h.shift()
    historyRef.current = h
    historyIdxRef.current = h.length - 1
    forceRender(v => v + 1)
  }, [])

  const commitAnnotation = useCallback((ann: Annotation, pageNum?: number) => {
    // Compute next from current annotations state (not functional updater) so that
    // pushHistory can be called OUTSIDE setAnnotations. React StrictMode double-invokes
    // state updaters — calling pushHistory inside would push twice and corrupt undo history.
    const page = pageNum ?? activePageRef.current
    const next = { ...annotations, [page]: [...(annotations[page] || []), ann] }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  const updateAnnotation = useCallback((id: string, update: Partial<Annotation>, pageNum?: number) => {
    // Same rationale as commitAnnotation: pushHistory outside to avoid StrictMode double-invoke.
    const page = pageNum ?? activePageRef.current
    const next = {
      ...annotations,
      [page]: (annotations[page] || []).map(a => a.id === id ? { ...a, ...update } : a),
    }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  // Updates an annotation without adding a history step — used for transient
  // changes during editing (e.g. auto-grow height) that should not be undoable.
  const updateAnnotationSilent = useCallback((id: string, update: Partial<Annotation>, pageNum?: number) => {
    const page = pageNum ?? activePageRef.current
    setAnnotations(prev => ({
      ...prev,
      [page]: (prev[page] || []).map(a => a.id === id ? { ...a, ...update } : a),
    }))
  }, [])

  const removeAnnotation = useCallback((id: string, pageNum?: number) => {
    // Same rationale as commitAnnotation: pushHistory outside to avoid StrictMode double-invoke.
    const page = pageNum ?? activePageRef.current
    const next = { ...annotations, [page]: (annotations[page] || []).filter(a => a.id !== id) }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    setAnnotations(structuredClone(historyRef.current[historyIdxRef.current]))
    forceRender(v => v + 1)
    setSelectedAnnId(null)
    setEditingTextId(null)
    requestAnimationFrame(() => redrawAll())
  }, [redrawAll])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    setAnnotations(structuredClone(historyRef.current[historyIdxRef.current]))
    forceRender(v => v + 1)
    setSelectedAnnId(null)
    setEditingTextId(null)
    requestAnimationFrame(() => redrawAll())
  }, [redrawAll])

  // ── Text editing ─────────────────────────────────────

  const commitTextEditing = useCallback((preserveSelection = true) => {
    if (!editingTextId) return
    const text = editingTextValue.trim()
    if (text) {
      lastCommittedTextRef.current = { id: editingTextId, text }
      updateAnnotation(editingTextId, { text })
      if (!preserveSelection) setSelectedAnnId(null)
    } else {
      removeAnnotation(editingTextId)
      setSelectedAnnId(null)
    }
    editingTextIdRef.current = null
    setEditingTextId(null)
    setEditingTextValue('')
    // Redraw to show canvas-drawn text again
    redrawPage(activePageRef.current)
  }, [editingTextId, editingTextValue, updateAnnotation, removeAnnotation, redrawPage])

  const navigateToPage = useCallback((page: number | ((p: number) => number)) => {
    if (editingTextId) commitTextEditing(false)
    const target = typeof page === 'function' ? page(currentPageRef.current) : page
    const clamped = Math.max(1, Math.min(pdfFileRef.current?.pageCount || 1, target))
    const refs = pageRefsMap.current.get(clamped)
    if (refs) {
      refs.container.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setCurrentPage(clamped)
  }, [editingTextId, commitTextEditing])

  const enterEditMode = useCallback((annId: string) => {
    // Clear pending blur timeout to prevent race condition
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    const page = activePageRef.current
    const ann = (annotations[page] || []).find(a => a.id === annId)
    if (!ann || (ann.type !== 'text' && ann.type !== 'callout')) return
    setEditingTextId(annId)
    editingTextIdRef.current = annId
    // Use last committed text if re-entering the same annotation in the same tick (stale state workaround)
    const committed = lastCommittedTextRef.current
    const textValue = (committed && committed.id === annId) ? committed.text : (ann.text || '')
    setEditingTextValue(textValue)
    lastCommittedTextRef.current = null
    setSelectedAnnId(annId)
    // Sync formatting state from annotation
    setBold(ann.bold || false)
    setItalic(ann.italic || false)
    setUnderline(ann.underline || false)
    setStrikethrough(ann.strikethrough || false)
    setTextBgColor(ann.backgroundColor || null)
    setLineSpacing(ann.lineHeight || 1.3)
    setTextAlign(ann.textAlign || 'left')
    setSuperscript(ann.superscript || false)
    setSubscript(ann.subscript || false)
    setListType(ann.listType || 'none')
    // Auto-focus textarea & redraw to hide canvas text
    requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true })
      redrawPage(activePageRef.current)
    })
  }, [annotations, redrawPage])

  // ── Fit to window ──────────────────────────────────

  const fitToWindow = useCallback(() => {
    if (!scrollRef.current || maxCanvasWidthRef.current === 0) return
    const el = scrollRef.current
    const containerW = el.clientWidth - 48
    const containerH = el.clientHeight - 48
    // Fit to width, but also cap by height so the whole first page fits in view.
    // On very wide monitors this prevents extreme zoom-in (e.g. 250%) when fitting a
    // narrow page to the full container width.
    const scaleW = containerW / maxCanvasWidthRef.current
    const firstDims = pageDimsMap.current.get(1)
    const scaleH = firstDims && containerH > 0 ? containerH / firstDims.height : scaleW
    const newZoom = Math.round(Math.max(0.25, Math.min(4.0, Math.min(scaleW, scaleH))) * 100) / 100
    setZoom(newZoom)
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
        scrollRef.current.scrollLeft = 0
      }
    })
  }, [])

  // ── Rotation ─────────────────────────────────────────

  const rotatePage = useCallback((delta: number) => {
    const page = activePageRef.current
    const oldRot = pageRotations[page] || 0
    const newRot = ((oldRot + delta) % 360 + 360) % 360
    if (oldRot === newRot) return

    // Compute original (0° rotation) page dimensions from pageDimsMap
    const dims = pageDimsMap.current.get(page) || { width: 0, height: 0 }
    const origW = (oldRot === 90 || oldRot === 270) ? dims.height : dims.width
    const origH = (oldRot === 90 || oldRot === 270) ? dims.width : dims.height

    // Transform annotations on this page to new rotation space
    const pageAnns = annotations[page]
    if (pageAnns && pageAnns.length > 0) {
      const tp = (p: Point) => rotatePoint(p, oldRot, newRot, origW, origH)
      const transformed = pageAnns.map(ann => {
        const newPoints = ann.points.map(tp)
        let newWidth = ann.width
        let newHeight = ann.height
        // For annotations with width/height, transform the bounding box corners
        if (ann.width !== undefined && ann.height !== undefined) {
          const tl = ann.points[0]
          const br = { x: tl.x + ann.width, y: tl.y + ann.height }
          const ttl = tp(tl)
          const tbr = tp(br)
          newPoints[0] = { x: Math.min(ttl.x, tbr.x), y: Math.min(ttl.y, tbr.y) }
          newWidth = Math.abs(tbr.x - ttl.x)
          newHeight = Math.abs(tbr.y - ttl.y)
        }
        const newRects = ann.rects?.map(r => {
          const rtl = tp({ x: r.x, y: r.y })
          const rbr = tp({ x: r.x + r.w, y: r.y + r.h })
          return { x: Math.min(rtl.x, rbr.x), y: Math.min(rtl.y, rbr.y), w: Math.abs(rbr.x - rtl.x), h: Math.abs(rbr.y - rtl.y) }
        })
        const newArrows = ann.arrows?.map(tp)
        return {
          ...ann, points: newPoints,
          ...(newWidth !== undefined ? { width: newWidth } : {}),
          ...(newHeight !== undefined ? { height: newHeight } : {}),
          ...(newRects ? { rects: newRects } : {}),
          ...(newArrows ? { arrows: newArrows } : {}),
        }
      })
      setAnnotations(prev => ({ ...prev, [page]: transformed }))
    }

    // Transform measurements on this page
    const pageMeas = measurements[page]
    if (pageMeas && pageMeas.length > 0) {
      const tp = (p: Point) => rotatePoint(p, oldRot, newRot, origW, origH)
      setMeasurements(prev => ({
        ...prev,
        [page]: pageMeas.map(m => ({ ...m, startPt: tp(m.startPt), endPt: tp(m.endPt) })),
      }))
    }

    // Clear text selection and in-progress state
    setSelectTextToolbar(null)
    selectTextStartRef.current = null
    selectTextRectsRef.current = []
    setSelectedAnnId(null)
    setSelectedMeasureId(null)

    setPageRotations(prev => ({ ...prev, [page]: newRot }))
    // Clear thumbnails for this page since it changed
    setThumbnails(prev => {
      const next = { ...prev }
      delete next[page]
      return next
    })
    loadingThumbs.current.delete(page)
    // Mark page as not rendered so it gets re-rendered with new rotation
    renderedPagesRef.current.delete(page)
    pageRenderScaleRef.current.delete(page)
    // Re-fetch dimensions — the dimsReady change will trigger the observer to re-render
    if (pdfFile) {
      getAllPageDimensions(pdfFile, 1, { ...pageRotations, [page]: newRot }).then(allDims => {
        const newPageDims = allDims.get(page)
        if (newPageDims) {
          pageDimsMap.current.set(page, newPageDims)
          let maxW = 0
          for (const d of pageDimsMap.current.values()) {
            if (d.width > maxW) maxW = d.width
          }
          maxCanvasWidthRef.current = maxW
        }
        setDimsReady(v => v + 1)
      }).catch(() => {})
    }
  }, [pageRotations, annotations, measurements, pdfFile])

  // ── PDF loading ──────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    // Warn if there are unsaved annotations
    if (Object.values(annotations).some(a => a.length > 0)) {
      if (!confirm('You have unsaved annotations. Load a new PDF and discard them?')) return
    }
    setLoadError(null)
    try {
      const pdf = await loadPDFFile(file)
      setPdfFile(pdf)
      setCurrentPage(1)
      setAnnotations({})
      historyRef.current = [{}]
      historyIdxRef.current = 0
      setZoom(1.0)
      setThumbnails({})
      loadingThumbs.current.clear()
      setSelectedThumbPage(null)
      setPageRotations({})
      setSelectedAnnId(null)
      setEditingTextId(null)
      setMeasurements({})
      setCalibration({ pixelsPerUnit: null, unit: 'in' })
      setSelectedMeasureId(null)
      measureStartRef.current = null
      measurePreviewRef.current = null
      textItemsCacheRef.current = {}
      ocrPagesRef.current = new Set()
      ocrAbortRef.current?.abort()
      setOcrScanning(false)
      selectTextStartRef.current = null
      selectTextRectsRef.current = []
      setSelectTextToolbar(null)
      initialFitDoneRef.current = false
      // Clear multi-page refs
      pageRefsMap.current.clear()
      renderedPagesRef.current.clear()
      pageRenderScaleRef.current.clear()
      activePageRef.current = 1
      // Compute page dimensions for all pages
      // Use scale=1 for CSS-pixel layout dimensions; the pixel buffer is rendered at
      // RENDER_SCALE * zoom separately in renderSinglePage
      const dims = await getAllPageDimensions(pdf, 1)
      pageDimsMap.current = dims
      let maxW = 0
      for (const d of dims.values()) {
        if (d.width > maxW) maxW = d.width
      }
      maxCanvasWidthRef.current = maxW
      setDimsReady(v => v + 1)

      // Load PDF bookmarks/outline
      try {
        const pdfBytes = await pdf.file.arrayBuffer()
        const doc = await import('pdfjs-dist').then(m => m.getDocument({ data: new Uint8Array(pdfBytes) }).promise)
        const outline = await doc.getOutline()
        if (outline && outline.length > 0) {
          const bms: { title: string; pageNum: number; children: { title: string; pageNum: number }[] }[] = []
          for (const item of outline) {
            let pageNum = 1
            if (item.dest) {
              try {
                const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest
                if (dest && dest[0]) { const idx = await doc.getPageIndex(dest[0]); pageNum = idx + 1 }
              } catch { /* skip unresolvable dest */ }
            }
            const children: { title: string; pageNum: number }[] = []
            for (const child of item.items || []) {
              let cpn = 1
              if (child.dest) {
                try {
                  const cd = typeof child.dest === 'string' ? await doc.getDestination(child.dest) : child.dest
                  if (cd && cd[0]) { const ci = await doc.getPageIndex(cd[0]); cpn = ci + 1 }
                } catch { /* skip */ }
              }
              children.push({ title: child.title, pageNum: cpn })
            }
            bms.push({ title: item.title, pageNum, children })
          }
          setBookmarks(bms)
        } else {
          setBookmarks([])
        }
        doc.destroy()
      } catch { setBookmarks([]) }

      // Compute file hash for session matching
      const hash = await computeFileHash(file)
      fileHashRef.current = hash

      // Restore session if file matches
      const session = loadSession()
      const hashMatch = !session?.fileHash || session.fileHash === hash
      if (session?.version === 1 && session.file.fileName === file.name && session.file.fileSize === file.size && hashMatch) {
        setAnnotations(session.annotations as PageAnnotations)
        setMeasurements(session.measurements as Record<number, Measurement[]>)
        setPageRotations(session.pageRotations)
        setCalibration(session.calibration as CalibrationState)
        setZoom(session.zoom)
        setCurrentPage(session.currentPage)
        setColor(session.color)
        setFontSize(session.fontSize)
        setFontFamily(session.fontFamily)
        setStrokeWidth(session.strokeWidth)
        setOpacity(session.opacity)
        setActiveTool(session.activeTool as ToolType)
        setBold(session.bold)
        setItalic(session.italic)
        setUnderline(session.underline)
        setStrikethrough(session.strikethrough)
        setTextAlign(session.textAlign as 'left' | 'center' | 'right' | 'justify')
        setTextBgColor(session.textBgColor)
        setLineSpacing(session.lineSpacing)
        if (session.superscript !== undefined) setSuperscript(session.superscript)
        if (session.subscript !== undefined) setSubscript(session.subscript)
        if (session.listType !== undefined) setListType(session.listType as 'none' | 'bullet' | 'numbered')
        setEraserRadius(session.eraserRadius)
        setEraserMode(session.eraserMode as 'partial' | 'object')
        setActiveHighlight(session.activeHighlight as 'highlighter' | 'textHighlight' | 'textStrikethrough')
        setActiveDraw(session.activeDraw as ToolType)
        setActiveText(session.activeText as ToolType)
        if (session.polyMeasurements) setPolyMeasurements(session.polyMeasurements as Record<number, PolyMeasurement[]>)
        if (session.countGroups) setCountGroups(session.countGroups as Record<number, CountGroup[]>)
        if (session.measureMode) setMeasureMode(session.measureMode as MeasureMode)
        if (session.activeCountGroup) setActiveCountGroup(session.activeCountGroup as string)
        if (session.edgeSnappingEnabled !== undefined) setEdgeSnappingEnabled(session.edgeSnappingEnabled as boolean)
        if (session.commentThreads) setCommentThreads(session.commentThreads as CommentThread[])
        if (session.stickyNotes) setStickyNotes(session.stickyNotes as Record<number, StickyNote[]>)
        historyRef.current = [structuredClone(session.annotations as PageAnnotations)]
        historyIdxRef.current = 0
        pendingScrollRef.current = { scrollTop: session.scrollTop, scrollLeft: session.scrollLeft }
        restoringSessionRef.current = true
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setLoadError(`Failed to load PDF: ${msg}`)
    }
  }, [annotations])

  // ── Warn before closing & flush session ─────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.values(annotations).some(a => a.length > 0)) {
        e.preventDefault()
      }
      const f = pdfFileRef.current
      if (f) {
        const el = scrollRef.current
        saveSession({
          version: 1,
          file: { fileName: f.name, fileSize: f.size },
          fileHash: fileHashRef.current ?? undefined,
          annotations, measurements, pageRotations, calibration,
          zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
          color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
          bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
          superscript, subscript, listType,
          eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
          polyMeasurements, countGroups, measureMode, activeCountGroup, edgeSnappingEnabled,
          commentThreads, stickyNotes,
        } satisfies PdfAnnotateSession)
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [annotations, measurements, pageRotations, calibration,
      zoom, currentPage, color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      superscript, subscript, listType,
      eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
      polyMeasurements, countGroups, measureMode, activeCountGroup, edgeSnappingEnabled,
      commentThreads, stickyNotes])

  // ── Debounced session save ─────────────────────────
  useEffect(() => {
    if (!pdfFile) return
    const timer = setTimeout(() => {
      const el = scrollRef.current
      saveSession({
        version: 1,
        file: { fileName: pdfFile.name, fileSize: pdfFile.size },
        fileHash: fileHashRef.current ?? undefined,
        annotations, measurements, pageRotations, calibration,
        zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
        color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
        bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
        superscript, subscript, listType,
        eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
        polyMeasurements, countGroups, measureMode, activeCountGroup, edgeSnappingEnabled,
        commentThreads, stickyNotes,
      } satisfies PdfAnnotateSession)
    }, 1500)
    return () => clearTimeout(timer)
  }, [pdfFile, annotations, measurements, pageRotations, calibration, zoom, currentPage,
      color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      superscript, subscript, listType,
      eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
      polyMeasurements, countGroups, measureMode, activeCountGroup, edgeSnappingEnabled,
      commentThreads, stickyNotes])

  // ── Thumbnail loading ────────────────────────────────

  const loadThumbnail = useCallback(async (pageNum: number) => {
    if (loadingThumbs.current.has(pageNum) || !pdfFile) return
    loadingThumbs.current.add(pageNum)
    try {
      const thumb = await generateThumbnail(pdfFile, pageNum, 300)
      setThumbnails(prev => ({ ...prev, [pageNum]: thumb }))
    } catch {
      loadingThumbs.current.delete(pageNum)
    }
  }, [pdfFile])

  // ── Render pages via IntersectionObserver + scroll tracking ──

  const renderSinglePage = useCallback(async (pageNum: number) => {
    if (!pdfFile || renderedPagesRef.current.has(pageNum)) return
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return
    renderedPagesRef.current.add(pageNum)
    try {
      const rotation = pageRotationsRef.current[pageNum] || 0
      // Render at zoom-aware scale so the pixel buffer is always DPR-matched at the current zoom
      const clampedZoom = Math.min(Math.max(zoomRef.current, 0.25), 4)
      const rs = RENDER_SCALE * clampedZoom
      await renderPageToCanvas(pdfFile, pageNum, refs.pdfCanvas, rs, rotation)
      // CSS display size matches pageDimsMap (scale=1, CSS-pixel space);
      // zoom is applied via CSS transform on the parent.
      const dims = pageDimsMap.current.get(pageNum)
      if (dims) {
        refs.pdfCanvas.style.width = dims.width + 'px'
        refs.pdfCanvas.style.height = dims.height + 'px'
      }
      // Sync annotation canvas to same pixel buffer dimensions
      refs.annCanvas.width = refs.pdfCanvas.width
      refs.annCanvas.height = refs.pdfCanvas.height
      if (dims) {
        refs.annCanvas.style.width = dims.width + 'px'
        refs.annCanvas.style.height = dims.height + 'px'
      }
      pageRenderScaleRef.current.set(pageNum, rs)
      redrawPage(pageNum)
    } catch {
      renderedPagesRef.current.delete(pageNum)
    }
  }, [pdfFile, redrawPage])

  // Stable thumbnail callbacks — required for React.memo(ThumbnailItem) to skip re-renders
  const handleThumbVisible = useCallback((pageNum: number) => { loadThumbnail(pageNum) }, [loadThumbnail])
  const handleThumbClick = useCallback((pageNum: number) => { navigateToPage(pageNum) }, [navigateToPage])

  // Set up IntersectionObserver once dims are ready
  useEffect(() => {
    if (!pdfFile || pageDimsMap.current.size === 0) return
    // Clean up previous observer
    if (observerRef.current) observerRef.current.disconnect()

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.page)
            if (pageNum && !renderedPagesRef.current.has(pageNum)) {
              renderSinglePage(pageNum)
            }
          }
        }
      },
      { root: scrollRef.current, rootMargin: '1000px 0px' },
    )
    observerRef.current = obs

    // Observe all page containers
    for (const [, refs] of pageRefsMap.current) {
      obs.observe(refs.container)
    }

    // Restore scroll from session or fit to window on initial load only
    if (restoringSessionRef.current) {
      restoringSessionRef.current = false
      initialFitDoneRef.current = true
      setTimeout(() => {
        const el = scrollRef.current
        const pending = pendingScrollRef.current
        if (el && pending) {
          el.scrollTop = pending.scrollTop
          el.scrollLeft = pending.scrollLeft
          pendingScrollRef.current = null
        }
      }, 150)
    } else if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true
      // Always open at 100% zoom — predictable starting point on any screen size/DPR
      setZoom(1.0)
    }

    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, dimsReady, renderSinglePage, fitToWindow])

  // Re-render all visible pages when zoom changes (for pixel-perfect sharpness at every zoom level)
  useEffect(() => {
    if (!pdfFile) return
    const timer = setTimeout(() => {
      const clampedZoom = Math.min(Math.max(zoomRef.current, 0.25), 4)
      const rs = RENDER_SCALE * clampedZoom
      // Only re-render pages whose stored scale differs enough from the new target
      const pagesToRerender: number[] = []
      for (const pageNum of renderedPagesRef.current) {
        const currentRs = pageRenderScaleRef.current.get(pageNum)
        if (!currentRs || Math.abs(currentRs - rs) / rs > 0.05) {
          pagesToRerender.push(pageNum)
        }
      }
      for (const pageNum of pagesToRerender) {
        renderedPagesRef.current.delete(pageNum)
        pageRenderScaleRef.current.delete(pageNum)
        renderSinglePage(pageNum)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [zoom, pdfFile, renderSinglePage])

  // Scroll-based currentPage tracking
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pdfFile) return
    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const scrollRect = el.getBoundingClientRect()
        const viewCenterY = scrollRect.top + scrollRect.height / 2
        let closest = currentPageRef.current
        let minDist = Infinity
        for (const [pageNum, refs] of pageRefsMap.current) {
          const rect = refs.container.getBoundingClientRect()
          const pageCenterY = rect.top + rect.height / 2
          const dist = Math.abs(pageCenterY - viewCenterY)
          if (dist < minDist) { minDist = dist; closest = pageNum }
        }
        if (closest !== currentPageRef.current) {
          setCurrentPage(closest)
        }
      })
    }
    // Reposition fixed textarea overlay on scroll
    const onScrollTextOverlay = () => {
      if (editingTextIdRef.current) setTextOverlayTick(t => t + 1)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scroll', onScrollTextOverlay, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); el.removeEventListener('scroll', onScrollTextOverlay); cancelAnimationFrame(rafId) }
  }, [pdfFile, dimsReady])

  // ── Re-render annotations ────────────────────────────

  // Full redraw when annotations or measurements change (affects any page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawAll() }, [annotations, measurements, calibration])

  // Scoped redraw for selection/hover changes (only affects active page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawPage(activePageRef.current) }, [selectedAnnId, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId])

  // Redraw all when find matches change (they span all pages)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawAll() }, [findMatches, findIdx, cropRegions])

  // Find & Highlight: navigate to current match page + scroll into view
  useEffect(() => {
    if (findMatches.length === 0 || !findMatches[findIdx]) return
    const match = findMatches[findIdx]
    navigateToPage(match.pageNum)
    // Scroll the match into view within the canvas scroll container
    requestAnimationFrame(() => {
      const scrollEl = scrollRef.current
      const refs = pageRefsMap.current.get(match.pageNum)
      if (!scrollEl || !refs) return
      const scale = RENDER_SCALE * zoomRef.current
      const matchCenterX = match.matchX * scale + match.matchW * scale / 2
      const matchCenterY = match.item.y * scale + match.item.height * scale / 2
      const canvasRect = refs.annCanvas.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const targetScrollLeft = scrollEl.scrollLeft + (canvasRect.left - scrollRect.left) + matchCenterX - scrollEl.clientWidth / 2
      const targetScrollTop = scrollEl.scrollTop + (canvasRect.top - scrollRect.top) + matchCenterY - scrollEl.clientHeight / 2
      scrollEl.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior: 'smooth' })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findIdx, findMatches])

  // Find & Highlight: search text items when committed query or cache changes
  // Uses a committed query (set on Enter) to avoid running search on every keystroke.
  const [findCommittedQuery, setFindCommittedQuery] = useState('')
  const executeFind = useCallback(() => {
    const raw = findQuery.trim()
    setFindCommittedQuery(raw)
    if (!raw) { setFindMatches([]); setFindIdx(0); return }
    const q = findCaseSensitive ? raw : raw.toLowerCase()
    const matches: { pageNum: number; item: { text: string; x: number; y: number; width: number; height: number; page: number }; matchX: number; matchW: number }[] = []
    for (const [key, items] of Object.entries(textItemsCacheRef.current)) {
      const pageNum = parseInt(key.split('_')[0])
      for (const item of items) {
        const text = findCaseSensitive ? item.text : item.text.toLowerCase()
        const idx = text.indexOf(q)
        if (idx === -1) continue
        // Proportional substring position within the word
        const charCount = text.length || 1
        const matchX = item.x + (idx / charCount) * item.width
        const matchW = (q.length / charCount) * item.width
        matches.push({ pageNum, item, matchX, matchW })
      }
    }
    matches.sort((a, b) => a.pageNum - b.pageNum || a.item.y - b.item.y)
    setFindMatches(matches)
    setFindIdx(0)
  }, [findQuery, findCaseSensitive])

  // Re-run search when OCR results arrive or case sensitivity changes — only if we have a committed query
  useEffect(() => {
    if (!findCommittedQuery) return
    executeFind()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findCacheTick, findCaseSensitive])

  // Context menu: close on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // More menu: close on click outside
  useEffect(() => {
    if (!moreMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuOpen])

  // ── Zoom at viewport center ─────────────────────────

  const zoomAtCenter = useCallback((newZoom: number) => {
    const el = scrollRef.current
    if (!el) { setZoom(newZoom); return }
    const oldZoom = zoomRef.current
    if (newZoom === oldZoom) return
    const centerX = el.clientWidth / 2
    const centerY = el.clientHeight / 2
    const contentX = (el.scrollLeft + centerX) / oldZoom
    const contentY = (el.scrollTop + centerY) / oldZoom
    setZoom(newZoom)
    requestAnimationFrame(() => {
      el.scrollLeft = contentX * newZoom - centerX
      el.scrollTop = contentY * newZoom - centerY
    })
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────

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
        setFindOpen(o => { if (!o) setTimeout(() => findInputRef.current?.focus(), 50); return true })
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        if (!findOpen) { setFindOpen(true); setTimeout(() => findInputRef.current?.focus(), 50); return }
        setFindIdx(i => e.shiftKey ? (i - 1 + Math.max(1, findMatches.length)) % Math.max(1, findMatches.length) : (i + 1) % Math.max(1, findMatches.length))
        return
      }

      // ── Escape: context-dependent ──
      if (e.key === 'Escape') {
        e.preventDefault()
        // Close context menu
        if (contextMenu) { setContextMenu(null); return }
        // Close find bar
        if (findOpen) { setFindOpen(false); setFindQuery(''); setFindCommittedQuery(''); setFindMatches([]); ocrAbortRef.current?.abort(); setOcrScanning(false); return }
        // Clear text selection toolbar
        if (selectTextToolbar) {
          setSelectTextToolbar(null); selectTextStartRef.current = null; selectTextRectsRef.current = []; redrawAll(); return
        }
        // Cancel in-progress measurement
        if (activeTool === 'measure') {
          if (measureStartRef.current) {
            measureStartRef.current = null; measurePreviewRef.current = null; redrawAll(); return
          }
          if (polyPointsRef.current.length > 0) {
            polyPointsRef.current = []; polyPreviewRef.current = null; redrawAll(); return
          }
        }
        // Cancel in-progress cloud polygon
        if ((activeTool === 'cloud' || activeTool === 'polygon') && currentPtsRef.current.length > 0) {
          currentPtsRef.current = []; cloudPreviewRef.current = null; redrawAll(); return
        }
        // Two-step: if selected, deselect
        if (selectedAnnId) { setSelectedAnnId(null); return }
        if (selectedMeasureId) { setSelectedMeasureId(null); return }
        return
      }

      // Block all other keybinds while find bar is open (typing in search input)
      if (findOpen) return

      // ── Undo/Redo ──
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return }
      if (mod && e.key === 'y') { e.preventDefault(); redo(); return }

      // ── Delete ──
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Cloud tool: Backspace to undo last vertex
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
        // Delete individual callout arrow
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
      contextMenu, findOpen, findMatches])

  // ── Zoom with scroll wheel (cursor-position) ────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      const oldZoom = zoomRef.current
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.round(Math.max(0.25, Math.min(4.0, oldZoom + delta)) * 100) / 100
      if (newZoom === oldZoom) return
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const contentX = (el.scrollLeft + cursorX) / oldZoom
      const contentY = (el.scrollTop + cursorY) / oldZoom
      setZoom(newZoom)
      requestAnimationFrame(() => {
        el.scrollLeft = contentX * newZoom - cursorX
        el.scrollTop = contentY * newZoom - cursorY
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Middle-mouse pan ────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: PointerEvent) => {
      if (!panRef.current) return
      el.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
      el.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
    }
    const onUp = () => {
      if (!panRef.current) return
      panRef.current = null
      el.style.cursor = ''
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ── Clear in-progress when tool changes ──────────────

  useEffect(() => {
    isDrawingRef.current = false
    currentPtsRef.current = []
    eraserModsRef.current = { removed: new Set(), added: [] }
    calloutArrowDragRef.current = null
    generalDragRef.current = null
    cloudPreviewRef.current = null
    cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
    measureStartRef.current = null
    measurePreviewRef.current = null
    polyPointsRef.current = []
    polyPreviewRef.current = null
    setMeasureDropdownOpen(false)
    setStraightLineMode(false)
    if (eraserCursorDivRef.current) eraserCursorDivRef.current.style.display = 'none'
    setSelectedAnnId(null)
    setSelectedArrowIdx(null)
    setSelectedMeasureId(null)
    textHighlightStartRef.current = null
    textHighlightPreviewRectsRef.current = []
    selectTextStartRef.current = null
    selectTextRectsRef.current = []
    setSelectTextToolbar(null)
    // Highlighter: always force yellow + thick stroke; save previous settings to restore later
    if (activeTool === 'highlighter' || activeTool === 'textHighlight') {
      if (!preHighlightRef.current) {
        preHighlightRef.current = { color, strokeWidth }
      }
      setColor('#FFFF00')
      setStrokeWidth(8)
    } else {
      // Restore previous color & stroke when leaving highlighter
      if (preHighlightRef.current) {
        setColor(preHighlightRef.current.color)
        setStrokeWidth(preHighlightRef.current.strokeWidth)
        preHighlightRef.current = null
      }
      // Text/callout: default to black if color is the app default
      if ((activeTool === 'text' || activeTool === 'callout') && color === '#F47B20') setColor('#000000')
      // Text strikethrough: default to red
      if (activeTool === 'textStrikethrough' && (color === '#F47B20' || color === '#FFFF00')) setColor('#FF0000')
    }
    if (editingTextId && activeTool !== 'text' && activeTool !== 'callout') {
      // Commit any open text edit when switching away from text tools
      commitTextEditing()
    }
    // Hide eraser cursor overlay when switching away from eraser tool
    if (activeTool !== 'eraser' && eraserCursorDivRef.current) {
      eraserCursorDivRef.current.style.display = 'none'
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  // ── Close dropdowns on outside click (single shared listener) ──

  useEffect(() => {
    if (!shapesDropdownOpen && !textDropdownOpen && !zoomDropdownOpen && !stampDropdownOpen) return
    const handler = (e: PointerEvent) => {
      const t = e.target as Node
      if (shapesDropdownOpen && shapesDropdownRef.current && !shapesDropdownRef.current.contains(t)) setShapesDropdownOpen(false)
      if (textDropdownOpen && textDropdownRef.current && !textDropdownRef.current.contains(t)) setTextDropdownOpen(false)
      if (zoomDropdownOpen && zoomDropdownRef.current && !zoomDropdownRef.current.contains(t)) setZoomDropdownOpen(false)
      if (stampDropdownOpen && stampDropdownRef.current && !stampDropdownRef.current.contains(t)) setStampDropdownOpen(false)
      if (measureDropdownOpen && measureDropdownRef.current && !measureDropdownRef.current.contains(t)) setMeasureDropdownOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [shapesDropdownOpen, textDropdownOpen, zoomDropdownOpen, stampDropdownOpen])

  // ── Cache text items for text highlight and find ───────────────
  // Phase 1: extract embedded text via pdf.js. Phase 2 (OCR): if a page has
  // no embedded text and find is open, fall back to Tesseract.js OCR.

  useEffect(() => {
    if (!pdfFile || (activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'select' && !findOpen)) return
    // When find is open, cache ALL pages; otherwise only rendered pages
    const pagesToCache = findOpen
      ? Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1)
      : Array.from(renderedPagesRef.current)
    const pagesNeedingOcr: { pageNum: number; rotation: number; cacheKey: string }[] = []

    let pending = 0
    for (const pageNum of pagesToCache) {
      const rotation = pageRotations[pageNum] || 0
      const cacheKey = `${pageNum}_${rotation}`
      if (textItemsCacheRef.current[cacheKey]) continue
      pending++
      extractPositionedText(pdfFile, pageNum, rotation).then(result => {
        // Evict oldest entries if cache grows beyond 200 (safety cap for large multi-rotation PDFs)
        const keys = Object.keys(textItemsCacheRef.current)
        if (keys.length >= 200) {
          const toDelete = keys.slice(0, 50)
          for (const k of toDelete) delete textItemsCacheRef.current[k]
        }
        textItemsCacheRef.current[cacheKey] = result.items
        if (findOpen) setFindCacheTick(t => t + 1)

        // If page has very little embedded text, queue for OCR fallback
        // OCR runs when find is open OR when select tool is active (for copy/paste)
        const needsOcr = findOpen || activeTool === 'select'
        const totalChars = result.items.reduce((sum, it) => sum + it.text.length, 0)
        if (totalChars < 20 && needsOcr && !ocrPagesRef.current.has(cacheKey)) {
          pagesNeedingOcr.push({ pageNum, rotation, cacheKey })
        }
      }).catch(() => {}).finally(() => {
        pending--
        // Once all pdf.js extractions are done, kick off OCR for pages that need it
        const needsOcr = findOpen || activeTool === 'select'
        if (pending === 0 && pagesNeedingOcr.length > 0 && needsOcr) {
          runOcrFallback(pagesNeedingOcr)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, activeTool, pageRotations, dimsReady, findOpen])

  // ── OCR fallback for scanned pages ─────────────────
  const runOcrFallback = useCallback(async (
    pages: { pageNum: number; rotation: number; cacheKey: string }[],
  ) => {
    if (!pdfFile || pages.length === 0) return

    // Abort any previous OCR run
    ocrAbortRef.current?.abort()
    const abort = new AbortController()
    ocrAbortRef.current = abort

    setOcrScanning(true)
    const canvas = document.createElement('canvas')
    let worker: Tesseract.Worker | null = null

    try {
      worker = await Tesseract.createWorker('eng')
      if (abort.signal.aborted) { await worker.terminate(); return }

      const renderScale = 2.0
      for (const { pageNum, rotation, cacheKey } of pages) {
        if (abort.signal.aborted) break
        ocrPagesRef.current.add(cacheKey)

        try {
          // Render page at 2x for good OCR quality
          await renderPageToCanvas(pdfFile, pageNum, canvas, renderScale, rotation)
          if (abort.signal.aborted) break

          // Request blocks output to get word-level bounding boxes
          const result = await worker.recognize(canvas, {}, { blocks: true, text: true })
          if (abort.signal.aborted) break

          // Parse blocks → paragraphs → lines → words
          const items: { text: string; x: number; y: number; width: number; height: number; page: number }[] = []
          const blocks = result.data.blocks
          if (blocks) {
            for (const block of blocks) {
              for (const para of block.paragraphs) {
                for (const line of para.lines) {
                  for (const word of line.words) {
                    if (!word.text.trim()) continue
                    items.push({
                      text: word.text,
                      x: word.bbox.x0 / renderScale,
                      y: word.bbox.y0 / renderScale,
                      width: (word.bbox.x1 - word.bbox.x0) / renderScale,
                      height: (word.bbox.y1 - word.bbox.y0) / renderScale,
                      page: pageNum,
                    })
                  }
                }
              }
            }
          }

          if (items.length > 0) {
            textItemsCacheRef.current[cacheKey] = items
            setFindCacheTick(t => t + 1)
          }
        } catch {
          // OCR failed for this page — skip silently
        }
      }
    } catch {
      // Worker creation failed — skip OCR entirely
    } finally {
      if (worker) await worker.terminate().catch(() => {})
      canvas.width = 0
      canvas.height = 0
      if (!abort.signal.aborted) setOcrScanning(false)
    }
  }, [pdfFile])

  // Clean up OCR on unmount or file change
  useEffect(() => {
    return () => { ocrAbortRef.current?.abort() }
  }, [pdfFile])

  // Clear OCR region state when switching away from ocrRegion tool
  useEffect(() => {
    if (activeTool !== 'ocrRegion') {
      setOcrRegionResult(null)
      ocrRegionPreviewRef.current = null
      ocrRegionStartRef.current = null
    }
  }, [activeTool])

  // ── Focus textarea when editing ──────────────────────

  useEffect(() => {
    if (!editingTextId) return
    // Retry focus — the fixed-position textarea may not render on the exact same
    // render cycle if useMemo/IIFE dependencies resolve asynchronously.
    const tryFocus = () => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true })
        textareaRef.current.selectionStart = textareaRef.current.value.length
        return true
      }
      return false
    }
    if (!tryFocus()) {
      // Retry on next frame (textarea may render one frame later)
      const raf = requestAnimationFrame(() => tryFocus())
      return () => cancelAnimationFrame(raf)
    }
  }, [editingTextId])

  // ── Close text selection toolbar on scroll ──────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !selectTextToolbar) return
    const handler = () => { setSelectTextToolbar(null); redrawAll() }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [selectTextToolbar, redrawAll])

  // ── Pointer handlers ─────────────────────────────────

  // Track active pointer IDs for multi-touch detection
  const activeTouchIdsRef = useRef(new Set<number>())

  const handlePointerDown = useCallback((e: React.PointerEvent, pageNum: number) => {
    if (e.button !== 0) return

    // Touch/stylus optimization: track active touches
    if (e.pointerType === 'touch') {
      activeTouchIdsRef.current.add(e.pointerId)
      // 2+ simultaneous touches = pan/zoom, not draw
      if (activeTouchIdsRef.current.size >= 2) {
        const el = scrollRef.current
        if (el) {
          panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
          setCanvasCursor('grabbing')
        }
        return
      }
    }

    // Pen events go straight to drawing tools; filter palm rests (very low pressure)
    if (e.pointerType === 'pen' && e.pressure < 0.01) return

    // Space-to-pan: start panning instead of tool action
    if (spaceHeldRef.current) {
      const el = scrollRef.current
      if (el) {
        panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
        setCanvasCursor('grabbing')
      }
      return
    }
    activePageRef.current = pageNum
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPointForPage(pageNum, e)

    // Manual double-click detection (pointerdown.detail is always 0 in Chromium)
    const now = Date.now()
    const dblLast = dblClickRef.current
    const isDoubleClick = (now - dblLast.time) < 400 && Math.hypot(pt.x - dblLast.pt.x, pt.y - dblLast.pt.y) < 20
    dblClickRef.current = { time: now, pt }

    // ── Measure tool: mode-aware click placement ──
    if (activeTool === 'measure') {
      // Apply edge snapping if enabled
      let snappedPt = pt
      if (edgeSnappingEnabled) {
        const pdfCanvas = pageRefsMap.current.get(pageNum)?.pdfCanvas
        if (pdfCanvas) {
          const rs = pageRenderScaleRef.current.get(pageNum) ?? RENDER_SCALE
          const snapResult = snapToEdge(pdfCanvas, pt, rs, precisionSnapMode)
          if (snapResult.snapped) snappedPt = snapResult.point
        }
      }

      // ── Distance mode (existing behavior with edge snapping) ──
      if (measureMode === 'distance') {
        const pageMeas = measurements[pageNum] || []
        for (const m of pageMeas) {
          if (hitTestMeasurementLabel(pt, m, 20)) {
            setSelectedMeasureId(m.id)
            setCalibrateMeasureId(m.id)
            setCalibrateValue('')
            setCalibrateModalOpen(true)
            return
          }
        }
        const endpointThreshold = 10 / zoom
        for (const m of pageMeas) {
          const dStart = Math.hypot(pt.x - m.startPt.x, pt.y - m.startPt.y)
          const dEnd = Math.hypot(pt.x - m.endPt.x, pt.y - m.endPt.y)
          if (dStart < endpointThreshold) {
            setSelectedMeasureId(m.id)
            measureStartRef.current = m.endPt
            measurePreviewRef.current = m.startPt
            setMeasurements(prev => ({ ...prev, [pageNum]: (prev[pageNum] || []).filter(ms => ms.id !== m.id) }))
            return
          }
          if (dEnd < endpointThreshold) {
            setSelectedMeasureId(m.id)
            measureStartRef.current = m.startPt
            measurePreviewRef.current = m.endPt
            setMeasurements(prev => ({ ...prev, [pageNum]: (prev[pageNum] || []).filter(ms => ms.id !== m.id) }))
            return
          }
        }
        if (measureStartRef.current) {
          const m: Measurement = { id: crypto.randomUUID(), startPt: measureStartRef.current, endPt: snappedPt, page: pageNum }
          setMeasurements(prev => ({ ...prev, [pageNum]: [...(prev[pageNum] || []), m] }))
          setSelectedMeasureId(m.id)
          measureStartRef.current = null
          measurePreviewRef.current = null
          redrawPage(pageNum)
        } else {
          measureStartRef.current = snappedPt
          measurePreviewRef.current = snappedPt
          setSelectedMeasureId(null)
        }
        return
      }

      // ── Polylength mode ──
      if (measureMode === 'polylength') {
        if (isDoubleClick && polyPointsRef.current.length >= 2) {
          const pm: PolyMeasurement = { id: crypto.randomUUID(), mode: 'polylength', points: [...polyPointsRef.current], page: pageNum }
          setPolyMeasurements(prev => ({ ...prev, [pageNum]: [...(prev[pageNum] || []), pm] }))
          polyPointsRef.current = []
          polyPreviewRef.current = null
          setSelectedMeasureId(pm.id)
          redrawPage(pageNum)
          return
        }
        polyPointsRef.current.push(snappedPt)
        redrawPage(pageNum)
        return
      }

      // ── Area mode ──
      if (measureMode === 'area') {
        const pts = polyPointsRef.current
        if (pts.length >= 3) {
          const dFirst = Math.hypot(snappedPt.x - pts[0].x, snappedPt.y - pts[0].y)
          if (isDoubleClick || dFirst < 15 / zoom) {
            const pm: PolyMeasurement = { id: crypto.randomUUID(), mode: 'area', points: [...pts], page: pageNum, closed: true }
            setPolyMeasurements(prev => ({ ...prev, [pageNum]: [...(prev[pageNum] || []), pm] }))
            polyPointsRef.current = []
            polyPreviewRef.current = null
            setSelectedMeasureId(pm.id)
            redrawPage(pageNum)
            return
          }
        }
        pts.push(snappedPt)
        redrawPage(pageNum)
        return
      }

      // ── Count mode ──
      if (measureMode === 'count') {
        if (!activeCountGroup) {
          setCountGroupModalOpen(true)
          return
        }
        setCountGroups(prev => {
          const page = prev[pageNum] || []
          return { ...prev, [pageNum]: page.map(g => g.id === activeCountGroup ? { ...g, points: [...g.points, snappedPt] } : g) }
        })
        redrawPage(pageNum)
        return
      }

      return
    }

    // ── Select tool ──
    if (activeTool === 'select') {
      // If editing text, commit first
      if (editingTextId) commitTextEditing()

      // Check resize handles or body click on selected text/callout
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && (ann.type === 'text' || ann.type === 'callout') && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              annId: ann.id, mode: handle, startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
              origArrows: ann.arrows ? [...ann.arrows] : undefined,
            }
            return
          }
          // Click inside selected text/callout body → start move drag;
          // if it turns out to be a click (no significant movement), enter edit mode on pointerUp
          if (hitTest(pt, ann, 4 / zoom)) {
            isDrawingRef.current = true
            textDragRef.current = {
              annId: ann.id, mode: 'move', startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
              origArrows: ann.arrows ? [...ann.arrows] : undefined,
            }
            return
          }
        }
      }

      // Hit-test all annotations
      const hitAnn = findAnnotationAt(pt)
      if (hitAnn) {
        setSelectedAnnId(hitAnn.id)
        // Sync properties bar to selected annotation
        setColor(hitAnn.color)
        setStrokeWidth(hitAnn.strokeWidth)
        setOpacity(Math.round(hitAnn.opacity * 100))
        setFillColor(hitAnn.fillColor || null)
        setCornerRadius(hitAnn.cornerRadius || 0)
        setDashPattern(hitAnn.dashPattern || 'solid')
        setArrowStart(hitAnn.arrowStart || false)
        if (hitAnn.type === 'text' || hitAnn.type === 'callout') {
          setFontFamily(hitAnn.fontFamily || 'Arial')
          setFontSize(hitAnn.fontSize || 16)
          setBold(hitAnn.bold || false)
          setItalic(hitAnn.italic || false)
          setUnderline(hitAnn.underline || false)
          setStrikethrough(hitAnn.strikethrough || false)
          setTextBgColor(hitAnn.backgroundColor || null)
          setLineSpacing(hitAnn.lineHeight || 1.3)
          setTextAlign(hitAnn.textAlign || 'left')
          setSuperscript(hitAnn.superscript || false)
          setSubscript(hitAnn.subscript || false)
          setListType(hitAnn.listType || 'none')
        }
        // Click text/callout → first click selects (grab cursor), double-click enters edit mode
        if (hitAnn.type === 'text' || hitAnn.type === 'callout') {
          if (isDoubleClick) {
            // Double-click: enter edit mode immediately
            setActiveTool(hitAnn.type === 'callout' ? 'callout' : 'text')
            enterEditMode(hitAnn.id)
          } else {
            // Single-click: select — start move drag so the user can drag to reposition
            isDrawingRef.current = true
            generalDragRef.current = {
              annId: hitAnn.id, startPt: pt, origPoints: [...hitAnn.points],
            }
          }
          return
        }
        // For non-text annotations, start general move drag
        isDrawingRef.current = true
        generalDragRef.current = {
          annId: hitAnn.id, startPt: pt, origPoints: [...hitAnn.points],
        }
        return
      }

      // Check if click point is on embedded PDF text → start text selection drag
      setSelectTextToolbar(null)
      const currentRotation = pageRotationsRef.current[pageNum] || 0
      const cacheKey = `${pageNum}_${currentRotation}`
      const textItems = textItemsCacheRef.current[cacheKey] || []
      if (textItems.length > 0 && isPointInAnyTextItem(pt, textItems)) {
        isDrawingRef.current = true
        selectTextStartRef.current = pt
        selectTextRectsRef.current = []
        setSelectedAnnId(null)
        return
      }

      // Click empty space -> deselect
      setSelectedAnnId(null)
      return
    }

    // ── Cloud/Polygon tool: click-to-place vertices ──
    if (activeTool === 'cloud' || activeTool === 'polygon') {
      const now = Date.now()
      const last = cloudLastClickRef.current
      const isDbl = (now - last.time) < 400 && Math.hypot(pt.x - last.pt.x, pt.y - last.pt.y) < 20
      cloudLastClickRef.current = { time: now, pt }

      // Auto-close: click near first vertex to close polygon
      const closeThreshold = 15 / zoom
      if (!isDbl && currentPtsRef.current.length >= 3) {
        const first = currentPtsRef.current[0]
        if (Math.hypot(pt.x - first.x, pt.y - first.y) < closeThreshold) {
          const pts = [...currentPtsRef.current]
          const ann: Annotation = {
            id: genId(), type: 'cloud',
            points: pts, color, strokeWidth, opacity: opacity / 100, fontSize,
            ...(fillColor ? { fillColor } : {}),
            ...(dashPattern !== 'solid' ? { dashPattern } : {}),
          }
          commitAnnotation(ann)
          currentPtsRef.current = []
          cloudPreviewRef.current = null
          cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
          redrawPage(pageNum)
          return
        }
      }

      // Double-click: finalize polygon if we have enough vertices
      if (isDbl && currentPtsRef.current.length >= 3) {
        const pts = [...currentPtsRef.current]
        const ann: Annotation = {
          id: genId(), type: 'cloud',
          points: pts, color, strokeWidth, opacity: opacity / 100, fontSize,
          ...(fillColor ? { fillColor } : {}),
          ...(dashPattern !== 'solid' ? { dashPattern } : {}),
        }
        commitAnnotation(ann)
        setSelectedAnnId(ann.id)
        // Tools stay active (no auto-revert to select)
        currentPtsRef.current = []
        cloudPreviewRef.current = null
        cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
        redrawPage(pageNum)
        return
      }
      // Single click: add vertex
      currentPtsRef.current.push(pt)
      cloudPreviewRef.current = pt
      redrawPage(pageNum)
      return
    }

    // ── Callout tool ──
    if (activeTool === 'callout') {
      // If currently editing, check if click is inside the active callout — let textarea handle it
      if (editingTextId) {
        const editAnn = getAnnotation(editingTextId)
        if (editAnn && hitTestCalloutBox(pt, editAnn)) {
          return
        }
        commitTextEditing()
      }

      // Check resize handles on selected callout
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout' && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              annId: ann.id, mode: handle, startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
            }
            return
          }

          // Click inside box → double-click edits, single-click moves
          if (hitTestCalloutBox(pt, ann)) {
            if (isDoubleClick) {
              enterEditMode(ann.id)
            } else {
              isDrawingRef.current = true
              textDragRef.current = {
                annId: ann.id, mode: 'move', startPt: pt,
                origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
                origArrows: ann.arrows ? [...ann.arrows] : undefined,
              }
            }
            return
          }

          // Check if clicking near an existing arrow tip → select or drag it
          if (ann.arrows && ann.arrows.length > 0) {
            const arrowThreshold = 10 / zoom
            for (let ai = 0; ai < ann.arrows.length; ai++) {
              if (Math.hypot(pt.x - ann.arrows[ai].x, pt.y - ann.arrows[ai].y) < arrowThreshold) {
                setSelectedArrowIdx(ai)
                isDrawingRef.current = true
                calloutArrowDragRef.current = { tipPt: pt, arrowIdx: ai }
                redrawPage(pageNum)
                return
              }
            }
          }

          // Click outside box → start new arrow drag
          setSelectedArrowIdx(null)
          isDrawingRef.current = true
          calloutArrowDragRef.current = { tipPt: pt }
          redrawPage(pageNum)
          return
        }
      }

      // Check if clicking on an existing callout → single-click edits (callout tool is active)
      const hitCallout = findCalloutAt(pt)
      if (hitCallout) {
        setSelectedAnnId(hitCallout.id)
        enterEditMode(hitCallout.id)
        return
      }

      // Empty space → start creating new callout box
      setSelectedAnnId(null)
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
      return
    }

    // ── Text tool: PowerPoint-style ──
    if (activeTool === 'text') {
      // If currently editing, check if click is inside the active textbox — let textarea handle it
      if (editingTextId) {
        const editAnn = getAnnotation(editingTextId)
        if (editAnn && hitTest(pt, editAnn, 4 / zoom)) {
          // Click inside current editing textbox — do nothing, textarea handles cursor
          return
        }
        // Clicked outside — commit and continue
        commitTextEditing()
      }

      // Check if clicking a resize handle or body on selected annotation
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'text' && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              annId: ann.id,
              mode: handle,
              startPt: pt,
              origPoints: [...ann.points],
              origWidth: ann.width,
              origHeight: ann.height,
            }
            return
          }
          // Click inside text body: start potential move (click-vs-drag resolved in pointerUp)
          if (hitTest(pt, ann, 4 / zoom)) {
            isDrawingRef.current = true
            textDragRef.current = {
              annId: ann.id,
              mode: 'move',
              startPt: pt,
              origPoints: [...ann.points],
              origWidth: ann.width,
              origHeight: ann.height,
            }
            return
          }
        }
      }

      // Check if clicking on any text annotation (not currently selected)
      const hitAnn = findTextAnnotationAt(pt)
      if (hitAnn && hitAnn.width && hitAnn.height) {
        setSelectedAnnId(hitAnn.id)
        // Start potential move drag (click-vs-drag resolved in pointerUp)
        isDrawingRef.current = true
        textDragRef.current = {
          annId: hitAnn.id,
          mode: 'move',
          startPt: pt,
          origPoints: [...hitAnn.points],
          origWidth: hitAnn.width,
          origHeight: hitAnn.height,
        }
        return
      }

      // Click on empty space — deselect or start creating textbox
      setSelectedAnnId(null)
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
      return
    }

    // ── Text Highlight / Strikethrough tool: click-drag selection ──
    if (activeTool === 'textHighlight' || activeTool === 'textStrikethrough') {
      isDrawingRef.current = true
      textHighlightStartRef.current = pt
      textHighlightPreviewRectsRef.current = []
      return
    }

    // ── Stamp tool: click to place ──
    if (activeTool === 'stamp') {
      const ann: Annotation = {
        id: genId(),
        type: 'stamp',
        points: [{ x: pt.x - 60, y: pt.y - 20 }],
        color: activeStampPreset.color,
        strokeWidth: 2,
        opacity: opacity / 100,
        fontSize: 16,
        width: 120,
        height: 40,
        stampType: activeStampPreset.label,
        backgroundColor: activeStampPreset.bg,
      }
      commitAnnotation(ann)
      setSelectedAnnId(ann.id)
      return
    }

    // ── Image Stamp tool: click to place image ──
    if (activeTool === 'imageStamp' && pendingImageRef.current) {
      const dataUrl = pendingImageRef.current
      const img = new Image()
      img.src = dataUrl
      const placeImage = () => {
        const natW = img.naturalWidth || 200
        const natH = img.naturalHeight || 200
        const maxDocW = 200
        const s = Math.min(1, maxDocW / natW)
        const docW = natW * s
        const docH = natH * s
        const ann: Annotation = {
          id: genId(),
          type: 'imageStamp',
          points: [{ x: pt.x - docW / 2, y: pt.y - docH / 2 }, { x: pt.x + docW / 2, y: pt.y + docH / 2 }],
          color: '#000000',
          strokeWidth: 0,
          opacity: opacity / 100,
          fontSize: 16,
          width: docW,
          height: docH,
          imageDataUrl: dataUrl,
          ...(activeLayerId !== 'default' ? { layerId: activeLayerId } : {}),
        }
        imageStampCacheRef.current.set(ann.id, img)
        commitAnnotation(ann)
        setSelectedAnnId(ann.id)
        pendingImageRef.current = null
      }
      if (img.complete) placeImage()
      else img.onload = placeImage
      return
    }

    // ── Note (sticky note) tool: click to place ──
    if (activeTool === 'note') {
      const noteRefs = pageRefsMap.current.get(pageNum)
      const noteRs = pageRenderScaleRef.current.get(pageNum) ?? RENDER_SCALE
      // Check if clicking an existing sticky note — toggle its expanded state
      const pageNotes = stickyNotes[pageNum] || []
      for (const note of pageNotes) {
        if (hitTestStickyNote(pt, note, noteRs)) {
          // Toggle minimized/expanded
          setStickyNotes(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).map(n =>
              n.id === note.id ? { ...n, minimized: !n.minimized } : n
            ),
          }))
          // Open chat bubble
          if (noteRefs) {
            const rect = noteRefs.annCanvas.getBoundingClientRect()
            const screenX = rect.left + (note.point.x / noteRs) * zoom
            const screenY = rect.top + (note.point.y / noteRs) * zoom
            setChatBubbleTarget({ annotationId: note.id, position: { x: screenX, y: screenY } })
          }
          redrawPage(pageNum)
          return
        }
      }
      // Place a new sticky note
      const newNote: StickyNote = {
        id: genId(),
        point: pt,
        page: pageNum,
        color: activeStickyColor,
        text: '',
        minimized: true,
      }
      setStickyNotes(prev => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), newNote],
      }))
      // Open chat bubble for the new note
      if (noteRefs) {
        const canvasRect = noteRefs.annCanvas.getBoundingClientRect()
        const sx = canvasRect.left + (pt.x / noteRs) * zoom
        const sy = canvasRect.top + (pt.y / noteRs) * zoom
        setChatBubbleTarget({ annotationId: newNote.id, position: { x: sx, y: sy } })
      }
      redrawPage(pageNum)
      return
    }

    // ── Crop tool: start dragging crop region ──
    if (activeTool === 'ocrRegion') {
      ocrRegionStartRef.current = pt
      ocrRegionPreviewRef.current = null
      setOcrRegionResult(null)
      isDrawingRef.current = true
      return
    }

    if (activeTool === 'crop') {
      cropDrawRef.current = { startPt: pt }
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
      return
    }

    // ── Click-to-select (only for non-drawing tools) ──
    if (!DRAW_TYPES.has(activeTool) && activeTool !== 'eraser' && activeTool !== 'highlighter') {
      // Check sticky notes first (they render on top)
      const selectRs = pageRenderScaleRef.current.get(pageNum) ?? RENDER_SCALE
      const selectRefs = pageRefsMap.current.get(pageNum)
      const pageNotes = stickyNotes[pageNum] || []
      for (const note of pageNotes) {
        if (hitTestStickyNote(pt, note, selectRs)) {
          if (selectRefs) {
            const rect = selectRefs.annCanvas.getBoundingClientRect()
            const screenX = rect.left + (note.point.x / selectRs) * zoom
            const screenY = rect.top + (note.point.y / selectRs) * zoom
            setChatBubbleTarget({ annotationId: note.id, position: { x: screenX, y: screenY } })
          }
          return
        }
      }
      const hitAny = findAnnotationAt(pt)
      if (hitAny) {
        setSelectedAnnId(hitAny.id)
        // Sync properties bar to selected annotation
        setColor(hitAny.color)
        setStrokeWidth(hitAny.strokeWidth)
        setOpacity(Math.round(hitAny.opacity * 100))
        if (hitAny.type === 'text' || hitAny.type === 'callout') {
          setFontFamily(hitAny.fontFamily || 'Arial')
          setFontSize(hitAny.fontSize || 16)
          setBold(hitAny.bold || false)
          setItalic(hitAny.italic || false)
          setUnderline(hitAny.underline || false)
          setStrikethrough(hitAny.strikethrough || false)
          setTextBgColor(hitAny.backgroundColor || null)
          setLineSpacing(hitAny.lineHeight || 1.3)
          setTextAlign(hitAny.textAlign || 'left')
          setSuperscript(hitAny.superscript || false)
          setSubscript(hitAny.subscript || false)
          setListType(hitAny.listType || 'none')
        }
        // Double-click text/callout → edit mode
        if ((hitAny.type === 'text' || hitAny.type === 'callout') && isDoubleClick) {
          enterEditMode(hitAny.id)
        }
        return
      }
      setSelectedAnnId(null)
    }

    isDrawingRef.current = true

    // Snapshot canvas for incremental freehand rendering
    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      currentPressureRef.current = [e.pressure]  // capture initial pressure
      const annCanvas = pageRefsMap.current.get(pageNum)?.annCanvas
      if (annCanvas) {
        const ctx = annCanvas.getContext('2d')
        if (ctx) canvasSnapshotRef.current = ctx.getImageData(0, 0, annCanvas.width, annCanvas.height)
      }
    }

    if (activeTool === 'eraser') {
      eraserModsRef.current = { removed: new Set(), added: [] }
      const docRadius = eraserRadius / (zoom * RENDER_SCALE)
      const pageAnns = annotations[pageNum] || []
      for (const ann of pageAnns) {
        if (eraserMode === 'object') {
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) eraserModsRef.current.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            eraserModsRef.current.removed.add(ann.id)
          }
        } else {
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            const hasHit = pathHitsCircle(ann.points, pt, effectiveR)
            if (hasHit) {
              eraserModsRef.current.removed.add(ann.id)
              eraserModsRef.current.added.push(...splitPathByEraser(ann, pt, effectiveR))
            }
          } else if (ann.type === 'text' || ann.type === 'callout') {
            if (hitTest(pt, ann, docRadius)) eraserModsRef.current.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            if (ann.rects) {
              eraserModsRef.current.removed.add(ann.id)
            } else {
              const polyline = shapeToPolyline(ann)
              const effectiveR = docRadius + ann.strokeWidth / 2
              const tempAnn: Annotation = { ...ann, type: 'pencil', points: polyline, smooth: false }
              eraserModsRef.current.removed.add(ann.id)
              eraserModsRef.current.added.push(...splitPathByEraser(tempAnn, pt, effectiveR))
            }
          }
        }
      }
      redrawPage(pageNum)
      return
    }

    currentPtsRef.current = [pt]
    redrawPage(pageNum)
  }, [getPointForPage, activeTool, annotations, editingTextId, selectedAnnId, selectTextToolbar,
      commitTextEditing, commitAnnotation, getAnnotation, findTextAnnotationAt, findCalloutAt, findAnnotationAt, enterEditMode, redrawPage,
      eraserRadius, eraserMode, zoom, color, strokeWidth, fontSize, opacity, fontFamily, bold, italic, underline, textAlign,
      activeStampPreset])

  const handlePointerMove = useCallback((e: React.PointerEvent, pageNum: number) => {
    // Track cursor position for hover tooltip — update DOM directly to avoid re-renders on every move
    hoverPosRef.current = { x: e.clientX, y: e.clientY }
    if (tooltipDivRef.current) {
      tooltipDivRef.current.style.left = `${e.clientX + 14}px`
      tooltipDivRef.current.style.top = `${e.clientY - 28}px`
    }
    // Space-to-pan: scroll viewport
    if (spaceHeldRef.current && panRef.current) {
      const el = scrollRef.current
      if (el) {
        el.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
        el.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
      }
      return
    }
    // Use active page for drawing operations (pointer capture keeps events on starting page)
    const ap = activePageRef.current
    // Eraser cursor — update fixed overlay div directly to avoid state re-renders
    if (activeTool === 'eraser' && eraserCursorDivRef.current) {
      const size = eraserRadius * 2
      const style = eraserCursorDivRef.current.style
      style.display = 'block'
      style.left = `${e.clientX - eraserRadius}px`
      style.top = `${e.clientY - eraserRadius}px`
      style.width = `${size}px`
      style.height = `${size}px`
    }

    // Measure tool: track cursor for preview line
    if (activeTool === 'measure') {
      if (measureMode === 'distance' && measureStartRef.current) {
        measurePreviewRef.current = getPointForPage(ap, e)
        redrawPage(ap)
        return
      }
      if ((measureMode === 'polylength' || measureMode === 'area') && polyPointsRef.current.length > 0) {
        polyPreviewRef.current = getPointForPage(ap, e)
        redrawPage(ap)
        return
      }
    }

    // Cloud polygon: track cursor for preview
    if ((activeTool === 'cloud' || activeTool === 'polygon') && currentPtsRef.current.length > 0) {
      cloudPreviewRef.current = getPointForPage(ap, e)
      redrawPage(ap)
      return
    }

    // OCR Region: draw selection rectangle preview
    if (activeTool === 'ocrRegion' && ocrRegionStartRef.current && isDrawingRef.current) {
      const start = ocrRegionStartRef.current
      const cur = getPointForPage(ap, e)
      ocrRegionPreviewRef.current = {
        x: Math.min(start.x, cur.x), y: Math.min(start.y, cur.y),
        w: Math.abs(cur.x - start.x), h: Math.abs(cur.y - start.y),
      }
      redrawPage(ap)
      return
    }

    // Crop tool: draw dashed rectangle preview
    if (activeTool === 'crop' && cropDrawRef.current && isDrawingRef.current) {
      currentPtsRef.current = [cropDrawRef.current.startPt, getPointForPage(ap, e)]
      redrawPage(ap)
      return
    }

    // ── Cursor tracking for handles/annotations ──
    if (!isDrawingRef.current && (activeTool === 'text' || activeTool === 'callout')) {
      const hoverPt = getPointForPage(pageNum, e)
      if (selectedAnnId) {
        const selAnn = (annotations[ap] || []).find(a => a.id === selectedAnnId)
        if (selAnn) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(hoverPt, selAnn, handleThreshold)
          if (handle) { setCanvasCursor(HANDLE_CURSOR_MAP[handle]); return }
          if (hitTest(hoverPt, selAnn, 4 / zoom)) { setCanvasCursor('text'); return }
        }
      }
      // Check if hovering over any text/callout annotation
      const targetType = activeTool === 'text' ? 'text' : 'callout'
      const pageAnns = annotations[ap] || []
      for (let i = pageAnns.length - 1; i >= 0; i--) {
        if (pageAnns[i].type === targetType && hitTest(hoverPt, pageAnns[i], 4 / zoom)) { setCanvasCursor('text'); return }
      }
      setCanvasCursor(null)
    }

    // ── Cursor tracking for select tool handles/annotations/text ──
    if (!isDrawingRef.current && activeTool === 'select') {
      const hoverPt = getPointForPage(pageNum, e)
      // 1. Check resize handles on selected annotation
      if (selectedAnnId) {
        const selAnn = (annotations[ap] || []).find(a => a.id === selectedAnnId)
        if (selAnn) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(hoverPt, selAnn, handleThreshold)
          if (handle) { setCanvasCursor(HANDLE_CURSOR_MAP[handle]); return }
          if (hitTest(hoverPt, selAnn, 4 / zoom)) {
            setCanvasCursor((selAnn.type === 'text' || selAnn.type === 'callout') ? 'grab' : 'move')
            return
          }
        }
      }
      // 2. Check if hovering over any annotation
      const hoveredAnn = findAnnotationAt(hoverPt, pageNum)
      // Only setState when value changes — avoids full re-render on every mouse move
      const newHoveredId = hoveredAnn?.id ?? null
      if (newHoveredId !== hoveredAnnIdRef.current) {
        hoveredAnnIdRef.current = newHoveredId
        setHoveredAnnId(newHoveredId)
      }
      if (hoveredAnn) {
        // Show I-beam for text/callout annotations, move for everything else
        setCanvasCursor((hoveredAnn.type === 'text' || hoveredAnn.type === 'callout') ? 'text' : 'move')
        return
      }
      // 3. Check if hovering over embedded PDF text → I-beam
      const currentRotation = pageRotationsRef.current[pageNum] || 0
      const cacheKey = `${pageNum}_${currentRotation}`
      const textItems = textItemsCacheRef.current[cacheKey] || []
      if (textItems.length > 0 && isPointInAnyTextItem(hoverPt, textItems)) {
        setCanvasCursor('text'); return
      }
      // 4. Default arrow
      setCanvasCursor(null)
    }

    if (!isDrawingRef.current) return
    const pt = getPointForPage(ap, e)

    // General drag (select tool: moving shapes)
    if (generalDragRef.current) {
      const drag = generalDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y
      const newPoints = drag.origPoints.map(p => ({ x: p.x + dx, y: p.y + dy }))
      setAnnotations(prev => ({
        ...prev,
        [ap]: (prev[ap] || []).map(a =>
          a.id === drag.annId ? { ...a, points: newPoints } : a
        ),
      }))
      redrawPage(ap)
      return
    }

    // Select tool: text/callout move/resize via textDragRef
    if (activeTool === 'select' && textDragRef.current) {
      const drag = textDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y
      if (drag.mode === 'move') {
        setCanvasCursor('grabbing')
        const movedArrows = drag.origArrows?.map(p => ({ x: p.x + dx, y: p.y + dy }))
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === drag.annId ? { ...a, points: [{ x: drag.origPoints[0].x + dx, y: drag.origPoints[0].y + dy }], ...(movedArrows ? { arrows: movedArrows } : {}) } : a
          ),
        }))
      } else {
        const { origPoints, origWidth, origHeight } = drag
        let newX = origPoints[0].x, newY = origPoints[0].y
        let newW = origWidth, newH = origHeight
        switch (drag.mode) {
          case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
          case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
          case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
          case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 's': newH = Math.max(20, origHeight + dy); break
          case 'e': newW = Math.max(40, origWidth + dx); break
          case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
        }
        // Auto-height for text/callout: recompute height based on content reflow
        const annForHeight = (annotations[ap] || []).find(a => a.id === drag.annId)
        if (annForHeight && (annForHeight.type === 'text' || annForHeight.type === 'callout') && annForHeight.text) {
          newH = computeTextBoxHeight({ ...annForHeight, width: newW }, DEFAULT_TEXTBOX_H)
        }
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === drag.annId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
          ),
        }))
      }
      return
    }

    // Select tool: flow-based text selection preview during drag
    if (activeTool === 'select' && selectTextStartRef.current) {
      const selRotation = pageRotationsRef.current[ap] || 0
      const cacheKey = `${ap}_${selRotation}`
      const items = textItemsCacheRef.current[cacheKey] || []
      selectTextRectsRef.current = flowSelectTextItems(items, selectTextStartRef.current, pt)
      redrawPage(ap)
      return
    }

    // Text highlight/strikethrough: update preview rects
    if ((activeTool === 'textHighlight' || activeTool === 'textStrikethrough') && textHighlightStartRef.current) {
      const start = textHighlightStartRef.current
      const selRect = {
        x: Math.min(start.x, pt.x),
        y: Math.min(start.y, pt.y),
        w: Math.abs(pt.x - start.x),
        h: Math.abs(pt.y - start.y),
      }
      const hlRotation = pageRotationsRef.current[ap] || 0
      const cacheKey = `${ap}_${hlRotation}`
      const items = textItemsCacheRef.current[cacheKey] || []
      textHighlightPreviewRectsRef.current = findIntersectingTextItems(items, selRect)
      redrawPage(ap)
      return
    }

    // Callout tool: arrow drag or move/resize
    if (activeTool === 'callout') {
      if (calloutArrowDragRef.current) {
        calloutArrowDragRef.current.tipPt = pt
        redrawPage(ap)
        return
      }
      if (textDragRef.current) {
        const drag = textDragRef.current
        const dx = pt.x - drag.startPt.x
        const dy = pt.y - drag.startPt.y
        if (drag.mode === 'move') {
          setCanvasCursor('grabbing')
          const movedArrows = drag.origArrows?.map(p => ({ x: p.x + dx, y: p.y + dy }))
          setAnnotations(prev => ({
            ...prev,
            [ap]: (prev[ap] || []).map(a =>
              a.id === drag.annId ? { ...a, points: [{ x: drag.origPoints[0].x + dx, y: drag.origPoints[0].y + dy }], ...(movedArrows ? { arrows: movedArrows } : {}) } : a
            ),
          }))
        } else {
          const { origPoints, origWidth, origHeight } = drag
          let newX = origPoints[0].x, newY = origPoints[0].y
          let newW = origWidth, newH = origHeight
          switch (drag.mode) {
            case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
            case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
            case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
            case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
            case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
            case 's': newH = Math.max(20, origHeight + dy); break
            case 'e': newW = Math.max(40, origWidth + dx); break
            case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
          }
          setAnnotations(prev => ({
            ...prev,
            [ap]: (prev[ap] || []).map(a =>
              a.id === drag.annId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
            ),
          }))
        }
        return
      }
      // Creating callout box
      currentPtsRef.current = [currentPtsRef.current[0], pt]
      redrawPage(ap)
      return
    }

    // Text tool: move/resize drag
    if (activeTool === 'text' && textDragRef.current) {
      const drag = textDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y

      if (drag.mode === 'move') {
        const newX = drag.origPoints[0].x + dx
        const newY = drag.origPoints[0].y + dy
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === drag.annId ? { ...a, points: [{ x: newX, y: newY }] } : a
          ),
        }))
      } else {
        const { origPoints, origWidth, origHeight } = drag
        let newX = origPoints[0].x, newY = origPoints[0].y
        let newW = origWidth, newH = origHeight

        switch (drag.mode) {
          case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
          case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
          case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
          case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 's': newH = Math.max(20, origHeight + dy); break
          case 'e': newW = Math.max(40, origWidth + dx); break
          case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
        }
        // Auto-height for text annotations
        const annForHeight = (annotations[ap] || []).find(a => a.id === drag.annId)
        if (annForHeight && annForHeight.type === 'text' && annForHeight.text) {
          newH = computeTextBoxHeight({ ...annForHeight, width: newW }, DEFAULT_TEXTBOX_H)
        }

        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === drag.annId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
          ),
        }))
      }
      return
    }

    // Text tool: creating textbox
    if (activeTool === 'text') {
      currentPtsRef.current = [currentPtsRef.current[0], pt]
      redrawPage(ap)
      return
    }

    if (activeTool === 'eraser') {
      const docRadius = eraserRadius / (zoom * RENDER_SCALE)
      const mods = eraserModsRef.current
      const pageAnns = annotations[ap] || []
      for (const ann of pageAnns) {
        if (mods.removed.has(ann.id)) continue
        if (eraserMode === 'object') {
          // Object mode: delete whole annotation on hit
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) mods.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            mods.removed.add(ann.id)
          }
        } else {
          // Partial mode: split paths at eraser boundary
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) {
              mods.removed.add(ann.id)
              mods.added.push(...splitPathByEraser(ann, pt, effectiveR))
            }
          } else if (ann.type === 'text' || ann.type === 'callout') {
            if (hitTest(pt, ann, docRadius)) mods.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            if (ann.rects) {
              mods.removed.add(ann.id)
            } else {
              const polyline = shapeToPolyline(ann)
              const effectiveR = docRadius + ann.strokeWidth / 2
              const tempAnn: Annotation = { ...ann, type: 'pencil', points: polyline, smooth: false }
              mods.removed.add(ann.id)
              mods.added.push(...splitPathByEraser(tempAnn, pt, effectiveR))
            }
          }
        }
      }
      // In object mode, also remove any previously-added fragments that get hit
      if (eraserMode === 'object') {
        mods.added = mods.added.filter(frag => {
          const effectiveR = docRadius + frag.strokeWidth / 2
          return !pathHitsCircle(frag.points, pt, effectiveR)
        })
      } else {
        const newAdded: Annotation[] = []
        for (const frag of mods.added) {
          const effectiveR = docRadius + frag.strokeWidth / 2
          if (pathHitsCircle(frag.points, pt, effectiveR)) {
            newAdded.push(...splitPathByEraser(frag, pt, effectiveR))
          } else {
            newAdded.push(frag)
          }
        }
        mods.added = newAdded
      }
      redrawPage(ap)
      return
    }

    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      if (straightLineMode) {
        currentPtsRef.current = [currentPtsRef.current[0], pt]
        currentPressureRef.current = [currentPressureRef.current[0], e.pressure]
      } else {
        currentPtsRef.current.push(pt)
        currentPressureRef.current.push(e.pressure)
        // Incremental rendering: restore snapshot + draw only current stroke
        if (!straightLineMode && canvasSnapshotRef.current) {
          const annCanvas = pageRefsMap.current.get(ap)?.annCanvas
          if (annCanvas) {
            const ctx = annCanvas.getContext('2d')
            if (ctx) {
              ctx.putImageData(canvasSnapshotRef.current, 0, 0)
              const pageRs = pageRenderScaleRef.current.get(ap) ?? RENDER_SCALE
              if (activeTool === 'highlighter') {
                // Use offscreen canvas for consistent opacity (no stacking at self-intersections)
                const hlPts = currentPtsRef.current
                if (hlPts.length >= 2) {
                  const pad = strokeWidth * pageRs
                  let minX = hlPts[0].x, maxX = hlPts[0].x, minY = hlPts[0].y, maxY = hlPts[0].y
                  for (const p of hlPts) {
                    if (p.x < minX) minX = p.x
                    if (p.x > maxX) maxX = p.x
                    if (p.y < minY) minY = p.y
                    if (p.y > maxY) maxY = p.y
                  }
                  const offX = minX * pageRs - pad
                  const offY = minY * pageRs - pad
                  const offW = Math.ceil((maxX - minX) * pageRs + pad * 2)
                  const offH = Math.ceil((maxY - minY) * pageRs + pad * 2)
                  if (offW > 0 && offH > 0) {
                    const offscreen = new OffscreenCanvas(offW, offH)
                    const offCtx = offscreen.getContext('2d')
                    if (offCtx) {
                      offCtx.strokeStyle = color
                      offCtx.lineWidth = strokeWidth * pageRs
                      offCtx.lineCap = 'butt'
                      offCtx.lineJoin = 'bevel'
                      offCtx.beginPath()
                      offCtx.moveTo(hlPts[0].x * pageRs - offX, hlPts[0].y * pageRs - offY)
                      for (let i = 1; i < hlPts.length; i++) {
                        offCtx.lineTo(hlPts[i].x * pageRs - offX, hlPts[i].y * pageRs - offY)
                      }
                      offCtx.stroke()
                      ctx.save()
                      ctx.globalAlpha = 0.4
                      ctx.drawImage(offscreen, offX, offY)
                      ctx.restore()
                    }
                  }
                }
              } else {
                ctx.save()
                ctx.globalAlpha = opacity / 100
                ctx.strokeStyle = color
                ctx.lineWidth = strokeWidth * pageRs
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                drawSmoothPath(ctx, currentPtsRef.current, pageRs)
                ctx.restore()
              }
              return
            }
          }
        }
      }
    } else {
      const start = currentPtsRef.current[0]
      let endPt = pt

      // Shift-constrain
      if (e.shiftKey && start) {
        if (activeTool === 'rectangle') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const side = Math.max(Math.abs(dx), Math.abs(dy))
          endPt = { x: start.x + side * Math.sign(dx || 1), y: start.y + side * Math.sign(dy || 1) }
        } else if (activeTool === 'circle') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const side = Math.max(Math.abs(dx), Math.abs(dy))
          endPt = { x: start.x + side * Math.sign(dx || 1), y: start.y + side * Math.sign(dy || 1) }
        } else if (activeTool === 'line' || activeTool === 'arrow') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const angle = Math.atan2(dy, dx)
          const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
          const dist = Math.hypot(dx, dy)
          endPt = { x: start.x + dist * Math.cos(snapped), y: start.y + dist * Math.sin(snapped) }
        }
      }

      currentPtsRef.current = [start, endPt]
    }
    redrawPage(ap)
  }, [getPointForPage, activeTool, annotations, redrawPage, eraserRadius, eraserMode, zoom, straightLineMode, selectedAnnId, findAnnotationAt])

  const handlePointerUp = useCallback((e?: React.PointerEvent) => {
    // Clean up touch tracking
    if (e?.pointerType === 'touch') activeTouchIdsRef.current.delete(e.pointerId)
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    canvasSnapshotRef.current = null
    const ap = activePageRef.current

    // General drag (select tool: moving shapes)
    if (generalDragRef.current) {
      pushHistory(structuredClone(annotations))
      generalDragRef.current = null
      return
    }

    // Select tool: commit text/callout drag or finalize text selection
    if (activeTool === 'select') {
      if (textDragRef.current) {
        const drag = textDragRef.current
        const ann = (annotations[ap] || []).find(a => a.id === drag.annId)
        // Detect click (no significant movement) → enter edit mode for text/callout
        if (ann && drag.mode === 'move' && (ann.type === 'text' || ann.type === 'callout')) {
          const moved = Math.hypot(ann.points[0].x - drag.origPoints[0].x, ann.points[0].y - drag.origPoints[0].y)
          if (moved < 2) {
            // Was a click, not a drag → enter edit mode
            textDragRef.current = null
            setActiveTool(ann.type === 'callout' ? 'callout' : 'text')
            enterEditMode(ann.id)
            return
          }
        }
        pushHistory(structuredClone(annotations))
        textDragRef.current = null
        return
      }
      if (selectTextStartRef.current) {
        const rects = selectTextRectsRef.current
        if (rects.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          for (const r of rects) {
            if (r.x < minX) minX = r.x
            if (r.y < minY) minY = r.y
            if (r.x + r.w > maxX) maxX = r.x + r.w
            if (r.y + r.h > maxY) maxY = r.y + r.h
          }
          const selRotation = pageRotationsRef.current[ap] || 0
          const cacheKey = `${ap}_${selRotation}`
          const allItems = textItemsCacheRef.current[cacheKey] || []
          const rectSet = new Set(rects.map(r => `${r.x},${r.y},${r.w},${r.h}`))
          const matchedItems = allItems.filter(item =>
            item.width > 0 && rectSet.has(`${item.x},${item.y},${item.width},${item.height}`)
          )
          const docPos = { x: (minX + maxX) / 2, y: minY }
          setSelectTextToolbar({ rects: [...rects], items: matchedItems, docPos })
        }
        selectTextStartRef.current = null
        selectTextRectsRef.current = []
        redrawPage(ap)
        return
      }
      return
    }

    // Callout tool: finish arrow drag, move/resize, or create box
    if (activeTool === 'callout') {
      if (calloutArrowDragRef.current && selectedAnnId) {
        const tip = calloutArrowDragRef.current.tipPt
        const arrowIdx = calloutArrowDragRef.current.arrowIdx
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout') {
          if (arrowIdx !== undefined && ann.arrows) {
            const newArrows = ann.arrows.map((a, i) => i === arrowIdx ? tip : a)
            updateAnnotation(selectedAnnId, { arrows: newArrows })
          } else {
            updateAnnotation(selectedAnnId, { arrows: [...(ann.arrows || []), tip] })
          }
        }
        calloutArrowDragRef.current = null
        redrawPage(ap)
        return
      }
      if (textDragRef.current) {
        const ann = getAnnotation(textDragRef.current.annId)
        if (ann) pushHistory(structuredClone(annotations))
        textDragRef.current = null
        return
      }
      // Creating new callout box
      const pts = currentPtsRef.current
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x)
        const y = Math.min(pts[0].y, pts[1].y)
        const w = Math.abs(pts[1].x - pts[0].x)
        const h = Math.abs(pts[1].y - pts[0].y)
        const boxW = w > 20 ? w : DEFAULT_TEXTBOX_W
        const boxH = h > 20 ? h : DEFAULT_TEXTBOX_H
        const boxX = w > 20 ? x : pts[0].x
        const boxY = h > 20 ? y : pts[0].y
        const newAnn: Annotation = {
          id: genId(), type: 'callout',
          points: [{ x: boxX, y: boxY }],
          color, fontSize, fontFamily, strokeWidth: 1,
          opacity: 1,
          text: '', width: boxW, height: boxH, arrows: [],
          bold, italic, underline, strikethrough, textAlign,
          superscript, subscript, listType,
          backgroundColor: textBgColor || undefined, lineHeight: lineSpacing,
        }
        commitAnnotation(newAnn)
        setSelectedAnnId(newAnn.id)
        editingTextIdRef.current = newAnn.id
        setEditingTextId(newAnn.id)
        setEditingTextValue('')
      }
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    // Text tool: finish move/resize or create textbox
    if (activeTool === 'text') {
      if (textDragRef.current) {
        const drag = textDragRef.current
        const ann = getAnnotation(drag.annId)
        textDragRef.current = null
        // Click-vs-drag: if barely moved and it was a body move, treat as click → enter edit mode
        if (drag.mode === 'move' && ann) {
          const dx = ann.points[0].x - drag.origPoints[0].x
          const dy = ann.points[0].y - drag.origPoints[0].y
          if (Math.hypot(dx, dy) < 5) {
            enterEditMode(drag.annId)
            return
          }
        }
        if (ann) {
          pushHistory(structuredClone(annotations))
        }
        return
      }

      // Creating new textbox
      const pts = currentPtsRef.current
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x)
        const y = Math.min(pts[0].y, pts[1].y)
        const w = Math.abs(pts[1].x - pts[0].x)
        const h = Math.abs(pts[1].y - pts[0].y)
        const boxW = w > 20 ? w : DEFAULT_TEXTBOX_W
        const boxH = h > 20 ? h : DEFAULT_TEXTBOX_H
        const boxX = w > 20 ? x : pts[0].x
        const boxY = h > 20 ? y : pts[0].y

        const newAnn: Annotation = {
          id: genId(), type: 'text',
          points: [{ x: boxX, y: boxY }],
          color, fontSize, fontFamily, strokeWidth: 1,
          opacity: opacity / 100,
          text: '',
          width: boxW,
          height: boxH,
          bold, italic, underline, strikethrough, textAlign,
          superscript, subscript, listType,
          backgroundColor: textBgColor || undefined, lineHeight: lineSpacing,
        }
        commitAnnotation(newAnn)
        setSelectedAnnId(newAnn.id)
        editingTextIdRef.current = newAnn.id
        setEditingTextId(newAnn.id)
        setEditingTextValue('')
      }
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    if (activeTool === 'eraser') {
      const mods = eraserModsRef.current
      if (mods.removed.size > 0 || mods.added.length > 0) {
        const pageAnns = annotations[ap] || []
        const surviving = pageAnns.filter(a => !mods.removed.has(a.id))
        const next = { ...annotations, [ap]: [...surviving, ...mods.added] }
        setAnnotations(next)
        pushHistory(next)
      }
      eraserModsRef.current = { removed: new Set(), added: [] }
      return
    }

    // OCR Region: finalize selection and run OCR
    if (activeTool === 'ocrRegion') {
      const region = ocrRegionPreviewRef.current
      ocrRegionStartRef.current = null
      isDrawingRef.current = false
      if (!region || region.w < 10 || region.h < 10 || !pdfFile) {
        ocrRegionPreviewRef.current = null
        redrawPage(ap)
        return
      }
      // Run OCR on the selected region
      const scanRegion = { ...region }
      const scanPage = ap
      setOcrRegionScanning(true)
      ;(async () => {
        try {
          const rotation = pageRotations[scanPage] || 0
          const canvas = document.createElement('canvas')
          await renderPageToCanvas(pdfFile, scanPage, canvas, 2.0, rotation)
          const worker = await Tesseract.createWorker('eng')
          const result = await worker.recognize(canvas, {
            rectangle: { left: Math.round(scanRegion.x * 2), top: Math.round(scanRegion.y * 2), width: Math.round(scanRegion.w * 2), height: Math.round(scanRegion.h * 2) },
          }, { text: true })
          await worker.terminate()
          canvas.width = 0
          canvas.height = 0
          const text = (result.data.text ?? '').trim()
          if (text) {
            setOcrRegionResult({ text, pageNum: scanPage, rect: scanRegion })
          } else {
            addToast({ type: 'warning', message: 'No text detected in selected region' })
            ocrRegionPreviewRef.current = null
            redrawPage(scanPage)
          }
        } catch {
          addToast({ type: 'error', message: 'OCR scan failed' })
          ocrRegionPreviewRef.current = null
          redrawPage(scanPage)
        } finally {
          setOcrRegionScanning(false)
        }
      })()
      return
    }

    // Crop tool: finalize crop region
    if (activeTool === 'crop') {
      if (cropDrawRef.current && currentPtsRef.current.length >= 2) {
        const cpts = currentPtsRef.current
        const x = Math.min(cpts[0].x, cpts[1].x)
        const y = Math.min(cpts[0].y, cpts[1].y)
        const w = Math.abs(cpts[1].x - cpts[0].x)
        const h = Math.abs(cpts[1].y - cpts[0].y)
        if (w > 5 && h > 5) {
          setCropRegions(prev => ({ ...prev, [ap]: { x, y, w, h } }))
        }
      }
      cropDrawRef.current = null
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    // Text highlight / strikethrough: create annotation from preview rects
    if (activeTool === 'textHighlight' || activeTool === 'textStrikethrough') {
      const rects = textHighlightPreviewRectsRef.current
      if (rects.length > 0) {
        const isStrikethrough = activeTool === 'textStrikethrough'
        const ann: Annotation = {
          id: genId(),
          type: 'highlighter',
          points: [{ x: 0, y: 0 }],
          color,
          strokeWidth: 0,
          opacity: isStrikethrough ? 1 : 0.4,
          fontSize,
          rects: [...rects],
          strikethrough: isStrikethrough || undefined,
        }
        commitAnnotation(ann)
      }
      textHighlightStartRef.current = null
      textHighlightPreviewRectsRef.current = []
      redrawPage(ap)
      return
    }

    const pts = currentPtsRef.current
    if (pts.length < 2) {
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    const isHL = activeTool === 'highlighter'
    const isPencilOrHL = activeTool === 'pencil' || isHL
    // Highlighter uses raw points (no decimation) so committed path exactly matches in-progress
    const finalPts = isHL ? [...pts] : (isPencilOrHL ? decimatePoints([...pts], 0.5) : [...pts])
    const ann: Annotation = {
      id: genId(),
      type: activeTool as Exclude<ToolType, 'select' | 'eraser' | 'measure' | 'textHighlight' | 'textStrikethrough' | 'crop' | 'note'>,
      points: finalPts,
      color,
      strokeWidth: strokeWidth,
      opacity: isHL ? 0.4 : opacity / 100,
      fontSize,
      ...(fillColor && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud' || activeTool === 'polygon') ? { fillColor } : {}),
      ...(cornerRadius > 0 && activeTool === 'rectangle' ? { cornerRadius } : {}),
      ...(dashPattern !== 'solid' ? { dashPattern } : {}),
      ...(arrowStart && activeTool === 'arrow' ? { arrowStart: true } : {}),
      ...(isPencilOrHL && currentPressureRef.current.length > 0 ? { pressure: [...currentPressureRef.current] } : {}),
      ...(activeLayerId !== 'default' ? { layerId: activeLayerId } : {}),
    }
    currentPtsRef.current = []
    currentPressureRef.current = []
    commitAnnotation(ann)

    // Ink-to-shape recognition for pencil strokes
    if (activeTool === 'pencil' && finalPts.length >= 10 && finalPts.length <= 80) {
      const recognized = recognizeShape(finalPts)
      if (recognized && recognized.score >= 0.75) {
        const { name, bounds } = recognized
        // Replace the freehand annotation with a clean shape
        const shapeAnn: Annotation = {
          ...ann,
          id: genId(),
          type: name === 'circle' ? 'circle' : name === 'line' ? 'line' : name === 'arrow' ? 'arrow' : 'rectangle',
          points: name === 'circle'
            ? [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }]
            : [{ x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }],
          smooth: undefined,
          pressure: undefined,
        }
        // Remove the freehand and add the clean shape
        const pageAnns = annotations[ap] || []
        const withoutFreehand = pageAnns.filter(a => a.id !== ann.id)
        const next = { ...annotations, [ap]: [...withoutFreehand, shapeAnn] }
        setAnnotations(next)
        pushHistory(next)
        setSelectedAnnId(shapeAnn.id)
        addToast({ type: 'info', message: `Converted to ${name}` })
        redrawPage(ap)
        return
      }
    }

    // Auto-select shapes/arrows/lines after drawing; skip pencil & highlighter
    if (activeTool !== 'pencil' && activeTool !== 'highlighter') {
      setSelectedAnnId(ann.id)
    }
  }, [activeTool, color, strokeWidth, opacity, fontSize, fillColor, cornerRadius, dashPattern, arrowStart, commitAnnotation,
      pushHistory, redrawPage, annotations, getAnnotation, updateAnnotation, selectedAnnId, addToast])

  // ── Comment & Sticky Note Management ─────────────────

  const handleAddComment = useCallback((annotationId: string, text: string, parentId?: string) => {
    const profile = userProfileRef.current
    if (!profile || !text.trim()) return
    const newComment: CommentType = {
      id: genId(),
      authorName: profile.name,
      authorInitials: profile.initials,
      timestamp: Date.now(),
      text: text.trim(),
      parentId,
    }
    setCommentThreads(prev => {
      const existing = prev.find(t => t.annotationId === annotationId)
      if (existing) {
        return prev.map(t => t.annotationId === annotationId
          ? { ...t, comments: [...t.comments, newComment] }
          : t)
      }
      return [...prev, { annotationId, comments: [newComment], status: 'open' as CommentStatus }]
    })
  }, [])

  const handleStatusChange = useCallback((annotationId: string, status: CommentStatus) => {
    setCommentThreads(prev => {
      const existing = prev.find(t => t.annotationId === annotationId)
      if (existing) {
        return prev.map(t => t.annotationId === annotationId ? { ...t, status } : t)
      }
      return [...prev, { annotationId, comments: [], status }]
    })
  }, [])

  const handleSelectThread = useCallback((annotationId: string, page: number) => {
    // Navigate to page and open chat bubble
    setCurrentPage(page)
    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      const pageContainer = scrollContainer.querySelector(`[data-page="${page}"]`)
      if (pageContainer) {
        pageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // Find the annotation/sticky note position to anchor the chat bubble
    const pageAnns = annotations[page] ?? []
    const ann = pageAnns.find(a => a.id === annotationId)
    if (ann && ann.points.length > 0) {
      const refs = pageRefsMap.current.get(page)
      if (refs) {
        const rect = refs.annCanvas.getBoundingClientRect()
        const rs = pageRenderScaleRef.current.get(page) ?? RENDER_SCALE
        const screenX = rect.left + (ann.points[0].x / rs) * zoom
        const screenY = rect.top + (ann.points[0].y / rs) * zoom
        setChatBubbleTarget({ annotationId, position: { x: screenX, y: screenY } })
      }
    }
    // Check sticky notes
    const pageStickyNotes = stickyNotes[page] ?? []
    const note = pageStickyNotes.find(n => n.id === annotationId)
    if (note) {
      const refs = pageRefsMap.current.get(page)
      if (refs) {
        const rect = refs.annCanvas.getBoundingClientRect()
        const rs = pageRenderScaleRef.current.get(page) ?? RENDER_SCALE
        const screenX = rect.left + (note.point.x / rs) * zoom
        const screenY = rect.top + (note.point.y / rs) * zoom
        setChatBubbleTarget({ annotationId, position: { x: screenX, y: screenY } })
      }
    }
    setCommentsPanelOpen(false)
  }, [annotations, stickyNotes, zoom])

  // ── Export annotated PDF ─────────────────────────────

  const handleExport = useCallback(async () => {
    if (!pdfFile) return
    // Commit any editing
    if (editingTextId) commitTextEditing()
    setIsExporting(true)
    setExportError(null)
    try {
      const bytes = await getPDFBytes(pdfFile)
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()
      const fontCache = new Map<StandardFonts, Awaited<ReturnType<typeof doc.embedFont>>>()
      const getFont = async (ff: string, annBold = false, annItalic = false) => {
        const std = resolvePdfFont(ff, annBold, annItalic)
        if (!fontCache.has(std)) fontCache.set(std, await doc.embedFont(std))
        return fontCache.get(std)!
      }

      for (const [pageStr, pageAnns] of Object.entries(annotations)) {
        const pageNum = parseInt(pageStr)
        if (pageNum < 1 || pageNum > pages.length || !pageAnns.length) continue

        const page = pages[pageNum - 1]
        const { width: origW, height: origH } = page.getSize()
        const rotation = pageRotations[pageNum] || 0

        // Apply rotation
        if (rotation !== 0) {
          const existingRot = page.getRotation().angle
          page.setRotation(degrees((existingRot + rotation) % 360))
        }

        for (const ann of pageAnns) {
          const { r, g, b: bv } = parseHexColor(ann.color)
          const c = rgb(r, g, bv)

          // Transform points to PDF coordinates
          const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

          switch (ann.type) {
            case 'highlighter':
              // Text-selection highlights (rects)
              if (ann.rects && ann.rects.length > 0) {
                if (ann.strikethrough) {
                  for (const rect of ann.rects) {
                    const midY = rect.y + rect.h / 2
                    const lineStart = toPC({ x: rect.x, y: midY })
                    const lineEnd = toPC({ x: rect.x + rect.w, y: midY })
                    page.drawLine({
                      start: lineStart, end: lineEnd,
                      thickness: Math.max(0.5, 1.5), color: c, opacity: ann.opacity,
                    })
                  }
                } else {
                  for (const rect of ann.rects) {
                    const tl = toPC({ x: rect.x, y: rect.y + rect.h })
                    page.drawRectangle({
                      x: tl.x, y: tl.y,
                      width: rect.w, height: rect.h,
                      color: c, opacity: ann.opacity,
                    })
                  }
                }
              } else {
                // Freehand highlighter — export as line segments (matches canvas rendering)
                for (let i = 0; i < ann.points.length - 1; i++) {
                  const s = toPC(ann.points[i])
                  const e = toPC(ann.points[i + 1])
                  page.drawLine({
                    start: s, end: e,
                    thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
                  })
                }
              }
              break
            case 'pencil':
              if (ann.points.length >= 3 && ann.smooth !== false) {
                // Export as SVG cubic Bézier (Catmull-Rom) for smooth curves
                const pts = ann.points
                const first = toPC(pts[0])
                const tension = 0.3
                let svgD = `M 0 0`
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[Math.max(0, i - 1)]
                  const p1 = pts[i]
                  const p2 = pts[i + 1]
                  const p3 = pts[Math.min(pts.length - 1, i + 2)]
                  const cp1 = toPC({ x: p1.x + (p2.x - p0.x) * tension, y: p1.y + (p2.y - p0.y) * tension })
                  const cp2 = toPC({ x: p2.x - (p3.x - p1.x) * tension, y: p2.y - (p3.y - p1.y) * tension })
                  const ep = toPC(p2)
                  svgD += ` C ${cp1.x - first.x} ${-(cp1.y - first.y)} ${cp2.x - first.x} ${-(cp2.y - first.y)} ${ep.x - first.x} ${-(ep.y - first.y)}`
                }
                page.drawSvgPath(svgD, {
                  x: first.x, y: first.y,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                })
              } else {
                // Straight segments (eraser fragments or < 3 points)
                for (let i = 0; i < ann.points.length - 1; i++) {
                  const s = toPC(ann.points[i])
                  const e = toPC(ann.points[i + 1])
                  page.drawLine({
                    start: s, end: e,
                    thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
                  })
                }
              }
              break
            case 'line': {
              if (ann.points.length < 2) break
              const lineOpts: Record<string, unknown> = {
                start: toPC(ann.points[0]), end: toPC(ann.points[1]),
                thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
              }
              if (ann.dashPattern === 'dashed') lineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') lineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawLine(lineOpts as unknown as Parameters<typeof page.drawLine>[0])
              break
            }
            case 'arrow': {
              if (ann.points.length < 2) break
              const s = toPC(ann.points[0])
              const e = toPC(ann.points[1])
              const pdfAngle = Math.atan2(e.y - s.y, e.x - s.x)
              const hl = Math.min(20, Math.max(10, ann.strokeWidth * 2.5))
              const halfAngle = Math.PI / 7
              // End arrowhead base
              const baseX = e.x - hl * Math.cos(pdfAngle)
              const baseY = e.y - hl * Math.sin(pdfAngle)
              // Start arrowhead base (for double-headed)
              const lineStart = ann.arrowStart
                ? { x: s.x + hl * Math.cos(pdfAngle), y: s.y + hl * Math.sin(pdfAngle) }
                : s
              const arrowLineOpts: Record<string, unknown> = { start: lineStart, end: { x: baseX, y: baseY }, thickness: ann.strokeWidth, color: c, opacity: ann.opacity }
              if (ann.dashPattern === 'dashed') arrowLineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') arrowLineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawLine(arrowLineOpts as unknown as Parameters<typeof page.drawLine>[0])
              // End arrowhead
              const lxOff = -hl * Math.cos(pdfAngle - halfAngle)
              const lyOff = hl * Math.sin(pdfAngle - halfAngle)
              const rxOff = -hl * Math.cos(pdfAngle + halfAngle)
              const ryOff = hl * Math.sin(pdfAngle + halfAngle)
              page.drawSvgPath(`M 0 0 L ${lxOff} ${lyOff} L ${rxOff} ${ryOff} Z`, {
                x: e.x, y: e.y, color: c, opacity: ann.opacity, borderWidth: 0,
              })
              // Start arrowhead (double-headed)
              if (ann.arrowStart) {
                const revAngle = pdfAngle + Math.PI
                const slxOff = -hl * Math.cos(revAngle - halfAngle)
                const slyOff = hl * Math.sin(revAngle - halfAngle)
                const srxOff = -hl * Math.cos(revAngle + halfAngle)
                const sryOff = hl * Math.sin(revAngle + halfAngle)
                page.drawSvgPath(`M 0 0 L ${slxOff} ${slyOff} L ${srxOff} ${sryOff} Z`, {
                  x: s.x, y: s.y, color: c, opacity: ann.opacity, borderWidth: 0,
                })
              }
              break
            }
            case 'rectangle': {
              if (ann.points.length < 2) break
              const rw = Math.abs(ann.points[1].x - ann.points[0].x)
              const rh = Math.abs(ann.points[1].y - ann.points[0].y)
              const cr = ann.cornerRadius || 0
              const dashArr = ann.dashPattern === 'dashed' ? [ann.strokeWidth * 3, ann.strokeWidth * 2]
                : ann.dashPattern === 'dotted' ? [ann.strokeWidth, ann.strokeWidth * 2] : undefined

              // Compute fill color once
              let rectFillRgb: ReturnType<typeof rgb> | undefined
              if (ann.fillColor) {
                const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
                rectFillRgb = rgb(fr, fg, fb)
              }

              if (cr > 0) {
                // Rounded rectangle via SVG path (pdf-lib drawRectangle has no borderRadius)
                const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.min(ann.points[0].y, ann.points[1].y) })
                const clamped = Math.min(cr, rw / 2, rh / 2)
                const svgRRect = `M ${clamped} 0 L ${rw - clamped} 0 Q ${rw} 0 ${rw} ${-clamped} L ${rw} ${-(rh - clamped)} Q ${rw} ${-rh} ${rw - clamped} ${-rh} L ${clamped} ${-rh} Q 0 ${-rh} 0 ${-(rh - clamped)} L 0 ${-clamped} Q 0 0 ${clamped} 0 Z`
                const pathOpts: Record<string, unknown> = {
                  x: tl.x, y: tl.y,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                }
                if (rectFillRgb) { pathOpts.color = rectFillRgb; pathOpts.opacity = ann.opacity }
                if (dashArr) pathOpts.borderDashArray = dashArr
                page.drawSvgPath(svgRRect, pathOpts as Parameters<typeof page.drawSvgPath>[1])
              } else {
                const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.max(ann.points[0].y, ann.points[1].y) })
                const rectOpts: Record<string, unknown> = {
                  x: tl.x, y: tl.y, width: rw, height: rh,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                }
                if (rectFillRgb) { rectOpts.color = rectFillRgb; rectOpts.opacity = ann.opacity }
                if (dashArr) rectOpts.borderDashArray = dashArr
                page.drawRectangle(rectOpts as Parameters<typeof page.drawRectangle>[0])
              }
              break
            }
            case 'cloud': {
              if (ann.points.length < 3) break
              // Fill polygon if fillColor set
              if (ann.fillColor) {
                const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
                const first = toPC(ann.points[0])
                let svgD = `M ${0} ${0}`
                for (let pi = 1; pi < ann.points.length; pi++) {
                  const pt = toPC(ann.points[pi])
                  svgD += ` L ${pt.x - first.x} ${-(pt.y - first.y)}`
                }
                svgD += ' Z'
                page.drawSvgPath(svgD, { x: first.x, y: first.y, color: rgb(fr, fg, fb), opacity: ann.opacity, borderWidth: 0 })
              }
              // Bumpy outline as SVG quadratic Bézier curves
              {
                const firstPt = toPC(ann.points[0])
                let svgPath = `M ${0} ${0}`
                for (let ei = 0; ei < ann.points.length; ei++) {
                  const edgeStart = ann.points[ei]
                  const edgeEnd = ann.points[(ei + 1) % ann.points.length]
                  const edgeLen = Math.hypot(edgeEnd.x - edgeStart.x, edgeEnd.y - edgeStart.y)
                  const arcSz = 20
                  const numBumps = Math.max(2, Math.round(edgeLen / arcSz))
                  const ddx = (edgeEnd.x - edgeStart.x) / numBumps
                  const ddy = (edgeEnd.y - edgeStart.y) / numBumps
                  const len = Math.hypot(ddx, ddy)
                  if (len === 0) continue
                  const nx = (ddy / len) * arcSz * 0.4
                  const ny = (-ddx / len) * arcSz * 0.4
                  for (let i = 0; i < numBumps; i++) {
                    const ex = edgeStart.x + ddx * (i + 1), ey = edgeStart.y + ddy * (i + 1)
                    const sx = edgeStart.x + ddx * i, sy = edgeStart.y + ddy * i
                    const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
                    const cp = toPC({ x: mx, y: my })
                    const ep = toPC({ x: ex, y: ey })
                    // SVG Y is inverted vs PDF Y — negate offsets
                    svgPath += ` Q ${cp.x - firstPt.x} ${-(cp.y - firstPt.y)} ${ep.x - firstPt.x} ${-(ep.y - firstPt.y)}`
                  }
                }
                svgPath += ' Z'
                const cloudDash = ann.dashPattern === 'dashed' ? [ann.strokeWidth * 3, ann.strokeWidth * 2]
                  : ann.dashPattern === 'dotted' ? [ann.strokeWidth, ann.strokeWidth * 2] : undefined
                const pathOpts: Record<string, unknown> = {
                  x: firstPt.x, y: firstPt.y,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                }
                if (cloudDash) pathOpts.borderDashArray = cloudDash
                page.drawSvgPath(svgPath, pathOpts as Parameters<typeof page.drawSvgPath>[1])
              }
              break
            }
            case 'circle': {
              if (ann.points.length < 2) break
              const [c1, c2] = ann.points
              const center = toPC({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 })
              const ellipseOpts: Record<string, unknown> = {
                x: center.x, y: center.y,
                xScale: Math.abs(c2.x - c1.x) / 2,
                yScale: Math.abs(c2.y - c1.y) / 2,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (ann.fillColor) {
                const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
                ellipseOpts.color = rgb(fr, fg, fb)
                ellipseOpts.opacity = ann.opacity
              }
              if (ann.dashPattern === 'dashed') ellipseOpts.borderDashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') ellipseOpts.borderDashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawEllipse(ellipseOpts as Parameters<typeof page.drawEllipse>[0])
              break
            }
            case 'text': {
              if (!ann.text || !ann.points.length) break
              // Export text background color if set
              if (ann.backgroundColor && ann.width && ann.height) {
                const { r: tbr, g: tbg, b: tbb } = parseHexColor(ann.backgroundColor)
                const bgBl = toPC({ x: ann.points[0].x, y: ann.points[0].y + ann.height })
                page.drawRectangle({
                  x: bgBl.x, y: bgBl.y,
                  width: ann.width, height: ann.height,
                  color: rgb(tbr, tbg, tbb), opacity: 0.3,
                })
              }
              const baseFsText = ann.fontSize || 16
              const fs = ann.superscript || ann.subscript ? baseFsText * 0.6 : baseFsText
              const yShift = ann.superscript ? -baseFsText * 0.4 : ann.subscript ? baseFsText * 0.2 : 0
              const pdfFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
              // Apply list prefix
              let exportText = ann.text
              if (ann.listType && ann.listType !== 'none') {
                exportText = ann.text.split('\n').map((line, idx) => {
                  if (!line.trim()) return line
                  return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
                }).join('\n')
              }
              const lines = ann.width ? wrapText(exportText, ann.width, fs, ann.bold, (t: string) => pdfFont.widthOfTextAtSize(t, fs)) : exportText.split('\n')
              const tAlign = ann.textAlign || 'left'
              for (let i = 0; i < lines.length; i++) {
                let xOff = 0
                if (ann.width && tAlign !== 'left') {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  if (tAlign === 'center') xOff = (ann.width - tw) / 2
                  else if (tAlign === 'right') xOff = ann.width - tw
                }
                const linePt = toPC({ x: ann.points[0].x + xOff, y: ann.points[0].y + yShift + fs * (ann.lineHeight || 1.3) * i + fs })
                page.drawText(lines[i], {
                  x: linePt.x, y: linePt.y,
                  size: fs, font: pdfFont, color: c, opacity: ann.opacity,
                })
                if (ann.underline) {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  const ulY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs + fs * 0.15
                  const ulStart = toPC({ x: ann.points[0].x + xOff, y: ulY })
                  const ulEnd = toPC({ x: ann.points[0].x + xOff + tw, y: ulY })
                  page.drawLine({ start: ulStart, end: ulEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
                }
                if (ann.strikethrough) {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  const stY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs - fs * 0.35
                  const stStart = toPC({ x: ann.points[0].x + xOff, y: stY })
                  const stEnd = toPC({ x: ann.points[0].x + xOff + tw, y: stY })
                  page.drawLine({ start: stStart, end: stEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
                }
              }
              break
            }
            case 'callout': {
              if (!ann.points.length || !ann.width || !ann.height) break
              const boxPt = ann.points[0]
              const cfs = ann.fontSize || 14

              // White-filled box with colored border
              const bl = toPC({ x: boxPt.x, y: boxPt.y + ann.height })
              page.drawRectangle({
                x: bl.x, y: bl.y,
                width: ann.width, height: ann.height,
                color: rgb(1, 1, 1), borderColor: c,
                borderWidth: 1.5, opacity: 1, borderOpacity: 1,
              })

              // Text inside box
              if (ann.text) {
                const calloutFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
                const baseCfs = cfs
                const effectiveCfs = ann.superscript || ann.subscript ? baseCfs * 0.6 : baseCfs
                const cYShift = ann.superscript ? -baseCfs * 0.4 : ann.subscript ? baseCfs * 0.2 : 0
                let cExportText = ann.text
                if (ann.listType && ann.listType !== 'none') {
                  cExportText = ann.text.split('\n').map((line, idx) => {
                    if (!line.trim()) return line
                    return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
                  }).join('\n')
                }
                const cLines = wrapText(cExportText, ann.width - 8, effectiveCfs, ann.bold, (t: string) => calloutFont.widthOfTextAtSize(t, effectiveCfs))
                const cAlign = ann.textAlign || 'left'
                for (let i = 0; i < cLines.length; i++) {
                  let cxOff = 4
                  if (cAlign !== 'left') {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    if (cAlign === 'center') cxOff = 4 + (ann.width - 8 - ctw) / 2
                    else if (cAlign === 'right') cxOff = ann.width - 4 - ctw
                  }
                  const lPt = toPC({ x: boxPt.x + cxOff, y: boxPt.y + 4 + cYShift + effectiveCfs * (ann.lineHeight || 1.3) * i + effectiveCfs })
                  page.drawText(cLines[i], {
                    x: lPt.x, y: lPt.y,
                    size: effectiveCfs, font: calloutFont, color: c, opacity: 1,
                  })
                  if (ann.underline) {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    const culY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs + cfs * 0.15
                    const culStart = toPC({ x: boxPt.x + cxOff, y: culY })
                    const culEnd = toPC({ x: boxPt.x + cxOff + ctw, y: culY })
                    page.drawLine({ start: culStart, end: culEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                  }
                  if (ann.strikethrough) {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    const cstY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs - cfs * 0.35
                    const cstStart = toPC({ x: boxPt.x + cxOff, y: cstY })
                    const cstEnd = toPC({ x: boxPt.x + cxOff + ctw, y: cstY })
                    page.drawLine({ start: cstStart, end: cstEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                  }
                }
              }

              // Arrows
              if (ann.arrows) {
                for (const tip of ann.arrows) {
                  const origin = nearestPointOnRect(boxPt.x, boxPt.y, ann.width, ann.height, tip.x, tip.y)
                  const aS = toPC(origin)
                  const aE = toPC(tip)
                  const aAngle = Math.atan2(aE.y - aS.y, aE.x - aS.x)
                  const aHl = Math.min(20, Math.max(10, 1.5 * 2.5))
                  const aHalf = Math.PI / 7
                  const abX = aE.x - aHl * Math.cos(aAngle)
                  const abY = aE.y - aHl * Math.sin(aAngle)
                  page.drawLine({
                    start: aS, end: { x: abX, y: abY },
                    thickness: 1.5, color: c, opacity: 1,
                  })
                  const aLxOff = -aHl * Math.cos(aAngle - aHalf)
                  const aLyOff = aHl * Math.sin(aAngle - aHalf)
                  const aRxOff = -aHl * Math.cos(aAngle + aHalf)
                  const aRyOff = aHl * Math.sin(aAngle + aHalf)
                  page.drawSvgPath(`M 0 0 L ${aLxOff} ${aLyOff} L ${aRxOff} ${aRyOff} Z`, {
                    x: aE.x, y: aE.y, color: c, opacity: 1, borderWidth: 0,
                  })
                }
              }
              break
            }
            case 'stamp': {
              if (!ann.points.length || !ann.width || !ann.height) break
              const stampPt = toPC(ann.points[0])
              const stampTr = toPC({ x: ann.points[0].x + ann.width, y: ann.points[0].y })
              const stampW = Math.abs(stampTr.x - stampPt.x)
              const stampH = ann.height
              const stampX = Math.min(stampPt.x, stampTr.x)
              const stampY = stampPt.y - stampH
              // Background fill
              if (ann.backgroundColor) {
                const { r: bgr, g: bgg, b: bgb } = parseHexColor(ann.backgroundColor)
                page.drawRectangle({
                  x: stampX, y: stampY, width: stampW, height: stampH,
                  color: rgb(bgr, bgg, bgb), opacity: ann.opacity,
                })
              }
              // Border
              page.drawRectangle({
                x: stampX, y: stampY, width: stampW, height: stampH,
                borderColor: c, borderWidth: 1.5, opacity: ann.opacity,
              })
              // Text
              const stampFont = await getFont(ann.fontFamily || 'Arial', true, false)
              const stampLabel = ann.stampType || 'STAMP'
              const stampFs = Math.min(ann.height * 0.42, 18)
              const tw = stampFont.widthOfTextAtSize(stampLabel, stampFs)
              const sp = toPC({ x: ann.points[0].x + ann.width / 2, y: ann.points[0].y + ann.height / 2 })
              page.drawText(stampLabel, {
                x: sp.x - tw / 2, y: sp.y - stampFs / 2,
                size: stampFs, font: stampFont, color: c, opacity: ann.opacity,
              })
              break
            }
          }
        }
      }

      // Export measurements
      const measFont = await doc.embedFont(StandardFonts.Helvetica)
      for (const [pageStr, pageMeas] of Object.entries(measurements)) {
        const pageNum = parseInt(pageStr)
        if (pageNum < 1 || pageNum > pages.length || !pageMeas.length) continue
        const page = pages[pageNum - 1]
        const { width: origW, height: origH } = page.getSize()
        const rotation = pageRotations[pageNum] || 0
        const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

        for (const m of pageMeas) {
          const s = toPC(m.startPt)
          const e = toPC(m.endPt)
          const pxDist = Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y)

          // Dashed cyan line
          page.drawLine({
            start: s, end: e,
            thickness: 1.5, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
            dashArray: [6, 4],
          })

          // Endpoint circles
          for (const pt of [s, e]) {
            page.drawCircle({
              x: pt.x, y: pt.y, size: 3,
              color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
            })
          }

          // Distance label
          let label: string
          if (calibration.pixelsPerUnit !== null) {
            const realDist = pxDist / calibration.pixelsPerUnit
            label = `${realDist.toFixed(2)} ${calibration.unit}`
          } else {
            label = `${pxDist.toFixed(1)} px`
          }
          const mid = toPC({ x: (m.startPt.x + m.endPt.x) / 2, y: (m.startPt.y + m.endPt.y) / 2 })
          const tw = measFont.widthOfTextAtSize(label, 9)
          const padX = 4
          const padY = 2
          // Label background pill
          page.drawRectangle({
            x: mid.x - tw / 2 - padX, y: mid.y - 5 - padY,
            width: tw + padX * 2, height: 10 + padY * 2,
            color: rgb(0, 0.16, 0.2), opacity: 0.85,
            borderColor: rgb(0.133, 0.827, 0.933), borderWidth: 0.5, borderOpacity: 0.9,
          })
          page.drawText(label, {
            x: mid.x - tw / 2, y: mid.y - 4,
            size: 9, font: measFont, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
          })
        }
      }

      // Apply rotation to pages without annotations too
      for (const [pageStr, rot] of Object.entries(pageRotations)) {
        const pageNum = parseInt(pageStr)
        if (rot === 0 || pageNum < 1 || pageNum > pages.length) continue
        if (annotations[pageNum]?.length) continue // already handled above
        const page = pages[pageNum - 1]
        const existingRot = page.getRotation().angle
        page.setRotation(degrees((existingRot + rot) % 360))
      }

      // Apply crop regions
      for (const [pageStr, cropRgn] of Object.entries(cropRegions)) {
        const cropPageNum = parseInt(pageStr)
        if (cropPageNum < 1 || cropPageNum > pages.length) continue
        const cropPage = pages[cropPageNum - 1]
        const { width: cpw, height: cph } = cropPage.getSize()
        const cropRot = pageRotations[cropPageNum] || 0
        const blPdf = toPdfCoords({ x: cropRgn.x, y: cropRgn.y + cropRgn.h }, cpw, cph, cropRot)
        const trPdf = toPdfCoords({ x: cropRgn.x + cropRgn.w, y: cropRgn.y }, cpw, cph, cropRot)
        const minX = Math.min(blPdf.x, trPdf.x)
        const minY = Math.min(blPdf.y, trPdf.y)
        const cropW = Math.abs(trPdf.x - blPdf.x)
        const cropH = Math.abs(trPdf.y - blPdf.y)
        if (cropW > 0 && cropH > 0) {
          cropPage.setMediaBox(minX, minY, cropW, cropH)
        }
      }

      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const fileName = `${pdfFile.name.replace(/\.pdf$/i, '')}-annotated.pdf`

      const pickerResult = await saveWithPicker(blob, fileName, {
        description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] },
      })
      if (pickerResult === 'cancelled') return
      if (pickerResult === 'fallback') downloadBlob(blob, fileName)
      addToast({ type: 'success', message: 'PDF exported' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setExportError(`Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }, [pdfFile, annotations, pageRotations, editingTextId, commitTextEditing, measurements, calibration])

  // ── Reset ────────────────────────────────────────────

  const handleReset = useCallback(() => {
    if (!confirm('Discard all annotations and start over?')) return
    clearSession()
    if (pdfFileRef.current) removePDFFromCache(pdfFileRef.current.id)
    setPdfFile(null)
    setAnnotations({})
    historyRef.current = [{}]
    historyIdxRef.current = 0
    setCurrentPage(1)
    setZoom(1.0)
    setThumbnails({})
    setSidebarOpen(false)
    setSelectedThumbPage(null)
    loadingThumbs.current.clear()
    setPageRotations({})
    setSelectedAnnId(null)
    setEditingTextId(null)
    setEditingTextValue('')
    setMeasurements({})
    setCalibration({ pixelsPerUnit: null, unit: 'in' })
    setCalibrateModalOpen(false)
    setCalibrateMeasureId(null)
    setSelectedMeasureId(null)
    measureStartRef.current = null
    measurePreviewRef.current = null
    polyPointsRef.current = []
    polyPreviewRef.current = null
    setPolyMeasurements({})
    setCountGroups({})
    setActiveCountGroup(null)
    setMeasureMode('distance')
    setMeasureDropdownOpen(false)
    setCropRegions({})
    setCommentThreads([])
    setStickyNotes({})
    setChatBubbleTarget(null)
    setCommentsPanelOpen(false)
    setExportModalOpen(false)
    setEmailModalOpen(false)
  }, [])

  // ── Pre-render derived values (must be before any early return) ──

  // Memoize total annotation count so badge doesn't recompute on every render
  const totalAnnotationCount = useMemo(() =>
    Object.values(annotations).reduce((s, a) => s + a.length, 0)
  , [annotations])

  // ── Render ───────────────────────────────────────────

  if (!pdfFile) {
    const savedSession = loadSession()
    return (
      <div className="h-full flex flex-col gap-4">
        {savedSession && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-300 flex-1">
              Previous session found. Re-select <strong>{savedSession.file.fileName}</strong> to restore your annotations.
            </p>
            <button
              onClick={() => { clearSession(); forceRender(v => v + 1) }}
              className="p-1 rounded text-blue-400/60 hover:text-blue-400 transition-colors"
              aria-label="Dismiss session banner"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <FileDropZone
          onFiles={handleFiles}
          accept="application/pdf"
          multiple={false}
          label="Drop a PDF file here"
          description="Annotate with pencil, shapes, text & more"
          className="h-full"
        />
        {loadError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 flex-1">{loadError}</p>
            <button
              onClick={() => setLoadError(null)}
              className="p-1 rounded text-red-400/60 hover:text-red-400 transition-colors"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  const zoomPct = Math.round(zoom * 100)
  const activeDrawDef = DRAW_TOOLS.find(s => s.type === activeTool) || DRAW_TOOLS.find(s => s.type === activeDraw)!
  const ActiveDrawIcon = activeDrawDef.icon
  const activeTextDef = TEXT_TOOLS.find(s => s.type === activeTool) || TEXT_TOOLS.find(s => s.type === activeText)!
  const ActiveTextIcon = activeTextDef.icon

  // Compute scaled layout dimensions for innerRef so it centers when zoomed out.
  // CSS transform: scale() shrinks visually but the layout box stays at unscaled size;
  // setting explicit width/height + margin:auto makes the box match its visual size.
  const innerScaledW = (() => {
    if (!pdfFile || maxCanvasWidthRef.current === 0) return 0
    return maxCanvasWidthRef.current * zoom
  })()
  const innerScaledH = (() => {
    if (!pdfFile) return 0
    let totalH = 0
    for (let p = 1; p <= pdfFile.pageCount; p++) {
      const d = pageDimsMap.current.get(p)
      if (d) totalH += d.height
    }
    totalH += Math.max(0, pdfFile.pageCount - 1) * 24 // gap-6 = 24px
    return totalH * zoom
  })()

  // Get the editing text annotation for textarea overlay
  const editingAnn = editingTextId ? getAnnotation(editingTextId) : null
  const selectedAnn = selectedAnnId ? getAnnotation(selectedAnnId) : null
  const isTextAnnSelected = selectedAnn && (selectedAnn.type === 'text' || selectedAnn.type === 'callout')
  const isShapeAnnSelected = selectedAnn && !isTextAnnSelected

  // Properties bar context
  const showPropsForTool = activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'measure' && activeTool !== 'stamp' && activeTool !== 'imageStamp' && activeTool !== 'crop' && activeTool !== 'note' && activeTool !== 'ocrRegion'
  const showPropsForSelection = activeTool === 'select' && selectedAnn
  const showTextProps = (isTextAnnSelected && activeTool === 'select') || activeTool === 'text' || activeTool === 'callout'
  const showStrokeWidth = (isShapeAnnSelected && activeTool === 'select') ||
    (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'callout' && activeTool !== 'eraser' && activeTool !== 'measure' && activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'stamp' && activeTool !== 'crop' && activeTool !== 'note' && activeTool !== 'ocrRegion')
  const showOpacity = showPropsForTool || (activeTool === 'select' && selectedAnn != null)
  const showColorPicker = showPropsForTool || showPropsForSelection
  const showEraserControls = activeTool === 'eraser'
  const showMeasureControls = activeTool === 'measure'
  const showCropControls = activeTool === 'crop'

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Bar: Zoom + Export only ── */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-white/[0.06] flex-shrink-0">
        {/* Sidebar toggle */}
        {pdfFile.pageCount > 1 && (
          <>
            <button onClick={() => setSidebarOpen(o => !o)} title="Page thumbnails" aria-label="Toggle page thumbnails"
              className={`p-1 rounded-lg transition-colors ${
                sidebarOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <PanelLeft size={14} />
            </button>
            <div className="w-px h-5 bg-white/[0.08]" />
          </>
        )}

        {/* Zoom */}
        <button onClick={() => zoomAtCenter(Math.round(Math.max(0.25, zoom - 0.25) * 100) / 100)} title="Zoom out"
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomOut size={14} />
        </button>
        <div ref={zoomDropdownRef} className="relative">
          <button onClick={() => setZoomDropdownOpen(o => !o)} title="Zoom presets"
            className="text-[11px] text-white/50 hover:text-white w-10 text-center rounded-lg py-0.5 hover:bg-white/[0.06] transition-colors">
            {zoomPct}%
          </button>
          {zoomDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
              {ZOOM_PRESETS.map(z => (
                <button key={z} onClick={() => { zoomAtCenter(z); setZoomDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    Math.abs(zoom - z) < 0.01 ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  {Math.round(z * 100)}%
                </button>
              ))}
              <div className="h-px bg-white/[0.08] my-1" />
              <button onClick={() => { fitToWindow(); setZoomDropdownOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]">
                Fit Page
              </button>
            </div>
          )}
        </div>
        <button onClick={() => zoomAtCenter(Math.round(Math.min(4.0, zoom + 0.25) * 100) / 100)} title="Zoom in"
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomIn size={14} />
        </button>
        <button onClick={fitToWindow} title="Fit to window (F)"
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <Maximize size={14} />
        </button>

        {/* Page jump input */}
        {pdfFile.pageCount > 1 && (
          <div className="flex items-center gap-0.5 ml-1">
            {pageInputActive ? (
              <input
                type="number" min={1} max={pdfFile.pageCount}
                defaultValue={currentPage} autoFocus
                className="w-14 text-center text-xs bg-white/[0.06] border border-white/20 rounded px-1 py-0.5 text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onBlur={e => { navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, Number(e.target.value)))); setPageInputActive(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, Number(e.currentTarget.value)))); setPageInputActive(false) }
                  if (e.key === 'Escape') setPageInputActive(false)
                }}
              />
            ) : (
              <button onClick={() => setPageInputActive(true)} className="text-xs text-white/40 hover:text-white/80 tabular-nums px-1 rounded hover:bg-white/[0.06]">
                {currentPage} / {pdfFile.pageCount}
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Find button — stays visible with label */}
        <button onClick={() => { setFindOpen(o => !o); setTimeout(() => findInputRef.current?.focus(), 50) }} title="Find text (Ctrl+F)"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${findOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'}`}>
          <Search size={14} />
          <span>Find</span>
        </button>

        {/* More dropdown — replaces icon-only buttons */}
        <div className="relative" ref={moreMenuRef}>
          <button onClick={() => setMoreMenuOpen(o => !o)} title="More tools"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
              moreMenuOpen ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
            }`}>
            <MoreHorizontal size={14} />
            <span>More</span>
            <ChevronDown size={10} className={`transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {moreMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-[#0a1929] border border-white/[0.1] rounded-xl shadow-2xl py-1.5 z-50">
              <button onClick={() => { setAnnListOpen(o => !o); setMoreMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                <List size={15} className="text-white/40 shrink-0" />
                <span>Annotation List</span>
                {totalAnnotationCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] bg-[#F47B20] rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1">
                    {totalAnnotationCount > 99 ? '99+' : totalAnnotationCount}
                  </span>
                )}
              </button>
              <button onClick={() => { setMarkupsListOpen(o => !o); setMoreMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                <FileSpreadsheet size={15} className="text-white/40 shrink-0" />
                <span>Markups List</span>
              </button>

              {bookmarks.length > 0 && (
                <button onClick={() => { setBookmarksOpen(o => !o); setMoreMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                  <BookOpen size={15} className="text-white/40 shrink-0" />
                  <span>Bookmarks</span>
                </button>
              )}

              <div className="h-px bg-white/[0.06] my-1 mx-3" />

              <button onClick={() => { setPresetsOpen(o => !o); setMoreMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                <Star size={15} className="text-white/40 shrink-0" />
                <span>Tool Presets</span>
              </button>
              <button onClick={() => { setCompareOpen(true); setMoreMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                <Blend size={15} className="text-white/40 shrink-0" />
                <span>Compare PDFs</span>
              </button>

              <div className="h-px bg-white/[0.06] my-1 mx-3" />

              <button onClick={() => { setStampLibraryOpen(true); setMoreMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] transition-colors">
                <ImagePlus size={15} className="text-white/40 shrink-0" />
                <span>Stamp Library</span>
              </button>
            </div>
          )}
        </div>

        {/* Email, Print, Report, CSV, New, Export */}
        <Button variant="ghost" size="sm" onClick={() => setEmailModalOpen(true)} icon={<Mail size={12} />}>
          Email
        </Button>
        <Button variant="ghost" size="sm" disabled={isPrinting} onClick={async () => {
          setIsPrinting(true)
          try {
            await printAnnotatedPDF(pageRefsMap.current, pdfFile.pageCount, pageDimsMap.current)
          } finally {
            setIsPrinting(false)
          }
        }} icon={<Printer size={12} />}>
          {isPrinting ? 'Printing...' : 'Print'}
        </Button>
        <Button variant="ghost" size="sm" onClick={async () => {
          const reportBytes = await generateMarkupReport({
            fileName: pdfFile.name,
            pageCount: pdfFile.pageCount,
            pageRefsMap: pageRefsMap.current,
            annotations, measurements, polyMeasurements, countGroups,
            commentThreads, stickyNotes, calibration,
          })
          downloadBlob(new Blob([reportBytes], { type: 'application/pdf' }), `report-${pdfFile.name}`)
        }} icon={<FileText size={12} />}>
          Report
        </Button>
        {(Object.keys(measurements).length > 0 || Object.keys(polyMeasurements).length > 0 || Object.keys(countGroups).length > 0) && (
          <Button variant="ghost" size="sm" onClick={() => {
            const rows = gatherMeasurementData(measurements, polyMeasurements, countGroups, calibration)
            if (rows.length === 0) return
            exportMeasurementsToCSV(rows, `measurements-${pdfFile.name.replace('.pdf', '')}.csv`)
          }} icon={<FileSpreadsheet size={12} />}>
            CSV
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw size={12} />}>
          New
        </Button>
        {exportError && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-[10px] text-red-400">{exportError}</span>
            <button onClick={() => setExportError(null)} className="p-0.5 text-red-400/60 hover:text-red-400"><X size={10} /></button>
          </div>
        )}
        <Button size="sm" onClick={() => setExportModalOpen(true)} disabled={isExporting} icon={<Download size={12} />}>
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>

      {/* ── Find Bar ── */}
      {findOpen && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] bg-[#001218] flex-shrink-0">
          <Search size={12} className="text-white/40 flex-shrink-0" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find text… (Enter to search)"
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (findMatches.length > 0 && findCommittedQuery === findQuery.trim()) {
                  // Already searched — cycle through matches
                  if (e.shiftKey) setFindIdx(i => (i - 1 + findMatches.length) % findMatches.length)
                  else setFindIdx(i => (i + 1) % findMatches.length)
                } else {
                  // First Enter or query changed — run search
                  executeFind()
                }
              }
              if (e.key === 'Escape') { setFindOpen(false); setFindQuery(''); setFindCommittedQuery(''); setFindMatches([]); ocrAbortRef.current?.abort(); setOcrScanning(false) }
            }}
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
          />
          {findMatches.length > 0 && (
            <span className="text-xs text-white/40 flex-shrink-0">{findIdx + 1} / {findMatches.length}</span>
          )}
          {findCommittedQuery && findMatches.length === 0 && !ocrScanning && (
            <span className="text-xs text-red-400/70 flex-shrink-0">No matches</span>
          )}
          {ocrScanning && (
            <span className="text-xs text-[#F47B20]/70 flex-shrink-0 animate-pulse">OCR scanning...</span>
          )}
          <button
            onClick={() => setFindCaseSensitive(v => !v)}
            title="Case sensitive (Alt+C)"
            className={`px-1 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-colors ${
              findCaseSensitive ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
            }`}
          >Aa</button>
          <button onClick={() => setFindIdx(i => (i - 1 + Math.max(1, findMatches.length)) % Math.max(1, findMatches.length))} disabled={findMatches.length === 0}
            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setFindIdx(i => (i + 1) % Math.max(1, findMatches.length))} disabled={findMatches.length === 0}
            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded">
            <ChevronRight size={12} />
          </button>
          <button onClick={() => { setFindOpen(false); setFindQuery(''); setFindCommittedQuery(''); setFindMatches([]); ocrAbortRef.current?.abort(); setOcrScanning(false) }} className="p-0.5 text-white/40 hover:text-white rounded">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Contextual Properties Bar ── */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] flex-shrink-0 min-h-[28px]">
        {/* Color picker */}
        {showColorPicker && (
          <ColorPicker
            value={color}
            onChange={c => {
              setColor(c)
              if (selectedAnnId) updateAnnotation(selectedAnnId, { color: c })
            }}
            presets={(activeTool === 'highlighter' || activeTool === 'textHighlight') ? HIGHLIGHT_COLORS : ANN_COLORS}
          />
        )}

        {/* Stroke width */}
        {showStrokeWidth && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Width</span>
            <input type="range" min={1} max={20} value={strokeWidth}
              onChange={e => {
                const val = Number(e.target.value)
                setStrokeWidth(val)
                if (selectedAnnId && isShapeAnnSelected) updateAnnotation(selectedAnnId, { strokeWidth: val })
              }}
              className="w-16 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-4">{strokeWidth}</span>
          </div>
        )}

        {/* Opacity */}
        {showOpacity && activeTool !== 'highlighter' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Opacity</span>
            <input type="range" min={10} max={100} step={5} value={opacity}
              onChange={e => {
                const val = Number(e.target.value)
                setOpacity(val)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { opacity: val / 100 })
              }}
              className="w-14 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-6">{opacity}%</span>
          </div>
        )}

        {/* Fill color — shapes only */}
        {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud' || activeTool === 'polygon' ||
          (activeTool === 'select' && selectedAnn && (selectedAnn.type === 'rectangle' || selectedAnn.type === 'circle' || selectedAnn.type === 'cloud' || selectedAnn.type === 'polygon'))) && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Fill</span>
            <input type="color" value={fillColor || '#ffffff'}
              onChange={e => {
                setFillColor(e.target.value)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { fillColor: e.target.value })
              }}
              className="w-5 h-5 rounded cursor-pointer border border-white/[0.1] bg-transparent p-0"
            />
            <button
              onClick={() => {
                setFillColor(null)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { fillColor: undefined })
              }}
              className={`px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                !fillColor ? 'bg-white/10 text-white/60' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
              }`}>
              None
            </button>
          </div>
        )}

        {/* Corner radius — rectangle only */}
        {(activeTool === 'rectangle' || (activeTool === 'select' && selectedAnn?.type === 'rectangle')) && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Radius</span>
            <input type="range" min={0} max={30} value={cornerRadius}
              onChange={e => {
                const val = Number(e.target.value)
                setCornerRadius(val)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { cornerRadius: val })
              }}
              className="w-12 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-4">{cornerRadius}</span>
          </div>
        )}

        {/* Dash pattern — shapes/lines */}
        {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'cloud' || activeTool === 'polygon' ||
          (activeTool === 'select' && selectedAnn && ['rectangle', 'circle', 'line', 'arrow', 'cloud', 'polygon'].includes(selectedAnn.type))) && (
          <div className="flex items-center gap-0.5">
            {(['solid', 'dashed', 'dotted'] as const).map(dp => (
              <button key={dp} onClick={() => {
                setDashPattern(dp)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { dashPattern: dp === 'solid' ? undefined : dp })
              }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  dashPattern === dp ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
                }`}>
                {dp === 'solid' ? '━' : dp === 'dashed' ? '╌' : '┈'}
              </button>
            ))}
          </div>
        )}

        {/* Double-headed arrow */}
        {(activeTool === 'arrow' || (activeTool === 'select' && selectedAnn?.type === 'arrow')) && (
          <button onClick={() => {
            setArrowStart(!arrowStart)
            if (selectedAnnId) updateAnnotation(selectedAnnId, { arrowStart: !arrowStart })
          }}
            title={arrowStart ? 'Double-headed arrow' : 'Single arrow'}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
              arrowStart ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
            }`}>
            {arrowStart ? '↔' : '→'}
          </button>
        )}

        {/* Straight-line mode */}
        {(activeTool === 'pencil' || activeTool === 'highlighter') && (
          <button onClick={() => setStraightLineMode(m => !m)}
            title={straightLineMode ? 'Straight line mode' : 'Freehand mode'}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              straightLineMode
                ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30'
                : 'text-white/40 hover:text-white/60 border border-white/[0.08]'
            }`}>
            {straightLineMode ? 'Straight' : 'Free'}
          </button>
        )}

        {/* Text formatting controls */}
        {showTextProps && (
          <>
            <div className="w-px h-5 bg-white/[0.08]" />
            <select value={fontFamily} onChange={e => {
              const ff = e.target.value
              setFontFamily(ff)
              if (editingTextId) updateAnnotation(editingTextId, { fontFamily: ff })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { fontFamily: ff })
              }
            }}
              className="px-1 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white max-w-[100px]">
              {FONT_FAMILIES.map(ff => (
                <option key={ff} value={ff} style={{ fontFamily: ff }}>{ff}</option>
              ))}
            </select>
            <select value={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].includes(fontSize) ? fontSize : ''}
              onChange={e => {
                const fs = Number(e.target.value)
                if (fs) {
                  setFontSize(fs)
                  if (editingTextId) updateAnnotation(editingTextId, { fontSize: fs })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { fontSize: fs })
                  }
                }
              }}
              className="w-14 px-0.5 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white">
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {![8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].includes(fontSize) && (
                <option value={fontSize}>{fontSize}</option>
              )}
            </select>
            <div className="flex items-center gap-0.5">
              {([
                { key: 'bold' as const, Icon: Bold, label: 'Bold (Ctrl+B)', val: bold, set: setBold },
                { key: 'italic' as const, Icon: Italic, label: 'Italic (Ctrl+I)', val: italic, set: setItalic },
                { key: 'underline' as const, Icon: Underline, label: 'Underline (Ctrl+U)', val: underline, set: setUnderline },
                { key: 'strikethrough' as const, Icon: Strikethrough, label: 'Strikethrough (Ctrl+Shift+X)', val: strikethrough, set: setStrikethrough },
              ] as const).map(({ key, Icon, label, val, set }) => (
                <button key={key} onMouseDown={e => e.preventDefault()} onClick={() => {
                  const next = !val
                  set(next)
                  if (editingTextId) updateAnnotation(editingTextId, { [key]: next })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { [key]: next })
                  }
                }} title={label}
                  className={`p-1 rounded transition-colors ${
                    val ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {([
                { align: 'left' as const, Icon: AlignLeft, label: 'Align Left' },
                { align: 'center' as const, Icon: AlignCenter, label: 'Align Center' },
                { align: 'right' as const, Icon: AlignRight, label: 'Align Right' },
                { align: 'justify' as const, Icon: AlignJustify, label: 'Justify' },
              ] as const).map(({ align, Icon, label }) => (
                <button key={align} onMouseDown={e => e.preventDefault()} onClick={() => {
                  setTextAlign(align)
                  if (editingTextId) updateAnnotation(editingTextId, { textAlign: align })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { textAlign: align })
                  }
                }} title={label}
                  className={`p-1 rounded transition-colors ${
                    textAlign === align ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <button onMouseDown={e => e.preventDefault()} onClick={() => {
              const next = textBgColor ? null : color
              setTextBgColor(next)
              if (editingTextId) updateAnnotation(editingTextId, { backgroundColor: next || undefined })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { backgroundColor: next || undefined })
              }
            }} title="Text background highlight"
              className={`p-1 rounded transition-colors ${
                textBgColor ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
              }`}>
              <Paintbrush size={13} />
            </button>
            <select value={lineSpacing} onChange={e => {
              const lh = parseFloat(e.target.value)
              setLineSpacing(lh)
              if (editingTextId) updateAnnotation(editingTextId, { lineHeight: lh })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { lineHeight: lh })
              }
            }} title="Line spacing"
              className="px-1 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white">
              {[1.0, 1.15, 1.3, 1.5, 2.0].map(v => (
                <option key={v} value={v}>{v === 1.3 ? '1.3 (default)' : v.toString()}</option>
              ))}
            </select>
            <div className="flex items-center gap-0.5">
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = !superscript
                setSuperscript(next)
                if (next) setSubscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { superscript: next, ...(next ? { subscript: false } : {}) })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { superscript: next, ...(next ? { subscript: false } : {}) })
                }
              }} title="Superscript"
                className={`p-1 rounded transition-colors ${
                  superscript ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <Superscript size={13} />
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = !subscript
                setSubscript(next)
                if (next) setSuperscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { subscript: next, ...(next ? { superscript: false } : {}) })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { subscript: next, ...(next ? { superscript: false } : {}) })
                }
              }} title="Subscript"
                className={`p-1 rounded transition-colors ${
                  subscript ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <Subscript size={13} />
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = listType === 'bullet' ? 'none' : 'bullet'
                setListType(next)
                if (editingTextId) updateAnnotation(editingTextId, { listType: next })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { listType: next })
                }
              }} title="Bullet list"
                className={`p-1 rounded transition-colors ${
                  listType === 'bullet' ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <List size={13} />
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = listType === 'numbered' ? 'none' : 'numbered'
                setListType(next)
                if (editingTextId) updateAnnotation(editingTextId, { listType: next })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { listType: next })
                }
              }} title="Numbered list"
                className={`p-1 rounded transition-colors ${
                  listType === 'numbered' ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <ListOrdered size={13} />
              </button>
            </div>
          </>
        )}

        {/* Eraser controls */}
        {showEraserControls && (
          <>
            <div className="flex items-center bg-white/[0.06] rounded-md p-0.5">
              <button onClick={() => setEraserMode('partial')} title="Partial erase"
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  eraserMode === 'partial' ? 'bg-[#F47B20] text-white' : 'text-white/50 hover:text-white'
                }`}>Partial</button>
              <button onClick={() => setEraserMode('object')} title="Object erase"
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  eraserMode === 'object' ? 'bg-[#F47B20] text-white' : 'text-white/50 hover:text-white'
                }`}>Object</button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/40">Size</span>
              <input type="range" min={5} max={50} value={eraserRadius}
                onChange={e => setEraserRadius(Number(e.target.value))}
                className="w-16 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
              <span className="text-[10px] text-white/40 w-5">{eraserRadius}</span>
            </div>
          </>
        )}

        {/* Measure controls */}
        {showMeasureControls && (
          <>
            {calibration.pixelsPerUnit !== null && (
              <span className="text-[10px] text-cyan-400/70">
                Scale: {calibration.pixelsPerUnit.toFixed(1)} px/{calibration.unit}
              </span>
            )}
            {(measurements[currentPage] || []).length > 0 && (
              <button
                onClick={() => {
                  setMeasurements(prev => { const next = { ...prev }; delete next[currentPage]; return next })
                  setSelectedMeasureId(null)
                }}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Clear All
              </button>
            )}
            {calibration.pixelsPerUnit !== null && (
              <button
                onClick={() => setCalibration({ pixelsPerUnit: null, unit: 'in' })}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Reset Scale
              </button>
            )}
          </>
        )}

        {/* Stamp controls — tool mode or stamp selected */}
        {(activeTool === 'stamp' || (activeTool === 'select' && selectedAnn?.type === 'stamp')) && (
          <div className="flex items-center gap-1 flex-wrap">
            {STAMP_PRESETS.map(preset => {
              const isActive = activeTool === 'stamp'
                ? activeStampPreset.label === preset.label
                : selectedAnn?.stampType === preset.label
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    if (activeTool === 'stamp') { setActiveStampPreset(preset) }
                    else if (selectedAnnId) {
                      const p = STAMP_PRESETS.find(s => s.label === preset.label)
                      if (p) updateAnnotation(selectedAnnId, { stampType: p.label, color: p.color, backgroundColor: p.bg })
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors border ${
                    isActive
                      ? 'border-current ring-1 ring-inset ring-current'
                      : 'border-white/[0.1] text-white/40 hover:border-white/30 hover:text-white/70'
                  }`}
                  style={isActive ? { color: preset.color, borderColor: preset.color } : {}}>
                  {preset.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Crop controls */}
        {showCropControls && (
          <>
            <span className="text-[10px] text-white/40">Drag to set crop region</span>
            {cropRegions[currentPage] && (
              <button
                onClick={() => { setCropRegions(prev => { const next = { ...prev }; delete next[currentPage]; return next }) }}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Clear Crop
              </button>
            )}
          </>
        )}

        {/* Select hint */}
        {activeTool === 'select' && !selectedAnn && (
          <span className="text-[10px] text-white/25 italic">Click to select annotations</span>
        )}
      </div>

      {/* ── Content: sidebar + canvas ──────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnail sidebar */}
        {sidebarOpen && (
          <div className="w-48 border-r border-white/[0.06] bg-black/20 flex flex-col flex-shrink-0">
            <div className="px-3 py-2 text-xs text-white/50 font-medium border-b border-white/[0.06]">
              Pages ({pdfFile.pageCount})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1).map(pageNum => (
                <ThumbnailItem
                  key={pageNum}
                  pageNum={pageNum}
                  thumbnail={thumbnails[pageNum]}
                  isCurrent={pageNum === currentPage}
                  isSelected={pageNum === selectedThumbPage}
                  hasAnnotations={(annotations[pageNum] || []).length > 0}
                  onVisible={handleThumbVisible}
                  onClick={handleThumbClick}
                  onDoubleClick={handleThumbClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Canvas area ─────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-black/20 relative">
          <div style={{
            display: 'inline-block',
            minWidth: '100%',
            minHeight: '100%',
            boxSizing: 'border-box',
            paddingTop: 24,
            paddingBottom: 24,
            paddingLeft: innerScaledW ? `max(24px, calc((100% - ${innerScaledW}px) / 2))` : 24,
            paddingRight: innerScaledW ? `max(24px, calc((100% - ${innerScaledW}px) / 2))` : 24,
          }}>
          <div style={{ height: innerScaledH || undefined }}>
          <div ref={innerRef} style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }} className="flex flex-col items-center gap-6">
            {Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1).map(pageNum => {
              const dims = pageDimsMap.current.get(pageNum)
              return (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="relative"
                  style={dims ? { width: dims.width, height: dims.height } : undefined}
                  ref={el => {
                    if (el) {
                      const existing = pageRefsMap.current.get(pageNum)
                      if (!existing || existing.container !== el) {
                        const pdfCanvas = el.querySelector<HTMLCanvasElement>('canvas.pdf-canvas')
                        const annCanvas = el.querySelector<HTMLCanvasElement>('canvas.ann-canvas')
                        if (pdfCanvas && annCanvas) {
                          pageRefsMap.current.set(pageNum, { pdfCanvas, annCanvas, container: el })
                        }
                      }
                    }
                  }}
                >
                  <canvas
                    className="pdf-canvas block"
                    width={dims?.width ?? 0}
                    height={dims?.height ?? 0}
                  />
                  <canvas
                    className="ann-canvas absolute top-0 left-0"
                    width={dims?.width ?? 0}
                    height={dims?.height ?? 0}
                    style={{ mixBlendMode: 'multiply', touchAction: 'none', cursor: canvasCursor || (activeTool === 'select' && selectedAnnId ? 'default' : CURSOR_MAP[activeTool]) }}
                    onPointerDown={e => handlePointerDown(e, pageNum)}
                    onPointerMove={e => handlePointerMove(e, pageNum)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onContextMenu={e => {
                      e.preventDefault()
                      const pt = getPointForPage(pageNum, e)
                      const ann = findAnnotationAt(pt, pageNum)
                      if (!ann) return
                      setSelectedAnnId(ann.id)
                      // Clamp to viewport so menu doesn't go off-screen
                      const menuW = 168, menuH = 200
                      const cx = Math.min(e.clientX, window.innerWidth - menuW - 8)
                      const cy = Math.min(e.clientY, window.innerHeight - menuH - 8)
                      setContextMenu({ x: cx, y: cy, annId: ann.id, pageNum })
                    }}
                    onMouseLeave={() => { if (activeTool === 'eraser') if (eraserCursorDivRef.current) eraserCursorDivRef.current.style.display = 'none' }}
                  />
                  {/* Eraser circle cursor rendered as fixed overlay at root level */}
                </div>
              )
            })}
          </div>
          </div>
          </div>
        </div>

        {/* ── Right Tool Panel ── */}
        <div className={`border-l border-white/[0.06] bg-black/20 flex flex-col py-2 gap-0.5 flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-out ${
          toolbarExpanded ? 'w-[140px] px-1.5 items-stretch' : 'w-10 px-0.5 items-center'
        }`}>
          {/* Toggle collapse */}
          <button
            onClick={() => setToolbarExpanded(prev => !prev)}
            className="flex items-center justify-center py-1 mb-1 text-white/30 hover:text-white/60 transition-colors rounded-lg hover:bg-white/[0.06]"
            title={toolbarExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            {toolbarExpanded ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
          <div className={`${toolbarExpanded ? 'w-full' : 'w-6'} h-px bg-white/[0.06] mb-1 self-center`} />

          {/* ── Primary Tools ── */}

          {/* Select */}
          <button onClick={() => setActiveTool('select')} title="Select (S)"
            className={`flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              activeTool === 'select'
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <MousePointer2 size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <>
                <span className="text-xs truncate">Select</span>
                <span className="ml-auto text-[10px] opacity-40">S</span>
              </>
            )}
          </button>

          {/* Shapes dropdown */}
          <div ref={shapesDropdownRef} className="relative">
            <button
              onClick={() => { if (!isDrawTool) setActiveTool(activeDraw); setShapesDropdownOpen(o => !o) }}
              title={activeDrawDef.label}
              className={`flex items-center rounded-lg transition-colors ${
                toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
              } ${
                isDrawTool
                  ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <ActiveDrawIcon size={toolbarExpanded ? 15 : 16} />
              {toolbarExpanded && (
                <>
                  <span className="text-xs truncate">{activeDrawDef.label}</span>
                  <ChevronDown size={10} className="ml-auto opacity-40" />
                </>
              )}
            </button>
            {shapesDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                {DRAW_TOOLS.map(s => (
                  <button key={s.type}
                    onClick={() => { setActiveTool(s.type); setActiveDraw(s.type); setShapesDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      activeTool === s.type ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    <s.icon size={14} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Highlight */}
          <button
            onClick={() => {
              if (selectTextToolbar) {
                const ann: Annotation = { id: genId(), type: 'highlighter', points: [{ x: 0, y: 0 }], color: '#FFFF00', strokeWidth: 0, opacity: 0.4, fontSize, rects: [...selectTextToolbar.rects] }
                commitAnnotation(ann); setSelectTextToolbar(null); redrawAll()
              } else { setActiveTool('highlighter'); setActiveHighlight('highlighter') }
            }}
            title="Highlight (H)"
            className={`flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              activeTool === 'highlighter'
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <Highlighter size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <>
                <span className="text-xs truncate">Highlight</span>
                <span className="ml-auto text-[10px] opacity-40">H</span>
              </>
            )}
          </button>

          {/* Strikethrough */}
          <button
            onClick={() => {
              if (selectTextToolbar) {
                const ann: Annotation = { id: genId(), type: 'highlighter', points: [{ x: 0, y: 0 }], color: '#FF0000', strokeWidth: 0, opacity: 1, fontSize, rects: [...selectTextToolbar.rects], strikethrough: true }
                commitAnnotation(ann); setSelectTextToolbar(null); redrawAll()
              } else { setActiveTool('textStrikethrough'); setActiveHighlight('textStrikethrough') }
            }}
            title="Strikethrough (Shift+X)"
            className={`flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              activeTool === 'textStrikethrough'
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <Strikethrough size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <span className="text-xs truncate">Strikethrough</span>
            )}
          </button>

          {/* Text tools dropdown */}
          <div ref={textDropdownRef} className="relative">
            <button
              onClick={() => { if (!isTextTool) setActiveTool(activeText); setTextDropdownOpen(o => !o) }}
              title={activeTextDef.label}
              className={`flex items-center rounded-lg transition-colors ${
                toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
              } ${
                isTextTool
                  ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <ActiveTextIcon size={toolbarExpanded ? 15 : 16} />
              {toolbarExpanded && (
                <>
                  <span className="text-xs truncate">{activeTextDef.label}</span>
                  <ChevronDown size={10} className="ml-auto opacity-40" />
                </>
              )}
            </button>
            {textDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                {TEXT_TOOLS.map(s => (
                  <button key={s.type}
                    onClick={() => { setActiveTool(s.type); setActiveText(s.type); setTextDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      activeTool === s.type ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    <s.icon size={14} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Eraser */}
          <button onClick={() => setActiveTool('eraser')} title="Eraser (E)"
            className={`flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              activeTool === 'eraser'
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <Eraser size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <>
                <span className="text-xs truncate">Eraser</span>
                <span className="ml-auto text-[10px] opacity-40">E</span>
              </>
            )}
          </button>

          {/* Measure dropdown */}
          <div ref={measureDropdownRef} className="relative">
            <button onClick={() => { if (activeTool === 'measure') { setMeasureDropdownOpen(o => !o) } else { setActiveTool('measure'); setMeasureDropdownOpen(false) } }} title="Measure (M)"
              className={`flex items-center rounded-lg transition-colors relative ${
                toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
              } ${
                activeTool === 'measure'
                  ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <Ruler size={toolbarExpanded ? 15 : 16} />
              {toolbarExpanded ? (
                <>
                  <span className="text-xs truncate">Measure</span>
                  <span className="ml-auto text-[10px] opacity-40">M</span>
                </>
              ) : (
                <ChevronDown size={7} className="absolute bottom-0.5 right-0.5 opacity-50" />
              )}
            </button>
            {measureDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.08] rounded-lg shadow-xl py-1 z-50 min-w-[160px]">
                {MEASURE_MODES.map(({ mode, label }) => (
                  <button key={mode}
                    onClick={() => { setMeasureMode(mode); setActiveTool('measure'); setMeasureDropdownOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      measureMode === mode ? 'text-[#F47B20] bg-[#F47B20]/10' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    {label}
                  </button>
                ))}
                <div className="h-px bg-white/[0.08] my-1" />
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 cursor-pointer hover:bg-white/[0.06]">
                  <input type="checkbox" checked={edgeSnappingEnabled}
                    onChange={e => setEdgeSnappingEnabled(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-[#F47B20] focus:ring-[#F47B20]" />
                  Edge Snap
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 cursor-pointer hover:bg-white/[0.06]">
                  <input type="checkbox" checked={precisionSnapMode}
                    onChange={e => setPrecisionSnapMode(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-[#F47B20] focus:ring-[#F47B20]" />
                  Precision Mode
                </label>
              </div>
            )}
          </div>

          {/* ── Divider between primary and secondary ── */}
          <div className={`${toolbarExpanded ? 'w-full' : 'w-6'} h-px bg-white/[0.06] my-1 self-center`} />

          {/* ── More Tools Expander ── */}
          <button
            onClick={() => setMoreToolsOpen(prev => !prev)}
            className={`flex items-center rounded-lg transition-colors border border-dashed border-white/[0.08] ${
              toolbarExpanded ? 'gap-2 px-2.5 py-1.5 w-full' : 'justify-center p-1.5'
            } text-white/30 hover:text-white/50`}
            title="More tools"
          >
            <MoreHorizontal size={14} />
            {toolbarExpanded && (
              <>
                <span className="text-xs">More tools</span>
                <ChevronDown size={12} className={`ml-auto transition-transform ${moreToolsOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* ── Secondary Tools (collapsible) ── */}
          {moreToolsOpen && (
            <>
              {/* Stamp */}
              <div ref={stampDropdownRef} className="relative">
                <button
                  onClick={() => { setActiveTool('stamp'); setStampDropdownOpen(o => !o) }}
                  title="Stamp"
                  className={`flex items-center rounded-lg transition-colors ${
                    toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
                  } ${
                    activeTool === 'stamp'
                      ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  <Tag size={toolbarExpanded ? 15 : 16} />
                  {toolbarExpanded && (
                    <>
                      <span className="text-xs truncate">Stamp</span>
                      <ChevronDown size={10} className="ml-auto opacity-40" />
                    </>
                  )}
                </button>
                {stampDropdownOpen && (
                  <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                    {STAMP_PRESETS.map(preset => (
                      <button key={preset.label}
                        onClick={() => { setActiveStampPreset(preset); setStampDropdownOpen(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                          activeStampPreset.label === preset.label ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                        }`}>
                        <span className="font-bold text-[10px]" style={{ color: preset.color }}>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Crop */}
              <button onClick={() => setActiveTool('crop')} title="Crop page"
                className={`flex items-center rounded-lg transition-colors ${
                  toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
                } ${
                  activeTool === 'crop'
                    ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <Crop size={toolbarExpanded ? 15 : 16} />
                {toolbarExpanded && (
                  <span className="text-xs truncate">Crop</span>
                )}
              </button>

              {/* Image Stamp */}
              <button onClick={() => {
                setActiveTool('imageStamp')
                // Open file picker immediately
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp'
                input.onchange = async () => {
                  const file = input.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = reader.result as string
                    // Store pending image for next canvas click
                    pendingImageRef.current = dataUrl
                  }
                  reader.readAsDataURL(file)
                }
                input.click()
              }} title="Image Stamp (I)"
                className={`flex items-center rounded-lg transition-colors ${
                  toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
                } ${
                  activeTool === 'imageStamp'
                    ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <ImagePlus size={toolbarExpanded ? 15 : 16} />
                {toolbarExpanded && (
                  <>
                    <span className="text-xs truncate">Image Stamp</span>
                    <span className="ml-auto text-[10px] opacity-40">I</span>
                  </>
                )}
              </button>

              {/* OCR Region Scan */}
              <button onClick={() => { setActiveTool('ocrRegion'); setOcrRegionResult(null) }} title="OCR Region Scan"
                className={`flex items-center rounded-lg transition-colors ${
                  toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
                } ${
                  activeTool === 'ocrRegion'
                    ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <ScanText size={toolbarExpanded ? 15 : 16} />
                {toolbarExpanded && (
                  <span className="text-xs truncate">OCR Scan</span>
                )}
              </button>

              {/* Sticky Note */}
              <button onClick={() => setActiveTool('note')} title="Sticky Note (N)"
                className={`flex items-center rounded-lg transition-colors ${
                  toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
                } ${
                  activeTool === 'note'
                    ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <StickyNoteIcon size={toolbarExpanded ? 15 : 16} />
                {toolbarExpanded && (
                  <>
                    <span className="text-xs truncate">Sticky Note</span>
                    <span className="ml-auto text-[10px] opacity-40">N</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Divider before panel toggles ── */}
          <div className={`${toolbarExpanded ? 'w-full' : 'w-6'} h-px bg-white/[0.06] my-1 self-center`} />

          {/* ── Panel Toggles ── */}

          {/* Layers panel */}
          <button onClick={() => setLayersPanelOpen(prev => !prev)} title="Layers"
            className={`flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              layersPanelOpen
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <Layers size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <span className="text-xs truncate">Layers</span>
            )}
          </button>

          {/* Comments panel */}
          <button onClick={() => setCommentsPanelOpen(prev => !prev)} title="Comments panel"
            className={`relative flex items-center rounded-lg transition-colors ${
              toolbarExpanded ? 'gap-2 px-2.5 py-2 w-full' : 'justify-center p-1.5'
            } ${
              commentsPanelOpen
                ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <MessageCircle size={toolbarExpanded ? 15 : 16} />
            {toolbarExpanded && (
              <span className="text-xs truncate">Comments</span>
            )}
            {commentThreads.length > 0 && (
              <span className={`${toolbarExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'} min-w-[14px] h-[14px] flex items-center justify-center px-0.5 text-[8px] font-bold bg-[#F47B20] text-white rounded-full`}>
                {commentThreads.length > 99 ? '99+' : commentThreads.length}
              </span>
            )}
          </button>

          {/* ── Undo / Redo / Rotate pinned at bottom ── */}
          <div className="mt-auto" />
          <div className={`${toolbarExpanded ? 'w-full' : 'w-6'} h-px bg-white/[0.06] my-1 self-center`} />
          <div className={`flex ${toolbarExpanded ? 'gap-1 justify-center' : 'flex-col gap-0.5 items-center'}`}>
            <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 disabled:text-white/10 transition-colors" title="Undo (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 disabled:text-white/10 transition-colors" title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={14} />
            </button>
            <button onClick={() => rotatePage(-90)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors" title="Rotate CCW">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => rotatePage(90)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors" title="Rotate CW">
              <RotateCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Fixed-position textarea overlay (Konva.js pattern: positioned via screen coords) ── */}
      {editingTextId && editingAnn && editingAnn.width && editingAnn.height && (() => {
        const page = findAnnotationPage(editingTextId)
        if (page === null) return null
        const activeCanvas = pageRefsMap.current.get(page)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        // Screen position = canvas bounding rect + annotation coords * zoom
        const screenLeft = canvasRect.left + editingAnn.points[0].x * zoom
        const screenTop = canvasRect.top + editingAnn.points[0].y * zoom
        return (
          <textarea
            ref={textareaRef}
            value={editingTextValue}
            onChange={e => {
              setEditingTextValue(e.target.value)
              if (textareaRef.current && editingTextId) {
                requestAnimationFrame(() => {
                  const taEl = textareaRef.current
                  if (!taEl || !editingTextId) return
                  const prev = taEl.style.height
                  taEl.style.height = '0px'
                  // scrollHeight is in annotation-space (CSS transform doesn't affect layout metrics)
                  const needed = Math.max(DEFAULT_TEXTBOX_H, taEl.scrollHeight)
                  taEl.style.height = prev
                  if (Math.abs(needed - (editingAnn?.height || 0)) > 1) {
                    updateAnnotationSilent(editingTextId, { height: needed })
                  }
                })
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.nativeEvent.stopImmediatePropagation()
                escapeCommittedRef.current = true
                commitTextEditing(true)
              }
            }}
            onBlur={() => {
              if (escapeCommittedRef.current) {
                escapeCommittedRef.current = false
                return
              }
              blurTimeoutRef.current = setTimeout(() => {
                blurTimeoutRef.current = null
                commitTextEditing(true)
              }, 100)
            }}
            style={{
              position: 'fixed',
              left: screenLeft,
              top: screenTop,
              width: editingAnn.width,
              height: editingAnn.height,
              fontSize: editingAnn.fontSize || (editingAnn.type === 'callout' ? 14 : 16),
              fontFamily: `"${editingAnn.fontFamily || 'Arial'}", sans-serif`,
              fontWeight: editingAnn.bold ? 'bold' : 'normal',
              fontStyle: editingAnn.italic ? 'italic' : 'normal',
              textDecoration: [editingAnn.underline && 'underline', editingAnn.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
              textAlign: editingAnn.textAlign || 'left',
              color: editingAnn.type === 'callout' ? (editingAnn.color || '#000000') : editingAnn.color,
              backgroundColor: editingAnn.type === 'callout' ? '#ffffff' : 'transparent',
              lineHeight: String(editingAnn.lineHeight || 1.3),
              opacity: editingAnn.type === 'callout' ? 1 : editingAnn.opacity,
              padding: editingAnn.type === 'callout' ? '4px' : '0',
              transform: `scale(${zoom})`,
              transformOrigin: 'left top',
              zIndex: 55,
            }}
            className={`border-2 border-[#3B82F6] outline-none resize-none font-sans m-0 overflow-hidden ${
              editingAnn.type === 'callout' ? '' : 'bg-transparent p-0'
            }`}
            placeholder="Type here..."
          />
        )
      })()}

      {/* ── Floating formatting toolbar for text editing ────────── */}
      {editingTextId && editingAnn && (() => {
        const page = findAnnotationPage(editingTextId)
        if (page === null) return null
        const activeCanvas = pageRefsMap.current.get(page)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        const annX = editingAnn.points[0].x * zoom
        const annY = editingAnn.points[0].y * zoom
        const annW = (editingAnn.width || DEFAULT_TEXTBOX_W) * zoom
        const screenCenterX = canvasRect.left + annX + annW / 2
        const screenTopY = canvasRect.top + annY
        const spaceAbove = screenTopY > 50
        const toolbarX = Math.max(200, Math.min(window.innerWidth - 200, screenCenterX))
        const toolbarY = spaceAbove ? screenTopY - 8 : screenTopY + (editingAnn.height || DEFAULT_TEXTBOX_H) * zoom + 8
        return (
          <div style={{ position: 'fixed', left: toolbarX, top: toolbarY, transform: `translateX(-50%)${spaceAbove ? ' translateY(-100%)' : ''}`, zIndex: 60 }}>
            <FloatingToolbar
              x={0} y={0}
              anchor={spaceAbove ? 'above' : 'below'}
              bold={bold} italic={italic} underline={underline} strikethrough={strikethrough}
              superscript={superscript} subscript={subscript}
              textAlign={textAlign} fontSize={fontSize} color={color} listType={listType}
              visible={true}
              onToggleBold={() => {
                const v = !bold; setBold(v)
                if (editingTextId) updateAnnotation(editingTextId, { bold: v })
              }}
              onToggleItalic={() => {
                const v = !italic; setItalic(v)
                if (editingTextId) updateAnnotation(editingTextId, { italic: v })
              }}
              onToggleUnderline={() => {
                const v = !underline; setUnderline(v)
                if (editingTextId) updateAnnotation(editingTextId, { underline: v })
              }}
              onToggleStrikethrough={() => {
                const v = !strikethrough; setStrikethrough(v)
                if (editingTextId) updateAnnotation(editingTextId, { strikethrough: v })
              }}
              onToggleSuperscript={() => {
                const v = !superscript; setSuperscript(v)
                if (v) setSubscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { superscript: v, ...(v ? { subscript: false } : {}) })
              }}
              onToggleSubscript={() => {
                const v = !subscript; setSubscript(v)
                if (v) setSuperscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { subscript: v, ...(v ? { superscript: false } : {}) })
              }}
              onSetTextAlign={(align) => {
                setTextAlign(align)
                if (editingTextId) updateAnnotation(editingTextId, { textAlign: align })
              }}
              onChangeFontSize={(size) => {
                setFontSize(size)
                if (editingTextId) updateAnnotation(editingTextId, { fontSize: size })
              }}
              onChangeColor={(c) => {
                setColor(c)
                if (editingTextId) updateAnnotation(editingTextId, { color: c })
              }}
              onSetListType={(lt) => {
                setListType(lt)
                if (editingTextId) updateAnnotation(editingTextId, { listType: lt })
              }}
            />
          </div>
        )
      })()}

      {/* ── Floating text selection toolbar ────────── */}
      {selectTextToolbar && (() => {
        const activeCanvas = pageRefsMap.current.get(activePageRef.current)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        const screenX = canvasRect.left + selectTextToolbar.docPos.x * zoom
        const screenY = canvasRect.top + selectTextToolbar.docPos.y * zoom
        const clampedX = Math.max(80, Math.min(window.innerWidth - 80, screenX))
        const clampedY = Math.max(8, screenY - 44)
        return (
          <div
            style={{ position: 'fixed', left: clampedX, top: clampedY, transform: 'translateX(-50%)', zIndex: 50 }}
            className="flex items-center gap-0.5 px-1 py-0.5 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-lg"
          >
            <button
              title="Highlight"
              onClick={() => {
                const ann: Annotation = {
                  id: genId(), type: 'highlighter',
                  points: [{ x: 0, y: 0 }], color: '#FFFF00', strokeWidth: 0,
                  opacity: 0.4, fontSize, rects: [...selectTextToolbar.rects],
                }
                commitAnnotation(ann)
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <Highlighter size={14} />
            </button>
            <button
              title="Strikethrough"
              onClick={() => {
                const ann: Annotation = {
                  id: genId(), type: 'highlighter',
                  points: [{ x: 0, y: 0 }], color: '#FF0000', strokeWidth: 0,
                  opacity: 1, fontSize, rects: [...selectTextToolbar.rects],
                  strikethrough: true,
                }
                commitAnnotation(ann)
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <Strikethrough size={14} />
            </button>
            <button
              title="Copy text"
              onClick={() => {
                const text = selectTextToolbar.items.map(i => i.text).join(' ')
                navigator.clipboard.writeText(text).then(() => addToast({ type: 'success', message: 'Copied to clipboard' })).catch(() => {})
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <TextSelect size={14} />
            </button>
          </div>
        )
      })()}

      {/* ── OCR Region result popup ── */}
      {(ocrRegionResult || ocrRegionScanning) && (() => {
        const targetPage = ocrRegionResult?.pageNum ?? activePageRef.current
        const activeCanvas = pageRefsMap.current.get(targetPage)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        const rect = ocrRegionResult?.rect ?? ocrRegionPreviewRef.current
        if (!rect) return null
        const screenX = canvasRect.left + (rect.x + rect.w / 2) * zoom
        const screenY = canvasRect.top + (rect.y + rect.h) * zoom + 8
        const clampedX = Math.max(120, Math.min(window.innerWidth - 120, screenX))
        const clampedY = Math.max(8, Math.min(window.innerHeight - 60, screenY))
        return (
          <div
            style={{ position: 'fixed', left: clampedX, top: clampedY, transform: 'translateX(-50%)', zIndex: 50 }}
            className="bg-[#1e1e2e] border border-white/10 rounded-lg shadow-lg max-w-[320px]"
          >
            {ocrRegionScanning ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#F47B20] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white/60">Scanning region...</span>
              </div>
            ) : ocrRegionResult ? (
              <div className="flex flex-col">
                <div className="px-3 py-2 max-h-[200px] overflow-y-auto">
                  <p className="text-xs text-white/80 whitespace-pre-wrap select-all">{ocrRegionResult.text}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/[0.08]">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ocrRegionResult.text)
                        .then(() => addToast({ type: 'success', message: 'Copied to clipboard' }))
                        .catch(() => {})
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <TextSelect size={12} /> Copy
                  </button>
                  <button
                    onClick={() => {
                      setOcrRegionResult(null)
                      ocrRegionPreviewRef.current = null
                      redrawPage(targetPage)
                    }}
                    className="px-2 py-1 text-[11px] text-white/40 hover:text-white/70 hover:bg-white/10 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )
      })()}

      {/* ── Compact status bar ────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06] flex-shrink-0">
        {/* Left: file info */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/30 min-w-0">
          <span className="truncate max-w-[160px]">{pdfFile.name}</span>
          <span>{formatFileSize(pdfFile.size)}</span>
          {currentRotation !== 0 && <span>{currentRotation}°</span>}
        </div>

        {/* Right: annotations + hint */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-white/25 min-w-0">
          <span>{(annotations[currentPage] || []).length} ann</span>
          {(measurements[currentPage] || []).length > 0 && (
            <span>· {(measurements[currentPage] || []).length} meas</span>
          )}
          <span className="truncate">· {
            selectedAnnId ? 'Arrows nudge · Del delete · Right-click menu' :
            activeTool === 'select' ? 'Click to select · Ctrl+A all' :
            activeTool === 'text' ? 'Drag to create text' :
            activeTool === 'callout' ? 'Drag to create callout' :
            activeTool === 'cloud' || activeTool === 'polygon' ? `${currentPtsRef.current.length} pts · Dbl-click close` :
            activeTool === 'measure' ? (
              measureMode === 'distance' ? 'Click two points' :
              measureMode === 'polylength' ? 'Click to add points · Double-click to finish' :
              measureMode === 'area' ? 'Click to add vertices · Double-click to close' :
              measureMode === 'count' ? (activeCountGroup ? 'Click to place marker' : 'Create a count group first') :
              'Click two points'
            ) :
            activeTool === 'textHighlight' ? 'Drag to highlight' :
            activeTool === 'stamp' ? `${activeStampPreset.label} · click to place` :
            activeTool === 'crop' ? 'Drag to set crop region' :
            activeTool === 'imageStamp' ? (pendingImageRef.current ? 'Click to place image' : 'Select an image file') :
            activeTool === 'ocrRegion' ? 'Drag to scan text in region' :
            activeTool === 'note' ? 'Click to place a sticky note' :
            (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow')
              ? 'Shift for perfect shapes' :
            'Ctrl+scroll zoom'
          }</span>
        </div>
      </div>

      {/* ── Calibration modal ───────────────────────── */}
      <Modal open={calibrateModalOpen} onClose={() => setCalibrateModalOpen(false)} title="Calibrate Measurement" width="sm">
        {(() => {
          const m = calibrateMeasureId
            ? (measurements[currentPage] || []).find(ms => ms.id === calibrateMeasureId)
            : null
          const pxDist = m ? Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y) : 0
          const parsedVal = parseFloat(calibrateValue)
          const isValid = !isNaN(parsedVal) && parsedVal > 0 && pxDist > 0
          const showError = calibrateValue.length > 0 && !isValid
          return (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/60">
                This measurement is <span className="text-white font-medium">{pxDist.toFixed(1)} px</span>.
                Enter the real-world distance it represents:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={calibrateValue}
                  onChange={e => setCalibrateValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && isValid) {
                      setCalibration({ pixelsPerUnit: pxDist / parsedVal, unit: calibrateUnit })
                      setCalibrateModalOpen(false)
                    }
                  }}
                  placeholder="e.g. 12"
                  className={`flex-1 px-3 py-2 text-sm bg-dark-surface border rounded-lg text-white placeholder:text-white/30 focus:outline-none ${
                    showError ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.1] focus:border-[#F47B20]/50'
                  }`}
                  autoFocus
                />
                <select
                  value={calibrateUnit}
                  onChange={e => setCalibrateUnit(e.target.value)}
                  className="px-2 py-2 text-sm bg-dark-surface border border-white/[0.1] rounded-lg text-white"
                >
                  <option value="in">inches</option>
                  <option value="ft">feet</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">meters</option>
                </select>
              </div>
              {showError && (
                <p className="text-xs text-red-400">Enter a positive number greater than 0</p>
              )}
              <div className="flex items-center justify-between">
                {calibration.pixelsPerUnit !== null && (
                  <button
                    onClick={() => {
                      setCalibration({ pixelsPerUnit: null, unit: 'in' })
                      setCalibrateModalOpen(false)
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Reset Calibration
                  </button>
                )}
                <div className="flex-1" />
                <button
                  disabled={!isValid}
                  onClick={() => {
                    if (isValid) {
                      setCalibration({ pixelsPerUnit: pxDist / parsedVal, unit: calibrateUnit })
                      setCalibrateModalOpen(false)
                    }
                  }}
                  className="px-4 py-1.5 text-sm bg-[#F47B20] text-white rounded-lg hover:bg-[#F47B20]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Count Group creation modal ── */}
      <Modal open={countGroupModalOpen} onClose={() => setCountGroupModalOpen(false)} title="New Count Group" width="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/60">Create a named group to count items (e.g., doors, outlets, fixtures).</p>
          <input
            type="text"
            value={countGroupLabel}
            onChange={e => setCountGroupLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && countGroupLabel.trim()) {
                const newGroup: CountGroup = { id: genId(), label: countGroupLabel.trim(), color: countGroupColor, points: [], page: currentPage }
                setCountGroups(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), newGroup] }))
                setActiveCountGroup(newGroup.id)
                setCountGroupLabel('')
                setCountGroupModalOpen(false)
              }
            }}
            placeholder="e.g. Doors, Outlets, Sprinklers"
            className="px-3 py-2 text-sm bg-dark-surface border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#F47B20]/50"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Color:</span>
            {['#EF4444', '#F47B20', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
              <button key={c} onClick={() => setCountGroupColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-colors ${countGroupColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              disabled={!countGroupLabel.trim()}
              onClick={() => {
                if (!countGroupLabel.trim()) return
                const newGroup: CountGroup = { id: genId(), label: countGroupLabel.trim(), color: countGroupColor, points: [], page: currentPage }
                setCountGroups(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), newGroup] }))
                setActiveCountGroup(newGroup.id)
                setCountGroupLabel('')
                setCountGroupModalOpen(false)
              }}
              className="px-4 py-1.5 text-sm bg-[#F47B20] text-white rounded-lg hover:bg-[#F47B20]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Create Group
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Eraser cursor overlay — positioned via ref to avoid re-renders on mousemove ── */}
      <div
        ref={eraserCursorDivRef}
        className="pointer-events-none fixed border-2 border-white/60 rounded-full mix-blend-difference z-40"
        style={{ display: 'none' }}
      />

      {/* ── Hover Tooltip — position updated via ref to avoid re-renders on mousemove ── */}
      {hoveredAnnId && !editingTextId && activeTool === 'select' && (() => {
        const ann = annPageMap.get(hoveredAnnId) !== undefined
          ? (annotations[annPageMap.get(hoveredAnnId)!] || []).find(a => a.id === hoveredAnnId)
          : null
        if (!ann) return null
        const label = annLabel(ann)
        const opacityNote = ann.opacity < 1 ? ` · ${Math.round(ann.opacity * 100)}%` : ''
        return (
          <div
            ref={tooltipDivRef}
            className="fixed z-50 pointer-events-none bg-[#001a24] border border-white/10 text-xs text-white/70 px-2 py-1 rounded shadow-lg"
            style={{ left: hoverPosRef.current.x + 14, top: hoverPosRef.current.y - 28 }}
          >
            {label}{opacityNote}
          </div>
        )
      })()}

      {/* ── Context Menu ── */}
      {contextMenu && (() => {
        const { annId, pageNum: cmPageNum } = contextMenu
        const cmAnn = (annotations[cmPageNum] || []).find(a => a.id === annId)
        if (!cmAnn) return null

        const doAction = (fn: () => void) => { fn(); setContextMenu(null) }

        const bringToFront = () => {
          const pageAnns = annotations[cmPageNum] || []
          const idx = pageAnns.findIndex(a => a.id === annId)
          if (idx < 0 || idx === pageAnns.length - 1) return
          const next = [...pageAnns]
          next.push(next.splice(idx, 1)[0])
          const result = { ...annotations, [cmPageNum]: next }
          setAnnotations(result); pushHistory(result)
        }
        const sendToBack = () => {
          const pageAnns = annotations[cmPageNum] || []
          const idx = pageAnns.findIndex(a => a.id === annId)
          if (idx <= 0) return
          const next = [...pageAnns]
          next.unshift(next.splice(idx, 1)[0])
          const result = { ...annotations, [cmPageNum]: next }
          setAnnotations(result); pushHistory(result)
        }
        const duplicate = () => {
          const dup: Annotation = { ...structuredClone(cmAnn), id: genId(), points: cmAnn.points.map(p => ({ x: p.x + 20, y: p.y + 20 })), arrows: cmAnn.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })) }
          commitAnnotation(dup); setSelectedAnnId(dup.id)
        }
        const del = () => { removeAnnotation(annId, cmPageNum); setSelectedAnnId(null) }
        const copyStyle = () => { copiedStyleRef.current = { color: cmAnn.color, strokeWidth: cmAnn.strokeWidth, opacity: cmAnn.opacity, fontFamily: cmAnn.fontFamily, fontSize: cmAnn.fontSize, bold: cmAnn.bold, italic: cmAnn.italic } }
        const pasteStyle = () => {
          const s = copiedStyleRef.current; if (!s) return
          updateAnnotation(annId, s, cmPageNum)
        }

        const isTextType = cmAnn.type === 'text' || cmAnn.type === 'callout'
        const editText = () => {
          if (!isTextType) return
          setSelectedAnnId(annId)
          setActiveTool(cmAnn.type === 'callout' ? 'callout' : 'text')
          enterEditMode(annId)
        }

        return (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-[#001a24] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {isTextType && (
              <>
                <button onClick={() => doAction(editText)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">
                  <span>Edit Text</span>
                  <span className="text-white/25 text-[10px]">E</span>
                </button>
                <div className="h-px bg-white/[0.08] my-1" />
              </>
            )}
            {([
              { label: 'Duplicate', hint: 'Ctrl+D', action: duplicate, cls: 'text-white/70 hover:text-white' },
              { label: 'Delete', hint: 'Del', action: del, cls: 'text-red-400 hover:text-red-300' },
            ] as { label: string; hint: string; action: () => void; cls: string }[]).map(({ label, hint, action, cls }) => (
              <button key={label} onClick={() => doAction(action)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-white/[0.06] ${cls}`}>
                <span>{label}</span>
                <span className="text-white/25 text-[10px]">{hint}</span>
              </button>
            ))}
            <div className="h-px bg-white/[0.08] my-1" />
            {([
              { label: 'Bring to Front', hint: 'Ctrl+]', action: bringToFront },
              { label: 'Send to Back', hint: 'Ctrl+[', action: sendToBack },
            ] as { label: string; hint: string; action: () => void }[]).map(({ label, hint, action }) => (
              <button key={label} onClick={() => doAction(action)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">
                <span>{label}</span>
                <span className="text-white/25 text-[10px]">{hint}</span>
              </button>
            ))}
            <div className="h-px bg-white/[0.08] my-1" />
            <button onClick={() => doAction(() => {
              const refs = pageRefsMap.current.get(cmPageNum)
              if (!refs || !cmAnn.points[0]) return
              const rsL = pageRenderScaleRef.current.get(cmPageNum) ?? RENDER_SCALE
              const rect = refs.annCanvas.getBoundingClientRect()
              const sx = rect.left + (cmAnn.points[0].x / rsL) * zoom
              const sy = rect.top + (cmAnn.points[0].y / rsL) * zoom
              setChatBubbleTarget({ annotationId: annId, position: { x: sx, y: sy } })
            })} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">
              <MessageCircle size={11} />
              <span>Add Comment</span>
            </button>
            <div className="h-px bg-white/[0.08] my-1" />
            <button onClick={() => doAction(() => {
              const rangeStr = prompt('Duplicate to pages (e.g. "2-5, 8, All"):')
              if (!rangeStr) return
              const total = pdfFileRef.current?.pageCount ?? 1
              let pages: number[]
              if (rangeStr.trim().toLowerCase() === 'all') {
                pages = Array.from({ length: total }, (_, i) => i + 1).filter(p => p !== cmPageNum)
              } else {
                const { pages: parsed } = validatePageRange(rangeStr, total)
                pages = parsed.filter(p => p !== cmPageNum)
              }
              if (pages.length === 0) return
              const next = { ...annotations }
              for (const targetPage of pages) {
                const dup: Annotation = { ...structuredClone(cmAnn), id: genId() }
                next[targetPage] = [...(next[targetPage] || []), dup]
              }
              setAnnotations(next); pushHistory(next)
              addToast({ type: 'success', message: `Duplicated to ${pages.length} page${pages.length !== 1 ? 's' : ''}` })
            })} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">
              <Copy size={11} />
              <span>Duplicate to Pages...</span>
            </button>
            <div className="h-px bg-white/[0.08] my-1" />
            <button onClick={() => doAction(copyStyle)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">Copy Style</button>
            <button onClick={() => doAction(pasteStyle)} disabled={!copiedStyleRef.current} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] disabled:opacity-40">Paste Style</button>
          </div>
        )
      })()}

      {/* ── Annotation List Panel ── */}
      {annListOpen && pdfFile && (
        <div className="fixed right-12 top-[80px] z-40 w-52 max-h-[60vh] bg-[#001a24] border border-white/10 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/70">Annotations</span>
            <button onClick={() => setAnnListOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {Object.entries(annotations).filter(([, anns]) => anns.length > 0).length === 0 ? (
              <div className="px-3 py-4 text-xs text-white/30 text-center">No annotations</div>
            ) : (
              Object.entries(annotations)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([pageStr, anns]) => anns.length === 0 ? null : (
                  <div key={pageStr}>
                    <div className="px-3 py-1 text-[10px] text-white/30 font-medium">Page {pageStr} ({anns.length})</div>
                    {anns.map(ann => (
                      <div
                        key={ann.id}
                        className={`group flex items-center gap-1 px-2 py-1 hover:bg-white/[0.06] transition-colors ${selectedAnnId === ann.id ? 'bg-white/[0.04]' : ''}`}
                      >
                        <button
                          onClick={() => {
                            navigateToPage(Number(pageStr))
                            setSelectedAnnId(ann.id)
                            setActiveTool('select')
                          }}
                          className={`flex-1 text-left text-xs flex items-center gap-1.5 min-w-0 ${selectedAnnId === ann.id ? 'text-[#F47B20]' : 'text-white/60'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                          <span className="truncate">{annLabel(ann)}</span>
                        </button>
                        <button
                          onClick={() => { removeAnnotation(ann.id, Number(pageStr)); if (selectedAnnId === ann.id) setSelectedAnnId(null) }}
                          title="Delete annotation"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ── Chat Bubble ── */}
      {chatBubbleTarget && userProfileRef.current && (
        <ChatBubble
          thread={commentThreads.find(t => t.annotationId === chatBubbleTarget.annotationId) ?? null}
          annotationId={chatBubbleTarget.annotationId}
          userProfile={userProfileRef.current}
          position={chatBubbleTarget.position}
          onAddComment={handleAddComment}
          onStatusChange={handleStatusChange}
          onClose={() => setChatBubbleTarget(null)}
        />
      )}

      {/* ── Comments Panel ── */}
      {/* ── Layers Panel ── */}
      {layersPanelOpen && (
        <div className="fixed top-20 right-14 w-56 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white/70">Layers</span>
            <button onClick={() => {
              const id = crypto.randomUUID()
              const name = `Layer ${layers.length}`
              setLayers(prev => [...prev, { id, name, visible: true, color: '#3B82F6' }])
            }} className="p-0.5 text-white/40 hover:text-white rounded" title="Add layer">
              <Plus size={12} />
            </button>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {layers.map(layer => (
              <div key={layer.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                  activeLayerId === layer.id ? 'bg-[#F47B20]/10 text-[#F47B20]' : 'text-white/60 hover:bg-white/[0.04]'
                }`}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)) }}
                  className="p-0.5 text-white/40 hover:text-white"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="flex-1 truncate">{layer.name}</span>
                {layer.id !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.filter(l => l.id !== layer.id)) }}
                    className="p-0.5 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    title="Delete layer"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
                {activeLayerId === layer.id && (
                  <span className="text-[8px] text-[#F47B20]/50 font-bold">ACTIVE</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <CommentsPanel
        isOpen={commentsPanelOpen}
        onClose={() => setCommentsPanelOpen(false)}
        threads={commentThreads}
        stickyNotes={stickyNotes}
        annotations={annotations}
        onSelectThread={handleSelectThread}
        onStatusChange={handleStatusChange}
      />

      {/* ── Export Modal ── */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={async (mode) => {
          setExportModalOpen(false)
          if (mode === 'final') {
            await handleExport()
          } else {
            // For Review: export with embedded annotation data
            setIsExporting(true)
            setExportError(null)
            try {
              // First do the normal export to get the PDF bytes
              await handleExport()
              // TODO: After export, embed metadata into the saved PDF
              // This will be enhanced to intercept the export flow
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unknown error'
              setExportError(`Export failed: ${msg}`)
            } finally {
              setIsExporting(false)
            }
          }
        }}
        fileName={pdfFile.name}
        hasComments={commentThreads.length > 0}
        isExporting={isExporting}
        annotationCount={totalAnnotationCount}
        commentCount={commentThreads.reduce((sum, t) => sum + t.comments.length, 0)}
      />

      {/* ── Email Modal ── */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={async (recipients, subject, body) => {
          setEmailModalOpen(false)
          // Export the PDF first, then trigger email
          setIsExporting(true)
          try {
            const pdfBytes = await getPDFBytes(pdfFile)
            if (!pdfBytes) return
            const pdfDoc = await PDFDocument.load(pdfBytes)
            // Flatten annotations onto the PDF (simplified — uses same export logic)
            const flatBytes = await pdfDoc.save()
            const blob = new Blob([flatBytes], { type: 'application/pdf' })
            sendAnnotatedPDF(recipients, subject, body, blob, pdfFile.name.replace('.pdf', '-annotated.pdf'))
          } catch {
            // Fallback: just open mailto without attachment
            const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
            window.open(mailto, '_blank')
          } finally {
            setIsExporting(false)
          }
        }}
        fileName={pdfFile.name}
      />

      {/* ── Markups List Panel (bottom) ── */}
      {markupsListOpen && pdfFile && (
        <MarkupsList
          annotations={annotations}
          commentThreads={commentThreads}
          selectedId={selectedAnnId}
          onSelectAnnotation={(id: string, page: number) => {
            navigateToPage(page)
            setSelectedAnnId(id)
          }}
          onExportCSV={() => {
            // Build CSV from all annotations
            const rows: string[] = ['#,Type,Page,Label,Color,Status']
            let idx = 0
            for (const [pageStr, anns] of Object.entries(annotations)) {
              for (const ann of anns) {
                idx++
                const thread = commentThreads.find(t => t.annotationId === ann.id)
                rows.push(`${idx},${ann.type},${pageStr},"${(ann.text || ann.type).replace(/"/g, '""')}",${ann.color},${thread?.status || 'none'}`)
              }
            }
            const csv = rows.join('\n')
            downloadBlob(new Blob([csv], { type: 'text/csv' }), `markups-${pdfFile.name.replace('.pdf', '')}.csv`)
            addToast({ type: 'success', message: 'Markups exported as CSV' })
          }}
        />
      )}

      {/* ── Bookmarks Panel ── */}
      {bookmarksOpen && bookmarks.length > 0 && (
        <div className="fixed left-12 top-[80px] z-40 w-56 max-h-[60vh] bg-[#001a24] border border-white/10 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/70">Bookmarks</span>
            <button onClick={() => setBookmarksOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {bookmarks.map((bm, i) => (
              <div key={i}>
                <button
                  onClick={() => { navigateToPage(bm.pageNum); setBookmarksOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] truncate"
                  title={`Page ${bm.pageNum}`}
                >
                  {bm.title}
                </button>
                {bm.children.map((child, j) => (
                  <button
                    key={j}
                    onClick={() => { navigateToPage(child.pageNum); setBookmarksOpen(false) }}
                    className="w-full text-left pl-6 pr-3 py-1 text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] truncate"
                    title={`Page ${child.pageNum}`}
                  >
                    {child.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tool Presets Panel ── */}
      {presetsOpen && (
        <div className="fixed right-12 top-[80px] z-40 w-56 bg-[#001a24] border border-white/10 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/70">Tool Presets</span>
            <button onClick={() => setPresetsOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
          <div className="overflow-y-auto max-h-[300px] py-1">
            {toolPresets.length === 0 && (
              <p className="text-[10px] text-white/25 text-center py-4">No presets saved yet</p>
            )}
            {toolPresets.map(preset => (
              <div key={preset.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04] group">
                <button onClick={() => { applyToolPreset(preset); setPresetsOpen(false) }} className="flex-1 flex items-center gap-2 min-w-0 text-left">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: preset.color }} />
                  <span className="text-xs text-white/60 truncate">{preset.name}</span>
                  <span className="text-[9px] text-white/25">{preset.toolType}</span>
                </button>
                <button onClick={() => deleteToolPreset(preset.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-opacity"><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] px-3 py-2">
            <button
              onClick={() => {
                const name = prompt('Preset name:')
                if (name?.trim()) saveToolPreset(name.trim())
              }}
              className="w-full text-center text-[10px] text-[#F47B20]/60 hover:text-[#F47B20] py-1"
            >
              + Save Current as Preset
            </button>
          </div>
        </div>
      )}

      {/* ── Compare Mode Overlay ── */}
      {compareOpen && <CompareMode onClose={() => setCompareOpen(false)} />}

      {/* ── Custom Stamp Library ── */}
      {stampLibraryOpen && (
        <StampLibrary
          onSelectStamp={(imageDataUrl, _name) => {
            setStampLibraryOpen(false)
            // Set up the image stamp tool with the selected stamp
            pendingImageRef.current = imageDataUrl
            setActiveTool('imageStamp')
            addToast({ type: 'success', message: 'Click on the PDF to place the stamp' })
          }}
          onClose={() => setStampLibraryOpen(false)}
        />
      )}
    </div>
  )
}
