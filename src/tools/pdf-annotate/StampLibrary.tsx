import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Plus, Trash2, Download, Upload, Image as ImageIcon, Save, AlertTriangle, PenTool,
} from 'lucide-react'
import { Button } from '@/components/common/Button.tsx'

// ── Types ──────────────────────────────────────────────

interface StampLibraryProps {
  onSelectStamp: (imageDataUrl: string, name: string) => void
  onClose: () => void
}

interface StampItem {
  id: string
  name: string
  imageDataUrl: string
  createdAt: number
}

// ── IndexedDB Helpers ──────────────────────────────────

const DB_NAME = 'mt-stamp-library'
const STORE_NAME = 'stamps'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllStamps(): Promise<StampItem[]> {
  return new Promise((resolve, reject) => {
    void openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => {
        const items = req.result as StampItem[]
        items.sort((a, b) => b.createdAt - a.createdAt)
        resolve(items)
      }
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}

function addStamp(stamp: StampItem): Promise<void> {
  return new Promise((resolve, reject) => {
    void openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(stamp)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}

function deleteStamp(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    void openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    }).catch(reject)
  })
}

// ── Helpers ────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read file as data URL'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ──────────────────────────────────────────

export function StampLibrary({ onSelectStamp, onClose }: StampLibraryProps): React.ReactNode {
  const [stamps, setStamps] = useState<StampItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create new stamp state
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newImageDataUrl, setNewImageDataUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Signature pad state
  const [isDrawingSignature, setIsDrawingSignature] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigDrawingRef = useRef(false)
  const [sigHasStrokes, setSigHasStrokes] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // ── Load stamps ────────────────────────────────────

  const loadStamps = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await getAllStamps()
      setStamps(items)
    } catch {
      setError('Failed to load stamps from storage.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadStamps() }, [loadStamps])

  // ── Create stamp ───────────────────────────────────

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, SVG, etc.).')
      return
    }
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setNewImageDataUrl(dataUrl)
      if (!newName.trim()) {
        setNewName(file.name.replace(/\.[^.]+$/, ''))
      }
    } catch {
      setError('Failed to read image file.')
    }
  }, [newName])

  const handleSaveStamp = useCallback(async () => {
    const trimmedName = newName.trim()
    if (!trimmedName || !newImageDataUrl) return

    setIsSaving(true)
    setError(null)
    try {
      const stamp: StampItem = {
        id: crypto.randomUUID(),
        name: trimmedName,
        imageDataUrl: newImageDataUrl,
        createdAt: Date.now(),
      }
      await addStamp(stamp)
      setStamps((prev) => [stamp, ...prev])
      setNewName('')
      setNewImageDataUrl(null)
      setIsCreating(false)
    } catch {
      setError('Failed to save stamp.')
    } finally {
      setIsSaving(false)
    }
  }, [newName, newImageDataUrl])

  // ── Signature pad ──────────────────────────────────

  const initSigCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  useEffect(() => {
    if (isDrawingSignature) {
      // Wait for canvas to mount then initialize
      requestAnimationFrame(initSigCanvas)
    }
  }, [isDrawingSignature, initSigCanvas])

  const handleSigPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    sigDrawingRef.current = true
    const canvas = sigCanvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const handleSigPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sigDrawingRef.current) return
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    ctx.lineTo(x, y)
    ctx.stroke()
    setSigHasStrokes(true)
  }, [])

  const handleSigPointerUp = useCallback(() => {
    sigDrawingRef.current = false
  }, [])

  const handleSigClear = useCallback(() => {
    initSigCanvas()
    setSigHasStrokes(false)
  }, [initSigCanvas])

  const handleSigSave = useCallback(async () => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const name = signatureName.trim() || 'Signature'
    const dataUrl = canvas.toDataURL('image/png')
    setIsSaving(true)
    setError(null)
    try {
      const stamp: StampItem = {
        id: crypto.randomUUID(),
        name,
        imageDataUrl: dataUrl,
        createdAt: Date.now(),
      }
      await addStamp(stamp)
      setStamps((prev) => [stamp, ...prev])
      setSignatureName('')
      setIsDrawingSignature(false)
    } catch {
      setError('Failed to save signature.')
    } finally {
      setIsSaving(false)
    }
  }, [signatureName])

  // ── Delete stamp ───────────────────────────────────

  const handleDeleteStamp = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteStamp(id)
      setStamps((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Failed to delete stamp.')
    }
  }, [])

  // ── Export / Import ────────────────────────────────

  const handleExport = useCallback(() => {
    if (stamps.length === 0) return
    downloadJson(stamps, 'mt-stamp-library.json')
  }, [stamps])

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)

      if (!Array.isArray(parsed)) {
        setError('Invalid stamp library file format.')
        return
      }

      let importedCount = 0
      for (const item of parsed) {
        if (
          typeof item === 'object' && item !== null &&
          'id' in item && typeof (item as StampItem).id === 'string' &&
          'name' in item && typeof (item as StampItem).name === 'string' &&
          'imageDataUrl' in item && typeof (item as StampItem).imageDataUrl === 'string' &&
          'createdAt' in item && typeof (item as StampItem).createdAt === 'number'
        ) {
          const stamp = item as StampItem
          // Generate a fresh ID to avoid collisions
          const imported: StampItem = {
            ...stamp,
            id: crypto.randomUUID(),
          }
          await addStamp(imported)
          importedCount++
        }
      }

      if (importedCount === 0) {
        setError('No valid stamps found in the file.')
        return
      }

      await loadStamps()
    } catch {
      setError('Failed to import stamps. Ensure the file is valid JSON.')
    }

    // Reset the file input so the same file can be imported again
    if (importInputRef.current) importInputRef.current.value = ''
  }, [loadStamps])

  // ── Render ─────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-[#00171F] border border-white/[0.1] rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-base font-semibold text-white">Stamp Library</h2>
          <div className="flex items-center gap-2">
            {/* Import */}
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors"
              title="Import library"
            >
              <Upload size={14} />
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => { void handleImport(e) }}
              className="hidden"
            />

            {/* Export */}
            <button
              type="button"
              onClick={handleExport}
              disabled={stamps.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Export library"
            >
              <Download size={14} />
              Export
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Create New Stamp */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 mb-4 px-3 py-2 w-full rounded-lg border-2 border-dashed border-white/15 hover:border-[#14B8A6]/50 text-white/50 hover:text-[#14B8A6] transition-all"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Create New Stamp</span>
            </button>
          ) : (
            <div className="mb-4 p-4 rounded-lg border border-white/[0.1] bg-white/[0.03]">
              <h3 className="text-sm font-medium text-white mb-3">New Stamp</h3>
              <div className="flex gap-4">
                {/* Image upload / preview */}
                <div className="shrink-0">
                  {newImageDataUrl ? (
                    <div className="relative w-28 h-28 rounded-lg border border-white/[0.1] bg-white/[0.03] flex items-center justify-center overflow-hidden">
                      <img
                        src={newImageDataUrl}
                        alt="Stamp preview"
                        className="max-w-full max-h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setNewImageDataUrl(null)}
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white/70 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-28 h-28 rounded-lg border-2 border-dashed border-white/15 hover:border-[#14B8A6]/50 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-[#14B8A6] transition-all"
                    >
                      <ImageIcon size={24} />
                      <span className="text-[10px]">Upload</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => { void handleImageUpload(e) }}
                    className="hidden"
                  />
                </div>

                {/* Name + actions */}
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Stamp Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Company Logo"
                      className="w-full h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      icon={<Save size={14} />}
                      onClick={() => { void handleSaveStamp() }}
                      disabled={!newName.trim() || !newImageDataUrl || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false)
                        setNewName('')
                        setNewImageDataUrl(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Draw Signature */}
          {!isDrawingSignature ? (
            <button
              type="button"
              onClick={() => setIsDrawingSignature(true)}
              className="flex items-center gap-2 mb-4 px-3 py-2 w-full rounded-lg border-2 border-dashed border-white/15 hover:border-[#14B8A6]/50 text-white/50 hover:text-[#14B8A6] transition-all"
            >
              <PenTool size={16} />
              <span className="text-sm font-medium">Draw Signature</span>
            </button>
          ) : (
            <div className="mb-4 p-4 rounded-lg border border-white/[0.1] bg-white/[0.03]">
              <h3 className="text-sm font-medium text-white mb-3">Draw Signature</h3>
              <canvas
                ref={sigCanvasRef}
                width={600}
                height={300}
                className="w-[300px] h-[150px] rounded-lg border border-white/[0.15] cursor-crosshair touch-none"
                onPointerDown={handleSigPointerDown}
                onPointerMove={handleSigPointerMove}
                onPointerUp={handleSigPointerUp}
                onPointerLeave={handleSigPointerUp}
              />
              <div className="mt-3 flex flex-col gap-2">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="e.g. My Signature"
                    className="w-full h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    icon={<Save size={14} />}
                    onClick={() => { void handleSigSave() }}
                    disabled={isSaving || !sigHasStrokes}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSigClear}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsDrawingSignature(false)
                      setSignatureName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-white/40">Loading stamps...</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && stamps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ImageIcon size={32} className="text-white/20" />
              <span className="text-sm text-white/40">No stamps yet</span>
              <span className="text-xs text-white/25">Create a stamp or import a library to get started.</span>
            </div>
          )}

          {/* Stamp grid */}
          {!isLoading && stamps.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {stamps.map((stamp) => (
                <div
                  key={stamp.id}
                  className="group relative flex flex-col items-center gap-2 p-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#14B8A6]/30 transition-all cursor-pointer"
                  onClick={() => onSelectStamp(stamp.imageDataUrl, stamp.name)}
                  title={`Use "${stamp.name}"`}
                >
                  {/* Thumbnail */}
                  <div className="w-full aspect-square rounded-md bg-white/[0.04] flex items-center justify-center overflow-hidden">
                    <img
                      src={stamp.imageDataUrl}
                      alt={stamp.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Name */}
                  <span className="text-xs text-white/70 truncate w-full text-center font-medium">
                    {stamp.name}
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDeleteStamp(stamp.id)
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 text-white/30 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black/60 transition-all"
                    title={`Delete "${stamp.name}"`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
