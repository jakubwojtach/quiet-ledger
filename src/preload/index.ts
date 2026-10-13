import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannels,
  IpcRequestSchemas,
  type CreateExpenseRequest,
  type CreateIncomeRequest,
  type GetAssetRequest,
  type GetMonthSummaryRequest,
  type IdRequest,
  type ListLotsRequest,
  type UpdateExpenseRequest,
  type UpdateIncomeRequest,
  type UpsertAssetRequest,
  type UpsertLiabilityRequest,
  type UpsertLotRequest
} from '../shared/ipc'
import type { DatabaseInfo } from '../shared/dataDirs'
import type {
  Asset,
  AssetLot,
  CashflowMonthPoint,
  DashboardSnapshot,
  ExpenseCategory,
  ExpenseEntry,
  IncomeEntry,
  Liability,
  MonthSummary,
  NetWorthHistoryPoint,
  ValuedAsset,
  ValuedLot
} from '../shared/types'

/**
 * Validate in the preload, but send the *original* payload.
 * Main re-parses and applies Zod transforms (e.g. PLN major → grosze) once.
 * Sending the already-transformed value used to multiply money by 100 twice.
 */
function invokeValidated<T>(
  channel: keyof typeof IpcRequestSchemas,
  payload?: unknown
): Promise<T> {
  const schema = IpcRequestSchemas[channel]
  const raw = payload ?? {}
  schema.parse(raw)
  return ipcRenderer.invoke(channel, raw) as Promise<T>
}

const api = {
  getDashboard: (): Promise<DashboardSnapshot> => invokeValidated(IpcChannels.getDashboard),

  listAssets: (): Promise<Asset[]> => invokeValidated(IpcChannels.listAssets),

  getAsset: (request: GetAssetRequest): Promise<ValuedAsset | null> =>
    invokeValidated(IpcChannels.getAsset, request),

  upsertAsset: (request: UpsertAssetRequest): Promise<Asset> =>
    invokeValidated(IpcChannels.upsertAsset, request),

  deleteAsset: (request: IdRequest): Promise<{ ok: true }> =>
    invokeValidated(IpcChannels.deleteAsset, request),

  listIncome: (): Promise<IncomeEntry[]> => invokeValidated(IpcChannels.listIncome),

  createIncome: (request: CreateIncomeRequest): Promise<IncomeEntry> =>
    invokeValidated(IpcChannels.createIncome, request),

  updateIncome: (request: UpdateIncomeRequest): Promise<IncomeEntry> =>
    invokeValidated(IpcChannels.updateIncome, request),

  deleteIncome: (request: IdRequest): Promise<{ ok: true }> =>
    invokeValidated(IpcChannels.deleteIncome, request),

  refreshPrices: (): Promise<DashboardSnapshot> => invokeValidated(IpcChannels.refreshPrices),

  listLiabilities: (): Promise<Liability[]> => invokeValidated(IpcChannels.listLiabilities),

  upsertLiability: (request: UpsertLiabilityRequest): Promise<Liability> =>
    invokeValidated(IpcChannels.upsertLiability, request),

  deleteLiability: (request: IdRequest): Promise<{ ok: true }> =>
    invokeValidated(IpcChannels.deleteLiability, request),

  listExpenseCategories: (): Promise<ExpenseCategory[]> =>
    invokeValidated(IpcChannels.listExpenseCategories),

  getMonthSummary: (request: GetMonthSummaryRequest): Promise<MonthSummary> =>
    invokeValidated(IpcChannels.getMonthSummary, request),

  createExpense: (request: CreateExpenseRequest): Promise<ExpenseEntry> =>
    invokeValidated(IpcChannels.createExpense, request),

  updateExpense: (request: UpdateExpenseRequest): Promise<ExpenseEntry> =>
    invokeValidated(IpcChannels.updateExpense, request),

  deleteExpense: (request: IdRequest): Promise<{ ok: true }> =>
    invokeValidated(IpcChannels.deleteExpense, request),

  getDatabaseInfo: (): Promise<DatabaseInfo> => invokeValidated(IpcChannels.getDatabaseInfo),

  listLots: (request: ListLotsRequest): Promise<ValuedLot[]> =>
    invokeValidated(IpcChannels.listLots, request),

  upsertLot: (request: UpsertLotRequest): Promise<AssetLot> =>
    invokeValidated(IpcChannels.upsertLot, request),

  deleteLot: (request: IdRequest): Promise<{ ok: true }> =>
    invokeValidated(IpcChannels.deleteLot, request),

  getNetWorthHistory: (): Promise<NetWorthHistoryPoint[]> =>
    invokeValidated(IpcChannels.getNetWorthHistory),

  getCashflowHistory: (): Promise<CashflowMonthPoint[]> =>
    invokeValidated(IpcChannels.getCashflowHistory)
}

export type NetWorthApi = typeof api

contextBridge.exposeInMainWorld('api', api)
