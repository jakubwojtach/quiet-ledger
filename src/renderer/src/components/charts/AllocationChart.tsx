import type { JSX } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMinorUnits } from '@shared/money'
import type { ClassBreakdown } from '@shared/types'
import { CHART_COLORS, formatPlnCompact } from './chartTheme'

export function AllocationChart({
  breakdown
}: {
  breakdown: ClassBreakdown[]
}): JSX.Element {
  const data = breakdown.map((row) => ({
    name: row.label,
    value: row.plnValueMinor,
    percent: row.percentOfTotal
  }))

  if (data.length === 0) {
    return (
      <p className="flex h-[180px] items-center justify-center text-sm text-ink-muted">
        No holdings to chart yet.
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
              <Cell key={data[i].name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : Number(value)
              return [formatMinorUnits(v, 'PLN'), String(name)]
            }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(197,209,200,0.9)',
              background: 'rgba(255,255,255,0.95)',
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
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {row.name} · {formatPlnCompact(row.value)}
          </li>
        ))}
      </ul>
    </div>
  )
}
