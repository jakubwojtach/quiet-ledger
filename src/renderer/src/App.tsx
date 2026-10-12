import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react'
import { PiggyBank, Wallet } from 'lucide-react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from 'react-router-dom'
import { AssetDetail } from '@renderer/components/AssetDetail'
import {
  InstallmentsExpensesPage,
  InstallmentsIncomePage,
  InstallmentsLayout,
  InstallmentsLoansPage,
  InstallmentsOverviewPage
} from '@renderer/components/Installments'
import { CashflowBar } from '@renderer/components/installments/CashflowBar'
import { AssetFormDialog } from '@renderer/components/forms/AssetFormDialog'
import { OnboardingWizard } from '@renderer/components/OnboardingWizard'
import { SettingsPage } from '@renderer/components/SettingsPage'
import { AppRail } from '@renderer/components/shell/AppRail'
import { ContextStrip } from '@renderer/components/shell/ContextStrip'
import { FreshnessChip } from '@renderer/components/shell/FreshnessChip'
import { PrivacyToggle } from '@renderer/components/shell/PrivacyToggle'
import { SavingsDashboard } from '@renderer/components/savings/SavingsDashboard'
import { PageTransition } from '@renderer/components/motion/PageTransition'
import { useDashboard, useDeleteAsset, useNetWorthHistory } from '@renderer/hooks/useNetWorth'
import { defaultHomePath } from '@renderer/lib/appPreferences'
import { useLocale } from '@renderer/lib/i18n/locale'
import { usePreferences } from '@renderer/lib/preferences'
import type { Asset } from '@shared/types'
import { cn } from '@renderer/lib/utils'

const RAIL_COLLAPSED_KEY = 'app-rail-collapsed'

type Tab = 'savings' | 'installments' | 'settings'

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <OnboardingWizard />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/savings"
          element={
            <ModuleGate module="savings">
              <Shell tab="savings">
                <SavingsListPage />
              </Shell>
            </ModuleGate>
          }
        />
        <Route
          path="/savings/:assetId"
          element={
            <ModuleGate module="savings">
              <Shell tab="savings">
                <HoldingPage />
              </Shell>
            </ModuleGate>
          }
        />
        <Route
          path="/installments"
          element={
            <ModuleGate module="installments">
              <Shell tab="installments">
                <InstallmentsLayout />
              </Shell>
            </ModuleGate>
          }
        >
          <Route index element={<InstallmentsOverviewPage />} />
          <Route path="expenses" element={<InstallmentsExpensesPage />} />
          <Route path="income" element={<InstallmentsIncomePage />} />
          <Route path="loans" element={<InstallmentsLoansPage />} />
        </Route>
        <Route
          path="/settings"
          element={
            <Shell tab="settings">
              <SettingsPage />
            </Shell>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </HashRouter>
  )
}

function HomeRedirect(): JSX.Element {
  const { prefs } = usePreferences()
  return <Navigate to={defaultHomePath(prefs)} replace />
}

function ModuleGate({
  module,
  children
}: {
  module: 'savings' | 'installments'
  children: ReactNode
}): JSX.Element {
  const { prefs } = usePreferences()
  const allowed = module === 'savings' ? prefs.showSavings : prefs.showInstallments
  if (!allowed) return <HomeRedirect />
  return <>{children}</>
}

function SavingsListPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const history = useNetWorthHistory()

  return (
    <SavingsDashboard
      data={data}
      isFetching={isFetching}
      history={history.data ?? []}
      isLoading={isLoading}
      isError={isError}
      error={(error as Error) ?? null}
      onRetry={() => void refetch()}
    />
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
    <main className="w-full min-w-0" data-testid="holding-page">
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
  const [searchParams] = useSearchParams()
  const { t } = useLocale()
  const { prefs } = usePreferences()
  const dashboard = useDashboard()

  const onHoldingPage =
    location.pathname.startsWith('/savings/') && location.pathname !== '/savings'

  const title =
    onHoldingPage
      ? t('nav.holding')
      : tab === 'settings'
        ? t('settings.title')
        : tab === 'savings'
          ? t('savings.title')
          : t('installments.title')

  const monthQuery = searchParams.get('month')

  const [railCollapsed, setRailCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, railCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [railCollapsed])

  const nav = useMemo(() => {
    const items: {
      id: string
      label: string
      active: boolean
      onClick: () => void
      icon: typeof PiggyBank
    }[] = []
    if (prefs.showSavings) {
      items.push({
        id: 'tab-savings',
        label: t('tab.savings'),
        icon: PiggyBank,
        active: tab === 'savings',
        onClick: () => navigate('/savings')
      })
    }
    if (prefs.showInstallments) {
      items.push({
        id: 'tab-installments',
        label: t('tab.installments'),
        icon: Wallet,
        active: tab === 'installments',
        onClick: () => {
          const q = monthQuery ? `?month=${monthQuery}` : ''
          navigate(`/installments${q}`)
        }
      })
    }
    return items
  }, [prefs.showSavings, prefs.showInstallments, tab, t, navigate, monthQuery])

  const freshnessAsOf = dashboard.data?.asOf ?? null
  const freshnessStale = Boolean(dashboard.data?.fxStale)

  return (
    <div
      className="flex min-h-screen w-full min-w-0 flex-col md:flex-row"
      data-testid="app-shell"
    >
      <AppRail
        className={cn(onHoldingPage && 'max-md:hidden')}
        nav={nav}
        periods={[]}
        periodsLabel={t('rail.months')}
        settingsActive={tab === 'settings'}
        onOpenSettings={() => navigate('/settings')}
        collapsed={railCollapsed}
        onToggleCollapsed={() => setRailCollapsed((v) => !v)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {!onHoldingPage ? (
          <header
            data-testid="app-sticky-header"
            className="sticky-frost sticky top-0 z-30 border-b border-[var(--line)] md:pt-1"
          >
            <div className="px-4 py-3 md:px-6 lg:px-8 xl:px-10">
              {tab === 'installments' ? (
                <CashflowBar />
              ) : (
                <ContextStrip
                  title={title}
                  leading={
                    tab !== 'settings' ? (
                      <FreshnessChip asOf={freshnessAsOf} stale={freshnessStale} />
                    ) : null
                  }
                  trailing={<PrivacyToggle />}
                />
              )}
            </div>
          </header>
        ) : null}

        <div className="w-full min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8 xl:px-10">
          <PageTransition
            routeKey={
              location.pathname.startsWith('/installments')
                ? 'installments'
                : location.pathname
            }
          >
            {children}
          </PageTransition>
        </div>
      </div>
    </div>
  )
}
