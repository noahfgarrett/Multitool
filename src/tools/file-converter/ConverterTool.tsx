import { useState, useCallback, useEffect, type CSSProperties } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { Button } from '@/components/common/Button.tsx'
import { Slider } from '@/components/common/Slider.tsx'
import { formatFileSize } from '@/utils/fileReader.ts'
import { saveBlob } from '@/utils/download.ts'
import {
  getFileCategory, getOutputFormats, convertFile,
  type FileCategory, type OutputFormat, type ConversionResult, type ConversionOptions,
} from '@/utils/conversion.ts'
import JSZip from 'jszip'
import {
  Download, RotateCcw, Check, X,
  Image as ImageIcon, FileText, Table2, FileType, FileIcon,
} from 'lucide-react'

// ── Drop zone accept string (all supported inputs) ──────────────

const ACCEPT = [
  'image/*', '.svg', '.heic', '.heif',
  '.pdf',
  '.csv', '.xlsx', '.xls', '.tsv', '.json',
  '.txt', '.md', '.html', '.htm',
  '.docx',
].join(',')

// ── Category → icon mapping ─────────────────────────────────────

function CategoryIcon({ category, className, style }: { category: FileCategory | null; className?: string; style?: CSSProperties }) {
  switch (category) {
    case 'image':       return <ImageIcon size={14} className={className} style={style} />
    case 'pdf':         return <FileText size={14} className={`${className} text-red-400/60`} />
    case 'spreadsheet': return <Table2 size={14} className={`${className} text-emerald-400/60`} />
    case 'text':        return <FileType size={14} className={className} style={style} />
    case 'document':    return <FileText size={14} className={`${className} text-blue-400/60`} />
    default:            return <FileIcon size={14} className={className} style={style} />
  }
}

// ── Per-file state ──────────────────────────────────────────────

interface FileEntry {
  id: string
  file: File
  category: FileCategory | null
  typeLabel: string
  formats: OutputFormat[]
  selectedFormat: OutputFormat | null
  options: ConversionOptions
  status: 'idle' | 'converting' | 'done' | 'error'
  result: ConversionResult | null
  results: ConversionResult[] | null
  error: string | null
}

function getFileTypeLabel(file: File): string {
  return file.name.split('.').pop()?.toUpperCase() || 'FILE'
}

// ── PDF scale presets ───────────────────────────────────────────

const PDF_SCALES = [
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
]

// ── Component ───────────────────────────────────────────────────

export default function ConverterTool() {
  const [entries, setEntries] = useState<FileEntry[]>([])

  const [bulkProgress, setBulkProgress] = useState<{
    current: number
    total: number
    startTime: number
  } | null>(null)

  // Tick every second while bulk conversion is running to update elapsed time
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!bulkProgress) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [bulkProgress])

  const handleFiles = useCallback((files: File[]) => {
    const newEntries: FileEntry[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      category: getFileCategory(file),
      typeLabel: getFileTypeLabel(file),
      formats: getOutputFormats(file),
      selectedFormat: null,
      options: { jpegQuality: 0.92, pdfScale: 2.0 },
      status: 'idle' as const,
      result: null,
      results: null,
      error: null,
    }))
    setEntries((prev) => [...prev, ...newEntries])
  }, [])

  const updateEntry = useCallback((id: string, updates: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)))
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleConvert = useCallback(async (entry: FileEntry) => {
    if (!entry.selectedFormat) return
    updateEntry(entry.id, { status: 'converting', error: null })
    try {
      const raw = await convertFile(entry.file, entry.selectedFormat, entry.options)
      if (Array.isArray(raw)) {
        updateEntry(entry.id, { status: 'done', result: raw.length === 1 ? raw[0] : null, results: raw })
      } else {
        updateEntry(entry.id, { status: 'done', result: raw, results: null })
      }
    } catch (err) {
      updateEntry(entry.id, { status: 'error', error: err instanceof Error ? err.message : 'Conversion failed' })
    }
  }, [updateEntry])

  const handleConvertAll = useCallback(async () => {
    const eligible = entries.filter((e) => e.selectedFormat && e.status !== 'done')
    if (eligible.length === 0) return

    setBulkProgress({ current: 0, total: eligible.length, startTime: Date.now() })

    for (let i = 0; i < eligible.length; i++) {
      const entry = eligible[i]
      setBulkProgress((prev) => prev ? { ...prev, current: i } : null)
      updateEntry(entry.id, { status: 'converting', error: null })
      try {
        const raw = await convertFile(entry.file, entry.selectedFormat!, entry.options)
        if (Array.isArray(raw)) {
          updateEntry(entry.id, { status: 'done', result: raw.length === 1 ? raw[0] : null, results: raw })
        } else {
          updateEntry(entry.id, { status: 'done', result: raw, results: null })
        }
      } catch (err) {
        updateEntry(entry.id, { status: 'error', error: err instanceof Error ? err.message : 'Conversion failed' })
      }
    }

    setBulkProgress(null)
  }, [entries, updateEntry])

  const handleDownload = useCallback(async (entry: FileEntry) => {
    try {
      // Single result — direct download
      if (entry.result) {
        await saveBlob(entry.result.blob, entry.result.name)
        return
      }
      // Multi-result — bundle into ZIP
      if (entry.results && entry.results.length > 1) {
        const zip = new JSZip()
        for (const r of entry.results) {
          zip.file(r.name, r.blob)
        }
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          mimeType: 'application/zip',
        })
        const baseName = entry.file.name.replace(/\.[^.]+$/, '')
        await saveBlob(zipBlob, `${baseName}-converted.zip`)
      }
    } catch (err) {
      updateEntry(entry.id, { status: 'error', error: err instanceof Error ? err.message : 'Download failed' })
    }
  }, [updateEntry])

  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownloadAll = useCallback(async () => {
    const done = entries.filter((e) => e.status === 'done' && (e.result || e.results))
    if (done.length === 0) return

    try {
      // If only one entry with a single result, download directly
      if (done.length === 1 && done[0].result) {
        await saveBlob(done[0].result.blob, done[0].result.name)
        return
      }

      // Bundle everything into a single ZIP
      const zip = new JSZip()
      for (const entry of done) {
        if (entry.results && entry.results.length > 1) {
          for (const r of entry.results) zip.file(r.name, r.blob)
        } else if (entry.result) {
          zip.file(entry.result.name, entry.result.blob)
        }
      }
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        mimeType: 'application/zip',
      })
      await saveBlob(zipBlob, 'converted-files.zip')
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    }
  }, [entries])

  const eligibleCount = entries.filter((e) => e.selectedFormat && e.status !== 'done').length
  const doneCount = entries.filter((e) => e.status === 'done').length

  // ── Empty state: central drop zone ──────────────────────────

  if (entries.length === 0) {
    return (
      <FileDropZone
        onFiles={handleFiles}
        accept={ACCEPT}
        multiple
        label="Drop files to convert"
        description="Images, PDFs, spreadsheets, documents, and more"
        className="h-full"
      />
    )
  }

  // ── File list view ──────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {entries.length} file{entries.length !== 1 ? 's' : ''}
          {doneCount > 0 && <span className="text-[#F47B20]"> · {doneCount} converted</span>}
        </span>
        <div className="flex-1" />

        {eligibleCount > 0 && !bulkProgress && (
          <Button onClick={handleConvertAll} size="sm">
            Convert{eligibleCount > 1 ? ` All (${eligibleCount})` : ''}
          </Button>
        )}

        {doneCount > 1 && (
          <Button onClick={handleDownloadAll} variant="secondary" size="sm" icon={<Download size={12} />}>
            Download All
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={12} />}
          onClick={() => setEntries([])}
        >
          Clear
        </Button>
      </div>

      {downloadError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
          <p className="text-xs text-red-400 flex-1">{downloadError}</p>
          <button onClick={() => setDownloadError(null)} className="p-1 text-red-400/60 hover:text-red-400 transition-colors" aria-label="Dismiss error">
            <X size={12} />
          </button>
        </div>
      )}

      {bulkProgress && (
        <div className="flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>
              Converting {bulkProgress.current + 1} of {bulkProgress.total} files...
            </span>
            {(() => {
              const elapsed = Math.floor((Date.now() - bulkProgress.startTime) / 1000)
              return elapsed >= 3 ? (
                <span style={{ color: 'var(--text-disabled)' }}>{elapsed}s elapsed</span>
              ) : null
            })()}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full bg-[#F47B20] transition-all duration-300 ease-out"
              style={{ width: `${((bulkProgress.current + 1) / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* File entries */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`p-4 rounded-xl border transition-colors ${
              entry.status === 'done'
                ? 'border-[#F47B20]/20 bg-[#F47B20]/[0.04]'
                : entry.status === 'error'
                  ? 'border-red-500/20 bg-red-500/[0.04]'
                  : ''
            }`}
            style={entry.status !== 'done' && entry.status !== 'error' ? { borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' } : undefined}
          >
            {/* File header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                <CategoryIcon category={entry.category} className="" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{entry.file.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                  {entry.typeLabel} · {formatFileSize(entry.file.size)}
                </p>
              </div>

              {entry.status === 'converting' && (
                <div className="w-4 h-4 border-2 border-[#F47B20] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {entry.status === 'done' && (entry.result || entry.results) && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Download size={12} />}
                  onClick={() => handleDownload(entry)}
                >
                  {entry.results && entry.results.length > 1
                    ? `${entry.results.length} files`
                    : entry.result?.name.split('.').pop()?.toUpperCase()}
                </Button>
              )}

              <button
                onClick={() => removeEntry(entry.id)}
                className="p-1 hover:text-red-400 transition-colors flex-shrink-0"
                style={{ color: 'var(--text-disabled)' }}
                aria-label={`Remove ${entry.file.name}`}
              >
                <X size={14} />
              </button>
            </div>

            {/* Output format selector */}
            {entry.formats.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: 'var(--text-disabled)' }}>Convert to:</span>
                  {entry.formats.map((fmt) => {
                    const isSelected = entry.selectedFormat?.ext === fmt.ext
                    const isDone = entry.status === 'done' && isSelected

                    return (
                      <button
                        key={fmt.ext}
                        onClick={() => {
                          if (entry.status === 'done') {
                            updateEntry(entry.id, { selectedFormat: fmt, status: 'idle', result: null, results: null })
                          } else {
                            updateEntry(entry.id, { selectedFormat: fmt })
                          }
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isDone
                            ? 'bg-[#F47B20] text-white'
                            : isSelected
                              ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30'
                              : 'border border-transparent hover:bg-[#F47B20]/[0.06]'
                          }
                        `}
                        style={!isDone && !isSelected ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : undefined}
                      >
                        {isDone && <Check size={10} className="inline mr-1 -mt-0.5" />}
                        {fmt.label}
                      </button>
                    )
                  })}

                  {entry.selectedFormat && entry.status === 'idle' && (
                    <Button size="sm" onClick={() => handleConvert(entry)} className="ml-auto">
                      Convert
                    </Button>
                  )}
                </div>

                {/* Contextual options */}
                {entry.selectedFormat && entry.status !== 'done' && (
                  <ConversionOptionsPanel entry={entry} updateEntry={updateEntry} />
                )}
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                Unsupported file type — no conversions available
              </p>
            )}

            {entry.status === 'error' && entry.error && (
              <p className="text-[10px] text-red-400 mt-2">{entry.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Add more files */}
      <FileDropZone
        onFiles={handleFiles}
        accept={ACCEPT}
        multiple
        label="Drop more files"
        description="Add more files to convert"
        className="py-4 flex-shrink-0"
      />
    </div>
  )
}

// ── Contextual conversion options ───────────────────────────────

function ConversionOptionsPanel({
  entry,
  updateEntry,
}: {
  entry: FileEntry
  updateEntry: (id: string, updates: Partial<FileEntry>) => void
}) {
  const { selectedFormat, category, options } = entry

  // JPEG quality slider — show when output is jpg
  const showQuality = selectedFormat?.ext === 'jpg'

  // PDF render scale — show when input is PDF and output is image
  const showPdfScale = category === 'pdf' && (selectedFormat?.ext === 'png' || selectedFormat?.ext === 'jpg')

  if (!showQuality && !showPdfScale) return null

  return (
    <div className="flex items-center gap-4 pt-1">
      {showQuality && (
        <div className="flex-1 max-w-[200px]">
          <Slider
            label="Quality"
            value={Math.round((options.jpegQuality ?? 0.92) * 100)}
            min={50}
            max={100}
            step={5}
            suffix="%"
            onChange={(e) => {
              const pct = Number((e.target as HTMLInputElement).value)
              updateEntry(entry.id, {
                options: { ...options, jpegQuality: pct / 100 },
              })
            }}
          />
        </div>
      )}

      {showPdfScale && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Render Scale</span>
          <div className="flex gap-1">
            {PDF_SCALES.map((s) => {
              const isActive = (options.pdfScale ?? 2.0) === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => updateEntry(entry.id, { options: { ...options, pdfScale: s.value } })}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    isActive
                      ? 'bg-[#F47B20]/20 text-[#F47B20] font-medium'
                      : 'hover:brightness-110'
                  }`}
                  style={!isActive ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)' } : undefined}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
