export interface TileRenderQueueItem {
  priority: number
  sequence: number
}

export interface TileRenderPriorityOptions {
  pageNum: number
  activePage: number
  rootTop: number
  tileTop: number
  row: number
  col: number
}

export function insertTileRenderJob<T extends TileRenderQueueItem>(queue: T[], job: T): void {
  const index = queue.findIndex(item => {
    if (job.priority !== item.priority) return job.priority < item.priority
    return job.sequence < item.sequence
  })

  if (index === -1) {
    queue.push(job)
  } else {
    queue.splice(index, 0, job)
  }
}

export function getTileRenderPriority(options: TileRenderPriorityOptions): number {
  const { pageNum, activePage, rootTop, tileTop, row, col } = options
  const pageDistance = Math.abs(pageNum - activePage)
  const distanceFromViewportTop = Math.max(0, tileTop - rootTop)
  return pageDistance * 1_000_000 + distanceFromViewportTop * 100 + row * 10 + col
}
