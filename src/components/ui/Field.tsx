import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  /** e.g. "12/80" */
  counter?: string
  counterWarn?: boolean
  children: ReactNode
  className?: string
}

/** Label + control + hint/error, wired for screen readers via the caller's id. */
export function Field({ label, htmlFor, hint, error, counter, counterWarn, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {counter && (
          <span className={cn('text-xs tabular-nums', counterWarn ? 'text-warning' : 'text-muted-foreground')}>{counter}</span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-[#f87171]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
