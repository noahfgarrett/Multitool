import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paddleItemsToWords } from './paddleResult.ts'

test('paddleItemsToWords converts Paddle single-token boxes to page-space items', () => {
  const words = paddleItemsToWords([
    {
      text: 'Invoice',
      score: 0.92,
      poly: [[20, 40], [120, 38], [125, 58], [18, 60]],
    },
  ], 2, 3)

  assert.equal(words.length, 1)
  assert.deepEqual(words[0], {
    text: 'Invoice',
    confidence: 92,
    x: 9,
    y: 19,
    width: 53.5,
    height: 11,
    page: 3,
  })
})

test('paddleItemsToWords applies crop offsets and ignores empty text', () => {
  const words = paddleItemsToWords([
    {
      text: '  ',
      score: 0.5,
      poly: [[0, 0], [10, 0], [10, 10], [0, 10]],
    },
    {
      text: 'Total',
      score: 87,
      poly: [[4, 6], [24, 6], [24, 16], [4, 16]],
    },
  ], 2, 1, { x: 30, y: 40 })

  assert.equal(words.length, 1)
  assert.equal(words[0].x, 32)
  assert.equal(words[0].y, 43)
  assert.equal(words[0].confidence, 87)
})

test('paddleItemsToWords splits spaced Paddle line boxes into word boxes', () => {
  const words = paddleItemsToWords([
    {
      text: 'BLUE RIVER PUMP',
      score: 0.94,
      poly: [[0, 20], [150, 20], [150, 40], [0, 40]],
    },
  ], 2, 7)

  assert.deepEqual(words.map(word => word.text), ['BLUE', 'RIVER', 'PUMP'])
  assert.deepEqual(words.map(word => ({
    x: Number(word.x.toFixed(2)),
    width: Number(word.width.toFixed(2)),
    y: word.y,
    height: word.height,
    confidence: word.confidence,
    page: word.page,
  })), [
    { x: 0, width: 20, y: 10, height: 10, confidence: 94, page: 7 },
    { x: 25, width: 25, y: 10, height: 10, confidence: 94, page: 7 },
    { x: 55, width: 20, y: 10, height: 10, confidence: 94, page: 7 },
  ])
})
