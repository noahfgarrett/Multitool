import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrgChartLayout } from './layout.ts'
import { createNode } from './types.ts'

const nodes = [
  createNode({ id: 'root', reportsTo: '' }),
  createNode({ id: 'child', reportsTo: 'root' }),
]

test('shared layout places children below parents in top-down mode', () => {
  const { byId } = buildOrgChartLayout(nodes, 'top-down')
  const root = byId.get('root')!
  const child = byId.get('child')!

  assert.ok(child.y > root.y)
})

test('shared layout places children to the right in left-right mode', () => {
  const { byId } = buildOrgChartLayout(nodes, 'left-right')
  const root = byId.get('root')!
  const child = byId.get('child')!

  assert.ok(child.x > root.x)
})

test('shared layout applies manual node offsets exactly once', () => {
  const offsetNodes = [createNode({ id: 'root', reportsTo: '', offsetX: 35, offsetY: -12 })]
  const { byId } = buildOrgChartLayout(offsetNodes, 'top-down')

  assert.equal(byId.get('root')!.x, 35)
  assert.equal(byId.get('root')!.y, -12)
})
