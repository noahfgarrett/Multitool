import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { Download, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import type { UpdateInfo } from '@/utils/updateChecker.ts'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
  info: UpdateInfo
}

export function UpdateModal({ open, onClose, info }: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false)

  const renderedNotes = useMemo(() => {
    if (!info.releaseNotes) return ''
    let html = marked.parse(info.releaseNotes, { async: false }) as string
    // Inject inline styles so bullets render regardless of which CSS version the user has
    html = html
      .replace(/<ul>/g, '<ul style="list-style-type:disc;padding-left:1.25rem">')
      .replace(/<ol>/g, '<ol style="list-style-type:decimal;padding-left:1.25rem">')
      .replace(/<li>/g, '<li style="margin:0.25rem 0">')
    return html
  }, [info.releaseNotes])

  async function handleDownload(): Promise<void> {
    if (!info.downloadUrl) return
    setDownloading(true)
    try {
      // Fetch via GitHub API to avoid browser navigation to github.com,
      // which can trigger GitHub 2FA prompts if the user has a stale session.
      const res = await fetch(info.assetApiUrl, {
        headers: { Accept: 'application/octet-stream' },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = info.assetName || 'LotusWorksToolkit.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in browser directly
      window.open(info.downloadUrl, '_blank', 'noopener')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Available" width="md">
      <div className="space-y-4">
        {/* Version badges */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60">
            v{__APP_VERSION__}
          </span>
          <span className="text-white/30">&rarr;</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F47B20]/20 text-[#F47B20]">
            v{info.version}
          </span>
        </div>

        {/* Release notes */}
        {renderedNotes && (
          <div
            className="release-notes max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-sm text-white/70"
            dangerouslySetInnerHTML={{ __html: renderedNotes }}
          />
        )}

        {/* Update instructions */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-white/50 space-y-1.5">
          <p className="text-white/70 font-medium">After downloading:</p>
          <p><span className="text-white/60 font-medium">Option A:</span> Delete your current LotusWorksToolkit.html, then move the new file to the same location. This keeps your existing bookmarks working.</p>
          <p><span className="text-white/60 font-medium">Option B:</span> Open the downloaded file and update your bookmark to point to the new copy.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={14} />}>
            Skip this version
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleDownload()}
            disabled={!info.downloadUrl || downloading}
            icon={downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          >
            {downloading ? 'Downloading...' : `Download v${info.version}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
