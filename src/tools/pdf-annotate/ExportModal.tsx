import { useState } from 'react'
import { Eye, Lock, AlertTriangle, FileDown, Loader2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import type { ExportMode } from './types'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (mode: ExportMode) => void
  fileName: string
  hasComments: boolean
  isExporting: boolean
  annotationCount: number
  commentCount: number
}

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  fileName,
  hasComments,
  isExporting,
  annotationCount,
  commentCount,
}: ExportModalProps): React.ReactNode {
  const [mode, setMode] = useState<ExportMode>('review')
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)

  function handleExportClick(): void {
    if (mode === 'final') {
      setShowFinalConfirm(true)
    } else {
      onExport('review')
    }
  }

  function handleConfirmFinal(): void {
    setShowFinalConfirm(false)
    onExport('final')
  }

  function handleCancelConfirm(): void {
    setShowFinalConfirm(false)
  }

  function handleClose(): void {
    if (!isExporting) {
      setShowFinalConfirm(false)
      onClose()
    }
  }

  return (
    <>
      <Modal open={isOpen} onClose={handleClose} title="Export PDF" width="lg">
        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* For Review card */}
          <button
            type="button"
            onClick={() => setMode('review')}
            disabled={isExporting}
            className={`
              relative text-left p-4 rounded-lg border-2 transition-all duration-200
              ${mode === 'review'
                ? 'border-[#3B82F6] bg-[#3B82F6]/10 border-l-4'
                : 'border-white/[0.1] bg-white/[0.03] hover:border-white/[0.2]'
              }
              disabled:opacity-40 disabled:pointer-events-none
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <Eye size={18} className={mode === 'review' ? 'text-[#3B82F6]' : 'text-white/60'} />
              <span className={`font-semibold text-sm ${mode === 'review' ? 'text-[#3B82F6]' : 'text-white'}`}>
                For Review
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Annotations visible in any PDF viewer. Edit data preserved — can be reopened in Multitool for further editing.
            </p>
          </button>

          {/* Final Submittal card */}
          <button
            type="button"
            onClick={() => setMode('final')}
            disabled={isExporting}
            className={`
              relative text-left p-4 rounded-lg border-2 transition-all duration-200
              ${mode === 'final'
                ? 'border-[#EF4444] bg-[#EF4444]/10 border-l-4'
                : 'border-white/[0.1] bg-white/[0.03] hover:border-white/[0.2]'
              }
              disabled:opacity-40 disabled:pointer-events-none
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className={mode === 'final' ? 'text-[#EF4444]' : 'text-white/60'} />
              <span className={`font-semibold text-sm ${mode === 'final' ? 'text-[#EF4444]' : 'text-white'}`}>
                Final Submittal
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              All annotations permanently flattened. Clean deliverable — not editable.
            </p>
          </button>
        </div>

        {/* Warning banner (Final mode only) */}
        {mode === 'final' && (
          <div className="flex items-start gap-3 p-3 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              All annotations will be permanently flattened. Comments, statuses, and edit history will not be recoverable.
            </p>
          </div>
        )}

        {/* Info section */}
        <div className="mb-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Export Summary</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">File</span>
              <span className="text-white font-medium truncate ml-4 max-w-[260px]">{fileName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Annotations</span>
              <span className="text-white font-medium">{annotationCount}</span>
            </div>
            {hasComments && (
              <div className="flex items-center justify-between">
                <span className="text-white/60">Comments</span>
                <span className="text-white font-medium">{commentCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={isExporting}
            className={`
              inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg
              transition-all duration-200
              disabled:opacity-40 disabled:pointer-events-none
              ${mode === 'review'
                ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-lg shadow-[#3B82F6]/20'
                : 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-lg shadow-[#EF4444]/20'
              }
            `}
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {isExporting
              ? 'Exporting...'
              : mode === 'review'
                ? 'Export for Review'
                : 'Export Final'
            }
          </button>
        </div>
      </Modal>

      {/* Final Submittal confirmation dialog */}
      <Modal open={showFinalConfirm} onClose={handleCancelConfirm} title="Confirm Final Export" width="sm">
        <p className="text-sm text-white/70 mb-5 leading-relaxed">
          Are you sure? This cannot be undone. The exported PDF will not be editable in Multitool.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleCancelConfirm}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleConfirmFinal}
            disabled={isExporting}
            className="
              inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg
              bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-lg shadow-[#EF4444]/20
              transition-all duration-200
              disabled:opacity-40 disabled:pointer-events-none
            "
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {isExporting ? 'Exporting...' : 'Export Final'}
          </button>
        </div>
      </Modal>
    </>
  )
}
