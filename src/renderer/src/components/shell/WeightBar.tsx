import type { JSX } from 'react'
import { cn } from '@renderer/lib/utils'

/** Thin weight / share bar (0–100). */
export function WeightBar({
  percent,
  className,
  tone = 'accent'
}: {
  percent: number
  className?: string
  tone?: 'accent' | 'neutral' | 'gain' | 'primary' | 'error' | 'muted'
}): JSX.Element {
  const w = Math.max(0, Math.min(100, percent))
  const resolved =
    tone === 'primary' ? 'accent' : tone === 'error' ? 'neutral' : tone === 'muted' ? 'neutral' : tone

  return (
    <div
      className={cn(
        'h-1 w-full overflow-hidden rounded-sm bg-[var(--surface-3)]',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-sm transition-[width] duration-200',
          resolved === 'accent' && 'bg-[var(--accent)]',
          resolved === 'neutral' && 'bg-[var(--cat-5)]',
          resolved === 'gain' && 'bg-[var(--gain)]'
        )}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}
