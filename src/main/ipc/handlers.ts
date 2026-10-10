import { ipcMain } from 'electron'
import {
  IpcChannels,
  createExpenseRequestSchema,
  createIncomeRequestSchema,
  getAssetRequestSchema,
  getMonthSummaryRequestSchema,
  idRequestSchema,
  upsertAssetRequestSchema,
  upsertLiabilityRequestSchema
} from '@shared/ipc'
import { buildDashboard, getValuedAsset, refreshAllPrices } from '../services/valuation'
import { buildMonthSummary } from '../services/monthSummary'
import {
  createIncomeEntry,
  deleteIncomeEntry,
  getDatabaseInfo,
  listAssets,
  listIncomeEntries
} from '../db'
import { upsertAsset, deleteAsset } from '../db/assets'
import { listLiabilities, upsertLiability, deleteLiability } from '../db/liabilities'
import {
  createExpenseEntry,
  deleteExpenseEntry,
  listExpenseCategories
} from '../db/expenses'
import { emitLocalEvent } from '../hooks/localEvents'

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.getDashboard, async () => buildDashboard())

  ipcMain.handle(IpcChannels.listAssets, async () => listAssets())

  ipcMain.handle(IpcChannels.getAsset, async (_event, raw: unknown) => {
    const { id } = getAssetRequestSchema.parse(raw)
    return getValuedAsset(id)
  })

  ipcMain.handle(IpcChannels.upsertAsset, async (_event, raw: unknown) => {
    const input = upsertAssetRequestSchema.parse(raw)
    return upsertAsset(input)
  })

  ipcMain.handle(IpcChannels.deleteAsset, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteAsset(id)
  })

  ipcMain.handle(IpcChannels.listIncome, async () => listIncomeEntries())

  ipcMain.handle(IpcChannels.createIncome, async (_event, raw: unknown) => {
    const input = createIncomeRequestSchema.parse(raw)
    const entry = createIncomeEntry({
      month: input.month,
      amountMinor: input.amount,
      currency: input.currency,
      note: input.note,
      allocations: input.allocations.map((a) => ({
        assetId: a.assetId,
        amountMinor: a.amount
      }))
    })
    emitLocalEvent('income.created', { id: entry.id, month: entry.month })
    return entry
  })

  ipcMain.handle(IpcChannels.deleteIncome, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteIncomeEntry(id)
  })

  ipcMain.handle(IpcChannels.refreshPrices, async () => refreshAllPrices())

  ipcMain.handle(IpcChannels.listLiabilities, async () => listLiabilities())

  ipcMain.handle(IpcChannels.upsertLiability, async (_event, raw: unknown) => {
    const input = upsertLiabilityRequestSchema.parse(raw)
    return upsertLiability({
      id: input.id,
      name: input.name,
      provider: input.provider,
      principalMinor: input.principal,
      monthlyPaymentMinor: input.monthlyPayment,
      currency: input.currency,
      nextDueDate: input.nextDueDate,
      notes: input.notes
    })
  })

  ipcMain.handle(IpcChannels.deleteLiability, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteLiability(id)
  })

  ipcMain.handle(IpcChannels.listExpenseCategories, async () => listExpenseCategories())

  ipcMain.handle(IpcChannels.getMonthSummary, async (_event, raw: unknown) => {
    const { month } = getMonthSummaryRequestSchema.parse(raw)
    return buildMonthSummary(month)
  })

  ipcMain.handle(IpcChannels.createExpense, async (_event, raw: unknown) => {
    const input = createExpenseRequestSchema.parse(raw)
    const entry = createExpenseEntry({
      categoryId: input.categoryId,
      date: input.date,
      amountMinor: input.amount,
      currency: input.currency,
      note: input.note,
      liabilityId: input.liabilityId
    })
    emitLocalEvent('expense.created', { id: entry.id, date: entry.date })
    return entry
  })

  ipcMain.handle(IpcChannels.deleteExpense, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteExpenseEntry(id)
  })

  ipcMain.handle(IpcChannels.getDatabaseInfo, async () => getDatabaseInfo())
}
