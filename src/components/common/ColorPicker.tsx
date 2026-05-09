import { useState, memo, useCallback } from 'react'
import { Pipette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  presets?: string[]
  recentColors?: string[]
}

const defaultPresets = [
  '#FFFFFF', '#000000', '#EF4444', '#14B8A6',
  '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
]

const HEX_PATTERN = /^#[0-9a-fA-F]{0,6}$/

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

export const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
  label,
  presets = defaultPresets,
  recentColors,
}: ColorPickerProps) {
  const [showHex, setShowHex] = useState(false)

  const pickEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper()
      const result = await dropper.open()
      if (result?.sRGBHex) onChange(result.sRGBHex)
    } catch {
      // User cancelled or API unavailable — silently ignore
    }
  }, [onChange])

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
      <div className="flex items-center gap-2">
        {/* Current color + native picker */}
        <label
          className="w-8 h-8 rounded-lg cursor-pointer flex-shrink-0 overflow-hidden"
          style={{ border: '1px solid var(--border-default)', backgroundColor: value }}
          title="Custom color"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-0 h-0"
          />
        </label>

        {/* Presets */}
        <div className="flex gap-1 flex-wrap">
          {presets.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`
                w-5 h-5 rounded-md transition-all duration-150
                ${value === color ? 'scale-110' : ''}
              `}
              style={{ backgroundColor: color, border: value === color ? '1px solid var(--text-muted)' : '1px solid var(--border-subtle)' }}
              title={color}
            />
          ))}
        </div>

        {/* Eyedropper */}
        {hasEyeDropper && (
          <button
            onClick={pickEyeDropper}
            className="flex items-center justify-center w-5 h-5 rounded transition-colors"
            style={{ color: 'var(--text-disabled)' }}
            title="Pick color from screen"
          >
            <Pipette size={13} />
          </button>
        )}

        {/* Hex input toggle */}
        <button
          onClick={() => setShowHex(!showHex)}
          className="text-[10px] ml-auto transition-colors"
          style={{ color: 'var(--text-disabled)' }}
        >
          {showHex ? value : '#'}
        </button>
      </div>

      {/* Recent colors */}
      {recentColors && recentColors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>Recent</span>
          {recentColors.map(rc => (
            <button
              key={rc}
              onClick={() => onChange(rc)}
              className="w-4 h-4 rounded-full transition-all duration-150"
              style={{
                backgroundColor: rc,
                border: value === rc ? '1.5px solid var(--text-muted)' : '1px solid var(--border-subtle)',
                transform: value === rc ? 'scale(1.15)' : undefined,
              }}
              title={rc}
            />
          ))}
        </div>
      )}

      {showHex && (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (HEX_PATTERN.test(v)) onChange(v)
          }}
          className="w-full px-2 py-1 text-xs rounded-md focus:outline-none focus:border-[#14B8A6]/40"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          placeholder="#000000"
        />
      )}
    </div>
  )
})
