import type { OcrWord } from './types.ts'

export interface PaddleOcrResultItem {
  text?: string
  score?: number
  poly?: readonly (readonly [number, number])[]
}

export interface PaddleCoordinateOffset {
  x: number
  y: number
}

function normalizeConfidence(score: number | undefined): number | undefined {
  if (score === undefined || !Number.isFinite(score)) return undefined
  return score >= 0 && score <= 1 ? score * 100 : score
}

function getTokenRanges(text: string): { text: string; start: number; end: number }[] {
  const ranges: { text: string; start: number; end: number }[] = []
  const tokenPattern = /\S+/g
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(text)) !== null) {
    ranges.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return ranges
}

export function paddleItemsToWords(
  items: readonly PaddleOcrResultItem[],
  renderScale: number,
  pageNumber: number,
  offset: PaddleCoordinateOffset = { x: 0, y: 0 },
): OcrWord[] {
  if (renderScale <= 0) return []

  const words: OcrWord[] = []
  for (const item of items) {
    const text = item.text?.trim() ?? ''
    const points = item.poly
    if (!text || !points || points.length === 0) continue

    const xs = points.map(point => point[0]).filter(Number.isFinite)
    const ys = points.map(point => point[1]).filter(Number.isFinite)
    if (xs.length === 0 || ys.length === 0) continue

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    if (maxX <= minX || maxY <= minY) continue

    const confidence = normalizeConfidence(item.score)
    const tokens = getTokenRanges(text)
    const wordRanges = tokens.length > 1 ? tokens : [{ text, start: 0, end: text.length }]
    const boxWidth = maxX - minX

    for (const token of wordRanges) {
      const startRatio = token.start / text.length
      const endRatio = token.end / text.length
      words.push({
        text: token.text,
        confidence,
        x: offset.x + (minX + boxWidth * startRatio) / renderScale,
        y: offset.y + minY / renderScale,
        width: (boxWidth * (endRatio - startRatio)) / renderScale,
        height: (maxY - minY) / renderScale,
        page: pageNumber,
      })
    }
  }

  return words
}
