import type { OcrWord } from './types.ts'

export interface TesseractWordLike {
  text?: string
  confidence?: number
  bbox?: { x0: number; y0: number; x1: number; y1: number }
}

export interface TesseractLineLike {
  words?: TesseractWordLike[]
}

export interface TesseractParagraphLike {
  lines?: TesseractLineLike[]
}

export interface TesseractBlockLike {
  paragraphs?: TesseractParagraphLike[]
}

export function tesseractBlocksToWords(
  blocks: readonly TesseractBlockLike[] | null | undefined,
  renderScale: number,
  pageNumber: number,
): OcrWord[] {
  const words: OcrWord[] = []
  if (!blocks || renderScale <= 0) return words

  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = word.text?.trim() ?? ''
          const bbox = word.bbox
          if (!text || !bbox) continue
          words.push({
            text,
            confidence: word.confidence,
            x: bbox.x0 / renderScale,
            y: bbox.y0 / renderScale,
            width: (bbox.x1 - bbox.x0) / renderScale,
            height: (bbox.y1 - bbox.y0) / renderScale,
            page: pageNumber,
          })
        }
      }
    }
  }

  return words
}
