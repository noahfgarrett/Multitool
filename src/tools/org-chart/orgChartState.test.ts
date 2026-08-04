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

test('upgradeSnapshot preserves layout and repairs expanded legend settings', () => {
  const upgraded = upgradeSnapshot({
    nodes: [],
    connections: [],
    connectorTypes: [],
    layoutDirection: 'left-right',
    legend: {
      position: 'top-left',
      visible: false,
      showRelationships: false,
      showDepartments: true,
    },
    background: { color: '#ffffff' },
  })

  assert.equal(upgraded.layoutDirection, 'left-right')
  assert.deepEqual(upgraded.legend, {
    position: 'top-left',
    visible: false,
    showRelationships: false,
    showDepartments: true,
  })
})

test('upgradeSnapshot defaults legacy documents to top-down layout and a visible legend', () => {
  const upgraded = upgradeSnapshot({ nodes: [] })

  assert.equal(upgraded.layoutDirection, 'top-down')
  assert.deepEqual(upgraded.legend, {
    position: 'bottom-right',
    visible: true,
    showRelationships: true,
    showDepartments: true,
  })
})
