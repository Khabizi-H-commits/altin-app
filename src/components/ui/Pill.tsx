interface PillProps {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'outline' | 'muted'
  children: React.ReactNode
}

export function Pill({ variant = 'outline', children }: PillProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    accent:  'bg-accent/10 text-accent',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    outline: 'border border-paper-2 text-muted',
    muted:   'bg-paper-2 text-muted',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
