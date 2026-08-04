import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import type { OrgChartStore } from './orgChartStore.ts'
import type { LegendPosition } from './types.ts'

const POSITION_LABELS: Record<LegendPosition, string> = {
  'top-left':     'Top-Left',
  'top-right':    'Top-Right',
  'bottom-left':  'Bottom-Left',
  'bottom-right': 'Bottom-Right',
}

const POSITION_GRID: LegendPosition[][] = [
  ['top-left', 'top-right'],
  ['bottom-left', 'bottom-right'],
]

export function LegendPositionChip({ store }: { store: OrgChartStore }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const current = store.legend.position

  return (
    <div ref={ref} className="relative" data-testid="legend-position-chip-wrapper">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 text-[11px] font-medium transition-colors"
        data-testid="legend-position-chip"
        title="Legend position"
      >
        {store.legend.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        <span>Legend</span>
        <span className="text-white/40">·</span>
        <span>{store.legend.visible ? POSITION_LABELS[current] : 'Hidden'}</span>
        <ChevronDown size={12} className="text-white/40" />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1 z-30 p-3 bg-dark-elevated/95 backdrop-blur-md border border-white/[0.1] rounded-lg shadow-xl"
          data-testid="legend-position-grid"
        >
          <label className="flex items-center justify-between gap-4 text-[11px] text-white/80 mb-2">
            <span>Show legend</span>
            <input
              type="checkbox"
              checked={store.legend.visible}
              onChange={event => store.updateLegend({ visible: event.target.checked })}
              className="accent-[#14B8A6]"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-[11px] text-white/70 mb-2">
            <span>Relationships</span>
            <input
              type="checkbox"
              checked={store.legend.showRelationships}
              onChange={event => store.updateLegend({ showRelationships: event.target.checked })}
              className="accent-[#14B8A6]"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-[11px] text-white/70 mb-3">
            <span>Departments</span>
            <input
              type="checkbox"
              checked={store.legend.showDepartments}
              onChange={event => store.updateLegend({ showDepartments: event.target.checked })}
              className="accent-[#14B8A6]"
            />
          </label>
          <div className="grid grid-cols-2 gap-1" style={{ width: 120 }}>
            {POSITION_GRID.flat().map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => {
                  store.setLegendPosition(pos)
                  setOpen(false)
                }}
                className={`aspect-square rounded border flex ${
                  pos.startsWith('top') ? 'items-start' : 'items-end'
                } ${
                  pos.endsWith('right') ? 'justify-end' : 'justify-start'
                } p-1.5 transition-colors ${
                  current === pos
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:bg-white/[0.06]'
                }`}
                data-testid={`legend-position-${pos}`}
                title={POSITION_LABELS[pos]}
              >
                <div className="w-3 h-2 bg-current opacity-60 rounded-sm" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
