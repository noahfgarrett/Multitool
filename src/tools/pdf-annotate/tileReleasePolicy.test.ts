import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldReleaseInactiveTile } from './tileReleasePolicy.ts'

test('releases inactive tiles for pages outside the recent readable cache', () => {
  assert.equal(shouldReleaseInactiveTile({
    pageNum: 12,
    recentReadablePages: new Set([7, 8, 9]),
    rendered: true,
    rendering: false,
    queued: false,
  }), true)
})

test('keeps inactive rendered tiles for recent readable pages', () => {
  assert.equal(shouldReleaseInactiveTile({
    pageNum: 8,
    recentReadablePages: new Set([7, 8, 9]),
    rendered: true,
    rendering: false,
    queued: false,
  }), false)
})

test('releases inactive queued tiles even for recent readable pages', () => {
  assert.equal(shouldReleaseInactiveTile({
    pageNum: 8,
    recentReadablePages: new Set([7, 8, 9]),
    rendered: false,
    rendering: false,
    queued: true,
  }), true)
})
