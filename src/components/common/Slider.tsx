import { memo } from 'react'
import type { InputHTMLAttributes } from 'react'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  showValue?: boolean
  suffix?: string
}

export const Slider = memo(function Slider({
  label,
  showValue = true,
  suffix = '',
  value,
  className = '',
  style,
  ...props
}: SliderProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showValue && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {value}{suffix}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        value={value}
        className="
          w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20]
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-[#F47B20]/30
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
        "
        style={{ background: 'var(--bg-elevated)', ...style }}
        {...props}
      />
    </div>
  )
})
