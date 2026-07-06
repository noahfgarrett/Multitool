import assert from 'node:assert/strict'
import test from 'node:test'
import { getTileRenderPriority, insertTileRenderJob } from './tileRenderQueue.ts'

test('orders tile render jobs by visible top-to-bottom priority', () => {
  const queue: Array<{ id: string; priority: number; sequence: number }> = []

  insertTileRenderJob(queue, { id: 'lower-visible', priority: 300, sequence: 1 })
  insertTileRenderJob(queue, { id: 'top-visible', priority: 20, sequence: 2 })
  insertTileRenderJob(queue, { id: 'middle-visible', priority: 160, sequence: 3 })

  assert.deepEqual(queue.map(item => item.id), ['top-visible', 'middle-visible', 'lower-visible'])
})

test('keeps FIFO order when tile priorities match', () => {
  const queue: Array<{ id: string; priority: number; sequence: number }> = []

  insertTileRenderJob(queue, { id: 'first', priority: 100, sequence: 1 })
  insertTileRenderJob(queue, { id: 'second', priority: 100, sequence: 2 })

  assert.deepEqual(queue.map(item => item.id), ['first', 'second'])
})

test('prioritizes the active page, then the tile closest to the viewport top', () => {
  const activeTop = getTileRenderPriority({
    pageNum: 4,
    activePage: 4,
    rootTop: 100,
    tileTop: 120,
    row: 0,
    col: 0,
  })
  const activeLower = getTileRenderPriority({
    pageNum: 4,
    activePage: 4,
    rootTop: 100,
    tileTop: 500,
    row: 2,
    col: 0,
  })
  const nearbyTop = getTileRenderPriority({
    pageNum: 5,
    activePage: 4,
    rootTop: 100,
    tileTop: 110,
    row: 0,
    col: 0,
  })

  assert(activeTop < activeLower)
  assert(activeLower < nearbyTop)
})
