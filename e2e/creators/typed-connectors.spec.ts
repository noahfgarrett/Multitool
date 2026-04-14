import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
})

// ── Store-backed integration test helpers ─────────────────────
// These run inside page.evaluate() and pull live store state from
// window.__orgChartTest.getStore(), which is registered from
// OrgChartTool.tsx's test-hooks effect.

interface StoreConnection { id: string; fromId: string; toId: string; typeId: string }
interface StoreConnectorType { id: string; label: string; color: string; style: string; lineWidth: number }
interface StoreNode { id: string; name: string; reportsTo: string }

async function getConnections(page: Page): Promise<StoreConnection[]> {
  return await page.evaluate(() => {
    const s = window.__orgChartTest?.getStore?.() as { connections?: unknown } | undefined
    return Array.isArray(s?.connections) ? (s!.connections as StoreConnection[]) : []
  })
}

async function getConnectorTypes(page: Page): Promise<StoreConnectorType[]> {
  return await page.evaluate(() => {
    const s = window.__orgChartTest?.getStore?.() as { connectorTypes?: unknown } | undefined
    return Array.isArray(s?.connectorTypes) ? (s!.connectorTypes as StoreConnectorType[]) : []
  })
}

async function getLegendPosition(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const s = window.__orgChartTest?.getStore?.() as { legend?: { position?: unknown } } | undefined
    return typeof s?.legend?.position === 'string' ? (s!.legend!.position as string) : ''
  })
}

async function getNodes(page: Page): Promise<StoreNode[]> {
  return await page.evaluate(() => {
    const s = window.__orgChartTest?.getStore?.() as { nodes?: unknown } | undefined
    return Array.isArray(s?.nodes) ? (s!.nodes as StoreNode[]) : []
  })
}

// Fires a store action and awaits completion. Return value is intentionally
// void — callers read state back via the getConnections/getNodes helpers
// instead of trying to thread typed return values through page.evaluate.
async function dispatchStore(
  page: Page,
  fn: string,
  args: unknown[],
): Promise<void> {
  await page.evaluate(({ fn, args }) => {
    const s = window.__orgChartTest?.getStore?.() as Record<string, unknown> | undefined
    if (!s) throw new Error('Store not registered')
    const action = s[fn]
    if (typeof action !== 'function') throw new Error(`Store action "${fn}" not found`)
    ;(action as (...a: unknown[]) => unknown)(...args)
  }, { fn, args })
}

test.describe('Org Chart — Typed Connectors (pure function tests)', () => {
  test('createDefaultConnectorTypes returns 4 types in stable order', async ({ page }) => {
    const types = await page.evaluate(() => {
      return window.__orgChartTest!.createDefaultConnectorTypes()
    })
    expect(types).toHaveLength(4)
    expect(types.map(t => t.id)).toEqual([
      'primary', 'dotted-line', 'supports', 'collaborates',
    ])
    expect(types[0].style).toBe('solid')
    expect(types[1].style).toBe('dashed')
    expect(types[2].style).toBe('dotted')
    expect(types[3].style).toBe('double')
  })

  test('mergeWithDefaults fills missing types and drops unknown ones', async ({ page }) => {
    const result = await page.evaluate(() => {
      return window.__orgChartTest!.mergeWithDefaults([
        { id: 'primary', label: 'Line Manager', color: '#ffffff', style: 'solid', lineWidth: 1.5 },
        { id: 'unknown-type', label: 'Nope', color: '#000000', style: 'solid', lineWidth: 1 },
      ])
    })
    expect(result).toHaveLength(4)
    expect(result[0].label).toBe('Line Manager')
    expect(result[0].color).toBe('#ffffff')
    expect(result[1].id).toBe('dotted-line')
    expect(result[1].label).toBe('Dotted-line')  // default restored
  })

  test('mergeWithDefaults rejects invalid color and keeps default', async ({ page }) => {
    const result = await page.evaluate(() => {
      return window.__orgChartTest!.mergeWithDefaults([
        { id: 'primary', label: 'Custom', color: 'not-a-hex', style: 'solid', lineWidth: 1.5 },
      ])
    })
    expect(result[0].label).toBe('Custom')
    expect(result[0].color).toBe('#9ca3af')  // fell back to default
  })

  test('mergeWithDefaults on null/empty/malformed returns all defaults', async ({ page }) => {
    const cases = await page.evaluate(() => {
      const hooks = window.__orgChartTest!
      return {
        nullCase: hooks.mergeWithDefaults(null),
        emptyCase: hooks.mergeWithDefaults([]),
        stringCase: hooks.mergeWithDefaults('garbage' as unknown),
      }
    })
    for (const result of Object.values(cases)) {
      expect(result).toHaveLength(4)
      expect(result[0].id).toBe('primary')
      expect(result[0].label).toBe('Reports to')
    }
  })

  test('getDashPattern returns correct arrays per style', async ({ page }) => {
    const patterns = await page.evaluate(() => {
      const hooks = window.__orgChartTest!
      return {
        solid: hooks.getDashPattern('solid'),
        dashed: hooks.getDashPattern('dashed'),
        dotted: hooks.getDashPattern('dotted'),
        double: hooks.getDashPattern('double'),
      }
    })
    expect(patterns.solid).toEqual([])
    expect(patterns.dashed).toEqual([8, 5])
    expect(patterns.dotted).toEqual([2, 3])
    expect(patterns.double).toEqual([])
  })

  test('routeSecondaryEdge — target directly below produces vertical line', async ({ page }) => {
    const path = await page.evaluate(() => {
      return window.__orgChartTest!.routeSecondaryEdge(
        { x: 100, y: 0,   width: 220, height: 90 },
        { x: 100, y: 300, width: 220, height: 90 },
      )
    })
    expect(path).toHaveLength(2)
    expect(path[0][0]).toBeCloseTo(210, 0)
    expect(path[0][1]).toBeCloseTo(90, 0)
    expect(path[1][0]).toBeCloseTo(210, 0)
    expect(path[1][1]).toBeCloseTo(300, 0)
  })

  test('routeSecondaryEdge — target directly right produces horizontal line', async ({ page }) => {
    const path = await page.evaluate(() => {
      return window.__orgChartTest!.routeSecondaryEdge(
        { x: 0,   y: 100, width: 220, height: 90 },
        { x: 400, y: 100, width: 220, height: 90 },
      )
    })
    expect(path).toHaveLength(2)
    expect(path[0][0]).toBeCloseTo(220, 0)
    expect(path[0][1]).toBeCloseTo(145, 0)
    expect(path[1][0]).toBeCloseTo(400, 0)
    expect(path[1][1]).toBeCloseTo(145, 0)
  })

  test('routeSecondaryEdge — diagonal target clips at appropriate corner edge', async ({ page }) => {
    const path = await page.evaluate(() => {
      return window.__orgChartTest!.routeSecondaryEdge(
        { x: 0,   y: 0,   width: 220, height: 90 },
        { x: 500, y: 400, width: 220, height: 90 },
      )
    })
    expect(path).toHaveLength(2)
    const [sx, sy] = path[0]
    const onBottomOrRight = (sy >= 89 && sy <= 90) || (sx >= 219 && sx <= 220)
    expect(onBottomOrRight).toBe(true)
  })

  test('routeSecondaryEdge — overlapping nodes return empty array', async ({ page }) => {
    const path = await page.evaluate(() => {
      return window.__orgChartTest!.routeSecondaryEdge(
        { x: 100, y: 100, width: 220, height: 90 },
        { x: 100, y: 100, width: 220, height: 90 },
      )
    })
    expect(path).toEqual([])
  })

  test('routeSecondaryEdge — very close nodes return empty array', async ({ page }) => {
    const path = await page.evaluate(() => {
      return window.__orgChartTest!.routeSecondaryEdge(
        { x: 100, y: 100, width: 220, height: 90 },
        { x: 100.1, y: 100.1, width: 220, height: 90 },
      )
    })
    expect(path).toEqual([])
  })

  test('hitTestPath — click on the line segment returns true', async ({ page }) => {
    const hits = await page.evaluate(() => {
      return {
        onLine: window.__orgChartTest!.hitTestPath(50, 50, [[0, 0], [100, 100]], 6),
        onEndpoint: window.__orgChartTest!.hitTestPath(0, 0, [[0, 0], [100, 100]], 6),
        offLine: window.__orgChartTest!.hitTestPath(100, 0, [[0, 0], [100, 100]], 6),
        tooFar: window.__orgChartTest!.hitTestPath(50, 70, [[0, 0], [100, 0]], 6),
      }
    })
    expect(hits.onLine).toBe(true)
    expect(hits.onEndpoint).toBe(true)
    expect(hits.offLine).toBe(false)
    expect(hits.tooFar).toBe(false)
  })

  test('hitTestPath — tolerance is respected', async ({ page }) => {
    const hits = await page.evaluate(() => {
      return {
        within: window.__orgChartTest!.hitTestPath(50, 5, [[0, 0], [100, 0]], 6),
        outside: window.__orgChartTest!.hitTestPath(50, 7, [[0, 0], [100, 0]], 6),
      }
    })
    expect(hits.within).toBe(true)
    expect(hits.outside).toBe(false)
  })

  test('hitTestPath — empty/single-point path returns false', async ({ page }) => {
    const results = await page.evaluate(() => {
      return {
        empty: window.__orgChartTest!.hitTestPath(0, 0, [], 6),
        single: window.__orgChartTest!.hitTestPath(0, 0, [[0, 0]], 6),
      }
    })
    expect(results.empty).toBe(false)
    expect(results.single).toBe(false)
  })
})

// ── Store-backed integration tests ───────────────────────────

test.describe('Org Chart — Typed Connectors (store-backed integration)', () => {
  test('createConnection adds a connection and rejects duplicates + self-loops', async ({ page }) => {
    // Start from a known state: 2-node chart with no connections
    const defaultTypes = await page.evaluate(() =>
      window.__orgChartTest!.createDefaultConnectorTypes(),
    )
    await dispatchStore(page, 'loadDiagram', [{
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
        { id: 'b', name: 'Bob', title: 'CTO', reportsTo: 'a', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
      ],
      connections: [],
      connectorTypes: defaultTypes,
      legend: { position: 'bottom-right' },
    }])

    // Create a dotted-line connection
    await dispatchStore(page, 'createConnection', ['a', 'b', 'dotted-line'])
    let connections = await getConnections(page)
    expect(connections).toHaveLength(1)
    expect(connections[0].fromId).toBe('a')
    expect(connections[0].toId).toBe('b')
    expect(connections[0].typeId).toBe('dotted-line')

    // Duplicate attempt (same from/to/type) should be rejected
    await dispatchStore(page, 'createConnection', ['a', 'b', 'dotted-line'])
    connections = await getConnections(page)
    expect(connections).toHaveLength(1)

    // Self-loop should be silently rejected
    await dispatchStore(page, 'createConnection', ['a', 'a', 'supports'])
    connections = await getConnections(page)
    expect(connections).toHaveLength(1)

    // Different type (a -> b with supports) IS allowed — it's not a duplicate
    await dispatchStore(page, 'createConnection', ['a', 'b', 'supports'])
    connections = await getConnections(page)
    expect(connections).toHaveLength(2)
  })

  test('removeConnection removes the connection and clears selection if selected', async ({ page }) => {
    const defaultTypes = await page.evaluate(() =>
      window.__orgChartTest!.createDefaultConnectorTypes(),
    )
    await dispatchStore(page, 'loadDiagram', [{
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
        { id: 'b', name: 'Bob', title: 'CTO', reportsTo: 'a', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
      ],
      connections: [],
      connectorTypes: defaultTypes,
      legend: { position: 'bottom-right' },
    }])
    await dispatchStore(page, 'createConnection', ['a', 'b', 'dotted-line'])
    const connections = await getConnections(page)
    expect(connections).toHaveLength(1)
    const connId = connections[0].id

    await dispatchStore(page, 'selectConnection', [connId])
    await dispatchStore(page, 'removeConnection', [connId])

    expect(await getConnections(page)).toHaveLength(0)
  })

  test('deleting a node cascades to orphan connections', async ({ page }) => {
    // Load a 3-node setup, then create a connection between 2 of them
    const defaultTypes = await page.evaluate(() =>
      window.__orgChartTest!.createDefaultConnectorTypes(),
    )
    await dispatchStore(page, 'loadDiagram', [{
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
        { id: 'b', name: 'Bob', title: 'CTO', reportsTo: 'a', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
        { id: 'c', name: 'Carol', title: 'CFO', reportsTo: 'a', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
      ],
      connections: [],
      connectorTypes: defaultTypes,
      legend: { position: 'bottom-right' },
    }])
    await dispatchStore(page, 'createConnection', ['b', 'c', 'supports'])
    expect(await getConnections(page)).toHaveLength(1)

    // Delete node 'c' (non-root) — its inbound connection should be swept
    await dispatchStore(page, 'removeNode', ['c'])
    expect(await getConnections(page)).toHaveLength(0)
    expect(await getNodes(page)).toHaveLength(2)
  })
})

test.describe('Org Chart — Typed Connectors (Connector Types editing)', () => {
  test('updateConnectorType changes label and color', async ({ page }) => {
    await dispatchStore(page, 'updateConnectorType', ['dotted-line', { label: 'Functional', color: '#ff00ff' }])
    const types = await getConnectorTypes(page)
    const dottedLine = types.find(t => t.id === 'dotted-line')
    expect(dottedLine?.label).toBe('Functional')
    expect(dottedLine?.color).toBe('#ff00ff')
  })

  test('resetConnectorType reverts a single type to defaults', async ({ page }) => {
    await dispatchStore(page, 'updateConnectorType', ['primary', { label: 'Line Manager', color: '#000000' }])
    await dispatchStore(page, 'resetConnectorType', ['primary'])
    const types = await getConnectorTypes(page)
    const primary = types.find(t => t.id === 'primary')
    expect(primary?.label).toBe('Reports to')
    // Default is #9ca3af per types.ts (tailwind gray-400)
    expect(primary?.color).toBe('#9ca3af')
  })

  test('resetAllConnectorTypes reverts every type', async ({ page }) => {
    await dispatchStore(page, 'updateConnectorType', ['primary', { label: 'X' }])
    await dispatchStore(page, 'updateConnectorType', ['dotted-line', { label: 'Y' }])
    await dispatchStore(page, 'resetAllConnectorTypes', [])
    const types = await getConnectorTypes(page)
    expect(types.find(t => t.id === 'primary')?.label).toBe('Reports to')
    expect(types.find(t => t.id === 'dotted-line')?.label).toBe('Dotted-line')
  })
})

test.describe('Org Chart — Typed Connectors (legend position)', () => {
  test('setLegendPosition cycles through all 4 corners', async ({ page }) => {
    const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
      'top-left', 'top-right', 'bottom-left', 'bottom-right',
    ]
    for (const pos of positions) {
      await dispatchStore(page, 'setLegendPosition', [pos])
      expect(await getLegendPosition(page)).toBe(pos)
    }
  })
})

test.describe('Org Chart — Typed Connectors (JSON round-trip)', () => {
  test('importJSON backward compat accepts old {nodes}-only file', async ({ page }) => {
    const oldFormat = JSON.stringify({
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0 },
        { id: 'b', name: 'Bob', title: 'CTO', reportsTo: 'a', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0 },
      ],
    })

    const result = await page.evaluate((raw) => {
      return window.__orgChartTest!.importJSON(raw)
    }, oldFormat)

    expect(result.nodes).toHaveLength(2)
    expect(result.connections).toEqual([])
    expect(result.connectorTypes).toHaveLength(4)
    expect(result.legend.position).toBe('bottom-right')
  })

  test('importJSON sweeps orphan connections', async ({ page }) => {
    const withOrphan = JSON.stringify({
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
      ],
      connections: [
        { id: 'c1', fromId: 'a', toId: 'missing-target', typeId: 'dotted-line' },
        { id: 'c2', fromId: 'nonexistent', toId: 'a', typeId: 'supports' },
      ],
    })

    const result = await page.evaluate((raw) => {
      return window.__orgChartTest!.importJSON(raw)
    }, withOrphan)

    expect(result.connections).toHaveLength(0)
  })

  test('importJSON preserves renamed connector types and legend position', async ({ page }) => {
    const customized = JSON.stringify({
      nodes: [
        { id: 'a', name: 'Alice', title: 'CEO', reportsTo: '', department: '', email: '', phone: '', location: '', imageDataUrl: null, nodeColor: '#14B8A6', offsetX: 0, offsetY: 0, sectionTitle: '' },
      ],
      connections: [],
      connectorTypes: [
        { id: 'primary', label: 'Manager', color: '#abcdef', style: 'solid', lineWidth: 1.5 },
        { id: 'dotted-line', label: 'Functional', color: '#123456', style: 'dashed', lineWidth: 1.75 },
        { id: 'supports', label: 'Helper', color: '#fedcba', style: 'dotted', lineWidth: 1.75 },
        { id: 'collaborates', label: 'Peer', color: '#654321', style: 'double', lineWidth: 2 },
      ],
      legend: { position: 'top-left' },
    })

    const result = await page.evaluate((raw) => {
      return window.__orgChartTest!.importJSON(raw)
    }, customized)

    const primary = result.connectorTypes.find(t => t.id === 'primary')
    expect(primary?.label).toBe('Manager')
    expect(primary?.color).toBe('#abcdef')
    expect(result.legend.position).toBe('top-left')
  })

  test('importJSON rejects invalid legend position and falls back to default', async ({ page }) => {
    const invalid = JSON.stringify({
      nodes: [{ id: 'a', name: 'Alice', reportsTo: '' }],
      legend: { position: 'middle' },
    })
    const result = await page.evaluate((raw) => {
      return window.__orgChartTest!.importJSON(raw)
    }, invalid)
    expect(result.legend.position).toBe('bottom-right')
  })
})

test.describe('Org Chart — Typed Connectors (Matrix template)', () => {
  test('Matrix Organization template loads 8 nodes and 3 connections', async ({ page }) => {
    // data-testid selectors + auto-retry assertions (no hardcoded waits)
    await page.getByTestId('org-chart-templates-btn').click()
    const matrixCard = page.getByTestId('template-matrix-organization')
    await expect(matrixCard).toBeVisible()
    await matrixCard.click()

    // Wait for the store to reflect the template load via auto-retry
    await expect.poll(() => getNodes(page).then(n => n.length)).toBe(8)

    const nodes = await getNodes(page)
    const connections = await getConnections(page)
    expect(nodes).toHaveLength(8)
    expect(connections).toHaveLength(3)

    // All 3 non-primary types should be represented
    const typeIds = connections.map(c => c.typeId).sort()
    expect(typeIds).toEqual(['collaborates', 'dotted-line', 'supports'])
  })
})
