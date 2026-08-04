import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLegendContent,
  ensureVisibleConnectorType,
  readableForeground,
} from './legend.ts'
import {
  createDefaultConnectorTypes,
  createDefaultLegend,
  createNode,
} from './types.ts'

test('legend content describes the primary hierarchy and departments in use', () => {
  const nodes = [
    createNode({ id: 'root', reportsTo: '', department: 'Engineering', nodeColor: '#3b82f6' }),
    createNode({ id: 'child', reportsTo: 'root', department: 'Engineering', nodeColor: '#3b82f6' }),
    createNode({ id: 'sales', reportsTo: 'root', department: 'Sales', nodeColor: '#f59e0b' }),
  ]

  const content = buildLegendContent({
    nodes,
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: createDefaultLegend(),
  })

  assert.deepEqual(content.relationships.map(item => item.label), ['Reports to'])
  assert.deepEqual(content.departments.map(item => item.label), ['Engineering', 'Sales'])
})

test('legend settings can hide either legend section', () => {
  const content = buildLegendContent({
    nodes: [createNode({ department: 'Legal', nodeColor: '#6366f1' })],
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: {
      ...createDefaultLegend(),
      showRelationships: false,
      showDepartments: false,
    },
  })

  assert.deepEqual(content, { relationships: [], departments: [] })
})

test('legend content includes line types used by hierarchy relationships', () => {
  const content = buildLegendContent({
    nodes: [
      createNode({ id: 'root', reportsTo: '' }),
      createNode({ id: 'child', reportsTo: 'root', relationshipTypeId: 'supports' }),
    ],
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: createDefaultLegend(),
  })

  assert.deepEqual(content.relationships.map(type => type.id), ['supports'])
})

test('connector colors are contrast-protected against the chart background', () => {
  const type = createDefaultConnectorTypes()[0]
  const protectedType = ensureVisibleConnectorType(type, '#0a0a14')

  assert.notEqual(protectedType.color.toLowerCase(), type.color.toLowerCase())
  assert.equal(readableForeground('#ffffff'), '#1a1a24')
  assert.equal(readableForeground('#0a0a14'), '#ffffff')
})
