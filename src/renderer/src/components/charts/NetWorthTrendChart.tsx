import { useMemo, type JSX } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { NetWorthHistoryPoint } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, usePrivacy } from '@renderer/lib/privacy'
import { useTheme } from '@renderer/lib/theme'
import { chartAxis, chartGrid, chartNet, formatPlnCompact } from './chartTheme'

export function NetWorthTrendChart({
  points,
  height = 280
}: {
  points: NetWorthHistoryPoint[]
  height?: number
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const privacy = usePrivacy()
  const { resolved } = useTheme()
  const stroke = useMemo(() => chartNet(), [resolved])
  const grid = useMemo(() => chartGrid(), [resolved])
  const axis = useMemo(() => chartAxis(), [resolved])

  if (points.length === 0) {
    return (
      <p
        className="flex items-center justify-center text-sm text-ink-muted"
        style={{ height }}
        data-testid="net-worth-trend-empty"
      >
        {t('dashboard.sparklineHint')}
      </p>
    )
  }

  const mapped = points.map((p, i) => ({
    day: p.day,
    label: p.day.slice(5),
    // Privacy: flat placeholder series — no real magnitudes
    value: privacy ? 100 + (i % 3) : p.netWorthPlnMinor
  }))
  const data =
    mapped.length === 1
      ? [
          { ...mapped[0], label: mapped[0].day },
          { ...mapped[0], label: mapped[0].day }
        ]
      : mapped

  return (
    <div style={{ height }} className="w-full min-w-0" data-testid="net-worth-trend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="nwTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={privacy ? 0.15 : 0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            hide={privacy}
            tick={{ fill: axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            tickFormatter={(v) => (privacy ? MASK.chart : formatPlnCompact(Number(v), localeTag))}
            tick={{ fill: axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickCount={4}
            domain={
              privacy
                ? [0, 200]
                : (extent: Readonly<[number, number]>) => {
                    const [dataMin, dataMax] = extent
                    const span = Math.max(1, dataMax - dataMin)
                    const pad = span * 0.08
                    return [dataMin - pad, dataMax + pad] as [number, number]
                  }
            }
          />
          <Tooltip
            formatter={(value) => {
              if (privacy) return [MASK.money, t('chart.netWorth')]
              const v = typeof value === 'number' ? value : Number(value)
              return [formatMinorUnits(v, 'PLN', localeTag), t('chart.netWorth')]
            }}
            labelFormatter={(_, payload) => {
              if (privacy) return '····-··'
              const day = payload?.[0]?.payload?.day
              return day ? String(day) : ''
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.25}
            fill="url(#nwTrendFill)"
            animationDuration={700}
            isAnimationActive={!privacy}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
