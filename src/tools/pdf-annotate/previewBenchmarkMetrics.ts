export interface FrameSummary {
  count: number
  p95Ms: number
  p99Ms: number
  maxMs: number
  over50Ms: number
}

export interface PreviewCorrectnessSummary {
  noBlackCanvases: boolean
  noConsoleErrors: boolean
  noPageErrors: boolean
  noBottomVoid: boolean
  noSettledWhitePages: boolean
}

export interface PreviewBenchmarkSummary {
  activeScrollFrames: FrameSummary
  oneNotchRevisitReadableMs: number
  coldFirstReadableMs: number
  revisitReadableMs: number
  highZoomFirstTileMs: number
  highZoomVisibleCoverageMs: number
  peakRssMb: number
  settledRssMb: number
  correctness: PreviewCorrectnessSummary
}

export interface PreviewTargetResults {
  activeScrollCadence: boolean
  oneNotchRevisit: boolean
  coldFirstReadable: boolean
  revisitReadable: boolean
  highZoomTileUpgrade: boolean
  memory: boolean
  correctness: boolean
  overall: boolean
}

export function percentile(values: readonly number[], pct: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const safePct = Math.min(100, Math.max(0, pct))
  const index = Math.max(0, Math.ceil((safePct / 100) * sorted.length) - 1)
  return sorted[Math.min(sorted.length - 1, index)]
}

export function summarizeFrameDeltas(frameDeltas: readonly number[]): FrameSummary {
  return {
    count: frameDeltas.length,
    p95Ms: percentile(frameDeltas, 95),
    p99Ms: percentile(frameDeltas, 99),
    maxMs: frameDeltas.length === 0 ? 0 : Math.max(...frameDeltas),
    over50Ms: frameDeltas.filter(ms => ms > 50).length,
  }
}

export function evaluatePreviewTargets(summary: PreviewBenchmarkSummary): PreviewTargetResults {
  const activeScrollCadence = summary.activeScrollFrames.p95Ms <= 16.7
    && summary.activeScrollFrames.p99Ms <= 25
    && summary.activeScrollFrames.over50Ms === 0
  const oneNotchRevisit = summary.oneNotchRevisitReadableMs <= 100
  const coldFirstReadable = summary.coldFirstReadableMs <= 2000
  const revisitReadable = summary.revisitReadableMs <= 100
  const highZoomTileUpgrade = summary.highZoomFirstTileMs <= 500
    && summary.highZoomVisibleCoverageMs <= 2000
  const memory = summary.peakRssMb <= 3600
    && summary.settledRssMb <= 2400
  const correctness = Object.values(summary.correctness).every(Boolean)

  return {
    activeScrollCadence,
    oneNotchRevisit,
    coldFirstReadable,
    revisitReadable,
    highZoomTileUpgrade,
    memory,
    correctness,
    overall: activeScrollCadence
      && oneNotchRevisit
      && coldFirstReadable
      && revisitReadable
      && highZoomTileUpgrade
      && memory
      && correctness,
  }
}
