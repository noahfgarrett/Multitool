export interface InactiveTileReleaseOptions {
  pageNum: number
  recentReadablePages: ReadonlySet<number>
  rendered: boolean
  rendering: boolean
  queued: boolean
}

export function shouldReleaseInactiveTile(options: InactiveTileReleaseOptions): boolean {
  if (!options.recentReadablePages.has(options.pageNum)) return true
  return !options.rendered && !options.rendering
}
