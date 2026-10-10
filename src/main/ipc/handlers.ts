import { ipcMain } from 'electron'
import {
  IpcChannels,
  createExpenseRequestSchema,
  createIncomeRequestSchema,
  getAssetRequestSchema,
  getMonthSummaryRequestSchema
} from '@shared/ipc'
import { buildDashboard, getValuedAsset, refreshAllPrices } from '../services/valuation'
import { buildMonthSummary } from '../services/monthSummary'
import { createIncomeEntry, listAssets, listIncomeEntries } from '../db'
import { listLiabilities } from '../db/liabilities'
import { createExpenseEntry, listExpenseCategories } from '../db/expenses'
import { emitLocalEvent } from '../hooks/localEvents'

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.getDashboard, async () => buildDashboard())

  ipcMain.handle(IpcChannels.listAssets, async () => listAssets())

  ipcMain.handle(IpcChannels.getAsset, async (_event, raw: unknown) => {
    const { id } = getAssetRequestSchema.parse(raw)
    return getValuedAsset(id)
  })

  ipcMain.handle(IpcChannels.listIncome, async () => listIncomeEntries())

  ipcMain.handle(IpcChannels.createIncome, async (_event, raw: unknown) => {
    const input = createIncomeRequestSchema.parse(raw)
    const entry = createIncomeEntry({
      month: input.month,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note,
      allocations: input.allocations
    })
    emitLocalEvent('income.created', { id: entry.id, month: entry.month })
    return entry
  })

  ipcMain.handle(IpcChannels.refreshPrices, async () => refreshAllPrices())

  ipcMain.handle(IpcChannels.listLiabilities, async () => listLiabilities())

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
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note,
      liabilityId: input.liabilityId
    })
    emitLocalEvent('expense.created', { id: entry.id, date: entry.date })
    return entry
  })
}
