import { listIncomeEntries } from '../db'
import { listExpensesForMonth } from '../db/expenses'
import { listLiabilities } from '../db/liabilities'
import { convertToPlnMinor } from './fx'
import { valueLiability } from './valuation'
import { emitLocalEvent } from '../hooks/localEvents'
import type { CategorySpend, MonthSummary } from '@shared/types'

export async function buildMonthSummary(month: string): Promise<MonthSummary> {
  const incomeRows = listIncomeEntries().filter((e) => e.month === month)
  const expenses = listExpensesForMonth(month)
  const valuedLiabilities = await Promise.all(listLiabilities().map(valueLiability))

  let incomePlnMinor = 0
  let expensesPlnMinor = 0
  let fxStale = false

  for (const entry of incomeRows) {
    const { plnMinor, stale } = await convertToPlnMinor(entry.amountMinor, entry.currency)
    incomePlnMinor += plnMinor
    if (stale) fxStale = true
  }

  const byCategory = new Map<string, { name: string; amount: number }>()
  for (const expense of expenses) {
    const { plnMinor, stale } = await convertToPlnMinor(expense.amountMinor, expense.currency)
    expensesPlnMinor += plnMinor
    if (stale) fxStale = true
    const prev = byCategory.get(expense.categoryId) ?? {
      name: expense.categoryName,
      amount: 0
    }
    prev.amount += plnMinor
    byCategory.set(expense.categoryId, prev)
  }

  let installmentsPlnMinor = 0
  for (const l of valuedLiabilities) {
    installmentsPlnMinor += l.monthlyPaymentPlnMinor
    if (l.priceStale) fxStale = true
  }

  const expensesByCategory: CategorySpend[] = [...byCategory.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.name,
      amountPlnMinor: v.amount,
      percentOfTotal: expensesPlnMinor === 0 ? 0 : (v.amount / expensesPlnMinor) * 100
    }))
    .sort((a, b) => b.amountPlnMinor - a.amountPlnMinor)

  const summary: MonthSummary = {
    month,
    incomePlnMinor,
    expensesPlnMinor,
    installmentsPlnMinor,
    cashflowPlnMinor: incomePlnMinor - expensesPlnMinor - installmentsPlnMinor,
    expensesByCategory,
    expenses,
    income: incomeRows,
    liabilities: valuedLiabilities,
    fxStale
  }

  emitLocalEvent('month.summary', { month, cashflowPlnMinor: summary.cashflowPlnMinor })
  return summary
}
