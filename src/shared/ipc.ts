import { z } from 'zod'
import { ASSET_CLASSES, LOT_PRICE_SCALE, QUANTITY_SCALE } from './types'
import { majorToMinor } from './money'

/** Typed IPC channel names */
export const IpcChannels = {
  getDashboard: 'networth:getDashboard',
  getAsset: 'networth:getAsset',
  listAssets: 'networth:listAssets',
  upsertAsset: 'networth:upsertAsset',
  deleteAsset: 'networth:deleteAsset',
  listIncome: 'networth:listIncome',
  createIncome: 'networth:createIncome',
  deleteIncome: 'networth:deleteIncome',
  refreshPrices: 'networth:refreshPrices',
  listLiabilities: 'networth:listLiabilities',
  upsertLiability: 'networth:upsertLiability',
  deleteLiability: 'networth:deleteLiability',
  listExpenseCategories: 'networth:listExpenseCategories',
  getMonthSummary: 'networth:getMonthSummary',
  createExpense: 'networth:createExpense',
  deleteExpense: 'networth:deleteExpense',
  getDatabaseInfo: 'networth:getDatabaseInfo',
  listLots: 'networth:listLots',
  upsertLot: 'networth:upsertLot',
  deleteLot: 'networth:deleteLot',
  getNetWorthHistory: 'networth:getNetWorthHistory',
  getCashflowHistory: 'networth:getCashflowHistory'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

const currencySchema = z.string().min(3).max(3)
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** UI sends major money units; Zod converts to minor (grosze/cents). */
const moneyMajorToMinor = z.number().finite().transform((n) => majorToMinor(n))
const optionalMoneyMajorToMinor = z
  .number()
  .finite()
  .nonnegative()
  .nullable()
  .optional()
  .transform((n) => (n == null ? null : majorToMinor(n)))
const valueSourceSchema = z.enum(['estimate', 'manual']).default('manual')
const quantityToScaled = z
  .number()
  .positive()
  .transform((n) => Math.round(n * QUANTITY_SCALE))

export const getAssetRequestSchema = z.object({
  id: z.string().uuid()
})

export const idRequestSchema = z.object({
  id: z.string().uuid()
})

export const createIncomeRequestSchema = z.object({
  month: monthSchema,
  /** Major units from UI → minor */
  amount: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  note: z.string().nullable().optional(),
  allocations: z
    .array(
      z.object({
        assetId: z.string().uuid(),
        amount: moneyMajorToMinor
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
  amount: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  note: z.string().nullable().optional(),
  liabilityId: z.string().uuid().nullable().optional()
})

const assetBase = {
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  account: z.string().trim().max(60).nullable().optional()
}

export const upsertAssetRequestSchema = z.discriminatedUnion('class', [
  z.object({
    ...assetBase,
    class: z.literal('etf'),
    ticker: z.string().min(1),
    quantity: quantityToScaled,
    costBasis: moneyMajorToMinor,
    costCurrency: currencySchema
  }),
  z.object({
    ...assetBase,
    class: z.literal('bond'),
    nominal: moneyMajorToMinor,
    unitValue: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    statementValue: optionalMoneyMajorToMinor,
    valuedOn: dateSchema.nullable().optional()
  }),
  z.object({
    ...assetBase,
    class: z.literal('retirement'),
    units: quantityToScaled,
    unitPrice: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    fundCode: z.string().trim().max(20).nullable().optional(),
    costBasis: optionalMoneyMajorToMinor
  }),
  z.object({
    ...assetBase,
    class: z.literal('savings_usd'),
    amount: moneyMajorToMinor,
    currency: currencySchema.default('USD')
  }),
  z.object({
    ...assetBase,
    class: z.literal('savings_pln'),
    amount: moneyMajorToMinor,
    currency: currencySchema.default('PLN')
  }),
  z.object({
    ...assetBase,
    class: z.literal('apartment'),
    value: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    valuedOn: dateSchema,
    costBasis: optionalMoneyMajorToMinor,
    valueSource: valueSourceSchema
  }),
  z.object({
    ...assetBase,
    class: z.literal('land'),
    value: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    valuedOn: dateSchema,
    costBasis: optionalMoneyMajorToMinor,
    valueSource: valueSourceSchema
  }),
  z.object({
    ...assetBase,
    class: z.literal('car'),
    value: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    valuedOn: dateSchema,
    costBasis: optionalMoneyMajorToMinor,
    valueSource: valueSourceSchema
  })
])

export const upsertLiabilityRequestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  provider: z.string().nullable().optional(),
  principal: moneyMajorToMinor,
  monthlyPayment: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  nextDueDate: dateSchema.nullable().optional(),
  notes: z.string().nullable().optional()
})

export const listLotsRequestSchema = z.object({
  assetId: z.string().uuid()
})

export const upsertLotRequestSchema = z.object({
  id: z.string().uuid().optional(),
  assetId: z.string().uuid(),
  date: dateSchema,
  /** Units, or number of bonds */
  quantity: quantityToScaled,
  /** Price per unit in major units of priceCurrency */
  price: z
    .number()
    .finite()
    .positive()
    .nullable()
    .optional()
    .transform((n) => (n == null ? null : Math.round(n * LOT_PRICE_SCALE))),
  priceCurrency: currencySchema.nullable().optional(),
  paid: moneyMajorToMinor,
  paidCurrency: currencySchema,
  series: z.string().trim().max(20).nullable().optional(),
  estimated: z.boolean().default(false),
  note: z.string().nullable().optional()
})

export const emptyRequestSchema = z.object({}).strict().optional()

export const assetClassSchema = z.enum(ASSET_CLASSES)

/** Runtime validation helpers used by preload before invoke */
export const IpcRequestSchemas = {
  [IpcChannels.getDashboard]: emptyRequestSchema,
  [IpcChannels.getAsset]: getAssetRequestSchema,
  [IpcChannels.listAssets]: emptyRequestSchema,
  [IpcChannels.upsertAsset]: upsertAssetRequestSchema,
  [IpcChannels.deleteAsset]: idRequestSchema,
  [IpcChannels.listIncome]: emptyRequestSchema,
  [IpcChannels.createIncome]: createIncomeRequestSchema,
  [IpcChannels.deleteIncome]: idRequestSchema,
  [IpcChannels.refreshPrices]: emptyRequestSchema,
  [IpcChannels.listLiabilities]: emptyRequestSchema,
  [IpcChannels.upsertLiability]: upsertLiabilityRequestSchema,
  [IpcChannels.deleteLiability]: idRequestSchema,
  [IpcChannels.listExpenseCategories]: emptyRequestSchema,
  [IpcChannels.getMonthSummary]: getMonthSummaryRequestSchema,
  [IpcChannels.createExpense]: createExpenseRequestSchema,
  [IpcChannels.deleteExpense]: idRequestSchema,
  [IpcChannels.getDatabaseInfo]: emptyRequestSchema,
  [IpcChannels.listLots]: listLotsRequestSchema,
  [IpcChannels.upsertLot]: upsertLotRequestSchema,
  [IpcChannels.deleteLot]: idRequestSchema,
  [IpcChannels.getNetWorthHistory]: emptyRequestSchema,
  [IpcChannels.getCashflowHistory]: emptyRequestSchema
} as const

export type GetAssetRequest = z.infer<typeof getAssetRequestSchema>
export type IdRequest = z.infer<typeof idRequestSchema>
/** Input shape before transform (UI / callers) */
export type CreateIncomeRequest = z.input<typeof createIncomeRequestSchema>
export type CreateExpenseRequest = z.input<typeof createExpenseRequestSchema>
export type UpsertAssetRequest = z.input<typeof upsertAssetRequestSchema>
export type UpsertLiabilityRequest = z.input<typeof upsertLiabilityRequestSchema>
export type GetMonthSummaryRequest = z.infer<typeof getMonthSummaryRequestSchema>
export type UpsertAssetParsed = z.output<typeof upsertAssetRequestSchema>
export type UpsertLiabilityParsed = z.output<typeof upsertLiabilityRequestSchema>
export type CreateIncomeParsed = z.output<typeof createIncomeRequestSchema>
export type CreateExpenseParsed = z.output<typeof createExpenseRequestSchema>
export type ListLotsRequest = z.infer<typeof listLotsRequestSchema>
export type UpsertLotRequest = z.input<typeof upsertLotRequestSchema>
export type UpsertLotParsed = z.output<typeof upsertLotRequestSchema>
