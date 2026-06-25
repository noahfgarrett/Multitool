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

    words.push({
      text,
      confidence: normalizeConfidence(item.score),
      x: offset.x + minX / renderScale,
      y: offset.y + minY / renderScale,
      width: (maxX - minX) / renderScale,
      height: (maxY - minY) / renderScale,
      page: pageNumber,
    })
  }

  return words
}
