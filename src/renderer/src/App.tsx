import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { Dashboard } from '@renderer/components/Dashboard'
import { HoldingsList } from '@renderer/components/HoldingsList'
import { AssetDetail } from '@renderer/components/AssetDetail'
import { Installments } from '@renderer/components/Installments'
import { AssetFormDialog } from '@renderer/components/forms/AssetFormDialog'
import { useDashboard, useDatabaseInfo, useDeleteAsset } from '@renderer/hooks/useNetWorth'
import type { Asset } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

type Tab = 'savings' | 'installments'

const TAB_COPY: Record<
  Tab,
  { eyebrow: string; title: string; subtitle: string }
> = {
  savings: {
    eyebrow: 'Savings',
    title: 'Savings',
    subtitle: 'Your holdings in PLN — edit locally; data stays in SQLite on this machine.'
  },
  installments: {
    eyebrow: 'Installments',
    title: 'Installments',
    subtitle: 'Loans, e-raty, spending, and income — enter real amounts in złoty.'
  }
}

export default function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('savings')

  return (
    <Shell tab={tab} onTabChange={setTab}>
      {tab === 'savings' ? <SavingsTab /> : <Installments />}
    </Shell>
  )
}

function SavingsTab(): JSX.Element {
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const deleteAsset = useDeleteAsset()
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [assetOpen, setAssetOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  useEffect(() => {
    if (selectedAssetId != null) return
    const first = dashboard?.assets[0]?.asset.id
    if (first) setSelectedAssetId(first)
  }, [dashboard, selectedAssetId])

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Savings</CardTitle>
          <CardDescription>Loading holdings…</CardDescription>
        </CardHeader>
        <CardContent className="h-40" />
      </Card>
    )
  }

  if (isError || !dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load savings</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  const selected = dashboard.assets.find((a) => a.asset.id === selectedAssetId) ?? null

  return (
    <main className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]" data-testid="savings-view">
      <section className="min-w-0">
        <Dashboard data={dashboard} isFetching={isFetching} />
      </section>

      <aside className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>Select an asset for native and PLN detail</CardDescription>
            </div>
            <Button
              data-testid="add-asset-btn"
              onClick={() => {
                setEditingAsset(null)
                setAssetOpen(true)
              }}
            >
              Add holding
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.assets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
                <p className="text-sm text-ink-muted">No holdings yet — add your first asset.</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    setEditingAsset(null)
                    setAssetOpen(true)
                  }}
                >
                  Add holding
                </Button>
              </div>
            ) : (
              <>
                <label
                  className="mb-3 block text-xs font-medium text-ink-muted"
                  htmlFor="holding-select"
                >
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
              </>
            )}
          </CardContent>
        </Card>

        <AssetDetail
          assetId={selectedAssetId}
          valued={selected}
          onAdd={() => {
            setEditingAsset(null)
            setAssetOpen(true)
          }}
          onEdit={(asset) => {
            setEditingAsset(asset)
            setAssetOpen(true)
          }}
          onDelete={(asset) => {
            deleteAsset.mutate(asset.id, {
              onSuccess: () => {
                if (selectedAssetId === asset.id) setSelectedAssetId(null)
              }
            })
          }}
        />
      </aside>

      <AssetFormDialog open={assetOpen} onOpenChange={setAssetOpen} asset={editingAsset} />
    </main>
  )
}

function Shell({
  children,
  tab,
  onTabChange
}: {
  children: ReactNode
  tab: Tab
  onTabChange: (tab: Tab) => void
}): JSX.Element {
  const [compact, setCompact] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const copy = TAB_COPY[tab]
  const { data: dbInfo } = useDatabaseInfo()

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompact(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 md:px-8">
      <div ref={sentinelRef} className="h-6 md:h-10" aria-hidden />
      <header
        data-testid="app-sticky-header"
        data-compact={compact ? 'true' : 'false'}
        className={cn(
          'sticky top-0 z-30 -mx-4 px-4 md:-mx-8 md:px-8',
          'transition-[padding,background-color,box-shadow,border-color] duration-300 ease-out',
          compact
            ? 'border-b border-line/70 bg-paper/85 py-3 shadow-[0_8px_24px_-18px_rgba(20,32,26,0.45)] backdrop-blur-md'
            : 'border-b border-transparent bg-transparent pb-0 pt-0'
        )}
      >
        <p
          className={cn(
            'overflow-hidden text-xs font-semibold uppercase tracking-[0.2em] text-forest-soft',
            'transition-[opacity,max-height,transform,margin] duration-300 ease-out',
            compact
              ? 'pointer-events-none mb-0 max-h-0 -translate-y-1 opacity-0'
              : 'mb-0 max-h-6 translate-y-0 opacity-100'
          )}
        >
          {copy.eyebrow}
        </p>
        <h1
          className={cn(
            'font-display font-semibold tracking-tight text-ink',
            'transition-[font-size,margin,transform] duration-300 ease-out',
            compact
              ? 'mt-0 text-2xl md:text-[1.65rem]'
              : 'mt-1 text-3xl md:text-4xl'
          )}
        >
          {copy.title}
        </h1>
        <p
          className={cn(
            'max-w-xl overflow-hidden text-sm text-ink-muted md:text-base',
            'transition-[opacity,max-height,margin,transform] duration-300 ease-out',
            compact
              ? 'pointer-events-none mt-0 max-h-0 -translate-y-1 opacity-0'
              : 'mt-2 max-h-16 translate-y-0 opacity-100'
          )}
        >
          {copy.subtitle}
        </p>
        <nav
          className={cn(
            'flex gap-2 transition-[margin] duration-300 ease-out',
            compact ? 'mt-2.5' : 'mt-4'
          )}
          aria-label="Primary"
          role="tablist"
        >
          <TabButton
            id="tab-savings"
            active={tab === 'savings'}
            onClick={() => onTabChange('savings')}
          >
            Savings
          </TabButton>
          <TabButton
            id="tab-installments"
            active={tab === 'installments'}
            onClick={() => onTabChange('installments')}
          >
            Installments
          </TabButton>
        </nav>
        <p
          className="mt-2 truncate font-mono text-[11px] leading-4 text-ink-muted"
          data-testid="sqlite-path"
          title={dbInfo?.dbPath}
        >
          SQLite: {dbInfo?.dbPath ?? 'opening local database…'}
        </p>
        {dbInfo && dbInfo.legacyDbPaths.length > 0 && (
          <p className="mt-1 text-[11px] leading-4 text-accent" data-testid="legacy-sqlite-paths">
            Not opened (remove with npm run db:reset): {dbInfo.legacyDbPaths.join(' · ')}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-6 py-6">{children}</div>
    </div>
  )
}

function TabButton({
  id,
  active,
  onClick,
  children
}: {
  id: string
  active: boolean
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={id}
      onClick={onClick}
      className={cn(
        'min-h-10 cursor-pointer rounded-md px-5 py-2.5 text-sm font-medium transition-colors',
        active ? 'bg-forest text-white' : 'bg-paper-deep text-ink hover:bg-line'
      )}
    >
      {children}
    </button>
  )
}
