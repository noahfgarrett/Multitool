export interface PagePrefetchWindowOptions {
  activePage: number
  pageCount: number
  scrollDirection: 'forward' | 'backward' | 'none'
  aheadCount: number
  behindCount: number
}

export function getPagesToPrefetchAround(options: PagePrefetchWindowOptions): number[] {
  const pageCount = Math.max(1, Math.floor(options.pageCount))
  const activePage = Math.min(Math.max(Math.round(options.activePage), 1), pageCount)
  const aheadCount = Math.max(0, Math.floor(options.aheadCount))
  const behindCount = Math.max(0, Math.floor(options.behindCount))
  const ahead: number[] = []
  const behind: number[] = []

  for (let offset = 1; offset <= aheadCount; offset++) {
    const pageNum = activePage + offset
    if (pageNum <= pageCount) ahead.push(pageNum)
  }

  for (let offset = 1; offset <= behindCount; offset++) {
    const pageNum = activePage - offset
    if (pageNum >= 1) behind.push(pageNum)
  }

  if (options.scrollDirection === 'backward') return [...behind, ...ahead]
  return [...ahead, ...behind]
}
