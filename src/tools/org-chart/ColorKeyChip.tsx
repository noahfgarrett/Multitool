import { useEffect, useRef, useState } from 'react'
import { ChevronDown, KeyRound, Plus, Trash2, WandSparkles } from 'lucide-react'
import type { OrgChartStore } from './orgChartStore.ts'
import type { ColorKeyEntry, LegendPosition } from './types.ts'
import { buildColorKeyEntriesFromNodes } from './colorKey.ts'
import { genId } from './types.ts'

const POSITION_LABELS: Record<LegendPosition, string> = {
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
}

export function ColorKeyChip({ store }: { store: OrgChartStore }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const updateEntry = (id: string, updates: Partial<ColorKeyEntry>) => {
    store.updateColorKey({
      entries: store.colorKey.entries.map(entry => entry.id === id ? { ...entry, ...updates } : entry),
    })
  }

  const addEntry = () => {
    store.updateColorKey({
      visible: true,
      entries: [...store.colorKey.entries, {
        id: genId(),
        label: 'Color meaning',
        color: store.nodes[0]?.nodeColor ?? '#14b8a6',
      }],
    })
  }

  return (
    <div ref={ref} className="relative" data-testid="color-key-chip-wrapper">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 text-[11px] font-medium transition-colors"
        data-testid="color-key-chip"
        title="Color key"
        aria-expanded={open}
      >
        <KeyRound size={12} />
        <span>Key</span>
        <ChevronDown size={12} className="text-white/40" />
      </button>
      {open ? (
        <div
          className="absolute top-full right-0 mt-1 z-40 w-80 rounded-md p-3 shadow-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          role="dialog"
          aria-label="Color key settings"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Color key</div>
              <div className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>Describe what each card color means.</div>
            </div>
            <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Show
              <input
                type="checkbox"
                checked={store.colorKey.visible}
                onChange={event => store.updateColorKey({ visible: event.target.checked })}
                className="accent-[#14B8A6]"
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 mb-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Position
            <select
              value={store.colorKey.position}
              onChange={event => store.updateColorKey({ position: event.target.value as LegendPosition })}
              className="rounded px-2 py-1 text-[11px]"
              style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
            >
              {Object.entries(POSITION_LABELS).map(([position, label]) => (
                <option key={position} value={position}>{label}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {store.colorKey.entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={entry.color}
                  onChange={event => updateEntry(entry.id, { color: event.target.value })}
                  className="h-8 w-9 rounded cursor-pointer"
                  aria-label={`Key color ${index + 1}`}
                />
                <input
                  key={`${entry.id}-${entry.label}`}
                  type="text"
                  defaultValue={entry.label}
                  maxLength={80}
                  onBlur={event => updateEntry(entry.id, { label: event.target.value.trim() || 'Color meaning' })}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  aria-label={`Color meaning ${index + 1}`}
                  className="min-w-0 flex-1 rounded px-2 py-1.5 text-xs"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                />
                <button
                  type="button"
                  onClick={() => store.updateColorKey({ entries: store.colorKey.entries.filter(item => item.id !== entry.id) })}
                  aria-label={`Remove key item ${index + 1}`}
                  title="Remove key item"
                  className="p-1.5 rounded text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={addEntry}
              aria-label="Add key item"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-white bg-[#14B8A6] hover:bg-[#0d9488]"
            >
              <Plus size={13} /> Add item
            </button>
            <button
              type="button"
              onClick={() => store.updateColorKey({
                visible: true,
                entries: buildColorKeyEntriesFromNodes(store.nodes),
              })}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              <WandSparkles size={13} /> Use chart colors
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
