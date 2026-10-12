import type { CashflowMonthPoint, NetWorthHistoryPoint } from '@shared/types'

export interface YearPeriod {
  year: number
  /** Percent change first→last snapshot in that year; null if <2 points */
  changePercent: number | null
  firstMinor: number
  lastMinor: number
  pointCount: number
}

export interface MonthPeriod {
  month: string
  cashflowPlnMinor: number
  incomePlnMinor?: number
}

/** Percent change of `last` vs `first`; null if first is 0. */
export function pctChange(first: number, last: number): number | null {
  if (first === 0) return last === 0 ? 0 : null
  return ((last - first) / Math.abs(first)) * 100
}

export function groupYears(points: NetWorthHistoryPoint[]): YearPeriod[] {
  const byYear = new Map<number, NetWorthHistoryPoint[]>()
  for (const p of points) {
    const y = Number(p.day.slice(0, 4))
    const list = byYear.get(y) ?? []
    list.push(p)
    byYear.set(y, list)
  }

  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => {
      const sorted = [...list].sort((a, b) => a.day.localeCompare(b.day))
      const first = sorted[0].netWorthPlnMinor
      const last = sorted[sorted.length - 1].netWorthPlnMinor
      return {
        year,
        changePercent: sorted.length >= 2 ? pctChange(first, last) : null,
        firstMinor: first,
        lastMinor: last,
        pointCount: sorted.length
      }
    })
}

/** YTD: from first snapshot of current calendar year to latest. */
export function ytdChange(points: NetWorthHistoryPoint[], now = new Date()): number | null {
  const year = now.getFullYear()
  const inYear = points
    .filter((p) => Number(p.day.slice(0, 4)) === year)
    .sort((a, b) => a.day.localeCompare(b.day))
  if (inYear.length < 2) return null
  return pctChange(inYear[0].netWorthPlnMinor, inYear[inYear.length - 1].netWorthPlnMinor)
}

export function filterPointsByYear(
  points: NetWorthHistoryPoint[],
  year: number | 'all'
): NetWorthHistoryPoint[] {
  if (year === 'all') return points
  return points.filter((p) => Number(p.day.slice(0, 4)) === year)
}

/** Best / worst calendar-month net-worth change from daily snapshots. */
export function bestWorstMonths(points: NetWorthHistoryPoint[]): {
  best: { month: string; changePercent: number } | null
  worst: { month: string; changePercent: number } | null
} {
  const byMonth = new Map<string, NetWorthHistoryPoint[]>()
  for (const p of points) {
    const m = p.day.slice(0, 7)
    const list = byMonth.get(m) ?? []
    list.push(p)
    byMonth.set(m, list)
  }

  let best: { month: string; changePercent: number } | null = null
  let worst: { month: string; changePercent: number } | null = null

  for (const [month, list] of byMonth) {
    const sorted = [...list].sort((a, b) => a.day.localeCompare(b.day))
    if (sorted.length < 2) continue
    const change = pctChange(sorted[0].netWorthPlnMinor, sorted[sorted.length - 1].netWorthPlnMinor)
    if (change == null) continue
    if (!best || change > best.changePercent) best = { month, changePercent: change }
    if (!worst || change < worst.changePercent) worst = { month, changePercent: change }
  }

  return { best, worst }
}

export function monthsFromCashflow(points: CashflowMonthPoint[]): MonthPeriod[] {
  return [...points]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((p) => ({ month: p.month, cashflowPlnMinor: p.cashflowPlnMinor }))
}

export interface CashflowRailMonth extends MonthPeriod {
  incomePlnMinor: number
  /**
   * Savings rate for the month: cashflow / income × 100.
   * Null when income is 0 (no rate to show).
   */
  changePercent: number | null
}

/**
 * Stable month rail: history months + always keep `anchorMonths` (current + URL)
 * so switching away from “this month” doesn’t make it vanish.
 * Chip % = cashflow ÷ income (what you kept), not MoM vs previous month.
 */
export function buildCashflowMonthRail(
  points: CashflowMonthPoint[],
  anchorMonths: string[]
): CashflowRailMonth[] {
  const byMonth = new Map<string, { cashflow: number; income: number }>()
  for (const p of points) {
    byMonth.set(p.month, {
      cashflow: p.cashflowPlnMinor,
      income: p.incomePlnMinor
    })
  }
  for (const m of anchorMonths) {
    if (m && /^\d{4}-\d{2}$/.test(m) && !byMonth.has(m)) {
      byMonth.set(m, { cashflow: 0, income: 0 })
    }
  }

  return [...byMonth.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const row = byMonth.get(month) ?? { cashflow: 0, income: 0 }
      const changePercent =
        row.income > 0 ? (row.cashflow / row.income) * 100 : null
      return {
        month,
        cashflowPlnMinor: row.cashflow,
        incomePlnMinor: row.income,
        changePercent
      }
    })
}
