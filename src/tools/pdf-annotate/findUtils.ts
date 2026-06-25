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
    for (const item of items) {
      const text = caseSensitive ? item.text : item.text.toLowerCase()
      const idx = text.indexOf(q)
      if (idx === -1) continue
      const charCount = text.length || 1
      matches.push({
        pageNum,
        item,
        matchX: item.x + (idx / charCount) * item.width,
        matchW: (q.length / charCount) * item.width,
      })
    }
  }

  matches.sort((a, b) => a.pageNum - b.pageNum || a.item.y - b.item.y)
  return matches
}
