import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tesseractBlocksToWords } from './tesseractEngine'

test('tesseractBlocksToWords converts nested word boxes into page-space OCR words', () => {
  const blocks = [
    {
      paragraphs: [
        {
          lines: [
            {
              words: [
                { text: 'Invoice', confidence: 92, bbox: { x0: 20, y0: 40, x1: 100, y1: 60 } },
                { text: ' ', confidence: 10, bbox: { x0: 110, y0: 40, x1: 120, y1: 60 } },
                { text: 'Total', confidence: 88, bbox: { x0: 20, y0: 80, x1: 70, y1: 100 } },
              ],
            },
          ],
        },
      ],
    },
  ]

  assert.deepEqual(tesseractBlocksToWords(blocks, 2, 4), [
    {
      text: 'Invoice',
      confidence: 92,
      x: 10,
      y: 20,
      width: 40,
      height: 10,
      page: 4,
    },
    {
      text: 'Total',
      confidence: 88,
      x: 10,
      y: 40,
      width: 25,
      height: 10,
      page: 4,
    },
  ])
})
