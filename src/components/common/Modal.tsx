import { useEffect, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export function Modal({ open, onClose, title, children, width = 'md' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`
          relative w-full ${widths[width]}
          rounded-xl animate-scale-in
        `}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-base font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--text-disabled)' }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
