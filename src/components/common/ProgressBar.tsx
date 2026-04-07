import { memo } from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  className?: string
}

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showPercent && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(percent)}%</span>
          )}
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full bg-[#14B8A6] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
})
