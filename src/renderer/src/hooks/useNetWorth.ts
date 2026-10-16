import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CopyExpensesToMonthRequest,
  CreateExpenseRequest,
  CreateIncomeRequest,
  UpdateExpenseRequest,
  UpdateIncomeRequest,
  UpsertAssetRequest,
  UpsertLiabilityRequest,
  UpsertLotRequest,
  UpsertMovementRequest
} from '@shared/ipc'
import type { ExpenseEntry, IncomeEntry } from '@shared/types'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  assets: ['assets'] as const,
  asset: (id: string) => ['asset', id] as const,
  income: ['income'] as const,
  liabilities: ['liabilities'] as const,
  expenseCategories: ['expenseCategories'] as const,
  monthSummary: (month: string) => ['monthSummary', month] as const,
  lots: (assetId: string) => ['lots', assetId] as const,
  movements: (assetId: string) => ['movements', assetId] as const,
  netWorthHistory: ['netWorthHistory'] as const,
  cashflowHistory: ['cashflowHistory'] as const
}

function invalidateMoney(qc: ReturnType<typeof useQueryClient>, month?: string): void {
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
  void qc.invalidateQueries({ queryKey: queryKeys.assets })
  void qc.invalidateQueries({ queryKey: ['asset'] })
  void qc.invalidateQueries({ queryKey: ['lots'] })
  void qc.invalidateQueries({ queryKey: ['movements'] })
  void qc.invalidateQueries({ queryKey: queryKeys.liabilities })
  void qc.invalidateQueries({ queryKey: queryKeys.income })
  void qc.invalidateQueries({ queryKey: queryKeys.netWorthHistory })
  void qc.invalidateQueries({ queryKey: queryKeys.cashflowHistory })
  if (month) void qc.invalidateQueries({ queryKey: queryKeys.monthSummary(month) })
  else void qc.invalidateQueries({ queryKey: ['monthSummary'] })
}

export function useDatabaseInfo() {
  return useQuery({
    queryKey: ['databaseInfo'] as const,
    queryFn: () => window.api.getDatabaseInfo(),
    staleTime: Infinity
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => window.api.getDashboard()
  })
}

export function useNetWorthHistory() {
  return useQuery({
    queryKey: queryKeys.netWorthHistory,
    queryFn: () => window.api.getNetWorthHistory(),
    staleTime: 60_000
  })
}

export function useCashflowHistory() {
  return useQuery({
    queryKey: queryKeys.cashflowHistory,
    queryFn: () => window.api.getCashflowHistory(),
    staleTime: 60_000
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
      const amountMinor = Math.round(Number(input.amount) * 100)
      const currency = input.currency ?? 'PLN'
      const date = input.date ?? `${input.month}-01`
      const status = input.status === 'expected' ? 'expected' : 'received'
      const optimistic: IncomeEntry = {
        id: `optimistic-${Date.now()}`,
        month: date.slice(0, 7),
        date,
        amountMinor,
        currency,
        fxRateScaled: 10_000,
        plnAmountMinor: amountMinor,
        status,
        note: input.note ?? null,
        allocations: [],
        createdAt: new Date().toISOString()
      }
      qc.setQueryData<IncomeEntry[]>(queryKeys.income, (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.income, ctx.previous)
    },
    onSuccess: (_data, input) => {
      invalidateMoney(qc, input.month)
    }
  })
}

export function useUpdateIncome(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateIncomeRequest) => window.api.updateIncome(input),
    onMutate: async (input) => {
      const key = queryKeys.monthSummary(month)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const nextStatus = input.status === 'expected' ? 'expected' : 'received'
      const amountMinor = Math.round(Number(input.amount) * 100)

      qc.setQueryData(key, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const summary = old as {
          income: IncomeEntry[]
          incomePlnMinor: number
          expectedIncomePlnMinor: number
          expensesPlnMinor: number
          installmentsPlnMinor: number
          cashflowPlnMinor: number
        }
        const income = summary.income.map((e) => {
          if (e.id !== input.id) return e
          const plnAmountMinor =
            e.currency === (input.currency ?? e.currency) && e.amountMinor === amountMinor
              ? e.plnAmountMinor
              : amountMinor
          return {
            ...e,
            month: input.date.slice(0, 7),
            date: input.date,
            amountMinor,
            currency: input.currency ?? e.currency,
            status: nextStatus,
            note: input.note ?? null,
            plnAmountMinor
          }
        })
        const incomePlnMinor = income
          .filter((e) => e.status === 'received')
          .reduce((s, e) => s + e.plnAmountMinor, 0)
        const expectedIncomePlnMinor = income
          .filter((e) => e.status === 'expected')
          .reduce((s, e) => s + e.plnAmountMinor, 0)
        return {
          ...summary,
          income,
          incomePlnMinor,
          expectedIncomePlnMinor,
          cashflowPlnMinor:
            incomePlnMinor - summary.expensesPlnMinor - summary.installmentsPlnMinor
        }
      })
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.monthSummary(month), ctx.previous)
    },
    onSuccess: (_data, input) => {
      invalidateMoney(qc, month)
      if (input.month !== month) invalidateMoney(qc, input.month)
    }
  })
}

export function useDeleteIncome(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteIncome({ id }),
    onSuccess: () => invalidateMoney(qc, month)
  })
}

export function useRefreshPrices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => window.api.refreshPrices(),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.dashboard, data)
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      void qc.invalidateQueries({ queryKey: queryKeys.netWorthHistory })
    }
  })
}

/** Bust TTL for one holding and pull a live quote from its source. */
export function useRefreshAssetPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.refreshAssetPrice({ id }),
    onSuccess: (data, id) => {
      if (data) qc.setQueryData(queryKeys.asset(id), data)
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      void qc.invalidateQueries({ queryKey: queryKeys.netWorthHistory })
      void qc.invalidateQueries({ queryKey: queryKeys.lots(id) })
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
      const categoryName = categories?.find((c) => c.id === input.categoryId)?.name ?? '…'
      const amountMinor = Math.round(Number(input.amount) * 100)

      qc.setQueryData(queryKeys.monthSummary(month), (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const summary = old as {
          expenses: ExpenseEntry[]
          expensesPlnMinor: number
          duePlnMinor: number
          cashflowPlnMinor: number
          incomePlnMinor: number
          installmentsPlnMinor: number
        }
        const status = input.status === 'due' ? 'due' : 'paid'
        const optimistic: ExpenseEntry = {
          id: `optimistic-${Date.now()}`,
          categoryId: input.categoryId,
          categoryName,
          date: input.date,
          amountMinor,
          currency: input.currency ?? 'PLN',
          note: input.note ?? null,
          liabilityId: input.liabilityId ?? null,
          status,
          dueDate: input.dueDate ?? null,
          createdAt: new Date().toISOString()
        }
        const expensesPlnMinor =
          status === 'paid' ? summary.expensesPlnMinor + amountMinor : summary.expensesPlnMinor
        const duePlnMinor =
          status === 'due' ? (summary.duePlnMinor ?? 0) + amountMinor : (summary.duePlnMinor ?? 0)
        return {
          ...summary,
          expenses: [optimistic, ...summary.expenses],
          expensesPlnMinor,
          duePlnMinor,
          cashflowPlnMinor:
            summary.incomePlnMinor - expensesPlnMinor - summary.installmentsPlnMinor
        }
      })
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.monthSummary(month), ctx.previous)
    },
    onSuccess: () => invalidateMoney(qc, month)
  })
}

export function useUpdateExpense(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateExpenseRequest) => window.api.updateExpense(input),
    onSuccess: (_data, input) => {
      invalidateMoney(qc, month)
      const nextMonth = input.date.slice(0, 7)
      if (nextMonth !== month) invalidateMoney(qc, nextMonth)
    }
  })
}

export function useDeleteExpense(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteExpense({ id }),
    onSuccess: () => invalidateMoney(qc, month)
  })
}

export function useCopyExpensesToMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CopyExpensesToMonthRequest) => window.api.copyExpensesToMonth(input),
    onSuccess: (_data, input) => {
      invalidateMoney(qc, input.fromMonth)
      invalidateMoney(qc, input.toMonth)
    }
  })
}

export function useUpsertAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertAssetRequest) => window.api.upsertAsset(input),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteAsset({ id }),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useUpsertLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertLiabilityRequest) => window.api.upsertLiability(input),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useLots(assetId: string | null) {
  return useQuery({
    queryKey: queryKeys.lots(assetId ?? ''),
    queryFn: () => window.api.listLots({ assetId: assetId! }),
    enabled: Boolean(assetId)
  })
}

export function useUpsertLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertLotRequest) => window.api.upsertLot(input),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useDeleteLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteLot({ id }),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useMovements(assetId: string | null) {
  return useQuery({
    queryKey: queryKeys.movements(assetId ?? ''),
    queryFn: () => window.api.listMovements({ assetId: assetId! }),
    enabled: Boolean(assetId)
  })
}

export function useUpsertMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertMovementRequest) => window.api.upsertMovement(input),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useDeleteMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteMovement({ id }),
    onSuccess: () => invalidateMoney(qc)
  })
}

export function useDeleteLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.deleteLiability({ id }),
    onSuccess: () => invalidateMoney(qc)
  })
}
