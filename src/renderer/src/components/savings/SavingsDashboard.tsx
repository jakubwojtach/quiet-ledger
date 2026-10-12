import { useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { DashboardSnapshot, NetWorthHistoryPoint } from '@shared/types'
import { AssetFormDialog } from '@renderer/components/forms/AssetFormDialog'
import { NetWorthTrendChart } from '@renderer/components/charts/NetWorthTrendChart'
import { FadeUp } from '@renderer/components/motion/PageTransition'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { CompositionBar } from './CompositionBar'
import { HistoryProgress } from './HistoryProgress'
import { HoldingsPanel } from './HoldingsPanel'
import { LiabilitiesPanel } from './LiabilitiesPanel'
import { SincePurchase } from './SincePurchase'
import { useRefreshPrices } from '@renderer/hooks/useNetWorth'
import { pctChange } from '@renderer/lib/historyPeriods'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { formatAmountNumber, formatGainPercent } from '@shared/money'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

export type PeriodId = '1m' | 'ytd' | '1y' | 'all'

const PERIODS: PeriodId[] = ['1m', 'ytd', '1y', 'all']

function isPeriodId(v: string | null): v is PeriodId {
  return v != null && (PERIODS as string[]).includes(v)
}

/** Filter snapshots to the selected window (anchored on the latest snapshot day). */
export function filterByPeriod(
  history: NetWorthHistoryPoint[],
  period: PeriodId
): NetWorthHistoryPoint[] {
  if (period === 'all') return [...history].sort((a, b) => a.day.localeCompare(b.day))
  const sorted = [...history].sort((a, b) => a.day.localeCompare(b.day))
  if (sorted.length === 0) return []
  const last = sorted[sorted.length - 1].day
  const end = new Date(`${last}T12:00:00`)
  if (period === '1m') {
    const start = new Date(end)
    start.setDate(start.getDate() - 30)
    const key = start.toISOString().slice(0, 10)
    return sorted.filter((p) => p.day >= key)
  }
  if (period === 'ytd') {
    const year = end.getFullYear()
    return sorted.filter((p) => Number(p.day.slice(0, 4)) === year)
  }
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 1)
  const key = start.toISOString().slice(0, 10)
  return sorted.filter((p) => p.day >= key)
}

function periodHasData(history: NetWorthHistoryPoint[], period: PeriodId): boolean {
  return filterByPeriod(history, period).length >= 2
}

export function SavingsDashboard({
  data,
  isFetching,
  history,
  isLoading,
  isError,
  error,
  onRetry
}: {
  data: DashboardSnapshot | undefined
  isFetching: boolean
  history: NetWorthHistoryPoint[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
}): JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const refresh = useRefreshPrices()
  const { t, localeTag } = useLocale()
  const [assetOpen, setAssetOpen] = useState(false)

  const period: PeriodId = isPeriodId(searchParams.get('period'))
    ? (searchParams.get('period') as PeriodId)
    : 'all'

  const setPeriod = (next: PeriodId): void => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'all') p.delete('period')
        else p.set('period', next)
        p.delete('year')
        return p
      },
      { replace: true }
    )
  }

  const periodHistory = useMemo(() => filterByPeriod(history, period), [history, period])

  /** Trend chart unlocks once we have 7 daily snapshots overall. */
  const chartUnlocked = history.length >= 7
  const showChart = chartUnlocked && periodHistory.length >= 2

  const periodDelta = useMemo(() => {
    if (periodHistory.length < 2) return null
    const first = periodHistory[0].netWorthPlnMinor
    const last = periodHistory[periodHistory.length - 1].netWorthPlnMinor
    return {
      absMinor: last - first,
      pct: pctChange(first, last),
      from: periodHistory[0].day,
      to: periodHistory[periodHistory.length - 1].day,
      count: periodHistory.length
    }
  }, [periodHistory])

  const asOfLabel = useMemo(() => {
    if (!data?.asOf) return ''
    return new Date(data.asOf).toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }, [data?.asOf, localeTag])

  const trackedSince = useMemo(() => {
    if (history.length === 0) return null
    const first = [...history].sort((a, b) => a.day.localeCompare(b.day))[0].day
    const [y, m, d] = first.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }, [history, localeTag])

  const periodLabel = t(`period.${period}`)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4" data-testid="savings-loading">
        <div className="h-14 w-72 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-24 rounded-[10px] bg-[var(--surface-2)]" />
        <div className="h-64 rounded-[10px] bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.error')}</CardTitle>
          <CardDescription>{error?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRetry}>{t('action.retry')}</Button>
        </CardContent>
      </Card>
    )
  }

  const debtPct =
    data.totalAssetsPlnMinor > 0
      ? (data.totalLiabilitiesPlnMinor / data.totalAssetsPlnMinor) * 100
      : 0

  const periodButtons: { id: PeriodId; label: string }[] = [
    { id: '1m', label: t('period.1m') },
    { id: 'ytd', label: t('period.ytd') },
    { id: '1y', label: t('period.1y') },
    { id: 'all', label: t('period.all') }
  ]

  const stickyRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const sticky = stickyRef.current
    if (!sticky) return
    const header = document.querySelector<HTMLElement>('[data-testid="app-sticky-header"]')
    const sync = (): void => {
      const h = header?.offsetHeight ?? 0
      sticky.style.top = `${h}px`
    }
    sync()
    const ro = header ? new ResizeObserver(sync) : null
    if (header && ro) ro.observe(header)
    window.addEventListener('resize', sync)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div className="flex w-full min-w-0 flex-col gap-4" data-testid="savings-view">
      <section
        ref={stickyRef}
        data-testid="net-worth-hero"
        className="sticky-frost sticky z-20 -mx-4 -mt-6 space-y-3 border-b border-[var(--line)] px-4 pt-3 pb-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10"
      >
        <div className="text-[12px] leading-4 font-medium text-[var(--ink-3)]">
          {t('dashboard.netWorth')} ·{' '}
          <Sensitive placeholder={MASK.date}>{asOfLabel}</Sensitive> · PLN
          {period !== 'all' ? ` · ${periodLabel}` : ''}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <MoneyAmount amountMinor={data.netWorthPlnMinor} size="hero" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-md"
              disabled={refresh.isPending || isFetching}
              onClick={() => refresh.mutate()}
            >
              <RefreshCw className={`size-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
              {t('action.refresh')}
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 rounded-md"
              data-testid="add-asset-btn-header"
              onClick={() => setAssetOpen(true)}
            >
              <Plus className="size-3.5" />
              {t('action.addHolding')}
            </Button>
          </div>
        </div>

        {periodDelta ? (
          <div
            className="flex flex-wrap items-baseline gap-x-3 text-[13px]"
            data-testid="period-delta"
          >
            <Sensitive
              placeholder={MASK.delta}
              className={cn(
                'num font-semibold',
                periodDelta.absMinor > 0 && 'text-gain',
                periodDelta.absMinor < 0 && 'text-loss',
                periodDelta.absMinor === 0 && 'text-[var(--ink-2)]'
              )}
            >
              {periodDelta.absMinor > 0 ? '+' : ''}
              {formatAmountNumber(periodDelta.absMinor, localeTag)} zł
              {periodDelta.pct != null
                ? ` · ${formatGainPercent(periodDelta.pct, localeTag)}`
                : ''}
            </Sensitive>
            <Sensitive placeholder={MASK.nameShort} className="text-[var(--ink-3)]">
              {t('period.deltaHint', {
                period: periodLabel,
                count: periodDelta.count
              })}
            </Sensitive>
          </div>
        ) : (
          <p className="text-[12px] text-[var(--ink-3)]">{t('period.needTwo')}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] leading-5 text-[var(--ink-2)]">
          <Sensitive placeholder={`${MASK.count} ·······`}>
            <span>
              <b className="num font-medium text-[var(--ink)]">{data.assets.length}</b>{' '}
              {t('dashboard.assets').toLowerCase()}
            </span>
          </Sensitive>
          <Sensitive placeholder={`${MASK.count} ········· · ·· %`}>
            <span>
              <b className="num font-medium text-[var(--ink)]">{data.liabilities.length}</b>{' '}
              {t('dashboard.liabilities').toLowerCase()} ·{' '}
              {t('dashboard.metricDebtPct').toLowerCase()}{' '}
              <b className="num font-medium text-[var(--ink)]">
                {debtPct.toLocaleString(localeTag, { maximumFractionDigits: 0 })} %
              </b>
            </span>
          </Sensitive>
          {trackedSince ? (
            <Sensitive placeholder={`········ ${MASK.date}`}>
              <span>
                {t('dashboard.trackedSince')}{' '}
                <b className="font-medium text-[var(--ink)]">{trackedSince}</b>
              </span>
            </Sensitive>
          ) : null}
          <span className="flex-1" />
          <div
            className="inline-flex rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
            role="group"
            aria-label={t('period.label')}
            data-testid="period-segment"
          >
            {periodButtons.map((p) => {
              const enabled = p.id === 'all' || periodHasData(history, p.id)
              const active = period === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!enabled}
                  data-testid={`period-${p.id}`}
                  aria-pressed={active}
                  title={
                    enabled
                      ? chartUnlocked
                        ? t('period.filtersChart', { period: p.label })
                        : t('period.filtersDelta', { period: p.label })
                      : t('period.notEnough')
                  }
                  onClick={() => enabled && setPeriod(p.id)}
                  className={cn(
                    'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
                    active && enabled
                      ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink)]',
                    !enabled && 'cursor-not-allowed opacity-40 hover:text-[var(--ink-3)]'
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] max-[1359px]:lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <FadeUp delay={0.04}>
            {showChart ? (
              <section className="surface-card p-3.5 px-4 pb-4" data-testid="net-worth-chart">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[13px] leading-5 font-semibold">{t('dashboard.trend')}</h2>
                  <span className="text-[12px] text-[var(--ink-3)]">
                    {periodLabel} ·{' '}
                    <Sensitive placeholder={MASK.count}>{periodHistory.length}</Sensitive>{' '}
                    {t('period.snapshots')}
                  </span>
                </div>
                <NetWorthTrendChart points={periodHistory} height={220} />
              </section>
            ) : (
              <HistoryProgress
                points={history}
                periodPoints={periodHistory}
                periodLabel={periodLabel}
              />
            )}
          </FadeUp>
          <FadeUp delay={0.06}>
            <HoldingsPanel
              assets={data.assets}
              totalAssetsMinor={data.totalAssetsPlnMinor}
              onOpenAsset={(id) => navigate(`/savings/${id}`)}
              onAdd={() => setAssetOpen(true)}
            />
          </FadeUp>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <FadeUp delay={0.05}>
            <CompositionBar assets={data.assets} totalMinor={data.totalAssetsPlnMinor} />
          </FadeUp>
          <FadeUp delay={0.07}>
            <SincePurchase assets={data.assets} />
          </FadeUp>
          <FadeUp delay={0.08}>
            <LiabilitiesPanel
              liabilities={data.liabilities}
              totalLiabilitiesMinor={data.totalLiabilitiesPlnMinor}
            />
          </FadeUp>
        </div>
      </div>

      <AssetFormDialog open={assetOpen} onOpenChange={setAssetOpen} asset={null} />
    </div>
  )
}
