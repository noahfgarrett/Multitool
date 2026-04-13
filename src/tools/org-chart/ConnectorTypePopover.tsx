import { useEffect, useRef } from 'react'
import type { OrgChartStore } from './orgChartStore.ts'
import type { ConnectorType } from './types.ts'
import { drawStyledLine } from './connectorStyle.ts'

function PopoverLineSample({ type }: { type: ConnectorType }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = 42 * dpr
    canvas.height = 10 * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, 42, 10)
    drawStyledLine(ctx, [[1, 5], [41, 5]], type, 1)
  }, [type])
  return <canvas ref={ref} style={{ width: 42, height: 10 }} />
}

export function ConnectorTypePopover({ store }: { store: OrgChartStore }): React.ReactElement | null {
  const { connectMode, connectorTypes, confirmConnection, cancelTypePicker } = store
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (connectMode.state !== 'picking-type') return

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelTypePicker()
        return
      }
      const idx = parseInt(e.key, 10) - 1
      if (idx >= 0 && idx < connectorTypes.length) {
        e.preventDefault()
        confirmConnection(connectorTypes[idx].id)
      }
    }

    const onClickOutside = (e: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        cancelTypePicker()
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [connectMode.state, connectorTypes, confirmConnection, cancelTypePicker])

  if (connectMode.state !== 'picking-type') return null

  const [anchorX, anchorY] = connectMode.anchorScreenXY

  return (
    <div
      ref={popoverRef}
      data-testid="connect-type-picker"
      className="fixed z-40 bg-dark-elevated/95 backdrop-blur-md border border-white/[0.12] rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: Math.min(anchorX, window.innerWidth - 220),
        top: Math.min(anchorY, window.innerHeight - 220),
        minWidth: 200,
      }}
    >
      <div className="px-3 py-2 border-b border-white/[0.06] text-[10px] text-white/50 uppercase tracking-wide">
        Connection Type
      </div>
      {connectorTypes.map((type, idx) => (
        <button
          key={type.id}
          type="button"
          onClick={() => confirmConnection(type.id)}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
          data-testid={`connect-type-row-${type.id}`}
        >
          <PopoverLineSample type={type} />
          <span className="flex-1 text-[12px] text-white/90">{type.label}</span>
          <span className="text-[10px] text-white/30 font-mono">{idx + 1}</span>
        </button>
      ))}
    </div>
  )
}
