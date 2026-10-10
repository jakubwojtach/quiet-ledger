import { ipcMain } from 'electron'
import { IpcChannels, createIncomeRequestSchema, getAssetRequestSchema } from '@shared/ipc'
import { buildDashboard, getValuedAsset, refreshAllPrices } from '../services/valuation'
import { createIncomeEntry, listAssets, listIncomeEntries } from '../db'

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.getDashboard, async () => {
    return buildDashboard()
  })

  ipcMain.handle(IpcChannels.listAssets, async () => {
    return listAssets()
  })

  ipcMain.handle(IpcChannels.getAsset, async (_event, raw: unknown) => {
    const { id } = getAssetRequestSchema.parse(raw)
    return getValuedAsset(id)
  })

  ipcMain.handle(IpcChannels.listIncome, async () => {
    return listIncomeEntries()
  })

  ipcMain.handle(IpcChannels.createIncome, async (_event, raw: unknown) => {
    const input = createIncomeRequestSchema.parse(raw)
    return createIncomeEntry({
      month: input.month,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note,
      allocations: input.allocations
    })
  })

  ipcMain.handle(IpcChannels.refreshPrices, async () => {
    return refreshAllPrices()
  })
}
