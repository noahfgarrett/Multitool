import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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

export function LegendPositionChip({ store }: { store: OrgChartStore }): React.ReactElement | null {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Hide chip when there are no secondary connections — legend wouldn't render anyway
  if (store.connections.length === 0) return null

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
        <span>Legend</span>
        <span className="text-white/40">·</span>
        <span>{POSITION_LABELS[current]}</span>
        <ChevronDown size={12} className="text-white/40" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-30 p-2 bg-dark-elevated/95 backdrop-blur-md border border-white/[0.1] rounded-lg shadow-xl"
          data-testid="legend-position-grid"
        >
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
