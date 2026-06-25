import { saveBlob } from './download.ts'
import type { UpdateInfo } from './updateChecker.ts'

interface SaveUpdateFile {
  (blob: Blob, filename: string, mimeType?: string): Promise<void> | void
}

interface UpdateDownloadDeps {
  fetchImpl?: typeof fetch
  saveImpl?: SaveUpdateFile
  decompressImpl?: (blob: Blob) => Promise<Blob>
}

export interface UpdateDownloadResult {
  downloadedAssetName: string
  savedFilename: string
  usedCompressedAsset: boolean
}

type DecompressionStreamCtor = new (format: 'gzip') => TransformStream<Uint8Array, Uint8Array>

function getHtmlFilename(assetName: string, fallbackAssetName?: string): string {
  if (fallbackAssetName) return fallbackAssetName
  return assetName.toLowerCase().endsWith('.gz') ? assetName.slice(0, -3) : assetName
}

function getDecompressionStream(): DecompressionStreamCtor | undefined {
  return (globalThis as { DecompressionStream?: DecompressionStreamCtor }).DecompressionStream
}

export function canDecompressGzipInBrowser(): boolean {
  return typeof getDecompressionStream() === 'function'
}

export async function decompressGzipHtml(blob: Blob): Promise<Blob> {
  const DecompressionStream = getDecompressionStream()
  if (!DecompressionStream) {
    throw new Error('This browser cannot decompress gzip updates.')
  }

  const decompressed = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  const htmlBlob = await new Response(decompressed).blob()
  return new Blob([htmlBlob], { type: 'text/html' })
}

async function fetchGitHubAssetBlob(assetApiUrl: string, fetchImpl: typeof fetch): Promise<Blob> {
  const response = await fetchImpl(assetApiUrl, {
    headers: { Accept: 'application/octet-stream' },
  })
  if (!response.ok) {
    throw new Error(`Update download failed: HTTP ${String(response.status)}`)
  }
  return response.blob()
}

export async function downloadUpdateFile(
  info: UpdateInfo,
  deps: UpdateDownloadDeps = {},
): Promise<UpdateDownloadResult> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const saveImpl = deps.saveImpl ?? saveBlob
  const decompressImpl = deps.decompressImpl ?? decompressGzipHtml

  if (info.downloadKind === 'gzip-html' && canDecompressGzipInBrowser()) {
    try {
      const compressedBlob = await fetchGitHubAssetBlob(info.assetApiUrl, fetchImpl)
      const htmlBlob = await decompressImpl(compressedBlob)
      const filename = getHtmlFilename(info.assetName, info.fallbackAssetName)
      await saveImpl(htmlBlob, filename, 'text/html')
      return {
        downloadedAssetName: info.assetName,
        savedFilename: filename,
        usedCompressedAsset: true,
      }
    } catch {
      // Fall through to the plain HTML asset if the compressed path fails.
    }
  }

  const fallbackAssetApiUrl = info.downloadKind === 'gzip-html'
    ? info.fallbackAssetApiUrl
    : info.assetApiUrl
  const fallbackAssetName = info.downloadKind === 'gzip-html'
    ? info.fallbackAssetName
    : info.assetName

  if (!fallbackAssetApiUrl || !fallbackAssetName) {
    throw new Error('No compatible update asset is available.')
  }

  const htmlBlob = await fetchGitHubAssetBlob(fallbackAssetApiUrl, fetchImpl)
  await saveImpl(new Blob([htmlBlob], { type: 'text/html' }), fallbackAssetName, 'text/html')
  return {
    downloadedAssetName: fallbackAssetName,
    savedFilename: fallbackAssetName,
    usedCompressedAsset: false,
  }
}
