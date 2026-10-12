import type { JSX } from 'react'
import { Landmark, Percent, TrendingUp, Wallet } from 'lucide-react'
import { formatGainPercent } from '@shared/money'
import type { DashboardSnapshot, NetWorthHistoryPoint } from '@shared/types'
import { MetricChip } from '@renderer/components/shell/MetricChip'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { bestWorstMonths, pctChange } from '@renderer/lib/historyPeriods'
import { useLocale } from '@renderer/lib/i18n/locale'

export function SavingsMetrics({
  data,
  history
}: {
  data: DashboardSnapshot
  history: NetWorthHistoryPoint[]
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const debtPct =
    data.totalAssetsPlnMinor > 0
      ? (data.totalLiabilitiesPlnMinor / data.totalAssetsPlnMinor) * 100
      : null
  const { best } = bestWorstMonths(history)

  const sorted = [...history].sort((a, b) => a.day.localeCompare(b.day))
  const periodChange =
    sorted.length >= 2
      ? pctChange(sorted[0].netWorthPlnMinor, sorted[sorted.length - 1].netWorthPlnMinor)
      : null

  const formatMonth = (ym: string): string => {
    const [y, m] = ym.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(localeTag, {
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="savings-metrics"
    >
      <MetricChip
        featured
        icon={Wallet}
        label={t('dashboard.netWorth')}
        amountMinor={data.netWorthPlnMinor}
        hint={
          periodChange != null
            ? formatGainPercent(periodChange, localeTag)
            : t('dashboard.needHistory')
        }
        trend={
          periodChange == null ? null : periodChange > 0 ? 'up' : periodChange < 0 ? 'down' : 'flat'
        }
      />
      <MetricChip
        icon={Landmark}
        label={t('dashboard.metricAssets')}
        amountMinor={data.totalAssetsPlnMinor}
      />
      <MetricChip
        icon={Percent}
        label={t('dashboard.metricDebtPct')}
        value={debtPct != null ? `${debtPct.toFixed(1)}%` : '—'}
        hint={<MoneyAmount amountMinor={data.totalLiabilitiesPlnMinor} className="text-xs" />}
      />
      <MetricChip
        icon={TrendingUp}
        label={t('dashboard.metricBestMonth')}
        value={best ? formatGainPercent(best.changePercent, localeTag) : '—'}
        hint={best ? formatMonth(best.month) : t('dashboard.needHistory')}
        trend={best ? 'up' : null}
      />
    </div>
  )
}
