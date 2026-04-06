import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      {icon && (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-disabled)' }}>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
