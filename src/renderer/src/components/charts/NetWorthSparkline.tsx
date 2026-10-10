import type { JSX } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis
} from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { NetWorthHistoryPoint } from '@shared/types'
import { CHART_NET, formatPlnCompact } from './chartTheme'

export function NetWorthSparkline({
  points
}: {
  points: NetWorthHistoryPoint[]
}): JSX.Element {
  if (points.length === 0) {
    return (
      <p className="text-xs text-ink-muted">
        Open Savings once more after a day or two — a daily snapshot powers this trend.
      </p>
    )
  }

  const mapped = points.map((p) => ({
    day: p.day,
    value: p.netWorthPlnMinor
  }))
  // Single day still draws a calm baseline until history accumulates.
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
              <stop offset="0%" stopColor={CHART_NET} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_NET} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            formatter={(value) => {
              const v = typeof value === 'number' ? value : Number(value)
              return [formatMinorUnits(v, 'PLN'), 'Net worth']
            }}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(197,209,200,0.9)',
              background: 'rgba(255,255,255,0.95)',
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_NET}
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
