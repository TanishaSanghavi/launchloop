import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  /** 0–100 */
  percent: number
  size?: number
  stroke?: number
  /** Show the percentage in the middle (hidden automatically below ~56px). */
  showValue?: boolean
  /** Draw the ring once on load with a CSS keyframe (landing hero only). */
  intro?: boolean
  className?: string
}

/**
 * Circular progress, the product's signature element: the ring "closes" as
 * milestones are completed, and turns green with a check at 100%.
 * Pure SVG + CSS so it also prerenders to static HTML on the landing page.
 */
export function ProgressRing({ percent, size = 56, stroke, showValue = true, intro = false, className }: ProgressRingProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  const strokeWidth = stroke ?? Math.max(4, Math.round(size / 11))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - value / 100)
  const complete = value === 100
  const showText = showValue && size >= 56

  return (
    <div
      role="img"
      aria-label={complete ? 'Complete' : `${value}% complete`}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-accent)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={complete ? 'var(--color-success)' : 'var(--color-loop)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={intro ? 'ring-intro' : undefined}
          style={
            intro
              ? ({ '--ring-c': c } as React.CSSProperties)
              : { transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2, 0.7, 0.2, 1), stroke 0.3s' }
          }
        />
      </svg>
      {showText && (
        <span className="absolute inset-0 flex items-center justify-center font-display font-semibold tabular-nums text-foreground" style={{ fontSize: size * 0.27 }}>
          {complete ? <Check className="text-success" style={{ width: size * 0.34, height: size * 0.34 }} aria-hidden="true" /> : `${value}%`}
        </span>
      )}
    </div>
  )
}
