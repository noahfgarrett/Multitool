import type { OcrProgress, OcrTextResult } from './types.ts'
import { paddleItemsToWords } from './paddleResult.ts'
import detModelUrl from './assets/PP-OCRv6_small_det_onnx_infer.tar?url'
import recModelUrl from './assets/PP-OCRv6_small_rec_onnx_infer.tar?url'
import ortWasmUrl from './assets/ort-wasm-simd-threaded.wasm?url'
import type { PaddleOCRCreateOptions, OcrResult } from '@paddleocr/paddleocr-js'

const PADDLE_DET_MODEL_NAME = 'PP-OCRv6_small_det'
const PADDLE_REC_MODEL_NAME = 'PP-OCRv6_small_rec'
const PADDLE_DET_ASSET_URL = `multitool://ocr/${PADDLE_DET_MODEL_NAME}.tar`
const PADDLE_REC_ASSET_URL = `multitool://ocr/${PADDLE_REC_MODEL_NAME}.tar`

type PaddleOcrInstance = {
  initialize(): Promise<unknown>
  predict(input: unknown, params?: Record<string, unknown>): Promise<OcrResult[]>
  dispose(): Promise<void>
}

type PatchablePaddleInstance = PaddleOcrInstance & {
  ensureServedFromHttp?: () => void
}

let configureOrtPromise: Promise<void> | null = null
let paddlePromise: Promise<PaddleOcrInstance> | null = null

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

async function cloneBundledAssetResponse(sourceUrl: string): Promise<Response> {
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Bundled OCR asset failed to load: HTTP ${String(response.status)}`)
  }
  const body = await response.arrayBuffer()
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/x-tar' },
  })
}

async function fetchBundledPaddleAsset(input: RequestInfo | URL): Promise<Response> {
  const url = requestUrl(input)
  if (url === PADDLE_DET_ASSET_URL) return cloneBundledAssetResponse(detModelUrl)
  if (url === PADDLE_REC_ASSET_URL) return cloneBundledAssetResponse(recModelUrl)
  throw new Error(`Blocked external OCR asset request: ${url}`)
}

async function configureOnnxRuntime(): Promise<void> {
  if (!configureOrtPromise) {
    configureOrtPromise = (async () => {
      const ort = await import('onnxruntime-web')
      ort.env.wasm.wasmPaths = { wasm: ortWasmUrl }
      ort.env.wasm.numThreads = 1
      ort.env.wasm.simd = true
      ort.env.wasm.proxy = false
    })()
  }
  return configureOrtPromise
}

async function createPaddleOcr(): Promise<PaddleOcrInstance> {
  await configureOnnxRuntime()

  const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
  const options: PaddleOCRCreateOptions = {
    worker: false,
    initialize: false,
    fetch: fetchBundledPaddleAsset,
    ortOptions: {
      backend: 'wasm',
      numThreads: 1,
      simd: true,
      proxy: false,
    },
    textDetectionModelName: PADDLE_DET_MODEL_NAME,
    textDetectionModelAsset: { url: PADDLE_DET_ASSET_URL },
    textRecognitionModelName: PADDLE_REC_MODEL_NAME,
    textRecognitionModelAsset: { url: PADDLE_REC_ASSET_URL },
  }

  const ocr = await PaddleOCR.create(options) as PatchablePaddleInstance
  // PaddleOCR.js guards file:// by default because it expects URL model fetches.
  // Multitool provides those assets from bundled data URLs, so the guard is not needed.
  ocr.ensureServedFromHttp = () => {}
  await ocr.initialize()
  return ocr
}

export function resetPaddleOcrForTests(): void {
  paddlePromise = null
  configureOrtPromise = null
}

export async function disposePaddleOcr(): Promise<void> {
  const ocr = await paddlePromise?.catch(() => null)
  paddlePromise = null
  if (ocr) await ocr.dispose()
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
  options.onProgress?.({ status: 'initializing OCR', progress: 0.15 })
  if (!paddlePromise) paddlePromise = createPaddleOcr()
  const ocr = await paddlePromise

  options.onProgress?.({ status: 'recognizing text', progress: 0.55 })
  const [result] = await ocr.predict(canvas)
  const items = result?.items ?? []
  const words = paddleItemsToWords(items, renderScale, pageNumber, options.offset)
  options.onProgress?.({ status: 'recognizing text', progress: 1 })

  return {
    text: words.map(word => word.text).join('\n').trim(),
    words,
  }
}
