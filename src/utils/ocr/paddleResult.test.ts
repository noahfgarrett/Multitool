import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paddleItemsToWords } from './paddleResult.ts'

test('paddleItemsToWords converts Paddle line boxes to page-space items', () => {
  const words = paddleItemsToWords([
    {
      text: 'Invoice 123',
      score: 0.92,
      poly: [[20, 40], [120, 38], [125, 58], [18, 60]],
    },
  ], 2, 3)

  assert.equal(words.length, 1)
  assert.deepEqual(words[0], {
    text: 'Invoice 123',
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
