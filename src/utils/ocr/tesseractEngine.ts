import Tesseract from 'tesseract.js'
import type { OcrProgress, OcrTextResult, OcrWord } from './types'

interface TesseractWordLike {
  text?: string
  confidence?: number
  bbox?: { x0: number; y0: number; x1: number; y1: number }
}

interface TesseractLineLike {
  words?: TesseractWordLike[]
}

interface TesseractParagraphLike {
  lines?: TesseractLineLike[]
}

interface TesseractBlockLike {
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

export async function recognizeCanvasWithTesseract(
  canvas: HTMLCanvasElement,
  language: string,
  pageNumber: number,
  renderScale: number,
  options: {
    rectangle?: { left: number; top: number; width: number; height: number }
    onProgress?: (progress: OcrProgress) => void
  } = {},
): Promise<OcrTextResult> {
  const worker = await Tesseract.createWorker(language, undefined, {
    logger: (message: { status: string; progress?: number }) => {
      if (message.status === 'recognizing text') {
        options.onProgress?.({ status: message.status, progress: message.progress ?? 0 })
      }
    },
  })

  try {
    const result = await worker.recognize(
      canvas,
      options.rectangle ? { rectangle: options.rectangle } : {},
      { blocks: true, text: true },
    )

    return {
      text: (result.data.text ?? '').trim(),
      words: tesseractBlocksToWords(result.data.blocks, renderScale, pageNumber),
    }
  } finally {
    await worker.terminate()
  }
}
