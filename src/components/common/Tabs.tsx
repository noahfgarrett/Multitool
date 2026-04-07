import { memo } from 'react'

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export const Tabs = memo(function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div
      className={`flex gap-1 p-1 rounded-lg ${className}`}
      style={{ background: 'color-mix(in srgb, var(--bg-surface) 40%, transparent)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150
            ${activeTab === tab.id
              ? 'bg-[#14B8A6] text-white shadow-sm'
              : 'hover:bg-white/[0.06]'
            }
          `}
          style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
})
