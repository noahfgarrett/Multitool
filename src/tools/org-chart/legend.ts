import type { Connection, ConnectorType, LegendConfig, OrgNode } from './types.ts'
import { getConnectorType, getNodeConnectorTypeId } from './types.ts'

export interface DepartmentLegendItem {
  label: string
  color: string
}

export interface LegendContent {
  relationships: ConnectorType[]
  departments: DepartmentLegendItem[]
}

interface LegendSource {
  nodes: OrgNode[]
  connections: Connection[]
  connectorTypes: ConnectorType[]
  legend: LegendConfig
}

export function buildLegendContent(source: LegendSource): LegendContent {
  if (!source.legend.visible) return { relationships: [], departments: [] }

  const relationships: ConnectorType[] = []
  if (source.legend.showRelationships) {
    const usedIds = new Set(source.connections.map(connection => connection.typeId))
    for (const node of source.nodes) {
      if (node.reportsTo) usedIds.add(getNodeConnectorTypeId(node))
    }
    for (const type of source.connectorTypes) {
      if (usedIds.has(type.id)) relationships.push(getConnectorType(source.connectorTypes, type.id))
    }
  }

  const departments: DepartmentLegendItem[] = []
  if (source.legend.showDepartments) {
    const seen = new Set<string>()
    for (const node of source.nodes) {
      const label = node.department.trim()
      if (!label || seen.has(label.toLocaleLowerCase())) continue
      seen.add(label.toLocaleLowerCase())
      departments.push({ label, color: node.nodeColor })
    }
  }

  return { relationships, departments }
}

export function readableForeground(background: string): '#1a1a24' | '#ffffff' {
  return relativeLuminance(background) > 0.42 ? '#1a1a24' : '#ffffff'
}

export function ensureVisibleConnectorType(
  type: ConnectorType,
  background: string,
): ConnectorType {
  const color = ensureVisibleColor(type.color, background)
  return color === type.color ? type : { ...type, color }
}

export function ensureVisibleColor(color: string, background: string, minimumRatio = 3): string {
  if (contrastRatio(color, background) >= minimumRatio) return color
  const target = readableForeground(background)
  const from = hexToRgb(color)
  const to = hexToRgb(target)
  if (!from || !to) return target

  for (let step = 1; step <= 10; step++) {
    const amount = step / 10
    const candidate = rgbToHex({
      r: Math.round(from.r + (to.r - from.r) * amount),
      g: Math.round(from.g + (to.g - from.g) * amount),
      b: Math.round(from.b + (to.b - from.b) * amount),
    })
    if (contrastRatio(candidate, background) >= minimumRatio) return candidate
  }
  return target
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

interface RGB { r: number; g: number; b: number }

function hexToRgb(value: string): RGB | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value)
  if (!match) return null
  const numeric = Number.parseInt(match[1], 16)
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  }
}

function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

function relativeLuminance(color: string): number {
  const rgb = hexToRgb(color)
  if (!rgb) return 0
  const channels = [rgb.r, rgb.g, rgb.b].map(channel => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
