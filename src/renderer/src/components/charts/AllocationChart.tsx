import { useMemo, type JSX } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { ClassBreakdown } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { useTheme } from '@renderer/lib/theme'
import { chartColors, formatPlnCompact } from './chartTheme'

export function AllocationChart({
  breakdown
}: {
  breakdown: ClassBreakdown[]
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const { resolved } = useTheme()
  const colors = useMemo(() => chartColors(), [resolved])

  const data = breakdown.map((row) => ({
    name: t(`class.${row.class}`),
    value: row.plnValueMinor,
    percent: row.percentOfTotal
  }))

  if (data.length === 0) {
    return (
      <p className="flex h-[180px] items-center justify-center text-sm text-ink-muted">
        {t('chart.noAllocation')}
      </p>
    )
  }

  return (
    <div className="h-[200px] w-full min-w-0" data-testid="allocation-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
            animationDuration={700}
            animationBegin={80}
          >
            {data.map((_, i) => (
              <Cell key={data[i].name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : Number(value)
              return [formatMinorUnits(v, 'PLN', localeTag), String(name)]
            }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--color-card)',
              color: 'var(--ink)',
              fontSize: 12
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
        {data.slice(0, 6).map((row, i) => (
          <li key={row.name} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            {row.name} · {formatPlnCompact(row.value)}
          </li>
        ))}
      </ul>
    </div>
  )
}
