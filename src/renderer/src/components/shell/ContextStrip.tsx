import type { JSX, ReactNode } from 'react'
import type { RailPeriodItem } from './AppRail'
import { cn } from '@renderer/lib/utils'

export function ContextStrip({
  title,
  periods,
  periodsLabel,
  leading,
  trailing,
  below,
  className
}: {
  title: string
  periods?: RailPeriodItem[]
  periodsLabel?: string
  leading?: ReactNode
  trailing?: ReactNode
  below?: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} data-testid="context-strip">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="truncate font-display text-xl text-ink md:text-2xl">{title}</h1>
          {leading}
        </div>
        {trailing ? <div className="flex flex-wrap items-center gap-2">{trailing}</div> : null}
      </div>

      {periods && periods.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          {periodsLabel ? (
            <span className="hidden shrink-0 text-[10px] font-semibold tracking-[0.14em] text-ink-muted uppercase sm:inline">
              {periodsLabel}
            </span>
          ) : null}
          <ul
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label={periodsLabel}
          >
            {periods.map((p) => (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  aria-label={p.label}
                  aria-pressed={p.active}
                  data-testid={`strip-period-${p.id}`}
                  onClick={p.onClick}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-left text-sm font-medium transition-colors',
                    p.active
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-ink hover:bg-base-200/70'
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {below}
    </div>
  )
}
