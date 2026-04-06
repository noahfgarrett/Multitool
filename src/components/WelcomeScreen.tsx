import { useAppStore } from '@/stores/appStore.ts'
import { categories } from '@/tools/registry.ts'
import type { ToolId } from '@/types/index.ts'
import {
  FileText, Image, FolderCog, Sparkles, Wrench,
  Combine, Scissors, PenTool, Stamp, ScanText,
  Maximize2, Eraser, Archive, ArrowRightLeft,
  ClipboardList, Network, LayoutDashboard, GitBranch,
  QrCode, Table, Lightbulb,
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

          <h1 className="text-4xl font-display font-bold text-[#F47B20] mb-3">
            LotusWorks Toolkit
          </h1>
          <p className="text-lg text-white/50 max-w-lg mx-auto">
            Your all-in-one productivity suite. Select a tool to get started.
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
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
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
                          bg-white/[0.03] border border-white/[0.06]
                          hover:bg-white/[0.06] hover:border-lotus-orange/30
                          transition-all duration-200
                          text-left
                        "
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 group-hover:text-lotus-orange group-hover:bg-lotus-orange/10 transition-colors">
                          {ToolIcon && <ToolIcon size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tool.label}</p>
                          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{tool.description}</p>
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
