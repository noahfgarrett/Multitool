import { useMemo } from 'react'
import { marked } from 'marked'
import { Download, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import type { UpdateInfo } from '@/utils/updateChecker.ts'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
  info: UpdateInfo | null
  defaultTab?: string
}

export function UpdateModal({ open, onClose, info }: UpdateModalProps) {
  const renderedNotes = useMemo(() => {
    if (!info?.releaseNotes) return ''
    let html = marked.parse(info.releaseNotes, { async: false }) as string
    // Inject inline styles so bullets render regardless of which CSS version the user has
    html = html
      .replace(/<ul>/g, '<ul style="list-style-type:disc;padding-left:1.25rem">')
      .replace(/<ol>/g, '<ol style="list-style-type:decimal;padding-left:1.25rem">')
      .replace(/<li>/g, '<li style="margin:0.25rem 0">')
    return html
  }, [info?.releaseNotes])

  function handleDownload() {
    if (info?.downloadUrl) {
      window.open(info.downloadUrl, '_blank', 'noopener')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Available" width="md">
      <div className="space-y-4">
        {/* Version badges */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb, var(--bg-surface) 50%, transparent)', color: 'var(--text-muted)' }}>
            v{__APP_VERSION__}
          </span>
          <span style={{ color: 'var(--text-disabled)' }}>&rarr;</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F47B20]/20 text-[#F47B20]">
            v{info?.version}
          </span>
        </div>

        {/* Release notes */}
        {renderedNotes && (
          <div
            className="release-notes max-h-60 overflow-y-auto overscroll-contain rounded-lg p-4 text-sm"
            style={{ background: 'color-mix(in srgb, var(--bg-surface) 30%, transparent)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: renderedNotes }}
          />
        )}

        {/* Update instructions */}
        <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: 'color-mix(in srgb, var(--bg-surface) 30%, transparent)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>After downloading:</p>
          <p><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Option A:</span> Delete your current LotusWorksToolkit.html, then move the new file to the same location. This keeps your existing bookmarks working.</p>
          <p><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Option B:</span> Open the downloaded file and update your bookmark to point to the new copy.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={14} />}>
            Skip this version
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload} disabled={!info?.downloadUrl} icon={<Download size={14} />}>
            Download v{info?.version}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
