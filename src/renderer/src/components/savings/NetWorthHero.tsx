import type { JSX } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatMinorUnits } from '@shared/money'
import type { DashboardSnapshot } from '@shared/types'
import { useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'

export function NetWorthHero({
  data,
  isFetching,
  periodLabel
}: {
  data: DashboardSnapshot
  isFetching: boolean
  periodLabel: string
}): JSX.Element {
  const refresh = useRefreshPrices()
  const { t, localeTag } = useLocale()

  return (
    <header
      className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      data-testid="net-worth-hero"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-brass uppercase">
          {t('dashboard.netWorth')}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{periodLabel}</p>
        <h2 className="mt-1 font-display text-hero leading-[1.05] tracking-tight break-words text-ink tabular-nums">
          {formatMinorUnits(data.netWorthPlnMinor, 'PLN', localeTag)}
        </h2>
        <p className="mt-2 text-xs text-ink-muted">
          {t('dashboard.asOf', {
            date: new Date(data.asOf).toLocaleString(localeTag)
          })}
          {data.fxStale ? ` ${t('dashboard.fxStale')}` : ''}
        </p>
      </div>
      <Button
        className="shrink-0 self-start sm:self-end"
        variant="outline"
        size="sm"
        disabled={refresh.isPending || isFetching}
        onClick={() => refresh.mutate()}
      >
        <RefreshCw className={`size-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
        {t('action.refresh')}
      </Button>
    </header>
  )
}
