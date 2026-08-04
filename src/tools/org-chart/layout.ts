import type { LayoutDirection, LayoutNode, OrgNode } from './types.ts'
import {
  H_SPACING,
  NODE_HEIGHT,
  NODE_WIDTH,
  SECTION_GAP,
  SECTION_TITLE_HEIGHT,
  V_SPACING,
} from './types.ts'

export interface OrgChartLayout {
  trees: LayoutNode[]
  flat: LayoutNode[]
  byId: Map<string, LayoutNode>
}

export function buildOrgChartLayout(
  nodes: OrgNode[],
  direction: LayoutDirection,
): OrgChartLayout {
  const roots = nodes.filter(node => !node.reportsTo)
  if (roots.length === 0) return { trees: [], flat: [], byId: new Map() }

  const childMap = new Map<string, OrgNode[]>()
  for (const node of nodes) {
    if (!node.reportsTo) continue
    const children = childMap.get(node.reportsTo) ?? []
    children.push(node)
    childMap.set(node.reportsTo, children)
  }

  const buildSubtree = (node: OrgNode, ancestors: Set<string>): LayoutNode => {
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(node.id)
    const children = (childMap.get(node.id) ?? [])
      .filter(child => !nextAncestors.has(child.id))
      .map(child => buildSubtree(child, nextAncestors))
    return { ...node, x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT, children }
  }

  const trees: LayoutNode[] = []
  let sectionOffset = 0

  for (const root of roots) {
    const tree = buildSubtree(root, new Set())
    const titleOffset = root.sectionTitle ? SECTION_TITLE_HEIGHT : 0

    if (direction === 'top-down') {
      const treeWidth = layoutTopDown(tree, 0)
      shiftX(tree, sectionOffset)
      if (titleOffset > 0) shiftY(tree, titleOffset)
      sectionOffset += treeWidth + SECTION_GAP
    } else {
      layoutLeftRight(tree, 0)
      shiftY(tree, sectionOffset + titleOffset)
      sectionOffset += getTreeHeight(tree) + SECTION_GAP
    }
    trees.push(tree)
  }

  const flat: LayoutNode[] = []
  for (const tree of trees) flattenInto(tree, flat)
  for (const node of flat) {
    node.x += node.offsetX
    node.y += node.offsetY
  }

  return {
    trees,
    flat,
    byId: new Map(flat.map(node => [node.id, node])),
  }
}

export function getSectionNodes(root: LayoutNode, flat: LayoutNode[]): LayoutNode[] {
  const ids = new Set<string>([root.id])
  for (const node of flat) {
    if (ids.has(node.reportsTo)) ids.add(node.id)
  }
  return flat.filter(node => ids.has(node.id))
}

function layoutTopDown(node: LayoutNode, depth: number): number {
  node.y = depth * (NODE_HEIGHT + V_SPACING)
  if (node.children.length === 0) {
    node.x = 0
    return NODE_WIDTH
  }

  let totalWidth = 0
  const childWidths: number[] = []
  for (const child of node.children) {
    const width = layoutTopDown(child, depth + 1)
    childWidths.push(width)
    totalWidth += width
  }
  totalWidth += (node.children.length - 1) * H_SPACING

  let offset = 0
  for (let index = 0; index < node.children.length; index++) {
    shiftX(node.children[index], offset)
    offset += childWidths[index] + H_SPACING
  }

  const first = node.children[0]
  const last = node.children[node.children.length - 1]
  node.x = (first.x + last.x + last.width) / 2 - NODE_WIDTH / 2
  return Math.max(NODE_WIDTH, totalWidth)
}

function layoutLeftRight(node: LayoutNode, depth: number): number {
  node.x = depth * (NODE_WIDTH + H_SPACING)
  if (node.children.length === 0) {
    node.y = 0
    return NODE_HEIGHT
  }

  let totalHeight = 0
  const childHeights: number[] = []
  for (const child of node.children) {
    const height = layoutLeftRight(child, depth + 1)
    childHeights.push(height)
    totalHeight += height
  }
  totalHeight += (node.children.length - 1) * V_SPACING / 2

  let offset = 0
  for (let index = 0; index < node.children.length; index++) {
    shiftY(node.children[index], offset)
    offset += childHeights[index] + V_SPACING / 2
  }

  const first = node.children[0]
  const last = node.children[node.children.length - 1]
  node.y = (first.y + last.y + last.height) / 2 - NODE_HEIGHT / 2
  return Math.max(NODE_HEIGHT, totalHeight)
}

function getTreeHeight(node: LayoutNode): number {
  let minY = node.y
  let maxY = node.y + node.height
  const stack = [...node.children]
  while (stack.length > 0) {
    const current = stack.pop()!
    minY = Math.min(minY, current.y)
    maxY = Math.max(maxY, current.y + current.height)
    stack.push(...current.children)
  }
  return maxY - minY
}

function shiftX(node: LayoutNode, amount: number): void {
  node.x += amount
  for (const child of node.children) shiftX(child, amount)
}

function shiftY(node: LayoutNode, amount: number): void {
  node.y += amount
  for (const child of node.children) shiftY(child, amount)
}

function flattenInto(node: LayoutNode, target: LayoutNode[]): void {
  target.push(node)
  for (const child of node.children) flattenInto(child, target)
}
