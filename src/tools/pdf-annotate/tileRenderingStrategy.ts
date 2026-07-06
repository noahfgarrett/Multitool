export interface TileRenderingStrategyOptions {
  naturalWidth: number
  naturalHeight: number
  requestedScale: number
  maxRenderScale: number
  progressiveTileMinPixels: number
  progressiveTileMinAxisPx: number
}

export function shouldUseTileRendering(options: TileRenderingStrategyOptions): boolean {
  const {
    naturalWidth,
    naturalHeight,
    requestedScale,
    maxRenderScale,
    progressiveTileMinPixels,
    progressiveTileMinAxisPx,
  } = options
  if (requestedScale > maxRenderScale * 1.02) return true
  const requestedPixels = naturalWidth * naturalHeight * requestedScale * requestedScale
  const longestAxis = Math.max(naturalWidth, naturalHeight) * requestedScale
  return requestedPixels >= progressiveTileMinPixels && longestAxis >= progressiveTileMinAxisPx
}
