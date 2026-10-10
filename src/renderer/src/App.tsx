import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom'
import { ClassBreakdownCard, TotalSavingsCard } from '@renderer/components/Dashboard'
import { HoldingsList } from '@renderer/components/HoldingsList'
import { AssetDetail } from '@renderer/components/AssetDetail'
import {
  InstallmentsExpensesPage,
  InstallmentsIncomePage,
  InstallmentsLayout,
  InstallmentsLoansPage,
  InstallmentsOverviewPage
} from '@renderer/components/Installments'
import { AssetFormDialog } from '@renderer/components/forms/AssetFormDialog'
import { useDashboard, useDeleteAsset } from '@renderer/hooks/useNetWorth'
import type { Asset } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

type Tab = 'savings' | 'installments'

const TAB_COPY: Record<Tab, { eyebrow: string; title: string; subtitle: string }> = {
  savings: {
    eyebrow: 'Savings',
    title: 'Savings',
    subtitle: 'Your holdings in PLN — edit locally; data stays in SQLite on this machine.'
  },
  installments: {
    eyebrow: 'Installments',
    title: 'Installments',
    subtitle: 'Month-by-month cashflow, expenses, income, and loans.'
  }
}

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/savings" replace />} />
        <Route
          path="/savings"
          element={
            <Shell tab="savings">
              <SavingsListPage />
            </Shell>
          }
        />
        <Route
          path="/savings/:assetId"
          element={
            <Shell tab="savings">
              <HoldingPage />
            </Shell>
          }
        />
        <Route
          path="/installments"
          element={
            <Shell tab="installments">
              <InstallmentsLayout />
            </Shell>
          }
        >
          <Route index element={<InstallmentsOverviewPage />} />
          <Route path="expenses" element={<InstallmentsExpensesPage />} />
          <Route path="income" element={<InstallmentsIncomePage />} />
          <Route path="loans" element={<InstallmentsLoansPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/savings" replace />} />
      </Routes>
    </HashRouter>
  )
}

function SavingsListPage(): JSX.Element {
  const navigate = useNavigate()
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const [assetOpen, setAssetOpen] = useState(false)

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

  return (
    <main className="flex w-full min-w-0 flex-col gap-4" data-testid="savings-view">
      <TotalSavingsCard data={dashboard} isFetching={isFetching} />

      {/* Breakdown sets the row height; holdings matches it and scrolls inside. */}
      <div className="grid w-full min-w-0 items-stretch gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0">
          <ClassBreakdownCard data={dashboard} />
        </section>

        <aside className="min-h-0 min-w-0 lg:h-0 lg:min-h-full">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <CardTitle>Holdings</CardTitle>
                <CardDescription>Open a holding for purchases and detail</CardDescription>
              </div>
              <Button data-testid="add-asset-btn" onClick={() => setAssetOpen(true)}>
                Add holding
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {dashboard.assets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
                  <p className="text-sm text-ink-muted">No holdings yet — add your first asset.</p>
                  <Button className="mt-3" variant="outline" onClick={() => setAssetOpen(true)}>
                    Add holding
                  </Button>
                </div>
              ) : (
                <HoldingsList
                  assets={dashboard.assets}
                  onOpenAsset={(id) => navigate(`/savings/${id}`)}
                />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <AssetFormDialog open={assetOpen} onOpenChange={setAssetOpen} asset={null} />
    </main>
  )
}

function HoldingPage(): JSX.Element {
  const { assetId = '' } = useParams()
  const navigate = useNavigate()
  const { data: dashboard } = useDashboard()
  const deleteAsset = useDeleteAsset()
  const [assetOpen, setAssetOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  const valued = dashboard?.assets.find((a) => a.asset.id === assetId) ?? null

  return (
    <main className="mx-auto w-full max-w-3xl" data-testid="holding-page">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          data-testid="back-to-savings"
          onClick={() => navigate('/savings')}
        >
          ← Holdings
        </Button>
      </div>
      <AssetDetail
        assetId={assetId}
        valued={valued}
        onEdit={(asset) => {
          setEditingAsset(asset)
          setAssetOpen(true)
        }}
        onDelete={(asset) => {
          deleteAsset.mutate(asset.id, {
            onSuccess: () => navigate('/savings')
          })
        }}
      />
      <AssetFormDialog open={assetOpen} onOpenChange={setAssetOpen} asset={editingAsset} />
    </main>
  )
}

function Shell({ children, tab }: { children: ReactNode; tab: Tab }): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [compact, setCompact] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const copy = TAB_COPY[tab]
  const onHoldingPage = location.pathname.startsWith('/savings/') && location.pathname !== '/savings'
  const installmentsHeading =
    location.pathname === '/installments/expenses'
      ? 'Expenses'
      : location.pathname === '/installments/income'
        ? 'Income'
        : location.pathname === '/installments/loans'
          ? 'Loans'
          : copy.title
  const monthQuery = location.search.includes('month=') ? location.search : ''

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
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col px-4 md:px-8">
      <div ref={sentinelRef} className="h-6 md:h-10" aria-hidden />
      <header
        data-testid="app-sticky-header"
        data-compact={compact ? 'true' : 'false'}
        className={cn(
          'sticky top-0 z-30 w-full min-w-0',
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
            compact ? 'mt-0 text-2xl md:text-[1.65rem]' : 'mt-1 text-3xl md:text-4xl'
          )}
        >
          {onHoldingPage ? 'Holding' : installmentsHeading}
        </h1>
        <p
          className={cn(
            'max-w-xl overflow-hidden text-sm text-ink-muted md:text-base',
            'transition-[opacity,max-height,margin,transform] duration-300 ease-out',
            compact || onHoldingPage || location.pathname !== '/installments' && tab === 'installments'
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
            onClick={() => navigate('/savings')}
          >
            Savings
          </TabButton>
          <TabButton
            id="tab-installments"
            active={tab === 'installments'}
            onClick={() => navigate(`/installments${monthQuery}`)}
          >
            Installments
          </TabButton>
        </nav>
      </header>
      <div className="flex w-full min-w-0 flex-col gap-6 py-6">{children}</div>
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
