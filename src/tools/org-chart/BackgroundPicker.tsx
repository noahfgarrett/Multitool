import { useEffect, useRef, useState } from 'react'
import { Check, PaintBucket } from 'lucide-react'
import type { OrgChartStore } from './orgChartStore.ts'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'

const BACKGROUND_PRESETS = [
  '#0a0a14', '#111827', '#1f2937', '#334155',
  '#ffffff', '#f8fafc', '#eff6ff', '#f0fdf4',
]

export function BackgroundPicker({ store }: { store: OrgChartStore }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative" data-testid="org-chart-background-color">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        title="Chart background"
        aria-label="Chart background"
        aria-expanded={open}
        className={`relative p-1.5 rounded transition-colors ${
          open ? 'bg-white/[0.1] text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.08]'
        }`}
      >
        <PaintBucket size={16} />
        <span
          className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white/60"
          style={{ backgroundColor: store.background.color }}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-40 mt-1 w-64 rounded-md p-3 shadow-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          role="dialog"
          aria-label="Chart background colors"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Background</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
              {store.background.color.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {BACKGROUND_PRESETS.map(color => {
              const selected = store.background.color.toLowerCase() === color
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => store.setBackgroundColor(color)}
                  className="relative h-9 rounded-md"
                  style={{ backgroundColor: color, border: '1px solid var(--border-default)' }}
                  aria-label={`Use background ${color}`}
                  title={color}
                >
                  {selected ? (
                    <Check
                      size={14}
                      className={`absolute inset-0 m-auto ${color === '#ffffff' || color === '#f8fafc' || color === '#eff6ff' || color === '#f0fdf4' ? 'text-gray-900' : 'text-white'}`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          <ColorPicker
            value={store.background.color}
            onChange={store.setBackgroundColor}
            presets={[]}
          />
        </div>
      ) : null}
    </div>
  )
}
