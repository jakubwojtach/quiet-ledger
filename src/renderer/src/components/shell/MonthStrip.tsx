import type { JSX } from 'react'
import type { CashflowMonthPoint } from '@shared/types'
import { cn } from '@renderer/lib/utils'

/** Mini income spark bars — click to jump month. */
export function MonthStrip({
  points,
  activeMonth,
  onSelect,
  className
}: {
  points: CashflowMonthPoint[]
  activeMonth: string
  onSelect: (month: string) => void
  className?: string
}): JSX.Element | null {
  const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month)).slice(-18)
  if (sorted.length === 0) return null

  const max = Math.max(...sorted.map((p) => p.incomePlnMinor), 1)

  return (
    <div
      className={cn('ml-1 flex h-6 items-end gap-0.5', className)}
      title={`${sorted.length} months`}
      data-testid="month-strip"
    >
      {sorted.map((p) => {
        const h = Math.max(4, Math.round((p.incomePlnMinor / max) * 22))
        const active = p.month === activeMonth
        return (
          <button
            key={p.month}
            type="button"
            aria-label={p.month}
            aria-pressed={active}
            onClick={() => onSelect(p.month)}
            className="flex h-6 w-1 items-end"
          >
            <i
              className={cn(
                'block w-full rounded-sm',
                active ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)] hover:bg-[var(--ink-3)]'
              )}
              style={{ height: h }}
            />
          </button>
        )
      })}
    </div>
  )
}
