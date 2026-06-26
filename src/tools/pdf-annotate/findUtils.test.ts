import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findTextMatches, reconcileFindIndex } from './findUtils'
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

test('findTextMatches finds phrases split across adjacent OCR word boxes', () => {
  const matches = findTextMatches({
    '1_0': [
      { text: 'BLUE', x: 10, y: 20, width: 20, height: 10, page: 1 },
      { text: 'RIVER', x: 35, y: 20, width: 30, height: 10, page: 1 },
      { text: 'PUMP', x: 72, y: 20, width: 26, height: 10, page: 1 },
    ],
  }, 'blue river', false)

  assert.equal(matches.length, 1)
  assert.equal(matches[0].pageNum, 1)
  assert.equal(matches[0].item.text, 'BLUE RIVER')
  assert.equal(matches[0].matchX, 10)
  assert.equal(matches[0].matchW, 55)
})

test('findTextMatches does not join phrases across separate OCR lines', () => {
  const matches = findTextMatches({
    '1_0': [
      { text: 'BLUE', x: 10, y: 20, width: 20, height: 10, page: 1 },
      { text: 'RIVER', x: 10, y: 46, width: 30, height: 10, page: 1 },
    ],
  }, 'blue river', false)

  assert.equal(matches.length, 0)
})
