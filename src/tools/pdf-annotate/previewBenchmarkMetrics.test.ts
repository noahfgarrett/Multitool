import assert from 'node:assert/strict'
import test from 'node:test'
import {
  percentile,
  summarizeFrameDeltas,
  evaluatePreviewTargets,
} from './previewBenchmarkMetrics.ts'

test('percentile uses nearest-rank values for stable benchmark reporting', () => {
  assert.equal(percentile([10, 20, 30, 40], 95), 40)
  assert.equal(percentile([40, 10, 30, 20], 50), 20)
  assert.equal(percentile([], 95), 0)
})

test('summarizes active scroll frame cadence and long frames', () => {
  const summary = summarizeFrameDeltas([16, 17, 20, 24, 55])

  assert.equal(summary.count, 5)
  assert.equal(summary.p95Ms, 55)
  assert.equal(summary.p99Ms, 55)
  assert.equal(summary.over50Ms, 1)
})

test('evaluates Preview-like targets independently', () => {
  const result = evaluatePreviewTargets({
    activeScrollFrames: { count: 80, p95Ms: 16.7, p99Ms: 24.9, maxMs: 24.9, over50Ms: 0 },
    oneNotchRevisitReadableMs: 84,
    coldFirstReadableMs: 1400,
    revisitReadableMs: 42,
    highZoomFirstTileMs: 320,
    highZoomVisibleCoverageMs: 1700,
    peakRssMb: 2900,
    settledRssMb: 1300,
    correctness: {
      noBlackCanvases: true,
      noConsoleErrors: true,
      noPageErrors: true,
      noBottomVoid: true,
      noSettledWhitePages: true,
    },
  })

  assert.equal(result.activeScrollCadence, true)
  assert.equal(result.oneNotchRevisit, true)
  assert.equal(result.coldFirstReadable, true)
  assert.equal(result.revisitReadable, true)
  assert.equal(result.highZoomTileUpgrade, true)
  assert.equal(result.memory, true)
  assert.equal(result.correctness, true)
  assert.equal(result.overall, true)
})

test('treats memory as a relaxed guardrail when responsiveness and correctness hold', () => {
  const result = evaluatePreviewTargets({
    activeScrollFrames: { count: 80, p95Ms: 16.7, p99Ms: 24.9, maxMs: 24.9, over50Ms: 0 },
    oneNotchRevisitReadableMs: 10,
    coldFirstReadableMs: 900,
    revisitReadableMs: 3,
    highZoomFirstTileMs: 350,
    highZoomVisibleCoverageMs: 450,
    peakRssMb: 3400,
    settledRssMb: 2200,
    correctness: {
      noBlackCanvases: true,
      noConsoleErrors: true,
      noPageErrors: true,
      noBottomVoid: true,
      noSettledWhitePages: true,
    },
  })

  assert.equal(result.memory, true)
})
