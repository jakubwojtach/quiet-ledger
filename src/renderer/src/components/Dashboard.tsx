import type { JSX } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatMinorUnits } from '@shared/money'
import type { DashboardSnapshot } from '@shared/types'
import { useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'

interface DashboardProps {
  data: DashboardSnapshot
  isFetching: boolean
}

export function Dashboard({ data, isFetching }: DashboardProps): JSX.Element {
  const refresh = useRefreshPrices()
  const liabilityPctOfAssets =
    data.totalAssetsPlnMinor === 0
      ? 0
      : (data.totalLiabilitiesPlnMinor / data.totalAssetsPlnMinor) * 100

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardDescription>Net worth · PLN</CardDescription>
            <CardTitle className="mt-1 font-display text-4xl tracking-tight text-forest md:text-5xl">
              {formatMinorUnits(data.netWorthPlnMinor, 'PLN')}
            </CardTitle>
            <p className="mt-2 text-xs text-ink-muted">
              As of {new Date(data.asOf).toLocaleString('pl-PL')}
              {data.fxStale ? ' · using last-known FX/prices' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={refresh.isPending || isFetching}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className={`size-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Assets"
            value={formatMinorUnits(data.totalAssetsPlnMinor, 'PLN')}
          />
          <Stat
            label="Liabilities"
            value={formatMinorUnits(data.totalLiabilitiesPlnMinor, 'PLN')}
            hint={`${liabilityPctOfAssets.toFixed(1)}% of assets`}
          />
          <Stat
            label="Net"
            value={formatMinorUnits(data.netWorthPlnMinor, 'PLN')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets by class</CardTitle>
          <CardDescription>Share of total assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-ink-muted">No assets yet.</p>
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

      {data.liabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
            <CardDescription>Remaining principal and monthly installments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.liabilities.map((v) => (
              <div
                key={v.liability.id}
                className="flex items-center justify-between rounded-lg bg-paper-deep/60 px-3 py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium">{v.liability.name}</div>
                  <div className="text-xs text-ink-muted">
                    {v.liability.provider ?? 'Loan'}
                    {v.liability.nextDueDate ? ` · due ${v.liability.nextDueDate}` : ''}
                    {' · '}
                    {formatMinorUnits(v.monthlyPaymentPlnMinor, 'PLN')}/mo
                  </div>
                </div>
                <div className="text-right tabular-nums font-medium">
                  {formatMinorUnits(v.principalPlnMinor, 'PLN')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint?: string
}): JSX.Element {
  return (
    <div className="rounded-lg bg-paper-deep/70 p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  )
}
