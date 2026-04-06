import { useAppStore } from '@/stores/appStore.ts'
import { categories } from '@/tools/registry.ts'
import { loadUserProfile } from '@/utils/userProfile.ts'
import type { ToolId } from '@/types/index.ts'
import {
  FileText, Image, FolderCog, Sparkles, Wrench,
  Combine, Scissors, PenTool, Stamp, ScanText,
  Maximize2, Eraser, Archive, ArrowRightLeft,
  ClipboardList, Network, LayoutDashboard, GitBranch,
  QrCode, Table, ChevronDown, PanelLeftClose, PanelLeft,
  Home, Settings, User,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText, Image, FolderCog, Sparkles, Wrench,
  Combine, Scissors, PenTool, Stamp, ScanText,
  Maximize2, Eraser, Archive, ArrowRightLeft,
  ClipboardList, Network, LayoutDashboard, GitBranch,
  QrCode, Table,
}

function getIcon(name: string, size = 18, className = '') {
  const Icon = iconMap[name]
  return Icon ? <Icon size={size} className={className} /> : null
}

export function Sidebar() {
  const activeTool = useAppStore((s) => s.activeTool)
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded)
  const sidebarCategories = useAppStore((s) => s.sidebarCategories)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const goHome = useAppStore((s) => s.goHome)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const toggleCategory = useAppStore((s) => s.toggleCategory)
  const openSettings = useAppStore((s) => s.openSettings)
  const profile = loadUserProfile()

  return (
    <aside
      className={`glass-sidebar relative flex flex-col h-full transition-all duration-300 ease-out ${
        sidebarExpanded ? 'w-60' : 'w-14'
      }`}
    >
      {/* Logo / collapse toggle */}
      <div className="flex items-center h-14 px-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {sidebarExpanded && (
          <span className="text-sm font-display font-semibold text-[#F47B20] tracking-wide truncate flex-1">
            LotusWorks Toolkit
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors ml-auto"
          style={{ color: 'var(--text-muted)' }}
          title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
      </div>

      {/* Tool categories */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-1">
        {/* Home Menu button */}
        <button
          onClick={goHome}
          title={sidebarExpanded ? undefined : 'Home Menu'}
          className={`
            w-full flex items-center gap-2.5 rounded-md transition-all duration-150 mb-1
            ${sidebarExpanded ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            ${!activeTool && !activeView
              ? 'bg-[#F47B20]/15 text-[#F47B20]'
              : 'hover:text-[#F47B20] hover:bg-[#F47B20]/[0.06]'
            }
            relative
          `}
          style={activeTool || activeView ? { color: 'var(--text-muted)' } : undefined}
        >
          {!activeTool && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F47B20] rounded-r-full" />
          )}
          <Home size={16} />
          {sidebarExpanded && (
            <span className="text-sm truncate">Home Menu</span>
          )}
        </button>

        <div className="divider-gradient my-1" />

        {categories.map((cat) => {
          const isExpanded = sidebarCategories[cat.id] ?? true

          return (
            <div key={cat.id}>
              {/* Category header */}
              <button
                onClick={() => sidebarExpanded && toggleCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                  sidebarExpanded ? '' : 'justify-center'
                }`}
                style={{ color: 'var(--text-muted)' }}
              >
                {getIcon(cat.icon, 14, 'text-[#F47B20]')}
                {sidebarExpanded && (
                  <>
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex-1 text-left">
                      {cat.label}
                    </span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  </>
                )}
              </button>

              {/* Tools list */}
              {(sidebarExpanded ? isExpanded : true) && (
                <div className={`${sidebarExpanded ? 'mt-0.5 space-y-0.5' : 'mt-1 space-y-1'}`}>
                  {cat.tools.map((tool) => {
                    const isActive = activeTool === tool.id

                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as ToolId)}
                        title={sidebarExpanded ? undefined : tool.label}
                        className={`
                          w-full flex items-center gap-2.5 rounded-md transition-all duration-150
                          ${sidebarExpanded ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                          ${isActive
                            ? 'bg-[#F47B20]/15 text-[#F47B20]'
                            : 'hover:text-[#F47B20] hover:bg-[#F47B20]/[0.06]'
                          }
                          relative
                        `}
                        style={!isActive ? { color: 'var(--text-muted)' } : undefined}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F47B20] rounded-r-full" />
                        )}
                        {getIcon(tool.icon, 16)}
                        {sidebarExpanded && (
                          <span className="text-sm truncate">{tool.label}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {sidebarExpanded ? (
          <div className="flex items-center gap-2">
            {/* Profile avatar */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--bg-surface) 50%, transparent)', border: '1px solid var(--border-default)' }}>
              {profile?.photo ? (
                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={14} style={{ color: 'var(--text-disabled)' }} />
              )}
            </div>
            {/* Name + version */}
            <div className="flex-1 min-w-0">
              {profile?.name && (
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                  {profile.name}
                </p>
              )}
              <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                v{__APP_VERSION__}
              </p>
            </div>
            {/* Settings cog */}
            <button
              onClick={openSettings}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={openSettings}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
