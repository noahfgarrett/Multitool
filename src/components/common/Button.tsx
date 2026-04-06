import { memo } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  children: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-[#F47B20] text-white
    hover:bg-[#E06D15] active:bg-[#C75F10]
    shadow-lg shadow-[#F47B20]/20
    hover:shadow-xl hover:shadow-[#F47B20]/30
  `,
  secondary: `
    border
  `,
  ghost: `
    hover:bg-white/[0.08]
  `,
  danger: `
    bg-red-500/15 text-red-400 border border-red-500/30
    hover:bg-red-500/25
  `,
}

/** Inline styles for theme-aware variants */
const variantStyles: Partial<Record<ButtonVariant, CSSProperties>> = {
  secondary: {
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-default)',
  },
  ghost: {
    color: 'var(--text-muted)',
  },
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-6 text-sm rounded-lg gap-2',
}

export const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F47B20]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-base
        disabled:opacity-40 disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      style={variantStyles[variant]}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
})
