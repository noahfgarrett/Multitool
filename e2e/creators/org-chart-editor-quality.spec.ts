import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { navigateToTool } from '../helpers/navigation'

async function setup(page: Page): Promise<void> {
  await page.goto('/')
  await navigateToTool(page, 'org-chart')
  await expect(page.locator('button[title="Undo (Ctrl+Z)"]')).toBeVisible()
  await page.waitForFunction(() => Boolean(window.__orgChartTest?.getStore?.()))
  await page.waitForFunction(() => {
    const store = window.__orgChartTest?.getStore?.() as { isHydrated?: boolean } | undefined
    return store?.isHydrated === true
  })
}

async function loadMultiDepartmentTemplate(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Templates/ }).click()
  await page.getByRole('button', { name: /Multi-Department/ }).click()
  await expect(page.locator('[data-testid="org-chart-legend"]')).toBeVisible()
}

test.describe('Org Chart editor quality pass', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
  })

  test('live legend explains relationships and department colors', async ({ page }) => {
    await loadMultiDepartmentTemplate(page)

    const legend = page.locator('[data-testid="org-chart-legend"]')
    await expect(legend.getByText('Relationships')).toBeVisible()
    await expect(legend.getByText('Reports to')).toBeVisible()
    await expect(legend.getByText('Departments')).toBeVisible()
    await expect(legend.getByText('Engineering')).toBeVisible()
    await expect(legend.getByText('Operations')).toBeVisible()

    await page.locator('[data-testid="legend-position-chip"]').click()
    await page.locator('[data-testid="legend-position-grid"]').getByLabel('Departments').uncheck()
    await expect(legend.getByText('Departments')).not.toBeVisible()
    await expect(legend.getByText('Relationships')).toBeVisible()
  })

  test('background, layout, and legend settings autosave across reload', async ({ page }) => {
    await loadMultiDepartmentTemplate(page)
    await page.locator('[data-testid="org-chart-background-color"] > button').click()
    await page.getByRole('button', { name: 'Use background #ffffff' }).click()
    await page.locator('button[title^="Layout:"]').click()
    await page.locator('[data-testid="legend-position-chip"]').click()
    await page.locator('[data-testid="legend-position-grid"]').getByLabel('Relationships').uncheck()

    await page.waitForFunction(() => {
      const store = window.__orgChartTest?.getStore?.() as {
        autosaveStatus?: string
        background?: { color?: string }
        layoutDirection?: string
      } | undefined
      return store?.autosaveStatus === 'saved'
        && store.background?.color === '#ffffff'
        && store.layoutDirection === 'left-right'
    })

    await page.reload()
    await navigateToTool(page, 'org-chart')
    await page.waitForFunction(() => {
      const store = window.__orgChartTest?.getStore?.() as {
        isHydrated?: boolean
        background?: { color?: string }
        layoutDirection?: string
        legend?: { showRelationships?: boolean }
      } | undefined
      return store?.isHydrated === true
        && store.background?.color === '#ffffff'
        && store.layoutDirection === 'left-right'
        && store.legend?.showRelationships === false
    })

    await expect(page.locator('button[title="Layout: Left-Right"]')).toBeVisible()
    await expect(page.locator('[data-testid="org-chart-legend"]').getByText('Departments')).toBeVisible()
    await expect(page.locator('[data-testid="org-chart-legend"]').getByText('Relationships')).not.toBeVisible()
  })

  test('JSON export preserves layout and expanded legend settings', async ({ page }) => {
    await page.locator('button[title^="Layout:"]').click()
    await page.locator('[data-testid="legend-position-chip"]').click()
    await page.locator('[data-testid="legend-position-grid"]').getByLabel('Departments').uncheck()
    await page.keyboard.press('Escape')

    await page.locator('button[title="Export"]').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Save as JSON/ }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).not.toBeNull()
    const exported = JSON.parse(await readFile(path!, 'utf8')) as {
      layoutDirection?: string
      legend?: { visible?: boolean; showRelationships?: boolean; showDepartments?: boolean }
    }

    expect(exported.layoutDirection).toBe('left-right')
    expect(exported.legend).toEqual({
      position: 'bottom-right',
      visible: true,
      showRelationships: true,
      showDepartments: false,
    })
  })

  test('large charts stay interactive and expose keyboard-readable people', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))

    const elapsed = await page.evaluate(async () => {
      const store = window.__orgChartTest!.getStore!() as {
        loadDiagram: (state: unknown) => void
      }
      const makeNode = (id: string, reportsTo: string) => ({
        id,
        name: `Person ${id}`,
        title: 'Team Member',
        reportsTo,
        department: 'Engineering',
        email: '',
        phone: '',
        location: '',
        imageDataUrl: null,
        nodeColor: '#3b82f6',
        offsetX: 0,
        offsetY: 0,
        sectionTitle: '',
      })
      const nodes = [makeNode('root', '')]
      for (let index = 1; index <= 500; index++) {
        nodes.push(makeNode(`n-${index}`, index <= 20 ? 'root' : `n-${Math.floor(index / 2)}`))
      }
      const started = performance.now()
      store.loadDiagram({ nodes })
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      return performance.now() - started
    })

    expect(elapsed).toBeLessThan(2000)
    await expect(page.getByRole('application', { name: /Interactive organization chart with 501 people/ })).toBeVisible()
    await expect(page.locator('.sr-only button')).toHaveCount(501)
    await page.locator('button[title="Fit to Content"]').click()
    await page.locator('button[title="Zoom In"]').click()
    await expect(page.locator('span.tabular-nums')).not.toHaveText('0%')
    expect(errors).toEqual([])
  })

  test('background and legend popovers support keyboard dismissal and typed hex colors', async ({ page }) => {
    const backgroundPicker = page.locator('[data-testid="org-chart-background-color"]')
    await backgroundPicker.locator('> button').click()
    await expect(page.getByRole('dialog', { name: 'Chart background colors' })).toBeVisible()

    await backgroundPicker.getByRole('button', { name: '#', exact: true }).click()
    const hexInput = backgroundPicker.locator('input[type="text"]')
    await hexInput.click()
    await hexInput.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await hexInput.pressSequentially('#123456')
    await expect.poll(() => page.evaluate(() => {
      const store = window.__orgChartTest?.getStore?.() as { background?: { color?: string } } | undefined
      return store?.background?.color
    })).toBe('#123456')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Chart background colors' })).not.toBeVisible()

    await page.locator('[data-testid="legend-position-chip"]').click()
    await expect(page.locator('[data-testid="legend-position-grid"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="legend-position-grid"]')).not.toBeVisible()
  })

  test('light theme keeps every Org Chart modal readable', async ({ page }) => {
    await page.evaluate(() => {
      document.body.classList.remove('theme-night-sky', 'theme-blueprint', 'theme-clean-dark')
      document.body.classList.add('theme-light')
    })

    await page.locator('button[title="Export"]').click()
    await expect(page.getByText('Image Background')).toHaveCSS('color', 'rgba(26, 26, 26, 0.5)')
    await expect(page.getByText('Export as PNG')).toHaveCSS('color', 'rgb(26, 26, 26)')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /Templates/ }).click()
    await expect(page.getByText('Startup', { exact: true })).toHaveCSS('color', 'rgb(26, 26, 26)')
    await page.keyboard.press('Escape')

    await page.locator('[data-testid="connector-types-btn"]').click()
    await expect(page.getByText(/Rename or recolor line styles/)).toHaveCSS('color', 'rgba(26, 26, 26, 0.5)')
    await expect(page.locator('[data-testid="type-label-primary"]')).toHaveCSS('color', 'rgb(26, 26, 26)')
  })
})
