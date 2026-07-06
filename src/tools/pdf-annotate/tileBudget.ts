export interface TileBudgetItem {
  id: string
  pageNum: number
  bytes: number
  inRenderWindow: boolean
  lastTouchedAt: number
}

export interface TileBudgetOptions {
  items: TileBudgetItem[]
  activePage: number
  maxBytes: number
  protectedIds?: ReadonlySet<string>
}

export function getTileItemsToReleaseForBudget(options: TileBudgetOptions): string[] {
  const { items, activePage, maxBytes, protectedIds } = options
  let totalBytes = items.reduce((sum, item) => sum + Math.max(0, item.bytes), 0)
  if (totalBytes <= maxBytes) return []

  const candidates = items
    .filter(item => item.bytes > 0 && !item.inRenderWindow && !protectedIds?.has(item.id))
    .sort((a, b) => {
      const distA = Math.abs(a.pageNum - activePage)
      const distB = Math.abs(b.pageNum - activePage)
      if (distA !== distB) return distB - distA
      if (a.lastTouchedAt !== b.lastTouchedAt) return a.lastTouchedAt - b.lastTouchedAt
      return a.id.localeCompare(b.id)
    })

  const releases: string[] = []
  for (const item of candidates) {
    if (totalBytes <= maxBytes) break
    releases.push(item.id)
    totalBytes -= item.bytes
  }

  return releases
}
