import { useMemo, type JSX } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { NetWorthHistoryPoint } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { useTheme } from '@renderer/lib/theme'
import { chartNet, formatPlnCompact } from './chartTheme'

export function NetWorthSparkline({
  points
}: {
  points: NetWorthHistoryPoint[]
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const { resolved } = useTheme()
  const stroke = useMemo(() => chartNet(), [resolved])

  if (points.length === 0) {
    return <p className="text-xs text-ink-muted">{t('dashboard.sparklineHint')}</p>
  }

  const mapped = points.map((p) => ({
    day: p.day,
    value: p.netWorthPlnMinor
  }))
  const data =
    mapped.length === 1
      ? [
          { day: mapped[0].day, value: mapped[0].value },
          { day: mapped[0].day, value: mapped[0].value }
        ]
      : mapped

  return (
    <div className="h-[88px] w-full min-w-0" data-testid="net-worth-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            formatter={(value) => {
              const v = typeof value === 'number' ? value : Number(value)
              return [formatMinorUnits(v, 'PLN', localeTag), t('chart.netWorth')]
            }}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--color-card)',
              color: 'var(--ink)',
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#nwFill)"
            animationDuration={800}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-between text-[11px] text-ink-muted tabular-nums">
        <span>{formatPlnCompact(data[0].value)}</span>
        <span>{formatPlnCompact(data[data.length - 1].value)}</span>
      </div>
    </div>
  )
}
