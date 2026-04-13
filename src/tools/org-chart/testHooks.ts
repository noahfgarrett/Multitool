// Dev-only test hooks. Exposed on window.__orgChartTest when running under Vite dev.
// Playwright e2e tests call into these via page.evaluate() to test pure functions
// without needing a unit test framework.
//
// IMPORTANT: import.meta.env.DEV is true only in `npm run dev`. Production builds
// (dist/Multitool.html) do not include these hooks, so there is no runtime cost
// or namespace pollution for end users.

import {
  createDefaultConnectorTypes,
  createDefaultLegend,
  mergeWithDefaults,
  getConnectorType,
} from './types.ts'
import {
  getDashPattern,
  routeSecondaryEdge,
  hitTestPath,
} from './connectorStyle.ts'
import { importJSON } from './export.ts'

// Live getter for the current store reference. Updated from OrgChartTool on
// mount (and on every render via the effect dep array) so that e2e tests can
// always read the latest store snapshot without caching staleness.
let storeGetter: (() => unknown) | null = null

interface OrgChartTestHooks {
  createDefaultConnectorTypes: typeof createDefaultConnectorTypes
  createDefaultLegend: typeof createDefaultLegend
  mergeWithDefaults: typeof mergeWithDefaults
  getConnectorType: typeof getConnectorType
  getDashPattern: typeof getDashPattern
  routeSecondaryEdge: typeof routeSecondaryEdge
  hitTestPath: typeof hitTestPath
  importJSON: typeof importJSON
  getStore: () => unknown
}

declare global {
  interface Window {
    __orgChartTest?: OrgChartTestHooks
  }
}

export function installTestHooks(): void {
  if (!import.meta.env.DEV) return
  if (window.__orgChartTest) return  // idempotent
  window.__orgChartTest = {
    createDefaultConnectorTypes,
    createDefaultLegend,
    mergeWithDefaults,
    getConnectorType,
    getDashPattern,
    routeSecondaryEdge,
    hitTestPath,
    importJSON,
    getStore: () => (storeGetter ? storeGetter() : null),
  }
}

export function registerStore(getter: () => unknown): void {
  if (!import.meta.env.DEV) return
  storeGetter = getter
}
