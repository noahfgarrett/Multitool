import assert from 'node:assert/strict'
import test from 'node:test'
import { getTileItemsToReleaseForBudget } from './tileBudget.ts'

test('releases farthest off-window tiles until the budget is met', () => {
  const releases = getTileItemsToReleaseForBudget({
    items: [
      { id: 'near-visible', pageNum: 10, bytes: 200, inRenderWindow: true, lastTouchedAt: 4 },
      { id: 'near-old', pageNum: 9, bytes: 200, inRenderWindow: false, lastTouchedAt: 1 },
      { id: 'far-new', pageNum: 20, bytes: 200, inRenderWindow: false, lastTouchedAt: 3 },
      { id: 'far-old', pageNum: 1, bytes: 200, inRenderWindow: false, lastTouchedAt: 2 },
    ],
    activePage: 10,
    maxBytes: 500,
  })

  assert.deepEqual(releases, ['far-new', 'far-old'])
})

test('does not release render-window or explicitly protected tiles', () => {
  const releases = getTileItemsToReleaseForBudget({
    items: [
      { id: 'visible-a', pageNum: 4, bytes: 300, inRenderWindow: true, lastTouchedAt: 1 },
      { id: 'protected-a', pageNum: 1, bytes: 300, inRenderWindow: false, lastTouchedAt: 2 },
      { id: 'outside-a', pageNum: 9, bytes: 300, inRenderWindow: false, lastTouchedAt: 3 },
    ],
    activePage: 4,
    maxBytes: 300,
    protectedIds: new Set(['protected-a']),
  })

  assert.deepEqual(releases, ['outside-a'])
})
