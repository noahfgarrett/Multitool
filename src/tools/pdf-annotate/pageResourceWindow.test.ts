import assert from 'node:assert/strict'
import test from 'node:test'
import { getPagesToRelease } from './pageResourceWindow.ts'

test('keeps pages within the active page radius and releases far rendered pages', () => {
  const pages = getPagesToRelease({
    renderedPages: new Set([1, 2, 3, 4, 5, 6, 20]),
    activePage: 4,
    pageCount: 20,
    radius: 2,
  })

  assert.deepEqual(pages, [1, 20])
})

test('clamps the protected page window to document bounds', () => {
  const nearStart = getPagesToRelease({
    renderedPages: new Set([1, 2, 3, 4, 5]),
    activePage: 1,
    pageCount: 5,
    radius: 2,
  })
  const nearEnd = getPagesToRelease({
    renderedPages: new Set([1, 2, 3, 4, 5]),
    activePage: 5,
    pageCount: 5,
    radius: 2,
  })

  assert.deepEqual(nearStart, [4, 5])
  assert.deepEqual(nearEnd, [1, 2])
})

test('always preserves explicitly protected pages', () => {
  const pages = getPagesToRelease({
    renderedPages: new Set([1, 2, 3, 4, 5, 6]),
    activePage: 3,
    pageCount: 6,
    radius: 1,
    protectedPages: new Set([6]),
  })

  assert.deepEqual(pages, [1, 5])
})
