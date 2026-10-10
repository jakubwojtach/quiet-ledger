import type { JSX } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { CashflowMonthPoint } from '@shared/types'
import {
  CHART_AXIS,
  CHART_EXPENSE,
  CHART_GRID,
  CHART_INCOME,
  formatPlnCompact
} from './chartTheme'

function shortMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'short' })
}

export function CashflowChart({
  points,
  highlightMonth
}: {
  points: CashflowMonthPoint[]
  highlightMonth?: string
}): JSX.Element {
  if (points.length === 0) {
    return (
      <p className="flex h-[200px] items-center justify-center text-sm text-ink-muted">
        No monthly cashflow yet.
      </p>
    )
  }

  const data = points.map((p) => ({
    month: p.month,
    label: shortMonth(p.month),
    income: p.incomePlnMinor,
    expenses: p.expensesPlnMinor,
    active: p.month === highlightMonth
  }))

  return (
    <div className="h-[240px] w-full min-w-0" data-testid="cashflow-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatPlnCompact(Number(v))}
            tick={{ fill: CHART_AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : Number(value)
              const label = name === 'income' ? 'Income' : 'Expenses'
              return [formatMinorUnits(v, 'PLN'), label]
            }}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { month?: string } | undefined
              return row?.month ?? ''
            }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(197,209,200,0.9)',
              background: 'rgba(255,255,255,0.95)',
              fontSize: 12
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART_AXIS }}
            formatter={(value) => (value === 'income' ? 'Income' : 'Expenses')}
          />
          <Bar
            dataKey="income"
            fill={CHART_INCOME}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            animationDuration={700}
          />
          <Bar
            dataKey="expenses"
            fill={CHART_EXPENSE}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
