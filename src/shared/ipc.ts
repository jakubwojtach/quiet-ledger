import { z } from 'zod'
import { ASSET_CLASSES } from './types'

/** Typed IPC channel names */
export const IpcChannels = {
  getDashboard: 'networth:getDashboard',
  getAsset: 'networth:getAsset',
  listAssets: 'networth:listAssets',
  listIncome: 'networth:listIncome',
  createIncome: 'networth:createIncome',
  refreshPrices: 'networth:refreshPrices'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

const currencySchema = z.string().min(3).max(3)

export const getAssetRequestSchema = z.object({
  id: z.string().uuid()
})

export const createIncomeRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
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

export const emptyRequestSchema = z.object({}).strict().optional()

export const assetClassSchema = z.enum(ASSET_CLASSES)

/** Runtime validation helpers used by preload before invoke */
export const IpcRequestSchemas = {
  [IpcChannels.getDashboard]: emptyRequestSchema,
  [IpcChannels.getAsset]: getAssetRequestSchema,
  [IpcChannels.listAssets]: emptyRequestSchema,
  [IpcChannels.listIncome]: emptyRequestSchema,
  [IpcChannels.createIncome]: createIncomeRequestSchema,
  [IpcChannels.refreshPrices]: emptyRequestSchema
} as const

export type GetAssetRequest = z.infer<typeof getAssetRequestSchema>
export type CreateIncomeRequest = z.infer<typeof createIncomeRequestSchema>
