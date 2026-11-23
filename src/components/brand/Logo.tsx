import { cn } from '@/lib/utils'

/**
 * The LaunchLoop mark: a loop that is almost closed. The gap and the dot at its
 * leading end are the product idea — a project is a loop you finish.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const r = 11
  const circumference = 2 * Math.PI * r
  const sweep = 0.83 // fraction of the circle drawn; the rest is the open gap
  const endAngle = (-90 + 360 * sweep) * (Math.PI / 180)
  const dotX = 16 + r * Math.cos(endAngle)
  const dotY = 16 + r * Math.sin(endAngle)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <circle
        cx="16"
        cy="16"
        r={r}
        stroke="var(--color-loop)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={`${circumference * sweep} ${circumference}`}
        transform="rotate(-90 16 16)"
      />
      <circle cx={dotX} cy={dotY} r="3.4" fill="#ffffff" />
    </svg>
  )
}

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="font-display text-[1.15rem] font-semibold leading-none tracking-tight text-foreground">
        LaunchLoop
      </span>
    </span>
  )
}
