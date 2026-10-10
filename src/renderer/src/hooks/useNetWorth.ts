import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateExpenseRequest, CreateIncomeRequest } from '@shared/ipc'
import type { ExpenseEntry, IncomeEntry } from '@shared/types'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  assets: ['assets'] as const,
  asset: (id: string) => ['asset', id] as const,
  income: ['income'] as const,
  liabilities: ['liabilities'] as const,
  expenseCategories: ['expenseCategories'] as const,
  monthSummary: (month: string) => ['monthSummary', month] as const
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => window.api.getDashboard()
  })
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: queryKeys.asset(id ?? ''),
    queryFn: () => window.api.getAsset({ id: id! }),
    enabled: Boolean(id)
  })
}

export function useIncomeLog() {
  return useQuery({
    queryKey: queryKeys.income,
    queryFn: () => window.api.listIncome()
  })
}

export function useCreateIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateIncomeRequest) => window.api.createIncome(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.income })
      const previous = qc.getQueryData<IncomeEntry[]>(queryKeys.income)
      const optimistic: IncomeEntry = {
        id: `optimistic-${Date.now()}`,
        month: input.month,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'PLN',
        note: input.note ?? null,
        allocations: input.allocations ?? [],
        createdAt: new Date().toISOString()
      }
      qc.setQueryData<IncomeEntry[]>(queryKeys.income, (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.income, ctx.previous)
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: queryKeys.income })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      void qc.invalidateQueries({ queryKey: queryKeys.monthSummary(input.month) })
    }
  })
}

export function useRefreshPrices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => window.api.refreshPrices(),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.dashboard, data)
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
    }
  })
}

export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.monthSummary(month),
    queryFn: () => window.api.getMonthSummary({ month }),
    enabled: Boolean(month)
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: queryKeys.expenseCategories,
    queryFn: () => window.api.listExpenseCategories()
  })
}

export function useCreateExpense(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseRequest) => window.api.createExpense(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.monthSummary(month) })
      const previous = qc.getQueryData(queryKeys.monthSummary(month))
      const categories = qc.getQueryData<Array<{ id: string; name: string }>>(
        queryKeys.expenseCategories
      )
      const categoryName =
        categories?.find((c) => c.id === input.categoryId)?.name ?? '…'

      qc.setQueryData(queryKeys.monthSummary(month), (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const summary = old as {
          expenses: ExpenseEntry[]
          expensesPlnMinor: number
          cashflowPlnMinor: number
          incomePlnMinor: number
          installmentsPlnMinor: number
        }
        const optimistic: ExpenseEntry = {
          id: `optimistic-${Date.now()}`,
          categoryId: input.categoryId,
          categoryName,
          date: input.date,
          amountMinor: input.amountMinor,
          currency: input.currency ?? 'PLN',
          note: input.note ?? null,
          liabilityId: input.liabilityId ?? null,
          createdAt: new Date().toISOString()
        }
        const expensesPlnMinor = summary.expensesPlnMinor + input.amountMinor
        return {
          ...summary,
          expenses: [optimistic, ...summary.expenses],
          expensesPlnMinor,
          cashflowPlnMinor:
            summary.incomePlnMinor - expensesPlnMinor - summary.installmentsPlnMinor
        }
      })
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.monthSummary(month), ctx.previous)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.monthSummary(month) })
    }
  })
}
