import { useEffect, useState, type JSX } from 'react'
import { Dashboard } from '@renderer/components/Dashboard'
import { AssetDetail } from '@renderer/components/AssetDetail'
import { IncomeLog } from '@renderer/components/IncomeLog'
import { useDashboard } from '@renderer/hooks/useNetWorth'

export default function App(): JSX.Element {
  const { data: dashboard } = useDashboard()
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Auto-select the largest holding once data arrives so detail is never empty.
  useEffect(() => {
    if (!dashboard?.assets.length) return
    setSelectedAssetId((current) => {
      if (current && dashboard.assets.some((a) => a.asset.id === current)) {
        return current
      }
      return dashboard.assets[0].asset.id
    })
  }, [dashboard])

  const selected =
    dashboard?.assets.find((a) => a.asset.id === selectedAssetId) ?? null

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="animate-[fadeUp_0.5s_ease-out]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-soft">
          Savings
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Net worth
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted md:text-base">
          Personal holdings in PLN — prices and FX cached locally with a 15-minute TTL.
        </p>
      </header>

      <main className="grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="animate-[fadeUp_0.55s_ease-out]">
          <Dashboard
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
          />
        </section>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 animate-[fadeUp_0.65s_ease-out]">
          <AssetDetail assetId={selectedAssetId} valued={selected} />
          <IncomeLog />
        </aside>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
