import { useAppStore } from '@/stores/appStore.ts'
import { categories } from '@/tools/registry.ts'
import { getUserProfile } from '@/utils/userProfile.ts'
import type { ToolId } from '@/types/index.ts'
import {
  FileText, Image, FolderCog, Sparkles, Wrench,
  Combine, Scissors, PenTool, Stamp, ScanText,
  Maximize2, Eraser, Archive, ArrowRightLeft,
  ClipboardList, Network, LayoutDashboard, GitBranch,
  QrCode, Table, Lightbulb, User,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText, Image, FolderCog, Sparkles, Wrench,
  Combine, Scissors, PenTool, Stamp, ScanText,
  Maximize2, Eraser, Archive, ArrowRightLeft,
  ClipboardList, Network, LayoutDashboard, GitBranch,
  QrCode, Table,
}

export function WelcomeScreen() {
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const profile = getUserProfile()
  const firstName = profile?.name?.split(/\s+/)[0] || ''

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12 pt-8 relative">
          {/* "Got an Idea?" button — top right */}
          <button
            onClick={() => setActiveView('feedback', { preselectedType: 'enhancement' })}
            className="
              btn-idea-shimmer
              absolute top-8 right-0
              flex items-center gap-2
              px-4 py-2 rounded-full
              border border-[#F47B20]/40
              text-[#F47B20] text-sm font-medium
              hover:bg-[#F47B20]/15 hover:border-[#F47B20]/60
              transition-colors duration-200
            "
          >
            <Lightbulb size={16} />
            Got an Idea?
          </button>

          {/* Profile avatar */}
          {profile && (
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full border-2 border-[#F47B20]/30 flex items-center justify-center overflow-hidden" style={{ background: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)' }}>
                {profile.photo ? (
                  <img src={profile.photo} alt="" className="w-full h-full object-cover" />
                ) : profile.initials ? (
                  <span className="text-xl font-bold text-[#F47B20]">{profile.initials}</span>
                ) : (
                  <User size={28} className="text-[#F47B20]/50" />
                )}
              </div>
            </div>
          )}

          {firstName ? (
            <h1 className="text-4xl font-display font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Welcome back, <span className="text-[#F47B20]">{firstName}</span>
            </h1>
          ) : (
            <h1 className="text-4xl font-display font-bold text-[#F47B20] mb-3">
              LotusWorks Toolkit
            </h1>
          )}
          <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
            {firstName ? 'Select a tool to get started.' : 'Your all-in-one productivity suite. Select a tool to get started.'}
          </p>
        </div>

        {/* Tool grid by category */}
        <div className="space-y-8">
          {categories.map((cat) => {
            const CatIcon = iconMap[cat.icon]

            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  {CatIcon && <CatIcon size={16} className="text-lotus-orange" />}
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {cat.label}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cat.tools.map((tool) => {
                    const ToolIcon = iconMap[tool.icon]

                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as ToolId)}
                        className="
                          group flex flex-col items-start gap-2 p-4 rounded-xl
                          border transition-all duration-200 text-left
                        "
                        style={{
                          background: 'color-mix(in srgb, var(--bg-surface) 30%, transparent)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:text-lotus-orange group-hover:bg-lotus-orange/10 transition-colors" style={{ background: 'color-mix(in srgb, var(--bg-surface) 50%, transparent)', color: 'var(--text-disabled)' }}>
                          {ToolIcon && <ToolIcon size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tool.label}</p>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-disabled)' }}>{tool.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
