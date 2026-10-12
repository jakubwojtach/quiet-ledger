import { useMemo, type JSX } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { CashflowMonthPoint } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, usePrivacy } from '@renderer/lib/privacy'
import { useTheme } from '@renderer/lib/theme'
import { chartTokens, formatPlnCompact } from './chartTheme'

function shortMonth(ym: string, localeTag: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(localeTag, { month: 'short' })
}

function yearOf(ym: string): number {
  return Number(ym.slice(0, 4))
}

export function CashflowChart({
  points,
  highlightMonth,
  onSelectMonth,
  className,
  fill
}: {
  points: CashflowMonthPoint[]
  highlightMonth?: string
  onSelectMonth?: (month: string) => void
  className?: string
  fill?: boolean
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const privacy = usePrivacy()
  const { resolved } = useTheme()
  const tokens = useMemo(() => chartTokens(), [resolved])

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.month.localeCompare(b.month)),
    [points]
  )

  const maxVal = useMemo(() => {
    let m = 0
    for (const p of sorted) {
      m = Math.max(m, p.incomePlnMinor, p.expensesPlnMinor)
    }
    return m || 1
  }, [sorted])

  const stub = Math.round(maxVal * 0.08)

  const data = useMemo(
    () =>
      sorted.map((p, i) => {
        const fakeIn = privacy ? 60 + (i % 5) * 8 : p.incomePlnMinor
        const fakeEx = privacy
          ? p.expensesMissing
            ? 12
            : 25 + (i % 4) * 5
          : p.expensesMissing
            ? stub
            : p.expensesPlnMinor
        return {
          month: p.month,
          label: shortMonth(p.month, localeTag),
          year: yearOf(p.month),
          income: fakeIn,
          expenses: fakeEx,
          expensesReal: p.expensesPlnMinor,
          missing: p.expensesMissing,
          active: p.month === highlightMonth
        }
      }),
    [sorted, localeTag, stub, highlightMonth, privacy]
  )

  const missingLabels = data.filter((d) => d.missing).map((d) => d.label)

  if (points.length === 0) {
    return (
      <p
        className={`flex items-center justify-center text-[13px] text-[var(--ink-3)] ${fill ? 'h-full min-h-[200px]' : 'h-[200px]'}`}
      >
        {t('chart.noCashflow')}
      </p>
    )
  }

  const firstYear = data[0]?.year
  const secondYearIdx = data.findIndex((d) => d.year !== firstYear)

  return (
    <div
      className={
        className ??
        (fill ? 'h-full min-h-[280px] w-full min-w-0' : 'h-[280px] w-full min-w-0')
      }
      data-testid="cashflow-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 28, right: 40, left: 0, bottom: 18 }}
          barCategoryGap="22%"
          barGap={2}
        >
          <defs>
            <pattern
              id="cf-hatch"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="4"
                stroke="var(--ink-3)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <CartesianGrid stroke={tokens.grid} vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            hide={privacy}
            tick={{ fill: tokens.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            tickFormatter={(v) =>
              privacy ? MASK.chart : formatPlnCompact(Number(v), localeTag)
            }
            tick={{ fill: tokens.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(value, name, item) => {
              if (privacy) {
                const label = name === 'income' ? t('chart.income') : t('chart.expenses')
                return [MASK.money, label]
              }
              const row = item?.payload as { missing?: boolean; expensesReal?: number } | undefined
              const v = typeof value === 'number' ? value : Number(value)
              if (name === 'expenses' && row?.missing) {
                return [t('cashflow.noExpensesEntered'), t('chart.expenses')]
              }
              const amount = name === 'expenses' ? (row?.expensesReal ?? v) : v
              const label = name === 'income' ? t('chart.income') : t('chart.expenses')
              return [formatMinorUnits(amount, 'PLN', localeTag), label]
            }}
            labelFormatter={(_, payload) => {
              if (privacy) return '····-··'
              const row = payload?.[0]?.payload as { month?: string } | undefined
              return row?.month ?? ''
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 12
            }}
          />
          {missingLabels.map((label) => (
            <ReferenceLine
              key={label}
              x={label}
              stroke="var(--ink-3)"
              strokeDasharray="2 2"
              label={{
                value: t('cashflow.noExpensesEntered'),
                position: 'top',
                fill: 'var(--ink-2)',
                fontSize: 11
              }}
            />
          ))}
          <Bar
            dataKey="income"
            radius={[2, 2, 0, 0]}
            maxBarSize={13}
            cursor="pointer"
            onClick={(state) => {
              const m = (state as { month?: string })?.month
              if (m) onSelectMonth?.(m)
            }}
          >
            {data.map((entry) => (
              <Cell
                key={`in-${entry.month}`}
                fill={tokens.accent}
                fillOpacity={entry.active ? 1 : 0.38}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expenses"
            radius={[2, 2, 0, 0]}
            maxBarSize={13}
            cursor="pointer"
            onClick={(state) => {
              const m = (state as { month?: string })?.month
              if (m) onSelectMonth?.(m)
            }}
          >
            {data.map((entry) => (
              <Cell
                key={`ex-${entry.month}`}
                fill={entry.missing ? 'url(#cf-hatch)' : tokens.cat[4]}
                fillOpacity={entry.missing ? 1 : entry.active ? 1 : 0.38}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none relative -mt-4 flex px-1 text-[11px] text-[var(--ink-3)]">
        <span>{firstYear}</span>
        {secondYearIdx > 0 ? (
          <span
            className="absolute"
            style={{ left: `${(secondYearIdx / Math.max(data.length - 1, 1)) * 100}%` }}
          >
            {data[secondYearIdx]?.year}
          </span>
        ) : null}
      </div>
    </div>
  )
}
