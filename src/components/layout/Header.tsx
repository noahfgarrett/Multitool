import { useState } from 'react'
import { useAppStore } from '@/stores/appStore.ts'
import { tools } from '@/tools/registry.ts'
import { toolHelp } from '@/data/toolHelp.ts'
import { HelpModal } from '@/components/common/HelpModal.tsx'
import { HelpCircle } from 'lucide-react'

export function Header() {
  const activeTool = useAppStore((s) => s.activeTool)
  const activeView = useAppStore((s) => s.activeView)
  const toolDef = activeTool ? tools.find((t) => t.id === activeTool) : null
  const [helpOpen, setHelpOpen] = useState(false)

  const hasHelp = toolDef && toolHelp[toolDef.id]

  return (
    <header className={`${toolDef || activeView === 'feedback' ? 'h-10' : 'h-14'} flex items-center px-6 border-b`} style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)' }}>
      {activeView === 'feedback' ? (
        <div className="flex-1 min-w-0 flex items-center">
          <h1 className="text-base font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Report Bug / Idea
          </h1>
        </div>
      ) : toolDef ? (
        <div className="flex-1 min-w-0 flex items-center">
          <h1 className="text-base font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            {toolDef.label}
          </h1>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Welcome
          </h1>
          <p className="text-xs -mt-0.5" style={{ color: 'var(--text-muted)' }}>Select a tool from the sidebar</p>
        </div>
      )}

      {hasHelp && (
        <>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors"
            style={{ color: 'var(--text-disabled)' }}
            title="Help & instructions"
            aria-label="Help & instructions"
          >
            <HelpCircle size={16} />
          </button>
          <HelpModal
            toolId={toolDef!.id}
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
          />
        </>
      )}
    </header>
  )
}
