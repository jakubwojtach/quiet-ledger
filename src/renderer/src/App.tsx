import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { Dashboard } from '@renderer/components/Dashboard'
import { HoldingsList } from '@renderer/components/HoldingsList'
import { AssetDetail } from '@renderer/components/AssetDetail'
import { IncomeLog } from '@renderer/components/IncomeLog'
import { useDashboard } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

export default function App(): JSX.Element {
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Only auto-select when nothing is selected yet — never fight user clicks.
  useEffect(() => {
    if (selectedAssetId != null) return
    const first = dashboard?.assets[0]?.asset.id
    if (first) setSelectedAssetId(first)
  }, [dashboard, selectedAssetId])

  if (isLoading) {
    return (
      <Shell>
        <Card className="animate-pulse">
          <CardHeader>
            <CardTitle>Net worth</CardTitle>
            <CardDescription>Loading holdings…</CardDescription>
          </CardHeader>
          <CardContent className="h-40" />
        </Card>
      </Shell>
    )
  }

  if (isError || !dashboard) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  const selected =
    dashboard.assets.find((a) => a.asset.id === selectedAssetId) ?? null

  return (
    <Shell>
      <main className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0">
          <Dashboard data={dashboard} isFetching={isFetching} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>Select an asset for native and PLN detail</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="mb-3 block text-xs font-medium text-ink-muted" htmlFor="holding-select">
                Jump to holding
              </label>
              <select
                id="holding-select"
                className="mb-3 flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                value={selectedAssetId ?? ''}
                onChange={(e) => setSelectedAssetId(e.target.value)}
              >
                {dashboard.assets.map((v) => (
                  <option key={v.asset.id} value={v.asset.id}>
                    {v.asset.name}
                  </option>
                ))}
              </select>
              <HoldingsList
                assets={dashboard.assets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
              />
            </CardContent>
          </Card>

          <AssetDetail assetId={selectedAssetId} valued={selected} />
          <IncomeLog />
        </aside>
      </main>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-soft">Savings</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Net worth
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted md:text-base">
          Personal holdings in PLN — prices and FX cached locally with a 15-minute TTL.
        </p>
      </header>
      {children}
    </div>
  )
}
