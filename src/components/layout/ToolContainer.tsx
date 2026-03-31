import type { ReactNode } from 'react'

interface ToolContainerProps {
  children: ReactNode
  fullBleed?: boolean
}

export function ToolContainer({ children, fullBleed }: ToolContainerProps) {
  return (
    <div className={`flex-1 overflow-auto animate-fade-in ${fullBleed ? 'p-0' : 'p-6'}`}>
      {children}
    </div>
  )
}
