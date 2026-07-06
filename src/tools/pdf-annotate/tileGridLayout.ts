export interface ComputeTileGridLayoutParams {
  totalWidth: number
  totalHeight: number
  maxCanvasPixels: number
  preferredMaxTileDim?: number
}

export interface TileGridLayout {
  cols: number
  rows: number
  tileW: number
  tileH: number
}

export function computeTileGridLayout(params: ComputeTileGridLayoutParams): TileGridLayout {
  const { totalWidth, totalHeight, maxCanvasPixels, preferredMaxTileDim = Infinity } = params
  // Keep each tile at ~85% of the cap so there's headroom against
  // floor/ceil rounding and the browser's internal bookkeeping overhead.
  const canvasCapDim = Math.floor(Math.sqrt(maxCanvasPixels * 0.85))
  const preferredDim = Number.isFinite(preferredMaxTileDim)
    ? Math.floor(preferredMaxTileDim)
    : canvasCapDim
  const maxTileDim = Math.max(256, Math.min(canvasCapDim, preferredDim))
  const cols = Math.max(1, Math.ceil(totalWidth / maxTileDim))
  const rows = Math.max(1, Math.ceil(totalHeight / maxTileDim))
  // Floor the nominal tile size, then let the last column/row consume
  // whatever's left so the grid covers the full buffer exactly.
  const tileW = Math.max(1, Math.floor(totalWidth / cols))
  const tileH = Math.max(1, Math.floor(totalHeight / rows))

  return { cols, rows, tileW, tileH }
}
