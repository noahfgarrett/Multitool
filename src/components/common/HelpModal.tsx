import { Modal } from '@/components/common/Modal.tsx'
import { toolHelp } from '@/data/toolHelp.ts'
import { Lightbulb } from 'lucide-react'
import type { ToolId } from '@/types'

interface HelpModalProps {
  toolId: ToolId
  open: boolean
  onClose: () => void
}

export function HelpModal({ toolId, open, onClose }: HelpModalProps) {
  const content = toolHelp[toolId]

  if (!content) {
    return (
      <Modal open={open} onClose={onClose} title="Help" width="md">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No help available for this tool yet.</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={content.title} width="lg">
      <div className="space-y-4">
        {/* Intro */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{content.intro}</p>

        {/* Sections */}
        {content.sections.map((section, sIdx) => (
          <div key={sIdx}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {section.heading}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-[#14B8A6] mt-1 flex-shrink-0">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Tips */}
        {content.tips && content.tips.length > 0 && (
          <div className="rounded-lg bg-[#14B8A6]/[0.06] border border-[#14B8A6]/[0.12] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-[#14B8A6]" />
              <span className="text-xs font-semibold text-[#14B8A6]">Tips</span>
            </div>
            <ul className="space-y-1">
              {content.tips.map((tip, tIdx) => (
                <li key={tIdx} className="flex items-start gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-[#14B8A6]/60 mt-0.5 flex-shrink-0">&bull;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
