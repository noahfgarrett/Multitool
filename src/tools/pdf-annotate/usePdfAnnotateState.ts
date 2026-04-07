import { useState, useRef, useMemo, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore.ts'
import type { PDFFile } from '@/types'
import type {
  ToolType, Point, Annotation, AnnotationLayer, PageAnnotations,
  Measurement, CalibrationState, PageRefs, MeasureMode,
  PolyMeasurement, CountGroup, CommentThread, StickyNote,
  HandleId,
} from './types.ts'
import { STAMP_PRESETS, STICKY_NOTE_COLORS, DRAW_TYPES, TEXT_TYPES, RENDER_SCALE } from './types.ts'
import { getUserProfile } from '@/utils/userProfile.ts'
import type { UserProfile } from '@/utils/userProfile.ts'

// ── Types for state that are local to this module ──────────

export interface SelectTextToolbar {
  rects: { x: number; y: number; w: number; h: number }[]
  items: { text: string; x: number; y: number; width: number; height: number; page: number }[]
  docPos: { x: number; y: number }
}

export interface ContextMenuState {
  x: number
  y: number
  annId: string
  pageNum: number
}

export interface FindMatch {
  pageNum: number
  item: { text: string; x: number; y: number; width: number; height: number; page: number }
  matchX: number
  matchW: number
}

export interface OcrRegionResult {
  text: string
  pageNum: number
  rect: { x: number; y: number; w: number; h: number }
}

export interface CropRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface ToolPreset {
  id: string
  name: string
  toolType: ToolType
  color: string
  strokeWidth: number
  opacity: number
  fontSize: number
  fillColor: string | null
  dashPattern: 'solid' | 'dashed' | 'dotted'
}

export interface TextDragState {
  annId: string
  mode: 'move' | HandleId
  startPt: Point
  origPoints: Point[]
  origWidth: number
  origHeight: number
  origArrows?: Point[]
}

export interface GeneralDragState {
  annId: string
  startPt: Point
  origPoints: Point[]
}

export interface CalloutArrowDragState {
  tipPt: Point
  arrowIdx?: number
}

export interface BookmarkEntry {
  title: string
  pageNum: number
  children: { title: string; pageNum: number }[]
}

export interface TextItemCache {
  text: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

export interface CopiedStyle {
  color: string
  strokeWidth: number
  opacity: number
  fontFamily?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
}

// ── Hook ──────────────────────────────────────────────────

export function usePdfAnnotateState() {
  // App store
  const addToast = useAppStore(s => s.addToast)
  const focusMode = useAppStore(s => s.focusMode)
  const setFocusMode = useAppStore(s => s.setFocusMode)

  // Core state
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [color, setColor] = useState('#14B8A6')
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

  // Text formatting
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
  const [selectTextToolbar, setSelectTextToolbar] = useState<SelectTextToolbar | null>(null)
  const clipboardRef = useRef<Annotation | null>(null)
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null)
  const hoveredAnnIdRef = useRef<string | null>(null)

  // Context menu, annotation list, find
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [annListOpen, setAnnListOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [findMatches, setFindMatches] = useState<FindMatch[]>([])
  const [findIdx, setFindIdx] = useState(0)
  const [findCacheTick, setFindCacheTick] = useState(0)
  const [findCaseSensitive, setFindCaseSensitive] = useState(false)
  const [ocrScanning, setOcrScanning] = useState(false)
  const ocrPagesRef = useRef<Set<string>>(new Set())
  const ocrAbortRef = useRef<AbortController | null>(null)

  // OCR Region
  const ocrRegionStartRef = useRef<Point | null>(null)
  const ocrRegionPreviewRef = useRef<CropRegion | null>(null)
  const [ocrRegionResult, setOcrRegionResult] = useState<OcrRegionResult | null>(null)
  const [ocrRegionScanning, setOcrRegionScanning] = useState(false)

  // Stamps
  const [stampDropdownOpen, setStampDropdownOpen] = useState(false)
  const [activeStampPreset, setActiveStampPreset] = useState(STAMP_PRESETS[0])
  const [cropRegions, setCropRegions] = useState<Record<number, CropRegion>>({})
  const [pageInputActive, setPageInputActive] = useState(false)
  const copiedStyleRef = useRef<CopiedStyle | null>(null)

  // Shapes dropdown
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false)
  const [activeDraw, setActiveDraw] = useState<ToolType>('pencil')

  // Text tools dropdown
  const [textDropdownOpen, setTextDropdownOpen] = useState(false)
  const [activeText, setActiveText] = useState<ToolType>('text')

  // Tool presets
  const [toolPresets, setToolPresets] = useState<ToolPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('mt-tool-presets') || '[]') } catch { return [] }
  })
  const [presetsOpen, setPresetsOpen] = useState(false)

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
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

  // Slide-out drawer for tablet focus mode
  const isTouchDevice = typeof window !== 'undefined' && matchMedia('(any-pointer: coarse)').matches
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPinned, setDrawerPinned] = useState(() => {
    return localStorage.getItem('pdfAnnotate.drawerPinned') === 'true'
  })
  const [drawerShapesOpen, setDrawerShapesOpen] = useState(false)
  const [drawerTextOpen, setDrawerTextOpen] = useState(false)
  const [drawerMeasureOpen, setDrawerMeasureOpen] = useState(false)
  const [drawerStampOpen, setDrawerStampOpen] = useState(false)
  const [drawerMoreToolsOpen, setDrawerMoreToolsOpen] = useState(false)

  // Watermark on export
  const [exportWatermark, setExportWatermark] = useState('')
  const [exportWatermarkOpacity, setExportWatermarkOpacity] = useState(15)

  // Zoom presets dropdown
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false)

  // Drawing options
  const [straightLineMode, setStraightLineMode] = useState(false)
  const [fillColor, setFillColor] = useState<string | null>(null)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [dashPattern, setDashPattern] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [arrowStart, setArrowStart] = useState(false)

  // Eraser
  const [eraserRadius, setEraserRadius] = useState(15)
  const [eraserMode, setEraserMode] = useState<'partial' | 'object'>('partial')
  const eraserModsRef = useRef<{ removed: Set<string>; added: Annotation[] }>({ removed: new Set(), added: [] })
  const canvasSnapshotRef = useRef<ImageData | null>(null)

  // Rotation
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})

  // Text tool
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommittedTextRef = useRef<{ id: string; text: string } | null>(null)
  const editingTextIdRef = useRef<string | null>(null)
  const [textOverlayTick, setTextOverlayTick] = useState(0)
  const escapeCommittedRef = useRef(false)
  const preHighlightRef = useRef<{ color: string; strokeWidth: number } | null>(null)
  const dblClickRef = useRef<{ time: number; pt: Point }>({ time: 0, pt: { x: 0, y: 0 } })
  const textDragRef = useRef<TextDragState | null>(null)
  const generalDragRef = useRef<GeneralDragState | null>(null)

  // Callout arrow drag
  const calloutArrowDragRef = useRef<CalloutArrowDragState | null>(null)
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
  const focusModeRef = useRef(focusMode)
  focusModeRef.current = focusMode
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
  const pageRenderScaleRef = useRef<Map<number, number>>(new Map())
  const findInputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)
  const currentPtsRef = useRef<Point[]>([])
  const currentPressureRef = useRef<number[]>([])
  const pendingImageRef = useRef<string | null>(null)
  const imageStampCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
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

  // Persist drawer pin state
  useEffect(() => {
    localStorage.setItem('pdfAnnotate.drawerPinned', String(drawerPinned))
  }, [drawerPinned])

  // Session restore
  const pendingScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null)
  const restoringSessionRef = useRef(false)
  const initialFitDoneRef = useRef(false)

  // Text highlight
  const textItemsCacheRef = useRef<Record<string, TextItemCache[]>>({})
  const textHighlightStartRef = useRef<Point | null>(null)
  const textHighlightPreviewRectsRef = useRef<CropRegion[]>([])
  const selectTextStartRef = useRef<Point | null>(null)
  const selectTextRectsRef = useRef<CropRegion[]>([])
  const [activeHighlight, setActiveHighlight] = useState<'highlighter' | 'textHighlight' | 'textStrikethrough'>('highlighter')

  // History
  const historyRef = useRef<PageAnnotations[]>([{}])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  // Derived state
  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1
  const isDrawTool = DRAW_TYPES.has(activeTool)
  const isTextTool = TEXT_TYPES.has(activeTool)
  const currentRotation = pageRotations[currentPage] || 0

  // Find (committed query)
  const [findCommittedQuery, setFindCommittedQuery] = useState('')

  // Touch / pinch tracking
  const activeTouchIdsRef = useRef(new Set<number>())
  const touchPositionsRef = useRef(new Map<number, { x: number; y: number }>())
  const prevPinchDistRef = useRef<number | null>(null)

  // Active canvas drawing pipeline (iPad perf overhaul)
  const pointBufferRef = useRef<{ x: number; y: number; pressure: number }[]>([])
  const rafIdRef = useRef<number>(0)
  const rafRunningRef = useRef(false)
  const activeCtxCacheRef = useRef<Map<number, CanvasRenderingContext2D>>(new Map())

  // O(1) annotation→page lookup
  const annPageMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const [pageStr, pageAnns] of Object.entries(annotations)) {
      for (const ann of pageAnns) map.set(ann.id, Number(pageStr))
    }
    return map
  }, [annotations])

  // Memoize total annotation count
  const totalAnnotationCount = useMemo(() =>
    Object.values(annotations).reduce((s, a) => s + a.length, 0)
  , [annotations])

  return {
    // App store
    addToast, focusMode, setFocusMode,
    // Core state
    pdfFile, setPdfFile, currentPage, setCurrentPage,
    activeTool, setActiveTool, color, setColor,
    strokeWidth, setStrokeWidth, opacity, setOpacity,
    fontSize, setFontSize, zoom, setZoom,
    annotations, setAnnotations,
    layers, setLayers, activeLayerId, setActiveLayerId,
    layersPanelOpen, setLayersPanelOpen,
    isExporting, setIsExporting,
    loadError, setLoadError, exportError, setExportError,
    // Text formatting
    fontFamily, setFontFamily, bold, setBold,
    italic, setItalic, underline, setUnderline,
    strikethrough, setStrikethrough, textBgColor, setTextBgColor,
    lineSpacing, setLineSpacing, textAlign, setTextAlign,
    superscript, setSuperscript, subscript, setSubscript,
    listType, setListType, canvasCursor, setCanvasCursor,
    selectTextToolbar, setSelectTextToolbar,
    clipboardRef, hoveredAnnId, setHoveredAnnId, hoveredAnnIdRef,
    // Context menu, find
    contextMenu, setContextMenu,
    annListOpen, setAnnListOpen,
    findQuery, setFindQuery, findOpen, setFindOpen,
    findMatches, setFindMatches, findIdx, setFindIdx,
    findCacheTick, setFindCacheTick,
    findCaseSensitive, setFindCaseSensitive,
    ocrScanning, setOcrScanning, ocrPagesRef, ocrAbortRef,
    // OCR Region
    ocrRegionStartRef, ocrRegionPreviewRef,
    ocrRegionResult, setOcrRegionResult,
    ocrRegionScanning, setOcrRegionScanning,
    // Stamps
    stampDropdownOpen, setStampDropdownOpen,
    activeStampPreset, setActiveStampPreset,
    cropRegions, setCropRegions,
    pageInputActive, setPageInputActive, copiedStyleRef,
    // Shapes/text dropdowns
    shapesDropdownOpen, setShapesDropdownOpen,
    activeDraw, setActiveDraw,
    textDropdownOpen, setTextDropdownOpen,
    activeText, setActiveText,
    // Tool presets
    toolPresets, setToolPresets, presetsOpen, setPresetsOpen,
    // Bookmarks
    bookmarks, setBookmarks, bookmarksOpen, setBookmarksOpen,
    // Markups list
    markupsListOpen, setMarkupsListOpen,
    // Compare mode
    compareOpen, setCompareOpen,
    // Stamp library
    stampLibraryOpen, setStampLibraryOpen,
    // More menu
    moreMenuOpen, setMoreMenuOpen, moreMenuRef,
    // Toolbar
    toolbarExpanded, setToolbarExpanded, moreToolsOpen, setMoreToolsOpen,
    // Drawer
    isTouchDevice, drawerOpen, setDrawerOpen,
    drawerPinned, setDrawerPinned,
    drawerShapesOpen, setDrawerShapesOpen,
    drawerTextOpen, setDrawerTextOpen,
    drawerMeasureOpen, setDrawerMeasureOpen,
    drawerStampOpen, setDrawerStampOpen,
    drawerMoreToolsOpen, setDrawerMoreToolsOpen,
    // Watermark
    exportWatermark, setExportWatermark,
    exportWatermarkOpacity, setExportWatermarkOpacity,
    // Zoom
    zoomDropdownOpen, setZoomDropdownOpen,
    // Drawing options
    straightLineMode, setStraightLineMode,
    fillColor, setFillColor, cornerRadius, setCornerRadius,
    dashPattern, setDashPattern, arrowStart, setArrowStart,
    // Eraser
    eraserRadius, setEraserRadius, eraserMode, setEraserMode,
    eraserModsRef, canvasSnapshotRef,
    // Rotation
    pageRotations, setPageRotations,
    // Text tool
    selectedAnnId, setSelectedAnnId,
    editingTextId, setEditingTextId,
    editingTextValue, setEditingTextValue,
    textareaRef, blurTimeoutRef, lastCommittedTextRef,
    editingTextIdRef, textOverlayTick, setTextOverlayTick,
    escapeCommittedRef, preHighlightRef, dblClickRef,
    textDragRef, generalDragRef,
    // Callout
    calloutArrowDragRef, selectedArrowIdx, setSelectedArrowIdx,
    // Cloud
    cloudPreviewRef, cloudLastClickRef,
    // Measurement
    measurements, setMeasurements,
    calibration, setCalibration,
    calibrateModalOpen, setCalibrateModalOpen,
    calibrateMeasureId, setCalibrateMeasureId,
    calibrateValue, setCalibrateValue,
    calibrateUnit, setCalibrateUnit,
    measureStartRef, measurePreviewRef,
    selectedMeasureId, setSelectedMeasureId,
    // Expanded measurement
    measureMode, setMeasureMode,
    measureDropdownOpen, setMeasureDropdownOpen,
    measureDropdownRef,
    polyMeasurements, setPolyMeasurements,
    polyPointsRef, polyPreviewRef,
    countGroups, setCountGroups,
    activeCountGroup, setActiveCountGroup,
    countGroupModalOpen, setCountGroupModalOpen,
    countGroupLabel, setCountGroupLabel,
    countGroupColor, setCountGroupColor,
    edgeSnappingEnabled, setEdgeSnappingEnabled,
    precisionSnapMode, setPrecisionSnapMode,
    isPrinting, setIsPrinting,
    // Comments
    commentThreads, setCommentThreads,
    stickyNotes, setStickyNotes,
    activeStickyColor, setActiveStickyColor,
    chatBubbleTarget, setChatBubbleTarget,
    commentsPanelOpen, setCommentsPanelOpen,
    userProfileRef,
    // Export & email
    exportModalOpen, setExportModalOpen,
    emailModalOpen, setEmailModalOpen,
    // Sidebar
    sidebarOpen, setSidebarOpen,
    thumbnails, setThumbnails,
    selectedThumbPage, setSelectedThumbPage,
    loadingThumbs,
    // Refs
    pageRefsMap, pageDimsMap, renderedPagesRef,
    activePageRef, maxCanvasWidthRef, observerRef,
    scrollRef, innerRef, zoomRef, focusModeRef, currentPageRef,
    panRef, spaceHeldRef,
    shapesDropdownRef, textDropdownRef, zoomDropdownRef,
    stampDropdownRef, contextMenuRef,
    hoverPosRef, eraserCursorDivRef, tooltipDivRef,
    cropDrawRef, pageRenderScaleRef, findInputRef,
    isDrawingRef, currentPtsRef, currentPressureRef,
    pendingImageRef, imageStampCacheRef,
    pdfFileRef, fileHashRef, pageRotationsRef,
    dimsReady, setDimsReady,
    // Session
    pendingScrollRef, restoringSessionRef, initialFitDoneRef,
    // Text highlight
    textItemsCacheRef, textHighlightStartRef,
    textHighlightPreviewRectsRef,
    selectTextStartRef, selectTextRectsRef,
    activeHighlight, setActiveHighlight,
    // History
    historyRef, historyIdxRef, forceRender,
    // Derived
    canUndo, canRedo, isDrawTool, isTextTool, currentRotation,
    // Find
    findCommittedQuery, setFindCommittedQuery,
    // Touch
    activeTouchIdsRef, touchPositionsRef, prevPinchDistRef,
    // Active canvas pipeline
    pointBufferRef, rafIdRef, rafRunningRef, activeCtxCacheRef,
    // Memos
    annPageMap, totalAnnotationCount,
  }
}

/** Return type of usePdfAnnotateState — used to type hook parameters */
export type PdfAnnotateState = ReturnType<typeof usePdfAnnotateState>
