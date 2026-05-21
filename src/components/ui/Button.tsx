import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', children, loading, className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90',
    accent:  'bg-accent text-white hover:opacity-90',
    ghost:   'bg-transparent text-ink border border-paper-2 hover:bg-paper-2',
    danger:  'bg-red-500 text-white hover:opacity-90',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center gap-2 font-semibold rounded-sm transition-all disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}
