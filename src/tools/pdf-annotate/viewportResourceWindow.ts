export interface PageViewportBounds {
  pageNum: number
  top: number
  bottom: number
}

export interface ViewportResourceWindowOptions {
  pages: readonly PageViewportBounds[]
  viewportTop: number
  viewportBottom: number
  marginPx: number
}

export function getPagesIntersectingViewportMargin(options: ViewportResourceWindowOptions): number[] {
  const { pages, viewportTop, viewportBottom, marginPx } = options
  const margin = Math.max(0, marginPx)
  const top = viewportTop - margin
  const bottom = viewportBottom + margin

  return pages
    .filter(page => page.bottom >= top && page.top <= bottom)
    .map(page => page.pageNum)
    .sort((a, b) => a - b)
}
