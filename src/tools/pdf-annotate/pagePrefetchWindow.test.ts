import assert from 'node:assert/strict'
import test from 'node:test'
import { getPagesToPrefetchAround } from './pagePrefetchWindow.ts'

test('prefetches pages ahead of the active page when scrolling forward', () => {
  const pages = getPagesToPrefetchAround({
    activePage: 10,
    pageCount: 20,
    scrollDirection: 'forward',
    aheadCount: 2,
    behindCount: 1,
  })

  assert.deepEqual(pages, [11, 12, 9])
})

test('prefetches pages behind the active page when scrolling backward', () => {
  const pages = getPagesToPrefetchAround({
    activePage: 10,
    pageCount: 20,
    scrollDirection: 'backward',
    aheadCount: 2,
    behindCount: 1,
  })

  assert.deepEqual(pages, [9, 11, 12])
})

test('clamps prefetch pages to document bounds', () => {
  const nearStart = getPagesToPrefetchAround({
    activePage: 1,
    pageCount: 3,
    scrollDirection: 'forward',
    aheadCount: 4,
    behindCount: 2,
  })
  const nearEnd = getPagesToPrefetchAround({
    activePage: 3,
    pageCount: 3,
    scrollDirection: 'backward',
    aheadCount: 4,
    behindCount: 2,
  })

  assert.deepEqual(nearStart, [2, 3])
  assert.deepEqual(nearEnd, [2, 1])
})
