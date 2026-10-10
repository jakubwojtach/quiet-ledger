import type { JSX } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatMinorUnits } from '@shared/money'
import { useDashboard, useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'

interface DashboardProps {
  onSelectAsset: (id: string) => void
  selectedAssetId: string | null
}

export function Dashboard({ onSelectAsset, selectedAssetId }: DashboardProps): JSX.Element {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const refresh = useRefreshPrices()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Net worth</CardTitle>
          <CardDescription>Loading holdings…</CardDescription>
        </CardHeader>
        <CardContent className="h-40" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load dashboard</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
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
                <Progress value={row.percentOfTotal} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>Select an asset for native and PLN detail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.assets.map((v) => {
            const active = selectedAssetId === v.asset.id
            return (
              <button
                key={v.asset.id}
                type="button"
                onClick={() => onSelectAsset(v.asset.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-forest text-white' : 'hover:bg-paper-deep'
                }`}
              >
                <div>
                  <div className="font-medium">{v.asset.name}</div>
                  <div className={`text-xs ${active ? 'text-white/80' : 'text-ink-muted'}`}>
                    {v.asset.class}
                    {v.priceStale ? ' · stale price' : ''}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="text-sm font-medium">{formatMinorUnits(v.plnValueMinor, 'PLN')}</div>
                  <div className={`text-xs ${active ? 'text-white/80' : 'text-ink-muted'}`}>
                    {formatMinorUnits(v.nativeValueMinor, v.nativeCurrency)}
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
