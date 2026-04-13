import { test, expect } from '@playwright/test'
import { navigateToTool } from '../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
})

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
    expect(result[0].color).toBe('#272730')  // fell back to default
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
