export function touchRecentPage(recentPages: readonly number[], pageNum: number, limit: number): number[] {
  const safeLimit = Math.max(0, Math.floor(limit))
  if (safeLimit === 0) return []

  const next = recentPages.filter(page => page !== pageNum)
  next.push(pageNum)
  return next.slice(Math.max(0, next.length - safeLimit))
}

export function touchRecentPageCluster(
  recentPages: readonly number[],
  pageNum: number,
  pageCount: number,
  radius: number,
  limit: number,
): number[] {
  const safePageCount = Math.max(1, Math.floor(pageCount))
  const safePage = Math.min(Math.max(Math.round(pageNum), 1), safePageCount)
  const safeRadius = Math.max(0, Math.floor(radius))
  let next = [...recentPages]

  for (let page = safePage - safeRadius; page <= safePage + safeRadius; page++) {
    if (page < 1 || page > safePageCount) continue
    next = touchRecentPage(next, page, limit)
  }

  return next
}
