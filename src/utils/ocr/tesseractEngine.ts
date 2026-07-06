import Tesseract from 'tesseract.js'
import type { OcrProgress, OcrTextResult } from './types'
import { tesseractBlocksToWords } from './tesseractBlocks.ts'
export { tesseractBlocksToWords } from './tesseractBlocks.ts'

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
