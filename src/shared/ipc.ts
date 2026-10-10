import { z } from 'zod'
import { ASSET_CLASSES } from './types'

/** Typed IPC channel names */
export const IpcChannels = {
  getDashboard: 'networth:getDashboard',
  getAsset: 'networth:getAsset',
  listAssets: 'networth:listAssets',
  listIncome: 'networth:listIncome',
  createIncome: 'networth:createIncome',
  refreshPrices: 'networth:refreshPrices',
  listLiabilities: 'networth:listLiabilities',
  listExpenseCategories: 'networth:listExpenseCategories',
  getMonthSummary: 'networth:getMonthSummary',
  createExpense: 'networth:createExpense'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

const currencySchema = z.string().min(3).max(3)
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const getAssetRequestSchema = z.object({
  id: z.string().uuid()
})

export const createIncomeRequestSchema = z.object({
  month: monthSchema,
  amountMinor: z.number().int(),
  currency: currencySchema.default('PLN'),
  note: z.string().nullable().optional(),
  allocations: z
    .array(
      z.object({
        assetId: z.string().uuid(),
        amountMinor: z.number().int()
      })
    )
    .default([])
})

export const getMonthSummaryRequestSchema = z.object({
  month: monthSchema
})

export const createExpenseRequestSchema = z.object({
  categoryId: z.string().uuid(),
  date: dateSchema,
  amountMinor: z.number().int().positive(),
  currency: currencySchema.default('PLN'),
  note: z.string().nullable().optional(),
  liabilityId: z.string().uuid().nullable().optional()
})

export const emptyRequestSchema = z.object({}).strict().optional()

export const assetClassSchema = z.enum(ASSET_CLASSES)

/** Runtime validation helpers used by preload before invoke */
export const IpcRequestSchemas = {
  [IpcChannels.getDashboard]: emptyRequestSchema,
  [IpcChannels.getAsset]: getAssetRequestSchema,
  [IpcChannels.listAssets]: emptyRequestSchema,
  [IpcChannels.listIncome]: emptyRequestSchema,
  [IpcChannels.createIncome]: createIncomeRequestSchema,
  [IpcChannels.refreshPrices]: emptyRequestSchema,
  [IpcChannels.listLiabilities]: emptyRequestSchema,
  [IpcChannels.listExpenseCategories]: emptyRequestSchema,
  [IpcChannels.getMonthSummary]: getMonthSummaryRequestSchema,
  [IpcChannels.createExpense]: createExpenseRequestSchema
} as const

export type GetAssetRequest = z.infer<typeof getAssetRequestSchema>
export type CreateIncomeRequest = z.infer<typeof createIncomeRequestSchema>
export type GetMonthSummaryRequest = z.infer<typeof getMonthSummaryRequestSchema>
export type CreateExpenseRequest = z.infer<typeof createExpenseRequestSchema>
