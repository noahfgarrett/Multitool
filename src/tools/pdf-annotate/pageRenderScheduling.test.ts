import assert from 'node:assert/strict'
import test from 'node:test'
import { getPagesToRenderInProtectedWindow } from './pageRenderScheduling.ts'

test('defers cold page renders while active scrolling', () => {
  const pages = getPagesToRenderInProtectedWindow({
    protectedPages: new Set([4, 5, 6]),
    renderedPages: new Set([4]),
    deferNewWork: true,
  })

  assert.deepEqual(pages, [])
})

test('returns unrendered protected pages when scroll is idle', () => {
  const pages = getPagesToRenderInProtectedWindow({
    protectedPages: new Set([6, 4, 5]),
    renderedPages: new Set([4]),
    deferNewWork: false,
  })

  assert.deepEqual(pages, [5, 6])
})

test('orders idle renders ahead of the active page while scrolling forward', () => {
  const pages = getPagesToRenderInProtectedWindow({
    protectedPages: new Set([9, 10, 11, 12]),
    renderedPages: new Set(),
    deferNewWork: false,
    activePage: 10,
    scrollDirection: 'forward',
  })

  assert.deepEqual(pages, [10, 11, 12, 9])
})

test('orders idle renders behind the active page while scrolling backward', () => {
  const pages = getPagesToRenderInProtectedWindow({
    protectedPages: new Set([9, 10, 11, 12]),
    renderedPages: new Set(),
    deferNewWork: false,
    activePage: 11,
    scrollDirection: 'backward',
  })

  assert.deepEqual(pages, [11, 10, 9, 12])
})
