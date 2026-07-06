import type { OcrProgress, OcrTextResult } from './types.ts'
export { tesseractBlocksToWords } from './tesseractBlocks.ts'
export type { TesseractWorkerLike } from './runtime.ts'

export const OCR_UNAVAILABLE_MESSAGE = 'OCR is available in the full downloaded HTML version. The GitHub Pages app keeps OCR out of the PWA bundle.'

export function isBundledOcrAvailable(): boolean {
  return false
}

function rejectOcr(): Promise<never> {
  return Promise.reject(new Error(OCR_UNAVAILABLE_MESSAGE))
}

export function createTesseractWorker(): Promise<never> {
  return rejectOcr()
}

export function recognizeCanvasWithPaddle(
  _canvas: HTMLCanvasElement,
  _pageNumber: number,
  _renderScale: number,
  _options: {
    offset?: { x: number; y: number }
    onProgress?: (progress: OcrProgress) => void
  } = {},
): Promise<OcrTextResult> {
  return rejectOcr()
}

export function recognizeCanvasWithTesseract(
  _canvas: HTMLCanvasElement,
  _language: string,
  _pageNumber: number,
  _renderScale: number,
  _options: {
    rectangle?: { left: number; top: number; width: number; height: number }
    onProgress?: (progress: OcrProgress) => void
  } = {},
): Promise<OcrTextResult> {
  return rejectOcr()
}
