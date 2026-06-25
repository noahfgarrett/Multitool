import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reconcileFindIndex } from './findUtils'
import type { FindMatch } from './usePdfAnnotateState'

function match(pageNum: number, text: string, x: number, y: number): FindMatch {
  return {
    pageNum,
    item: { text, x, y, width: 40, height: 10, page: pageNum },
    matchX: x,
    matchW: 40,
  }
}

test('reconcileFindIndex keeps the active match when background OCR inserts earlier matches', () => {
  const previousMatches = [
    match(1, 'alpha', 20, 20),
    match(3, 'target', 50, 90),
  ]
  const nextMatches = [
    match(1, 'fresh', 5, 5),
    match(1, 'alpha', 20, 20),
    match(3, 'target', 50, 90),
  ]

  assert.equal(reconcileFindIndex(previousMatches, nextMatches, 1), 2)
})

test('reconcileFindIndex clamps when the active match disappears', () => {
  const previousMatches = [
    match(1, 'alpha', 20, 20),
    match(2, 'target', 50, 90),
    match(3, 'omega', 15, 30),
  ]
  const nextMatches = [
    match(1, 'alpha', 20, 20),
  ]

  assert.equal(reconcileFindIndex(previousMatches, nextMatches, 2), 0)
})
