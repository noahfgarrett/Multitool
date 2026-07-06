import assert from 'node:assert/strict'
import test from 'node:test'
import { touchRecentPage, touchRecentPageCluster } from './recentPageCache.ts'

test('touchRecentPage moves an existing page to the most-recent slot', () => {
  assert.deepEqual(touchRecentPage([2, 5, 8], 5, 4), [2, 8, 5])
})

test('touchRecentPage trims the least-recent page when over the limit', () => {
  assert.deepEqual(touchRecentPage([2, 5, 8], 13, 3), [5, 8, 13])
})

test('touchRecentPage ignores invalid cache limits', () => {
  assert.deepEqual(touchRecentPage([2, 5], 8, 0), [])
})

test('touchRecentPageCluster keeps visible neighbors around the readable page', () => {
  assert.deepEqual(touchRecentPageCluster([9], 5, 10, 1, 8), [9, 4, 5, 6])
})

test('touchRecentPageCluster clamps neighbors to document bounds', () => {
  assert.deepEqual(touchRecentPageCluster([9], 1, 10, 1, 8), [9, 1, 2])
})
