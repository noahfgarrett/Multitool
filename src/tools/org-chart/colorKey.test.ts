import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildColorKeyEntriesFromNodes } from './colorKey.ts'
import { createNode } from './types.ts'

test('buildColorKeyEntriesFromNodes creates one editable meaning per used color', () => {
  const entries = buildColorKeyEntriesFromNodes([
    createNode({ id: 'a', department: 'Engineering', nodeColor: '#3B82F6' }),
    createNode({ id: 'b', department: 'Engineering', nodeColor: '#3b82f6' }),
    createNode({ id: 'c', department: '', nodeColor: '#22C55E' }),
  ])

  assert.deepEqual(entries.map(entry => ({ label: entry.label, color: entry.color })), [
    { label: 'Engineering', color: '#3b82f6' },
    { label: 'Green', color: '#22c55e' },
  ])
  assert.equal(new Set(entries.map(entry => entry.id)).size, 2)
})
