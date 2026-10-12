import type { JSX, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import type { CurrencyCode } from '@shared/money'
import { cn } from '@renderer/lib/utils'

export function MetricChip({
  label,
  value,
  amountMinor,
  currency = 'PLN',
  hint,
  icon: Icon,
  featured,
  trend,
  className
}: {
  label: string
  /** Custom value node — ignored when amountMinor is set */
  value?: ReactNode
  amountMinor?: number
  currency?: CurrencyCode
  hint?: ReactNode
  icon?: LucideIcon
  featured?: boolean
  trend?: 'up' | 'down' | 'flat' | null
  className?: string
}): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3xl p-5 transition-shadow',
        featured
          ? 'bg-primary text-primary-content shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]'
          : 'border border-line/50 bg-base-100 shadow-[var(--panel-shadow)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            'min-w-0 text-[13px] font-semibold tracking-[-0.01em]',
            featured ? 'text-primary-content/75' : 'text-ink-muted'
          )}
        >
          {label}
        </div>
        {Icon ? (
          <span
            className={cn(
              'inline-flex size-10 shrink-0 items-center justify-center rounded-2xl',
              featured ? 'bg-primary-content/15 text-primary-content' : 'bg-base-200 text-primary'
            )}
          >
            <Icon className="size-4.5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'mt-3 font-display text-[clamp(1.35rem,0.9rem+1.1vw,2rem)] leading-none',
          featured ? 'text-primary-content' : 'text-ink'
        )}
      >
        {amountMinor != null ? (
          <MoneyAmount amountMinor={amountMinor} currency={currency} />
        ) : (
          value
        )}
      </div>

      {hint ? (
        <div
          className={cn(
            'mt-2 flex items-center gap-1.5 text-xs',
            featured ? 'text-primary-content/70' : 'text-ink-muted'
          )}
        >
          {trend === 'up' && <TrendingUp className="size-3.5 shrink-0 text-success" />}
          {trend === 'down' && <TrendingDown className="size-3.5 shrink-0 text-error" />}
          <span className="min-w-0">{hint}</span>
        </div>
      ) : null}
    </div>
  )
}
