/**
 * Typed wrapper around the File System Access API picker.
 */
interface PickerHandle {
  createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>
}
type PickerFn = (opts: {
  suggestedName: string
  types: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<PickerHandle>

/** Map common MIME types to picker filter descriptions and extensions. */
const MIME_TO_PICKER: Record<string, { description: string; extensions: string[] }> = {
  'application/pdf':  { description: 'PDF Documents', extensions: ['.pdf'] },
  'application/zip':  { description: 'ZIP Archives', extensions: ['.zip'] },
  'image/png':        { description: 'PNG Images', extensions: ['.png'] },
  'image/jpeg':       { description: 'JPEG Images', extensions: ['.jpg', '.jpeg'] },
  'image/webp':       { description: 'WebP Images', extensions: ['.webp'] },
  'image/svg+xml':    { description: 'SVG Images', extensions: ['.svg'] },
  'text/plain':       { description: 'Text Files', extensions: ['.txt'] },
  'text/csv':         { description: 'CSV Files', extensions: ['.csv'] },
  'text/html':        { description: 'HTML Files', extensions: ['.html'] },
  'text/markdown':    { description: 'Markdown Files', extensions: ['.md'] },
  'application/json': { description: 'JSON Files', extensions: ['.json'] },
  'text/tab-separated-values': { description: 'TSV Files', extensions: ['.tsv'] },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { description: 'Excel Spreadsheets', extensions: ['.xlsx'] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { description: 'Word Documents', extensions: ['.docx'] },
}

/**
 * Save a Blob using the File System Access API (showSaveFilePicker).
 * Avoids Windows "Mark of the Web" blocking that occurs with anchor-click downloads.
 * Falls back to downloadBlob when the picker is unavailable or the user cancels.
 */
export async function saveBlob(
  data: Blob | Uint8Array,
  filename: string,
  mimeType?: string,
): Promise<void> {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data], { type: mimeType ?? 'application/octet-stream' })

  const mime = blob.type || mimeType || 'application/octet-stream'

  // Try the File System Access API first — writes directly without MOTW
  if ('showSaveFilePicker' in window) {
    try {
      const picker = (window as unknown as { showSaveFilePicker: PickerFn }).showSaveFilePicker
      const info = MIME_TO_PICKER[mime]
      const types = info
        ? [{ description: info.description, accept: { [mime]: info.extensions } }]
        : [{ description: 'File', accept: { [mime]: [`.${filename.split('.').pop() ?? 'bin'}`] } }]

      const handle = await picker({ suggestedName: filename, types })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // Picker failed (e.g. security restriction on file://) — fall through to anchor download
    }
  }

  downloadBlob(blob, filename)
}

/**
 * Trigger a browser download for a Blob or Uint8Array via anchor click.
 * Note: On Windows, files downloaded this way receive a "Mark of the Web"
 * Zone.Identifier that may cause SmartScreen blocking. Prefer saveBlob()
 * for user-initiated downloads where possible.
 */
export function downloadBlob(data: Blob | Uint8Array, filename: string, mimeType?: string): void {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data], { type: mimeType ?? 'application/octet-stream' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Delay revocation so the browser can finish reading the blob for the download.
  // Immediate revocation can produce truncated/corrupt files on Windows.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Download a canvas element as an image file.
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality = 0.92,
): void {
  canvas.toBlob(
    (blob) => {
      if (blob) downloadBlob(blob, filename)
    },
    type,
    quality,
  )
}

/**
 * Download a string as a text file.
 */
export function downloadText(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}
