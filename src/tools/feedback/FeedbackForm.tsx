import { useState } from 'react'
import { useAppStore } from '@/stores/appStore.ts'
import { getUserProfile, hasUserProfile } from '@/utils/userProfile.ts'
import { categories } from '@/tools/registry.ts'
import {
  Bug, Lightbulb, Mail, Info, RotateCcw, ClipboardCopy,
} from 'lucide-react'

type FeedbackType = 'bug' | 'enhancement' | null
type Priority = 'low' | 'medium' | 'high'

const RECIPIENT = 'ngarrett@lotusworks.com'

function buildToolOptions(): { group: string; tools: { value: string; label: string }[] }[] {
  const groups = categories.map((cat) => ({
    group: cat.label,
    tools: cat.tools.map((t) => ({ value: t.label, label: t.label })),
  }))
  groups.push({
    group: 'Other',
    tools: [
      { value: 'New Tool Idea', label: 'New Tool Idea' },
      { value: 'General / App-wide', label: 'General / App-wide' },
    ],
  })
  return groups
}

const TOOL_OPTIONS = buildToolOptions()

function buildEmailBody(
  type: FeedbackType,
  tool: string,
  priority: Priority,
  description: string,
  userName: string,
  userEmail: string,
): string {
  const typeLabel = type === 'bug' ? 'Bug Report' : 'Enhancement Idea'
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1)
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown'

  return [
    `TYPE: ${typeLabel}`,
    `TOOL: ${tool}`,
    `PRIORITY: ${priorityLabel}`,
    `SUBMITTED BY: ${userName}${userEmail ? ` (${userEmail})` : ''}`,
    `APP VERSION: v${version}`,
    '',
    '---',
    '',
    'DESCRIPTION:',
    '',
    description,
    '',
    '---',
    '',
    `Sent from LotusWorks Toolkit v${version}`,
  ].join('\n')
}

function buildSubject(type: FeedbackType, tool: string, subject: string): string {
  const prefix = type === 'bug' ? 'Bug Report' : 'Enhancement'
  return `[${prefix}] ${tool} — ${subject}`
}

export default function FeedbackForm() {
  const addToast = useAppStore((s) => s.addToast)
  const setShowProfileModal = useAppStore((s) => s.setShowProfileModal)
  const profile = getUserProfile()
  const hasProfile = hasUserProfile()

  const [type, setType] = useState<FeedbackType>(null)
  const [tool, setTool] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function validate(): boolean {
    const newErrors: Record<string, boolean> = {}
    if (!type) newErrors.type = true
    if (!tool) newErrors.tool = true
    if (!subject.trim()) newErrors.subject = true
    if (!description.trim()) newErrors.description = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function copyFeedbackToClipboard(): Promise<void> {
    if (!type || !profile) return
    const emailSubject = buildSubject(type, tool, subject.trim())
    const emailBody = buildEmailBody(
      type, tool, priority, description.trim(),
      profile.name, profile.email,
    )
    const clipboardText = `TO: ${RECIPIENT}\nSUBJECT: ${emailSubject}\n\n${emailBody}`
    await navigator.clipboard.writeText(clipboardText)
    addToast({ type: 'success', message: 'Feedback copied to clipboard — paste it into an email to ' + RECIPIENT })
  }

  function handleSubmit(): void {
    if (!validate()) return
    if (!hasProfile || !profile) {
      addToast({ type: 'error', message: 'Please set up your profile first' })
      return
    }

    const emailSubject = buildSubject(type, tool, subject.trim())
    const emailBody = buildEmailBody(
      type, tool, priority, description.trim(),
      profile.name, profile.email,
    )

    const encodedSubject = encodeURIComponent(emailSubject)
    const encodedBody = encodeURIComponent(emailBody)

    // Try Outlook protocol handler first
    try {
      window.location.href = `ms-outlook://compose?to=${encodeURIComponent(RECIPIENT)}&subject=${encodedSubject}&body=${encodedBody}`
    } catch {
      // Outlook not available — fall through to mailto
    }

    // After a delay, open mailto as fallback
    setTimeout(() => {
      window.location.href = `mailto:${RECIPIENT}?subject=${encodedSubject}&body=${encodedBody}`
    }, 500)

    // After 1.5s, check if the page still has focus — if so, no email client opened
    setTimeout(() => {
      if (document.hasFocus()) {
        // No email client took focus — copy to clipboard as fallback
        const clipboardText = `TO: ${RECIPIENT}\nSUBJECT: ${emailSubject}\n\n${emailBody}`
        navigator.clipboard.writeText(clipboardText).then(() => {
          addToast({
            type: 'info',
            message: 'No email client detected — feedback copied to clipboard. Paste it into an email to ' + RECIPIENT,
            duration: 8000,
          })
        }).catch(() => {
          addToast({ type: 'error', message: 'No email client detected and clipboard copy failed. Please copy the details manually.' })
        })
      } else {
        addToast({ type: 'success', message: 'Email client opened — just hit Send!' })
      }
    }, 1500)
  }

  function handleClear(): void {
    setType(null)
    setTool('')
    setSubject('')
    setPriority('medium')
    setDescription('')
    setErrors({})
  }

  const descriptionPlaceholder = type === 'bug'
    ? 'Describe what you were doing when the bug occurred. Include any error messages and what you expected to happen instead...'
    : type === 'enhancement'
      ? 'Describe the improvement you\'d like to see and how it would help your workflow...'
      : 'Provide details...'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-white">Report a Bug or Share an Idea</h2>
          <p className="text-xs text-white/40 mt-1">
            Your feedback helps us improve the toolkit. We&apos;ll review every submission.
          </p>
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => { setType('bug'); setErrors((e) => ({ ...e, type: false })) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-[1.5px] transition-all ${
                type === 'bug'
                  ? 'bg-red-500/[0.08] border-red-500/30 text-red-400'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20'
              } ${errors.type ? 'ring-1 ring-red-500/50' : ''}`}
            >
              <Bug size={16} />
              <span className="text-sm font-medium">Bug Report</span>
            </button>
            <button
              onClick={() => { setType('enhancement'); setErrors((e) => ({ ...e, type: false })) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-[1.5px] transition-all ${
                type === 'enhancement'
                  ? 'bg-blue-500/[0.08] border-blue-500/30 text-blue-400'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20'
              } ${errors.type ? 'ring-1 ring-red-500/50' : ''}`}
            >
              <Lightbulb size={16} />
              <span className="text-sm font-medium">Enhancement Idea</span>
            </button>
          </div>
        </div>

        {/* Tool dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Tool <span className="text-red-400">*</span>
          </label>
          <select
            value={tool}
            onChange={(e) => { setTool(e.target.value); setErrors((prev) => ({ ...prev, tool: false })) }}
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white/80 appearance-none cursor-pointer focus:outline-none focus:border-[#F47B20]/40 ${
              errors.tool ? 'border-red-500/50' : 'border-white/10'
            }`}
          >
            <option value="" disabled className="bg-[#1a1a2e]">Select a tool...</option>
            {TOOL_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group} className="bg-[#1a1a2e]">
                {group.tools.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1a1a2e]">{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-[10px] text-white/25 mt-1 ml-0.5">
            Select the tool where you found the bug, or choose &ldquo;New Tool Idea&rdquo;
          </p>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setErrors((prev) => ({ ...prev, subject: false })) }}
            placeholder="Brief summary of the issue or idea..."
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#F47B20]/40 ${
              errors.subject ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Priority
          </label>
          <div className="flex gap-1.5">
            {(['low', 'medium', 'high'] as const).map((p) => {
              const activeStyles: Record<Priority, string> = {
                low: 'bg-green-500/10 border border-green-500/30 text-green-400',
                medium: 'bg-[#F47B20]/10 border border-[#F47B20]/30 text-[#F47B20]',
                high: 'bg-red-500/10 border border-red-500/30 text-red-400',
              }
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    priority === p
                      ? activeStyles[p]
                      : 'bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((prev) => ({ ...prev, description: false })) }}
            placeholder={descriptionPlaceholder}
            rows={5}
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-white/25 resize-y focus:outline-none focus:border-[#F47B20]/40 ${
              errors.description ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {type === 'bug' && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Info size={11} className="text-red-400/50 flex-shrink-0" />
              <p className="text-[10px] text-red-400/50">
                Bug tip: Describe the steps that led to the issue — this helps me find the root cause faster.
              </p>
            </div>
          )}
        </div>

        {/* Sender identity badge */}
        {hasProfile && profile ? (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-[#F47B20]/15 flex items-center justify-center text-xs font-semibold text-[#F47B20] flex-shrink-0">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/70 truncate">Sending as {profile.name}</p>
              {profile.email && (
                <p className="text-[11px] text-white/30 truncate">{profile.email}</p>
              )}
            </div>
            <span className="text-[10px] text-white/20 flex-shrink-0">From your profile</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-yellow-500/[0.04] border border-yellow-500/20">
            <Info size={14} className="text-yellow-400/60 flex-shrink-0" />
            <p className="text-xs text-yellow-400/70 flex-1">
              <button
                onClick={() => setShowProfileModal(true)}
                className="underline hover:text-yellow-300 transition-colors"
              >
                Set up your profile
              </button>
              {' '}to send feedback
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!hasProfile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#F47B20] text-white text-sm font-semibold hover:bg-[#F47B20]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail size={14} />
            Open in Email Client
          </button>
          <button
            onClick={copyFeedbackToClipboard}
            disabled={!hasProfile || !type || !tool || !subject.trim() || !description.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ClipboardCopy size={12} />
            Copy to Clipboard
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            <RotateCcw size={12} />
            Clear
          </button>
        </div>
        <p className="text-[10px] text-white/20">
          Opens your default email client with a pre-formatted message to {RECIPIENT}
        </p>
      </div>
    </div>
  )
}
