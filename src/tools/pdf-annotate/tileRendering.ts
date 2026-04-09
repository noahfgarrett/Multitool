/**
 * Tiled PDF rendering for high zoom levels.
 *
 * Mobile/desktop browsers cap a single <canvas> at a fixed pixel area
 * (iOS WebKit: ~5 MP, desktop: ~16 MP — see src/utils/pdf.ts). At high
 * zoom on large documents, a full-page canvas would exceed that cap and
 * go blank. To get full clarity at any zoom, we split each page into a
 * grid of smaller tile canvases and render only the visible tiles. This
 * is the same pattern Google Maps / Figma / Adobe Acrobat Web use.
 *
 * This module owns the GEOMETRY and DOM setup for the tile grid — the
 * actual pixel rendering still goes through `renderPageTile()` in
 * utils/pdf.ts so cancellation and generation counters work the same
 * way for tiles as for full-page renders.
 *
 * Tile coordinate system: `x` and `y` are in the FULL-page pixel buffer
 * at the grid's render scale. E.g. at scale 8 on a 612×792 letter page,
 * the full buffer is 4896×6336, and a tile at column=2 row=1 with
 * tileW=1632 tileH=2112 has x=3264 y=2112.
 *
 * CSS positioning uses `x / scale` to project buffer pixels back to
 * CSS doc pixels so tiles line up with the page container which is
 * sized in CSS px and visually scaled by the parent `transform: scale`.
 */

export interface PageTile {
  /** The canvas element displaying this tile's pixels. */
  canvas: HTMLCanvasElement
  /** 0-based column index within the grid. */
  col: number
  /** 0-based row index within the grid. */
  row: number
  /** Tile's left edge in the full-page buffer coordinate system, in pixels. */
  x: number
  /** Tile's top edge in the full-page buffer coordinate system, in pixels. */
  y: number
  /** Tile canvas pixel width. */
  w: number
  /** Tile canvas pixel height. */
  h: number
  /** True once pdf.js has finished drawing this tile. */
  rendered: boolean
}

export interface PageTileGrid {
  pageNum: number
  cols: number
  rows: number
  tiles: PageTile[]
  /**
   * Effective render scale the grid was built for (RENDER_SCALE * zoom,
   * NOT clamped by the per-canvas cap — tiling is the whole reason we
   * can go above it).
   */
  scale: number
  rotation: number
  /** Total width/height of the full page buffer across all tiles. */
  totalWidth: number
  totalHeight: number
  /** The absolute-positioned div that holds all tile canvases. */
  container: HTMLDivElement
  /** Per-tile visibility observer; set by the caller after grid construction. */
  observer: IntersectionObserver | null
  /** Unscaled doc dimensions — used for CSS sizing of the container. */
  naturalWidth: number
  naturalHeight: number
}

export interface BuildTileGridParams {
  pageNum: number
  /** The DOM element that represents the page — tiles are inserted inside. */
  pageContainer: HTMLElement
  /** Unscaled doc-space dimensions (scale=1 viewport). */
  naturalWidth: number
  naturalHeight: number
  /** Effective render scale — typically RENDER_SCALE * zoom. */
  scale: number
  rotation: number
  /** Max canvas pixels for the current device — from getMaxCanvasPixels(). */
  maxCanvasPixels: number
  /**
   * Tile canvases are inserted BEFORE this sibling so the tile layer
   * sits underneath the annotation/active canvases in DOM z-order.
   */
  insertBefore: HTMLElement
}

/**
 * Compute the tile grid dimensions + create empty canvases in the DOM.
 * The returned grid has `observer: null` — the caller is responsible for
 * attaching an IntersectionObserver that calls `renderPageTile()` on
 * tiles as they scroll into view.
 */
export function buildTileGrid(params: BuildTileGridParams): PageTileGrid {
  const {
    pageNum, pageContainer, naturalWidth, naturalHeight,
    scale, rotation, maxCanvasPixels, insertBefore,
  } = params

  const totalW = Math.max(1, Math.floor(naturalWidth * scale))
  const totalH = Math.max(1, Math.floor(naturalHeight * scale))

  // Keep each tile at ~85% of the cap so there's headroom against
  // floor/ceil rounding and the browser's internal bookkeeping overhead.
  const maxTileDim = Math.max(256, Math.floor(Math.sqrt(maxCanvasPixels * 0.85)))
  const cols = Math.max(1, Math.ceil(totalW / maxTileDim))
  const rows = Math.max(1, Math.ceil(totalH / maxTileDim))
  // Floor the nominal tile size, then let the last column/row consume
  // whatever's left so the grid covers the full buffer exactly.
  const tileW = Math.max(1, Math.floor(totalW / cols))
  const tileH = Math.max(1, Math.floor(totalH / rows))

  const container = document.createElement('div')
  container.className = 'pdf-tile-container'
  container.style.position = 'absolute'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = `${naturalWidth}px`
  container.style.height = `${naturalHeight}px`
  // Tiles are display-only — pointer events pass through to the
  // annotation/active canvases underneath.
  container.style.pointerEvents = 'none'
  pageContainer.insertBefore(container, insertBefore)

  const tiles: PageTile[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileW
      const y = row * tileH
      const w = col === cols - 1 ? totalW - x : tileW
      const h = row === rows - 1 ? totalH - y : tileH

      const canvas = document.createElement('canvas')
      canvas.className = 'pdf-tile'
      canvas.width = w
      canvas.height = h
      // CSS position in doc-CSS-pixel coords — divide buffer coords by
      // the effective scale to project back to CSS pixels.
      canvas.style.position = 'absolute'
      canvas.style.left = `${x / scale}px`
      canvas.style.top = `${y / scale}px`
      canvas.style.width = `${w / scale}px`
      canvas.style.height = `${h / scale}px`
      // `display: block` removes the default inline-canvas baseline gap.
      canvas.style.display = 'block'
      container.appendChild(canvas)

      tiles.push({ canvas, col, row, x, y, w, h, rendered: false })
    }
  }

  return {
    pageNum,
    cols, rows, tiles,
    scale, rotation,
    totalWidth: totalW,
    totalHeight: totalH,
    container,
    observer: null,
    naturalWidth,
    naturalHeight,
  }
}

/**
 * Disconnect the intersection observer, remove the tile container from
 * the DOM, and null out every canvas to help the browser free GPU
 * memory promptly. Safe to call on a null/undefined grid.
 */
export function teardownTileGrid(grid: PageTileGrid | null | undefined): void {
  if (!grid) return
  grid.observer?.disconnect()
  grid.observer = null
  for (const tile of grid.tiles) {
    // Setting width/height to 0 releases the canvas pixel buffer sooner
    // than waiting for GC to reclaim the <canvas> element.
    tile.canvas.width = 0
    tile.canvas.height = 0
  }
  grid.tiles.length = 0
  grid.container.remove()
}
