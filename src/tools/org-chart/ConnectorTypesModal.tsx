import { useState, useCallback, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import type { OrgChartStore } from './orgChartStore.ts'
import type { ConnectorType, ConnectorTypeId } from './types.ts'
import { createDefaultConnectorTypes } from './types.ts'
import { drawStyledLine } from './connectorStyle.ts'
import { Modal } from '@/components/common/Modal.tsx'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'

const STYLE_CAPTIONS: Record<ConnectorTypeId, string> = {
  'primary':      'Solid · primary structure',
  'dotted-line':  'Dashed · secondary authority',
  'supports':     'Dotted · supporting relationship',
  'collaborates': 'Double · peer collaboration',
}

function LineSample({ type }: { type: ConnectorType }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = 60 * dpr
    canvas.height = 14 * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, 60, 14)
    drawStyledLine(ctx, [[2, 7], [58, 7]], type, 1)
  }, [type])

  return (
    <canvas
      ref={ref}
      style={{ width: 60, height: 14 }}
      data-testid={`type-sample-${type.id}`}
    />
  )
}

function ConnectorTypeRow({
  type,
  isDefault,
  onUpdate,
  onReset,
}: {
  type: ConnectorType
  isDefault: boolean
  onUpdate: (updates: Partial<Pick<ConnectorType, 'label' | 'color'>>) => void
  onReset: () => void
}): React.ReactElement {
  const [labelValue, setLabelValue] = useState(type.label)
  const [labelError, setLabelError] = useState(false)

  // Keep the input synced if the underlying type changes externally (reset all, undo)
  useEffect(() => { setLabelValue(type.label) }, [type.label])

  const commitLabel = useCallback(() => {
    const trimmed = labelValue.trim()
    if (trimmed === '') {
      setLabelError(true)
      setLabelValue(type.label)
      setTimeout(() => setLabelError(false), 800)
      return
    }
    if (trimmed !== type.label) {
      onUpdate({ label: trimmed.slice(0, 40) })
    }
  }, [labelValue, type.label, onUpdate])

  return (
    <div
      className="p-3 rounded-md border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Top row: sample · label input · reset button */}
      <div className="flex items-start gap-3">
        <div className="flex items-center flex-shrink-0" style={{ width: 60, height: 14, marginTop: 8 }}>
          <LineSample type={type} />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={labelValue}
            onChange={e => setLabelValue(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            placeholder={type.label}
            maxLength={40}
            className="w-full bg-transparent border-b text-sm py-1 outline-none transition-colors"
            style={{
              color: 'var(--text-primary)',
              borderColor: labelError ? '#ef4444' : 'var(--border-default)',
            }}
            aria-label={`Label for ${type.id} connector type`}
            data-testid={`type-label-${type.id}`}
          />
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
            {STYLE_CAPTIONS[type.id]}
          </p>
        </div>
        <div className="flex-shrink-0">
          {!isDefault ? (
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
              title="Reset to default"
              data-testid={`type-reset-${type.id}`}
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <div style={{ width: 28, height: 28 }} aria-hidden="true" />
          )}
        </div>
      </div>
      {/* Bottom row: ColorPicker (full width under label) */}
      <div className="mt-3 pl-[72px]" data-testid={`type-color-${type.id}`}>
        <ColorPicker
          value={type.color}
          onChange={color => onUpdate({ color })}
        />
      </div>
    </div>
  )
}

export function ConnectorTypesModal({
  store,
  isOpen,
  onClose,
}: {
  store: OrgChartStore
  isOpen: boolean
  onClose: () => void
}): React.ReactElement {
  const defaults = createDefaultConnectorTypes()

  const isDefault = useCallback((type: ConnectorType): boolean => {
    const def = defaults.find(d => d.id === type.id)
    return def ? def.label === type.label && def.color === type.color : false
  }, [defaults])

  const handleResetAll = (): void => {
    if (window.confirm('Reset all connector types to defaults?')) {
      store.resetAllConnectorTypes()
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Connector Types" width="lg">
      <div>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Rename or recolor line styles used in this chart. The line style itself
          (solid, dashed, etc.) is fixed per type.
        </p>
        <div className="space-y-2">
          {store.connectorTypes.map(type => (
            <ConnectorTypeRow
              key={type.id}
              type={type}
              isDefault={isDefault(type)}
              onUpdate={updates => store.updateConnectorType(type.id, updates)}
              onReset={() => store.resetConnectorType(type.id)}
            />
          ))}
        </div>
        <div
          className="flex items-center justify-between mt-5 pt-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={handleResetAll}
            className="text-[11px] px-2 py-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            data-testid="reset-all-types"
          >
            Reset all to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-medium px-3 py-1.5 rounded-md"
            data-testid="close-connector-types"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
