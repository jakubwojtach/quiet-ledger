import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateIncomeRequest } from '@shared/ipc'
import type { IncomeEntry } from '@shared/types'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  assets: ['assets'] as const,
  asset: (id: string) => ['asset', id] as const,
  income: ['income'] as const
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.income })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
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
