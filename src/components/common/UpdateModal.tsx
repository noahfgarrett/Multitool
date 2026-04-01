import { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import { Download, Loader2, X, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import { CHANGELOG } from '@/data/changelog.ts'
import type { ChangelogEntry } from '@/data/changelog.ts'
import type { UpdateInfo } from '@/utils/updateChecker.ts'
import { isNewer } from '@/utils/semver.ts'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
  info: UpdateInfo | null
  defaultTab?: 'update' | 'changelog'
}

function renderMarkdown(md: string): string {
  let html = marked.parse(md, { async: false }) as string
  html = html
    .replace(/<ul>/g, '<ul style="list-style-type:disc;padding-left:1.25rem">')
    .replace(/<ol>/g, '<ol style="list-style-type:decimal;padding-left:1.25rem">')
    .replace(/<li>/g, '<li style="margin:0.25rem 0">')
  return html
}

const TYPE_BADGE: Record<ChangelogEntry['type'], { label: string; className: string }> = {
  major: { label: 'Major', className: 'bg-[#F47B20]/20 text-[#F47B20]' },
  feature: { label: 'Feature', className: 'bg-blue-500/20 text-blue-400' },
  fix: { label: 'Fix', className: 'bg-emerald-500/20 text-emerald-400' },
}

const INITIAL_VISIBLE = 8

export function UpdateModal({ open, onClose, info, defaultTab }: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<'update' | 'changelog'>(
    defaultTab ?? (info ? 'update' : 'changelog'),
  )
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    () => new Set(CHANGELOG.length > 0 ? [CHANGELOG[0].version] : []),
  )
  const [showAll, setShowAll] = useState(false)

  // Reset activeTab when info or defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab ?? (info ? 'update' : 'changelog'))
  }, [info, defaultTab])

  const renderedNotes = useMemo(() => {
    if (!info?.releaseNotes) return ''
    return renderMarkdown(info.releaseNotes)
  }, [info?.releaseNotes])

  const hasNewerVersions = CHANGELOG.length > 0 && isNewer(CHANGELOG[0].version, __APP_VERSION__)

  const visibleEntries = showAll ? CHANGELOG : CHANGELOG.slice(0, INITIAL_VISIBLE)

  function toggleExpanded(version: string): void {
    setExpandedVersions((prev) => {
      const next = new Set(prev)
      if (next.has(version)) {
        next.delete(version)
      } else {
        next.add(version)
      }
      return next
    })
  }

  async function handleDownload(): Promise<void> {
    if (!info?.downloadUrl) return
    setDownloading(true)
    try {
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
      window.open(info.downloadUrl, '_blank', 'noopener')
    } finally {
      setDownloading(false)
    }
  }

  function formatStats(entry: ChangelogEntry): string | null {
    if (!entry.stats) return null
    const parts: string[] = []
    if (entry.stats.features) parts.push(`${entry.stats.features} feature${entry.stats.features > 1 ? 's' : ''}`)
    if (entry.stats.fixes) parts.push(`${entry.stats.fixes} fix${entry.stats.fixes > 1 ? 'es' : ''}`)
    if (entry.stats.tools) parts.push(`${entry.stats.tools} tool${entry.stats.tools > 1 ? 's' : ''} improved`)
    return parts.length > 0 ? parts.join(' \u00b7 ') : null
  }

  const modalTitle = info ? 'Update Available' : 'Changelog'

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} width="md">
      <div className="space-y-4">
        {/* Tabs — only show if info is available (both tabs make sense) */}
        {info && (
          <div className="flex gap-1 border-b border-white/[0.08]">
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'update'
                  ? 'text-[#F47B20] border-b-2 border-[#F47B20]'
                  : 'text-white/50 hover:text-white/70'
              }`}
              onClick={() => setActiveTab('update')}
            >
              Update
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'changelog'
                  ? 'text-[#F47B20] border-b-2 border-[#F47B20]'
                  : 'text-white/50 hover:text-white/70'
              }`}
              onClick={() => setActiveTab('changelog')}
            >
              Changelog
            </button>
          </div>
        )}

        {/* Update Tab */}
        {activeTab === 'update' && info && (
          <>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60">
                v{__APP_VERSION__}
              </span>
              <span className="text-white/30">&rarr;</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F47B20]/20 text-[#F47B20]">
                v{info.version}
              </span>
            </div>

            {renderedNotes && (
              <div
                className="release-notes max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-sm text-white/70"
                dangerouslySetInnerHTML={{ __html: renderedNotes }}
              />
            )}

            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-white/50 space-y-1.5">
              <p className="text-white/70 font-medium">After downloading:</p>
              <p><span className="text-white/60 font-medium">Option A:</span> Delete your current LotusWorksToolkit.html, then move the new file to the same location.</p>
              <p><span className="text-white/60 font-medium">Option B:</span> Open the downloaded file and update your bookmark to point to the new copy.</p>
            </div>

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
          </>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="space-y-3">
            {hasNewerVersions && (
              <p className="text-xs text-white/50">
                You&apos;re on <span className="text-white/70 font-medium">v{__APP_VERSION__}</span> — here&apos;s what&apos;s new since then:
              </p>
            )}

            <div className={showAll ? 'overflow-y-auto' : 'max-h-[400px] overflow-y-auto'}>
              <div className="space-y-2">
                {visibleEntries.map((entry, index) => {
                  const isExpanded = expandedVersions.has(entry.version)
                  const isNewerThanCurrent = isNewer(entry.version, __APP_VERSION__)
                  const isLatest = index === 0
                  const badge = TYPE_BADGE[entry.type]
                  const stats = formatStats(entry)

                  return (
                    <div
                      key={entry.version}
                      className={`rounded-lg bg-white/[0.03] border overflow-hidden ${
                        isExpanded && isNewerThanCurrent
                          ? 'border-l-2 border-l-[#F47B20] border-t-white/[0.06] border-r-white/[0.06] border-b-white/[0.06]'
                          : isExpanded
                            ? 'border-l-2 border-l-white/20 border-t-white/[0.06] border-r-white/[0.06] border-b-white/[0.06]'
                            : 'border-white/[0.06]'
                      }`}
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                        onClick={() => toggleExpanded(entry.version)}
                      >
                        <ChevronDown
                          size={14}
                          className={`text-white/40 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className="text-sm font-medium text-white/80">v{entry.version}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                        {isLatest && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50">
                            latest
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-white/30 shrink-0">{entry.date}</span>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          {stats && (
                            <p className="text-[11px] text-white/40 mb-2">{stats}</p>
                          )}
                          <div
                            className="text-sm text-white/60 [&_h3]:text-white/80 [&_h3]:font-medium [&_h3]:text-sm [&_h3]:mt-2 [&_h3]:mb-1 [&_h4]:text-white/70 [&_h4]:font-medium [&_h4]:text-xs [&_h4]:mt-2 [&_h4]:mb-1 [&_strong]:text-white/70"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.notes) }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* See all releases link */}
            {!showAll && CHANGELOG.length > INITIAL_VISIBLE && (
              <button
                type="button"
                className="text-xs text-[#F47B20] hover:text-[#F47B20]/80 transition-colors"
                onClick={() => setShowAll(true)}
              >
                See all {CHANGELOG.length} releases
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
