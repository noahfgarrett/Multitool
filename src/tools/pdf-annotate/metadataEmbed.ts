import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib'

import type { EmbeddedAnnotationData } from './types.ts'

const METADATA_KEY = 'MultitoolAnnotations'
/** Legacy key for backward compatibility with PDFs exported during the Apex era */
const LEGACY_APEX_KEY = 'ApexAnnotations'
/** Legacy key for backward compatibility with PDFs exported before the Apex rebrand */
const LEGACY_METADATA_KEY = 'LotusWorksAnnotations'
const GZIP_MAGIC = [0x1f, 0x8b] as const

// ── UTF-8 safe base64 helpers ──────────────────────────────────────────

function utf8ToBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1: string) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )
}

function base64ToUtf8(b64: string): string {
  return decodeURIComponent(
    Array.from(atob(b64), (c) =>
      '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('')
  )
}

// ── Compression helpers ────────────────────────────────────────────────

async function compressGzip(input: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null

  const encoder = new TextEncoder()
  const stream = new Blob([encoder.encode(input)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  const reader = stream.getReader()

  const chunks: Uint8Array[] = []
  let totalLength = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    totalLength += value.byteLength
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

async function decompressGzip(data: Uint8Array): Promise<string> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  const reader = stream.getReader()

  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const decoder = new TextDecoder()
  return chunks.map((c) => decoder.decode(c, { stream: true })).join('') +
    decoder.decode()
}

function isGzipCompressed(bytes: Uint8Array): boolean {
  return bytes.length >= 2 &&
    bytes[0] === GZIP_MAGIC[0] &&
    bytes[1] === GZIP_MAGIC[1]
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ── Info dict helpers ──────────────────────────────────────────────────

function getInfoDict(doc: PDFDocument): PDFDict {
  const infoRef = doc.context.trailerInfo.Info
  if (infoRef === undefined) {
    throw new Error('PDF has no Info dictionary')
  }
  const dict = doc.context.lookup(infoRef)
  if (!(dict instanceof PDFDict)) {
    throw new Error('PDF Info reference does not point to a dictionary')
  }
  return dict
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Embeds annotation data into a PDF's metadata using a custom Info dict key.
 * The data is JSON-serialized, optionally gzip-compressed, and base64-encoded.
 */
export async function embedAnnotationData(
  pdfBytes: Uint8Array,
  data: EmbeddedAnnotationData
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  const json = JSON.stringify(data)

  const compressed = await compressGzip(json)

  let encoded: string
  if (compressed !== null) {
    encoded = uint8ArrayToBase64(compressed)
  } else {
    encoded = utf8ToBase64(json)
  }

  let infoDict: PDFDict
  try {
    infoDict = getInfoDict(doc)
  } catch {
    doc.setTitle('')
    infoDict = getInfoDict(doc)
  }
  infoDict.set(PDFName.of(METADATA_KEY), PDFString.of(encoded))

  const savedBytes = await doc.save()
  return savedBytes
}

/**
 * Extracts embedded annotation data from a PDF's custom metadata key.
 * Returns null if no embedded data is found or if the data is invalid.
 */
export async function extractAnnotationData(
  pdfBytes: Uint8Array
): Promise<EmbeddedAnnotationData | null> {
  try {
    const doc = await PDFDocument.load(pdfBytes)
    const infoDict = getInfoDict(doc)

    // Try new key first, then Apex-era key, then original LotusWorks key
    let entry = infoDict.lookup(PDFName.of(METADATA_KEY))
    if (entry === undefined || !(entry instanceof PDFString)) {
      entry = infoDict.lookup(PDFName.of(LEGACY_APEX_KEY))
    }
    if (entry === undefined || !(entry instanceof PDFString)) {
      entry = infoDict.lookup(PDFName.of(LEGACY_METADATA_KEY))
    }
    if (entry === undefined) return null
    if (!(entry instanceof PDFString)) return null

    const encoded = entry.asString()

    const rawBytes = base64ToUint8Array(encoded)

    let json: string
    if (isGzipCompressed(rawBytes)) {
      json = await decompressGzip(rawBytes)
    } else {
      json = base64ToUtf8(encoded)
    }

    const parsed: unknown = JSON.parse(json)
    if (!isValidAnnotationData(parsed)) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * Quick check: returns true if the PDF contains embedded Multitool annotation data.
 */
export async function hasEmbeddedAnnotations(
  pdfBytes: Uint8Array
): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(pdfBytes)
    const infoDict = getInfoDict(doc)
    // Check new key first, then Apex-era key, then original LotusWorks key
    const entry = infoDict.lookup(PDFName.of(METADATA_KEY))
    if (entry instanceof PDFString) return true
    const apexEntry = infoDict.lookup(PDFName.of(LEGACY_APEX_KEY))
    if (apexEntry instanceof PDFString) return true
    const legacyEntry = infoDict.lookup(PDFName.of(LEGACY_METADATA_KEY))
    return legacyEntry instanceof PDFString
  } catch {
    return false
  }
}

// ── Validation ─────────────────────────────────────────────────────────

function isValidAnnotationData(value: unknown): value is EmbeddedAnnotationData {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>

  return (
    typeof obj.version === 'number' &&
    isRecord(obj.annotations) &&
    isRecord(obj.measurements) &&
    isRecord(obj.polyMeasurements) &&
    isRecord(obj.countGroups) &&
    Array.isArray(obj.commentThreads) &&
    isRecord(obj.stickyNotes) &&
    isCalibration(obj.calibration) &&
    isRecord(obj.pageRotations)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCalibration(
  value: unknown
): value is { pixelsPerUnit: number | null; unit: string } {
  if (typeof value !== 'object' || value === null) return false
  const cal = value as Record<string, unknown>
  return (
    (typeof cal.pixelsPerUnit === 'number' || cal.pixelsPerUnit === null) &&
    typeof cal.unit === 'string'
  )
}
