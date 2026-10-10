import type { JSX } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatMinorUnits } from '@shared/money'
import type { DashboardSnapshot } from '@shared/types'
import { useNetWorthHistory, useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { AllocationChart } from '@renderer/components/charts/AllocationChart'
import { NetWorthSparkline } from '@renderer/components/charts/NetWorthSparkline'
import { FadeUp } from '@renderer/components/motion/PageTransition'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'

interface DashboardProps {
  data: DashboardSnapshot
  isFetching: boolean
}

/** Hero card: total savings + sparkline. */
export function TotalSavingsCard({
  data,
  isFetching
}: DashboardProps): JSX.Element {
  const refresh = useRefreshPrices()
  const history = useNetWorthHistory()

  return (
    <FadeUp>
      <Card className="overflow-hidden border-forest/15 bg-gradient-to-br from-white/80 via-white/70 to-sage/20">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <CardDescription>Total savings · PLN</CardDescription>
            <CardTitle className="mt-1 font-display text-4xl tracking-tight break-words text-forest md:text-5xl">
              {formatMinorUnits(data.totalAssetsPlnMinor, 'PLN')}
            </CardTitle>
            <p className="mt-2 text-xs text-ink-muted">
              As of {new Date(data.asOf).toLocaleString('pl-PL')}
              {data.fxStale ? ' · using last-known FX/prices' : ''}
            </p>
            {data.totalLiabilitiesPlnMinor > 0 && (
              <p className="mt-1 text-xs text-ink-muted">
                After debts:{' '}
                <span className="font-medium text-ink">
                  {formatMinorUnits(data.netWorthPlnMinor, 'PLN')}
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
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <NetWorthSparkline points={history.data ?? []} />
        </CardContent>
      </Card>
    </FadeUp>
  )
}

/** Breakdown by asset class — pairs in height with the holdings list. */
export function ClassBreakdownCard({ data }: { data: DashboardSnapshot }): JSX.Element {
  return (
    <FadeUp delay={0.06}>
      <Card className="flex h-full min-h-0 flex-col" data-testid="class-breakdown">
        <CardHeader>
          <CardTitle>Breakdown by class</CardTitle>
          <CardDescription>Share of total savings</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <AllocationChart breakdown={data.breakdown} />
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No holdings yet — use <span className="font-medium text-ink">Add holding</span> to
              start.
            </p>
          ) : (
            data.breakdown.map((row) => (
              <div key={row.class} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    {row.percentOfTotal.toFixed(1)}% · {formatMinorUnits(row.plnValueMinor, 'PLN')}
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
