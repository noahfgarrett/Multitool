import { test } from 'node:test'
import assert from 'node:assert/strict'
import { upgradeSnapshot } from './orgChartStore.ts'

test('upgradeSnapshot adds the default chart background to legacy array snapshots', () => {
  const upgraded = upgradeSnapshot([]) as unknown as { background?: { color: string } }

  assert.deepEqual(upgraded.background, { color: '#0a0a14' })
})

test('upgradeSnapshot repairs invalid chart background colors', () => {
  const upgraded = upgradeSnapshot({
    nodes: [],
    connections: [],
    connectorTypes: [],
    legend: { position: 'top-left' },
    background: { color: 'not-a-color' },
  }) as unknown as { background?: { color: string } }

  assert.deepEqual(upgraded.background, { color: '#0a0a14' })
})
