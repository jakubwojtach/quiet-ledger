import type { JSX } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatMinorUnits } from '@shared/money'
import type { DashboardSnapshot } from '@shared/types'
import { useNetWorthHistory, useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { AllocationChart } from '@renderer/components/charts/AllocationChart'
import { NetWorthSparkline } from '@renderer/components/charts/NetWorthSparkline'
import { FadeUp } from '@renderer/components/motion/PageTransition'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'

interface DashboardProps {
  data: DashboardSnapshot
  isFetching: boolean
}

export function TotalSavingsCard({
  data,
  isFetching
}: DashboardProps): JSX.Element {
  const refresh = useRefreshPrices()
  const history = useNetWorthHistory()
  const { t, localeTag } = useLocale()

  return (
    <FadeUp>
      <Card className="overflow-hidden border-brass/30 bg-[var(--color-card)]">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <CardDescription className="tracking-[0.18em] uppercase text-brass">
              {t('dashboard.totalSavings')}
            </CardDescription>
            <CardTitle className="mt-2 font-display text-hero leading-[1.05] tracking-tight break-words text-ink tabular-nums">
              {formatMinorUnits(data.totalAssetsPlnMinor, 'PLN', localeTag)}
            </CardTitle>
            <p className="mt-2 text-xs text-ink-muted">
              {t('dashboard.asOf', {
                date: new Date(data.asOf).toLocaleString(localeTag)
              })}
              {data.fxStale ? ` ${t('dashboard.fxStale')}` : ''}
            </p>
            {data.totalLiabilitiesPlnMinor > 0 && (
              <p className="mt-1 text-xs text-ink-muted">
                {t('dashboard.afterDebts')}{' '}
                <span className="font-medium text-ink">
                  {formatMinorUnits(data.netWorthPlnMinor, 'PLN', localeTag)}
                </span>
              </p>
            )}
          </div>
          <Button
            className="shrink-0 self-start"
            variant="outline"
            size="sm"
            disabled={refresh.isPending || isFetching}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className={`size-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
            {t('action.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <NetWorthSparkline points={history.data ?? []} />
        </CardContent>
      </Card>
    </FadeUp>
  )
}

export function ClassBreakdownCard({ data }: { data: DashboardSnapshot }): JSX.Element {
  const { t, localeTag } = useLocale()
  return (
    <FadeUp delay={0.06}>
      <Card className="flex h-full min-h-0 flex-col" data-testid="class-breakdown">
        <CardHeader>
          <CardTitle>{t('dashboard.breakdown')}</CardTitle>
          <CardDescription>{t('dashboard.breakdownHint')}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <AllocationChart breakdown={data.breakdown} />
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('dashboard.emptyHoldings')}</p>
          ) : (
            data.breakdown.map((row) => (
              <div key={row.class} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{t(`class.${row.class}`)}</span>
                  <span className="tabular-nums text-ink-muted">
                    {row.percentOfTotal.toFixed(1)}% ·{' '}
                    {formatMinorUnits(row.plnValueMinor, 'PLN', localeTag)}
                  </span>
                </div>
                <Progress value={Math.min(100, row.percentOfTotal)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </FadeUp>
  )
}

/** @deprecated prefer TotalSavingsCard + ClassBreakdownCard for layout control */
export function Dashboard({ data, isFetching }: DashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <TotalSavingsCard data={data} isFetching={isFetching} />
      <ClassBreakdownCard data={data} />
    </div>
  )
}
