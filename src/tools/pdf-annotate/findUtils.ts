import type { FindMatch } from './usePdfAnnotateState'

export type FindTextItem = FindMatch['item']

function stableNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

export function getFindMatchKey(match: FindMatch): string {
  return [
    match.pageNum,
    match.item.text,
    stableNumber(match.item.x),
    stableNumber(match.item.y),
    stableNumber(match.item.width),
    stableNumber(match.item.height),
    stableNumber(match.matchX),
    stableNumber(match.matchW),
  ].join('|')
}

export function reconcileFindIndex(
  previousMatches: readonly FindMatch[],
  nextMatches: readonly FindMatch[],
  previousIndex: number,
): number {
  if (nextMatches.length === 0) return 0
  const previousMatch = previousMatches[previousIndex]
  if (!previousMatch) return Math.min(Math.max(previousIndex, 0), nextMatches.length - 1)

  const previousKey = getFindMatchKey(previousMatch)
  const preservedIndex = nextMatches.findIndex(match => getFindMatchKey(match) === previousKey)
  if (preservedIndex !== -1) return preservedIndex

  return Math.min(Math.max(previousIndex, 0), nextMatches.length - 1)
}

interface FindLineEntry {
  item: FindTextItem
  text: string
  start: number
  end: number
}

interface FindLine {
  y: number
  centerY: number
  items: FindTextItem[]
}

function groupItemsIntoLines(items: readonly FindTextItem[]): FindLine[] {
  const visibleItems = items
    .filter(item => item.text.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)
  if (visibleItems.length === 0) return []

  const avgHeight = visibleItems.reduce((sum, item) => sum + item.height, 0) / visibleItems.length
  const lineThreshold = Math.max(2, avgHeight * 0.65)
  const lines: FindLine[] = []

  for (const item of visibleItems) {
    const centerY = item.y + item.height / 2
    const current = lines[lines.length - 1]
    if (current && Math.abs(centerY - current.centerY) <= lineThreshold) {
      current.items.push(item)
      current.centerY = current.items.reduce((sum, lineItem) => sum + lineItem.y + lineItem.height / 2, 0) / current.items.length
      current.y = Math.min(current.y, item.y)
    } else {
      lines.push({ y: item.y, centerY, items: [item] })
    }
  }

  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
  }
  return lines
}

function buildLineText(items: readonly FindTextItem[]): { text: string; entries: FindLineEntry[] } {
  let text = ''
  const entries: FindLineEntry[] = []

  for (const item of items) {
    const itemText = item.text.trim()
    if (!itemText) continue
    if (text.length > 0) text += ' '
    const start = text.length
    text += itemText
    entries.push({ item, text: itemText, start, end: text.length })
  }

  return { text, entries }
}

function getEntryX(entry: FindLineEntry, index: number): number {
  const localIndex = Math.min(Math.max(index - entry.start, 0), entry.text.length)
  const charCount = entry.text.length || 1
  return entry.item.x + (localIndex / charCount) * entry.item.width
}

function findEntryAt(entries: readonly FindLineEntry[], index: number, direction: 'start' | 'end'): FindLineEntry | null {
  if (direction === 'end') {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (index > entry.start && index <= entry.end) return entry
    }
    return entries[entries.length - 1] ?? null
  }

  for (const entry of entries) {
    if (index >= entry.start && index < entry.end) return entry
  }
  return entries[0] ?? null
}

function makeLineMatch(pageNum: number, entries: readonly FindLineEntry[], lineText: string, start: number, queryLength: number): FindMatch | null {
  const end = start + queryLength
  const startEntry = findEntryAt(entries, start, 'start')
  const endEntry = findEntryAt(entries, end, 'end')
  if (!startEntry || !endEntry) return null

  const coveredItems = entries
    .filter(entry => end > entry.start && start < entry.end)
    .map(entry => entry.item)
  if (coveredItems.length === 0) return null

  const matchX = getEntryX(startEntry, start)
  const matchEndX = getEntryX(endEntry, end)
  const minY = Math.min(...coveredItems.map(item => item.y))
  const maxY = Math.max(...coveredItems.map(item => item.y + item.height))
  const singleItemMatch = coveredItems.length === 1

  return {
    pageNum,
    item: singleItemMatch
      ? coveredItems[0]
      : {
          text: lineText.slice(start, end),
          x: matchX,
          y: minY,
          width: Math.max(0, matchEndX - matchX),
          height: Math.max(1, maxY - minY),
          page: pageNum,
        },
    matchX,
    matchW: Math.max(0, matchEndX - matchX),
  }
}

export function findTextMatches(
  textItemsByCacheKey: Record<string, readonly FindTextItem[]>,
  query: string,
  caseSensitive: boolean,
): FindMatch[] {
  const raw = query.trim()
  if (!raw) return []

  const q = caseSensitive ? raw : raw.toLowerCase()
  const matches: FindMatch[] = []

  for (const [key, items] of Object.entries(textItemsByCacheKey)) {
    const pageNum = parseInt(key.split('_')[0])
    for (const line of groupItemsIntoLines(items)) {
      const { text, entries } = buildLineText(line.items)
      const haystack = caseSensitive ? text : text.toLowerCase()
      let searchFrom = 0
      while (searchFrom < haystack.length) {
        const idx = haystack.indexOf(q, searchFrom)
        if (idx === -1) break
        const match = makeLineMatch(pageNum, entries, text, idx, raw.length)
        if (match) matches.push(match)
        searchFrom = idx + Math.max(1, q.length)
      }
    }
  }

  matches.sort((a, b) => a.pageNum - b.pageNum || a.item.y - b.item.y || a.matchX - b.matchX)
  return matches
}
