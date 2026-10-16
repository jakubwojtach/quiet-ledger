import { ipcMain } from 'electron'
import {
  IpcChannels,
  copyExpensesToMonthRequestSchema,
  createExpenseRequestSchema,
  createIncomeRequestSchema,
  getAssetRequestSchema,
  getFxRateRequestSchema,
  getMonthSummaryRequestSchema,
  idRequestSchema,
  integrationIdRequestSchema,
  listLotsRequestSchema,
  listMovementsRequestSchema,
  setIntegrationSecretRequestSchema,
  setIntegrationsRequestSchema,
  updateExpenseRequestSchema,
  updateIncomeRequestSchema,
  upsertAssetRequestSchema,
  upsertLiabilityRequestSchema,
  upsertLotRequestSchema,
  upsertMovementRequestSchema
} from '@shared/ipc'
import type { IntegrationId } from '@shared/integrations'
import { getFxRateToPln, getFxRateToPlnOnDate } from '../services/fx'
import {
  clearIntegrationSecret,
  getIntegrationsConfig,
  hasIntegrationSecret,
  setIntegrationSecret,
  setIntegrationsConfig
} from '../services/integrations/registry'
import { probeOtodom } from '../services/otodom'
import { probeOtomoto } from '../services/otomoto'
import { getEquityPrice } from '../services/prices'
import { PRICE_SCALE } from '../db'
import type { FxRateQuote } from '@shared/types'
import {
  buildDashboard,
  getValuedAsset,
  getValuedLots,
  refreshAllPrices
} from '../services/valuation'
import { deleteLot, upsertLot } from '../db/lots'
import { deleteMovement, listMovements, upsertMovement } from '../db/movements'
import { listCashflowHistory, listNetWorthHistory } from '../db/analytics'
import { buildMonthSummary } from '../services/monthSummary'
import {
  createIncomeEntry,
  deleteIncomeEntry,
  getDatabaseInfo,
  listAssets,
  listIncomeEntries,
  updateIncomeEntry
} from '../db'
import { upsertAsset, deleteAsset } from '../db/assets'
import { listLiabilities, upsertLiability, deleteLiability } from '../db/liabilities'
import {
  copyExpensesToMonth,
  createExpenseEntry,
  deleteExpenseEntry,
  listExpenseCategories,
  updateExpenseEntry
} from '../db/expenses'
import { emitLocalEvent } from '../hooks/localEvents'
import {
  checkForUpdates,
  getAppVersion,
  getUpdateStatus,
  quitAndInstall
} from '../services/updater'

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
    const date = input.date
    const month = date.slice(0, 7)
    const fx = await getFxRateToPlnOnDate(input.currency, date)
    const fxRateScaled = Math.round(fx.rate * PRICE_SCALE)
    const plnAmountMinor = Math.round(input.amount * fx.rate)
    const entry = createIncomeEntry({
      month,
      date,
      amountMinor: input.amount,
      currency: input.currency,
      fxRateScaled,
      plnAmountMinor,
      status: input.status,
      note: input.note,
      allocations: input.allocations.map((a) => ({
        assetId: a.assetId,
        amountMinor: a.amount
      }))
    })
    emitLocalEvent('income.created', { id: entry.id, month: entry.month })
    return entry
  })

  ipcMain.handle(IpcChannels.updateIncome, async (_event, raw: unknown) => {
    const input = updateIncomeRequestSchema.parse(raw)
    const date = input.date
    const month = date.slice(0, 7)
    const fx = await getFxRateToPlnOnDate(input.currency, date)
    const fxRateScaled = Math.round(fx.rate * PRICE_SCALE)
    const plnAmountMinor = Math.round(input.amount * fx.rate)
    const entry = updateIncomeEntry({
      id: input.id,
      month,
      date,
      amountMinor: input.amount,
      currency: input.currency,
      fxRateScaled,
      plnAmountMinor,
      status: input.status,
      note: input.note
    })
    emitLocalEvent('income.updated', { id: entry.id, month: entry.month })
    return entry
  })

  ipcMain.handle(IpcChannels.getFxRate, async (_event, raw: unknown): Promise<FxRateQuote> => {
    const input = getFxRateRequestSchema.parse(raw)
    const fx = await getFxRateToPlnOnDate(input.currency, input.date)
    return {
      currency: input.currency.toUpperCase(),
      date: fx.asOfDate ?? input.date,
      rate: fx.rate,
      stale: fx.stale
    }
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
      liabilityId: input.liabilityId,
      status: input.status,
      dueDate: input.dueDate
    })
    emitLocalEvent('expense.created', { id: entry.id, date: entry.date })
    return entry
  })

  ipcMain.handle(IpcChannels.updateExpense, async (_event, raw: unknown) => {
    const input = updateExpenseRequestSchema.parse(raw)
    const entry = updateExpenseEntry(input.id, {
      categoryId: input.categoryId,
      date: input.date,
      amountMinor: input.amount,
      currency: input.currency,
      note: input.note,
      liabilityId: input.liabilityId,
      status: input.status,
      dueDate: input.dueDate
    })
    emitLocalEvent('expense.updated', { id: entry.id, date: entry.date })
    return entry
  })

  ipcMain.handle(IpcChannels.deleteExpense, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteExpenseEntry(id)
  })

  ipcMain.handle(IpcChannels.copyExpensesToMonth, async (_event, raw: unknown) => {
    const input = copyExpensesToMonthRequestSchema.parse(raw)
    const result = copyExpensesToMonth({
      fromMonth: input.fromMonth,
      toMonth: input.toMonth,
      expenseIds: input.expenseIds,
      categoryNames: input.categoryNames
    })
    emitLocalEvent('expense.copied', {
      fromMonth: input.fromMonth,
      toMonth: input.toMonth,
      copied: result.copied
    })
    return result
  })

  ipcMain.handle(IpcChannels.getDatabaseInfo, async () => getDatabaseInfo())

  ipcMain.handle(IpcChannels.listLots, async (_event, raw: unknown) => {
    const { assetId } = listLotsRequestSchema.parse(raw)
    return getValuedLots(assetId)
  })

  ipcMain.handle(IpcChannels.upsertLot, async (_event, raw: unknown) => {
    const input = upsertLotRequestSchema.parse(raw)
    return upsertLot(input)
  })

  ipcMain.handle(IpcChannels.deleteLot, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteLot(id)
  })

  ipcMain.handle(IpcChannels.listMovements, async (_event, raw: unknown) => {
    const { assetId } = listMovementsRequestSchema.parse(raw)
    return listMovements(assetId)
  })

  ipcMain.handle(IpcChannels.upsertMovement, async (_event, raw: unknown) => {
    const input = upsertMovementRequestSchema.parse(raw)
    return upsertMovement(input)
  })

  ipcMain.handle(IpcChannels.deleteMovement, async (_event, raw: unknown) => {
    const { id } = idRequestSchema.parse(raw)
    return deleteMovement(id)
  })

  // ~2y of daily snapshots so year rail + trend can use real history
  ipcMain.handle(IpcChannels.getNetWorthHistory, async () => listNetWorthHistory(730))

  ipcMain.handle(IpcChannels.getCashflowHistory, async () => listCashflowHistory(18))

  ipcMain.handle(IpcChannels.getIntegrations, async () => getIntegrationsConfig())

  ipcMain.handle(IpcChannels.setIntegrations, async (_event, raw: unknown) => {
    const { integrations } = setIntegrationsRequestSchema.parse(raw)
    return setIntegrationsConfig(integrations)
  })

  ipcMain.handle(IpcChannels.setIntegrationSecret, async (_event, raw: unknown) => {
    const { id, secret } = setIntegrationSecretRequestSchema.parse(raw)
    return setIntegrationSecret(id as IntegrationId, secret)
  })

  ipcMain.handle(IpcChannels.hasIntegrationSecret, async (_event, raw: unknown) => {
    const { id } = integrationIdRequestSchema.parse(raw)
    return { id, hasSecret: hasIntegrationSecret(id as IntegrationId) }
  })

  ipcMain.handle(IpcChannels.clearIntegrationSecret, async (_event, raw: unknown) => {
    const { id } = integrationIdRequestSchema.parse(raw)
    return clearIntegrationSecret(id as IntegrationId)
  })

  ipcMain.handle(IpcChannels.testIntegration, async (_event, raw: unknown) => {
    const { id } = integrationIdRequestSchema.parse(raw)
    const integrationId = id as IntegrationId
    if (integrationId === 'yahoo_equity') {
      const quote = await getEquityPrice('VWCE.DE')
      if (quote.missing) throw new Error('Yahoo returned no quote')
      return { ok: true as const, detail: `${quote.price} ${quote.currency}` }
    }
    if (integrationId === 'frankfurter_fx') {
      const fx = await getFxRateToPln('EUR')
      return { ok: true as const, detail: `1 EUR = ${fx.rate} PLN` }
    }
    if (integrationId === 'analizy_funds') {
      return { ok: true as const, detail: 'analizy.pl is enabled (no probe ticker)' }
    }
    if (integrationId === 'property_catalog') {
      return { ok: true as const, detail: 'Local catalog estimates are available' }
    }
    if (integrationId === 'property_otodom') {
      return probeOtodom()
    }
    if (integrationId === 'vehicle_otomoto') {
      return probeOtomoto()
    }
    throw new Error('This integration cannot be tested yet')
  })

  ipcMain.handle(IpcChannels.getAppVersion, async () => ({ version: getAppVersion() }))
  ipcMain.handle(IpcChannels.getUpdateStatus, async () => getUpdateStatus())
  ipcMain.handle(IpcChannels.checkForUpdates, async () => checkForUpdates())
  ipcMain.handle(IpcChannels.quitAndInstall, async () => {
    quitAndInstall()
    return { ok: true as const }
  })
}
