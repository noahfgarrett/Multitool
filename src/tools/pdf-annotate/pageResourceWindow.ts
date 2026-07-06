export interface PageResourceWindowOptions {
  renderedPages: ReadonlySet<number>
  activePage: number
  pageCount: number
  radius: number
  protectedPages?: ReadonlySet<number>
}

export function getPagesToRelease(options: PageResourceWindowOptions): number[] {
  const { renderedPages, activePage, pageCount, radius, protectedPages } = options
  const safePage = Math.min(Math.max(Math.round(activePage), 1), Math.max(1, pageCount))
  const safeRadius = Math.max(0, Math.floor(radius))
  const start = Math.max(1, safePage - safeRadius)
  const end = Math.min(pageCount, safePage + safeRadius)
  const pages: number[] = []

  for (const pageNum of renderedPages) {
    if (pageNum >= start && pageNum <= end) continue
    if (protectedPages?.has(pageNum)) continue
    pages.push(pageNum)
  }

  return pages.sort((a, b) => a - b)
}
