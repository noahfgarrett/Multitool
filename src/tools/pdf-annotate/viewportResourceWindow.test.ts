import assert from 'node:assert/strict'
import test from 'node:test'
import { getPagesIntersectingViewportMargin } from './viewportResourceWindow.ts'

test('protects pages that are still inside the render observer margin', () => {
  const pages = getPagesIntersectingViewportMargin({
    pages: [
      { pageNum: 1, top: -2400, bottom: -1200 },
      { pageNum: 2, top: -800, bottom: 400 },
      { pageNum: 3, top: 450, bottom: 1650 },
      { pageNum: 4, top: 2600, bottom: 3800 },
    ],
    viewportTop: 0,
    viewportBottom: 800,
    marginPx: 1000,
  })

  assert.deepEqual(pages, [2, 3])
})

test('does not protect pages outside the render observer margin', () => {
  const pages = getPagesIntersectingViewportMargin({
    pages: [
      { pageNum: 1, top: -1001, bottom: -1 },
      { pageNum: 2, top: 1801, bottom: 2600 },
    ],
    viewportTop: 0,
    viewportBottom: 800,
    marginPx: 1000,
  })

  assert.deepEqual(pages, [1])
})
