import { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import { Download, Loader2, X, ChevronDown, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import { CHANGELOG } from '@/data/changelog.ts'
import type { ChangelogEntry } from '@/data/changelog.ts'
import type { UpdateInfo } from '@/utils/updateChecker.ts'
import { isNewer } from '@/utils/semver.ts'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${month} ${day}, ${year} · ${time}`
}

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

const TYPE_COLORS: Record<ChangelogEntry['type'], { bar: string; text: string; bg: string; label: string }> = {
  major: { bar: 'border-l-[#F47B20]', text: 'text-[#F47B20]', bg: 'bg-[#F47B20]/[0.04]', label: 'Major' },
  feature: { bar: 'border-l-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/[0.04]', label: 'Feature' },
  fix: { bar: 'border-l-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/[0.04]', label: 'Fix' },
}

const INITIAL_VISIBLE = 8

export function UpdateModal({ open, onClose, info, defaultTab }: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [updated, setUpdated] = useState(false)
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

  // If an update is available and the new version isn't in the local changelog yet,
  // synthesize an entry from the GitHub release notes so users see it immediately.
  const changelogWithUpdate = useMemo(() => {
    if (!info?.version || !info.releaseNotes) return CHANGELOG
    const alreadyIncluded = CHANGELOG.some((e) => e.version === info.version)
    if (alreadyIncluded) return CHANGELOG
    const synthetic: ChangelogEntry = {
      version: info.version,
      date: new Date().toISOString(),
      type: 'fix',
      notes: info.releaseNotes,
    }
    return [synthetic, ...CHANGELOG]
  }, [info?.version, info?.releaseNotes])

  // Auto-expand the latest changelog entry (including synthetic ones from updates)
  useEffect(() => {
    if (changelogWithUpdate.length > 0) {
      setExpandedVersions((prev) => {
        const next = new Set(prev)
        next.add(changelogWithUpdate[0].version)
        return next
      })
    }
  }, [changelogWithUpdate])

  const hasNewerVersions = changelogWithUpdate.length > 0 && isNewer(changelogWithUpdate[0].version, __APP_VERSION__)

  const visibleEntries = showAll ? changelogWithUpdate : changelogWithUpdate.slice(0, INITIAL_VISIBLE)

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

      // Save a copy to downloads folder
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = info.assetName || 'LotusWorksToolkit.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      // Open the new version in a new tab so the user can start using it immediately
      const openUrl = URL.createObjectURL(blob)
      window.open(openUrl, '_blank')
      setUpdated(true)
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
    <Modal open={open} onClose={onClose} title={modalTitle} width="xl">
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
          updated ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <div className="text-center space-y-1.5">
                <p className="text-lg font-semibold text-white">You&apos;re all set!</p>
                <p className="text-sm text-white/50">
                  v{info.version} is open in a new tab. You can close this tab.
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-white/40 text-center max-w-sm">
                A copy was also saved to your Downloads folder. Replace your current LotusWorksToolkit.html with it to keep future updates working.
              </div>
            </div>
          ) : (
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
                <p className="text-white/70 font-medium">What happens when you click update:</p>
                <p>The new version will <span className="text-white/60 font-medium">open in a new tab</span> and a copy will be saved to your Downloads folder. Replace your current LotusWorksToolkit.html with the downloaded file to keep future updates working.</p>
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
                  {downloading ? 'Updating...' : `Update to v${info.version}`}
                </Button>
              </div>
            </>
          )
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
                  const isLatest = index === 0
                  const colors = TYPE_COLORS[entry.type]
                  const stats = formatStats(entry)

                  return (
                    <div
                      key={entry.version}
                      className={`rounded-r-lg border-l-[3px] ${colors.bar} ${isExpanded ? colors.bg : 'hover:bg-white/[0.02]'} transition-colors`}
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors group"
                        onClick={() => toggleExpanded(entry.version)}
                      >
                        <ChevronDown
                          size={14}
                          className={`text-white/30 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className={`text-sm font-semibold ${isLatest ? colors.text : 'text-white/80'}`}>
                          v{entry.version}
                        </span>
                        {/* Hover-reveal type label */}
                        <span className={`text-[10px] font-medium ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}>
                          {colors.label}
                        </span>
                        {isLatest && (
                          <span className={`text-[9px] font-semibold uppercase tracking-wider ${colors.text} opacity-60`}>
                            latest
                          </span>
                        )}
                        {stats && (
                          <span className="text-[10px] text-white/25 hidden sm:inline">{stats}</span>
                        )}
                        <span className="ml-auto text-[11px] text-white/25 shrink-0">{formatDate(entry.date)}</span>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pl-9">
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
            {!showAll && changelogWithUpdate.length > INITIAL_VISIBLE && (
              <button
                type="button"
                className="text-xs text-[#F47B20] hover:text-[#F47B20]/80 transition-colors"
                onClick={() => setShowAll(true)}
              >
                See all {changelogWithUpdate.length} releases
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
