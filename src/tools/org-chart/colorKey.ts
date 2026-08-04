import type { ColorKeyEntry, OrgNode } from './types.ts'
import { genId } from './types.ts'

const COLOR_NAMES: Record<string, string> = {
  '#3b82f6': 'Blue',
  '#22c55e': 'Green',
  '#f59e0b': 'Amber',
  '#8b5cf6': 'Purple',
  '#ec4899': 'Pink',
  '#f97316': 'Orange',
  '#06b6d4': 'Cyan',
  '#6366f1': 'Indigo',
  '#14b8a6': 'Teal',
}

export function buildColorKeyEntriesFromNodes(nodes: OrgNode[]): ColorKeyEntry[] {
  const entries: ColorKeyEntry[] = []
  const seen = new Set<string>()
  for (const node of nodes) {
    const color = node.nodeColor.toLowerCase()
    if (seen.has(color)) continue
    seen.add(color)
    const department = nodes.find(candidate =>
      candidate.nodeColor.toLowerCase() === color && candidate.department.trim(),
    )?.department.trim()
    entries.push({
      id: genId(),
      color,
      label: department || COLOR_NAMES[color] || color.toUpperCase(),
    })
  }
  return entries.slice(0, 20)
}
