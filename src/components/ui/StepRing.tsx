import { STEP_LABELS } from '@/types'

interface StepRingProps {
  currentStep: 1 | 2 | 3 | 4
  progress: number
  size?: 'sm' | 'md' | 'lg'
}

export function StepRing({ currentStep, progress, size = 'md' }: StepRingProps) {
  const sizes = { sm: 56, md: 80, lg: 100 }
  const r = sizes[size]
  const dim = r * 2 + 16
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress * circumference)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90" style={{ position: 'absolute' }}>
          <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="oklch(0.94 0.012 80)" strokeWidth={size === 'sm' ? 6 : 8} />
          <circle
            cx={dim/2} cy={dim/2} r={r} fill="none"
            stroke="oklch(0.31 0.07 250)"
            strokeWidth={size === 'sm' ? 6 : 8}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-primary ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}>{currentStep}</span>
          <span className="text-xs text-muted">/4</span>
        </div>
      </div>
      <span className="text-xs font-medium text-ink">{STEP_LABELS[currentStep]}</span>
    </div>
  )
}
