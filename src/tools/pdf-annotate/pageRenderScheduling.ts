export interface PageRenderSchedulingOptions {
  protectedPages: ReadonlySet<number>
  renderedPages: ReadonlySet<number>
  deferNewWork: boolean
  activePage?: number
  scrollDirection?: 'forward' | 'backward' | 'none'
}

export function getPagesToRenderInProtectedWindow(options: PageRenderSchedulingOptions): number[] {
  if (options.deferNewWork) return []

  const pages = Array.from(options.protectedPages)
    .filter(pageNum => !options.renderedPages.has(pageNum))
    .sort((a, b) => a - b)

  if (!options.activePage || !options.scrollDirection || options.scrollDirection === 'none') {
    return pages
  }

  const activePage = Math.round(options.activePage)
  const ahead = pages.filter(pageNum => pageNum >= activePage)
  const behind = pages.filter(pageNum => pageNum < activePage)

  if (options.scrollDirection === 'backward') {
    return [
      ...pages.filter(pageNum => pageNum <= activePage).sort((a, b) => b - a),
      ...pages.filter(pageNum => pageNum > activePage).sort((a, b) => a - b),
    ]
  }

  return [...ahead, ...behind]
}
