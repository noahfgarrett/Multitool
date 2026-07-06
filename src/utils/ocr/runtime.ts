import type { OcrProgress, OcrTextResult } from './types.ts'
import type { TesseractBlockLike } from './tesseractBlocks.ts'
export { tesseractBlocksToWords } from './tesseractBlocks.ts'

export const OCR_UNAVAILABLE_MESSAGE = 'OCR is not bundled in this Multitool build.'

export interface TesseractWorkerLike {
  recognize(
    image: HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ): Promise<{ data: { text?: string; blocks?: readonly TesseractBlockLike[] | null } }>
  terminate(): Promise<unknown>
}

export function isBundledOcrAvailable(): boolean {
  return true
}

export async function createTesseractWorker(language = 'eng'): Promise<TesseractWorkerLike> {
  const { default: Tesseract } = await import('tesseract.js')
  return Tesseract.createWorker(language) as Promise<TesseractWorkerLike>
}

export async function recognizeCanvasWithPaddle(
  canvas: HTMLCanvasElement,
  pageNumber: number,
  renderScale: number,
  options: {
    offset?: { x: number; y: number }
    onProgress?: (progress: OcrProgress) => void
  } = {},
): Promise<OcrTextResult> {
  const { recognizeCanvasWithPaddle: recognize } = await import('./paddleEngine.ts')
  return recognize(canvas, pageNumber, renderScale, options)
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
  const { recognizeCanvasWithTesseract: recognize } = await import('./tesseractEngine.ts')
  return recognize(canvas, language, pageNumber, renderScale, options)
}
