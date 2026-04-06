import { useState, useCallback, useRef, memo, type DragEvent } from 'react'
import { Upload } from 'lucide-react'

interface FileDropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  description?: string
  className?: string
}

export const FileDropZone = memo(function FileDropZone({
  onFiles,
  accept,
  multiple = true,
  label = 'Drop files here',
  description = 'or click to browse',
  className = '',
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      if (files.length > 0) onFiles(files)
    },
    [onFiles],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    // Only reset if leaving the container (not entering a child element)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragOver(false)
  }, [])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center
        border-2 border-dashed rounded-xl py-12 px-6
        cursor-pointer transition-all duration-200
        ${isDragOver
          ? 'border-[#F47B20] bg-[#F47B20]/10'
          : 'hover:bg-[#F47B20]/[0.04]'
        }
        ${className}
      `}
      style={isDragOver ? undefined : { borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
    >
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
          ${isDragOver ? 'bg-[#F47B20]/20 text-[#F47B20]' : ''}
        `}
        style={isDragOver ? undefined : { background: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}
      >
        <Upload size={22} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  )
})
