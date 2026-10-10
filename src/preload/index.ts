import { contextBridge, ipcRenderer } from 'electron'
import { z } from 'zod'
import {
  IpcChannels,
  IpcRequestSchemas,
  type CreateExpenseRequest,
  type CreateIncomeRequest,
  type GetAssetRequest,
  type GetMonthSummaryRequest
} from '../shared/ipc'
import type {
  Asset,
  DashboardSnapshot,
  ExpenseCategory,
  ExpenseEntry,
  IncomeEntry,
  Liability,
  MonthSummary,
  ValuedAsset
} from '../shared/types'

function invokeValidated<T>(
  channel: keyof typeof IpcRequestSchemas,
  payload?: unknown
): Promise<T> {
  const schema = IpcRequestSchemas[channel]
  const parsed = schema.parse(payload ?? {})
  return ipcRenderer.invoke(channel, parsed) as Promise<T>
}

const getAssetRequestGuard = z.object({ id: z.string().uuid() })
const createIncomeRequestGuard = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amountMinor: z.number().int(),
  currency: z.string().min(3).max(3).default('PLN'),
  note: z.string().nullable().optional(),
  allocations: z
    .array(z.object({ assetId: z.string().uuid(), amountMinor: z.number().int() }))
    .default([])
})
const getMonthSummaryGuard = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
})
const createExpenseGuard = z.object({
  categoryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3).default('PLN'),
  note: z.string().nullable().optional(),
  liabilityId: z.string().uuid().nullable().optional()
})

const api = {
  getDashboard: (): Promise<DashboardSnapshot> => invokeValidated(IpcChannels.getDashboard),

  listAssets: (): Promise<Asset[]> => invokeValidated(IpcChannels.listAssets),

  getAsset: (request: GetAssetRequest): Promise<ValuedAsset | null> =>
    invokeValidated(IpcChannels.getAsset, getAssetRequestGuard.parse(request)),

  listIncome: (): Promise<IncomeEntry[]> => invokeValidated(IpcChannels.listIncome),

  createIncome: (request: CreateIncomeRequest): Promise<IncomeEntry> =>
    invokeValidated(IpcChannels.createIncome, createIncomeRequestGuard.parse(request)),

  refreshPrices: (): Promise<DashboardSnapshot> => invokeValidated(IpcChannels.refreshPrices),

  listLiabilities: (): Promise<Liability[]> => invokeValidated(IpcChannels.listLiabilities),

  listExpenseCategories: (): Promise<ExpenseCategory[]> =>
    invokeValidated(IpcChannels.listExpenseCategories),

  getMonthSummary: (request: GetMonthSummaryRequest): Promise<MonthSummary> =>
    invokeValidated(IpcChannels.getMonthSummary, getMonthSummaryGuard.parse(request)),

  createExpense: (request: CreateExpenseRequest): Promise<ExpenseEntry> =>
    invokeValidated(IpcChannels.createExpense, createExpenseGuard.parse(request))
}

export type NetWorthApi = typeof api

contextBridge.exposeInMainWorld('api', api)
