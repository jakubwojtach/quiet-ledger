import { getDb } from './index'
import { listLiabilities } from './liabilities'
import type { CashflowMonthPoint, NetWorthHistoryPoint } from '@shared/types'

/** Upsert today's net-worth snapshot (called from dashboard build). */
export function recordNetWorthSnapshot(input: {
  assetsMinor: number
  liabilitiesMinor: number
  netWorthMinor: number
}): void {
  const day = new Date().toISOString().slice(0, 10)
  const recordedAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO net_worth_snapshots
         (day, assets_minor, liabilities_minor, net_worth_minor, recorded_at)
       VALUES (@day, @assetsMinor, @liabilitiesMinor, @netWorthMinor, @recordedAt)
       ON CONFLICT(day) DO UPDATE SET
         assets_minor = excluded.assets_minor,
         liabilities_minor = excluded.liabilities_minor,
         net_worth_minor = excluded.net_worth_minor,
         recorded_at = excluded.recorded_at`
    )
    .run({
      day,
      assetsMinor: input.assetsMinor,
      liabilitiesMinor: input.liabilitiesMinor,
      netWorthMinor: input.netWorthMinor,
      recordedAt
    })
}

export function listNetWorthHistory(limit = 90): NetWorthHistoryPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT day, assets_minor, liabilities_minor, net_worth_minor
       FROM net_worth_snapshots
       ORDER BY day DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    day: string
    assets_minor: number
    liabilities_minor: number
    net_worth_minor: number
  }>

  return rows
    .map((r) => ({
      day: r.day,
      assetsPlnMinor: r.assets_minor,
      liabilitiesPlnMinor: r.liabilities_minor,
      netWorthPlnMinor: r.net_worth_minor
    }))
    .reverse()
}

/** Monthly income / expense / scheduled loan payments for charts (PLN minor units). */
export function listCashflowHistory(limitMonths = 18): CashflowMonthPoint[] {
  const db = getDb()
  const incomeRows = db
    .prepare(
      `SELECT month, SUM(amount_minor) AS total
       FROM income_entries
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`
    )
    .all(limitMonths) as Array<{ month: string; total: number }>

  const expenseRows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month, SUM(amount_minor) AS total
       FROM expense_entries
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`
    )
    .all(limitMonths) as Array<{ month: string; total: number }>

  const loanPayments = listLiabilities().reduce((sum, l) => {
    // Charts assume loan currencies are PLN (current data); non-PLN would need FX.
    return l.currency === 'PLN' ? sum + l.monthlyPaymentMinor : sum
  }, 0)

  const months = new Set<string>()
  for (const r of incomeRows) months.add(r.month)
  for (const r of expenseRows) months.add(r.month)

  const incomeMap = new Map(incomeRows.map((r) => [r.month, r.total]))
  const expenseMap = new Map(expenseRows.map((r) => [r.month, r.total]))

  return [...months]
    .sort()
    .slice(-limitMonths)
    .map((month) => {
      const incomePlnMinor = incomeMap.get(month) ?? 0
      const expensesPlnMinor = expenseMap.get(month) ?? 0
      const installmentsPlnMinor = loanPayments
      return {
        month,
        incomePlnMinor,
        expensesPlnMinor,
        installmentsPlnMinor,
        cashflowPlnMinor: incomePlnMinor - expensesPlnMinor - installmentsPlnMinor
      }
    })
}
