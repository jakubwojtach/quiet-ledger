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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardDescription>Total net worth · PLN</CardDescription>
          <CardTitle className="mt-1 font-display text-4xl tracking-tight text-forest md:text-5xl">
            {formatMinorUnits(data.totalPlnMinor, 'PLN')}
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
      <CardContent className="space-y-3">
        <h4 className="text-sm font-medium text-ink-muted">Breakdown by asset class</h4>
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
  )
}
