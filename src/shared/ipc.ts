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
  updateIncome: 'networth:updateIncome',
  deleteIncome: 'networth:deleteIncome',
  refreshPrices: 'networth:refreshPrices',
  refreshAssetPrice: 'networth:refreshAssetPrice',
  listLiabilities: 'networth:listLiabilities',
  upsertLiability: 'networth:upsertLiability',
  deleteLiability: 'networth:deleteLiability',
  listExpenseCategories: 'networth:listExpenseCategories',
  getMonthSummary: 'networth:getMonthSummary',
  createExpense: 'networth:createExpense',
  updateExpense: 'networth:updateExpense',
  deleteExpense: 'networth:deleteExpense',
  copyExpensesToMonth: 'networth:copyExpensesToMonth',
  getFxRate: 'networth:getFxRate',
  getDatabaseInfo: 'networth:getDatabaseInfo',
  listLots: 'networth:listLots',
  upsertLot: 'networth:upsertLot',
  deleteLot: 'networth:deleteLot',
  listMovements: 'networth:listMovements',
  upsertMovement: 'networth:upsertMovement',
  deleteMovement: 'networth:deleteMovement',
  getNetWorthHistory: 'networth:getNetWorthHistory',
  getCashflowHistory: 'networth:getCashflowHistory',
  getIntegrations: 'networth:getIntegrations',
  setIntegrations: 'networth:setIntegrations',
  setIntegrationSecret: 'networth:setIntegrationSecret',
  hasIntegrationSecret: 'networth:hasIntegrationSecret',
  clearIntegrationSecret: 'networth:clearIntegrationSecret',
  testIntegration: 'networth:testIntegration',
  getAppVersion: 'app:getVersion',
  getUpdateStatus: 'app:getUpdateStatus',
  checkForUpdates: 'app:checkForUpdates',
  quitAndInstall: 'app:quitAndInstall'
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
const valueSourceSchema = z.enum(['estimate', 'manual', 'otodom', 'otomoto']).default('manual')
const addressSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = (v ?? '').trim()
    if (!trimmed) return null
    if (trimmed.length > 200) throw new Error('Address is too long')
    return trimmed
  })
const areaM2Schema = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null
    if (!Number.isFinite(v) || v <= 0 || v > 1_000_000) {
      throw new Error('Area must be a positive number of m²')
    }
    return Math.round(v * 100) / 100
  })
const shortTextSchema = (label: string, max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      const trimmed = (v ?? '').trim()
      if (!trimmed) return null
      if (trimmed.length > max) throw new Error(`${label} is too long`)
      return trimmed
    })
const carYearSchema = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null
    const y = Math.round(v)
    if (!Number.isFinite(y) || y < 1980 || y > 2100) {
      throw new Error('Year must be between 1980 and 2100')
    }
    return y
  })
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

const incomeStatusSchema = z.enum(['expected', 'received']).default('received')

export const createIncomeRequestSchema = z.object({
  month: monthSchema,
  /** Settlement / expected date — drives FX lookup */
  date: dateSchema,
  /** Major units from UI → minor (in `currency`) */
  amount: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  status: incomeStatusSchema,
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

export const updateIncomeRequestSchema = z.object({
  id: z.string().uuid(),
  month: monthSchema,
  date: dateSchema,
  amount: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  status: incomeStatusSchema,
  note: z.string().nullable().optional()
})

export const getFxRateRequestSchema = z.object({
  currency: currencySchema,
  date: dateSchema
})

export const getMonthSummaryRequestSchema = z.object({
  month: monthSchema
})

const expenseStatusSchema = z.enum(['due', 'paid']).default('paid')

export const createExpenseRequestSchema = z.object({
  categoryId: z.string().uuid(),
  date: dateSchema,
  amount: moneyMajorToMinor,
  currency: currencySchema.default('PLN'),
  note: z.string().nullable().optional(),
  liabilityId: z.string().uuid().nullable().optional(),
  status: expenseStatusSchema,
  dueDate: dateSchema.nullable().optional()
})

export const updateExpenseRequestSchema = createExpenseRequestSchema.extend({
  id: z.string().uuid()
})

export const copyExpensesToMonthRequestSchema = z.object({
  fromMonth: monthSchema,
  toMonth: monthSchema,
  /** Copy only these expense ids (preferred). */
  expenseIds: z.array(z.string().uuid()).optional(),
  /** Legacy / bulk by category name when ids omitted. */
  categoryNames: z.array(z.string().min(1)).optional()
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
    valueSource: valueSourceSchema,
    address: addressSchema,
    areaM2: areaM2Schema
  }),
  z.object({
    ...assetBase,
    class: z.literal('land'),
    value: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    valuedOn: dateSchema,
    costBasis: optionalMoneyMajorToMinor,
    valueSource: valueSourceSchema,
    address: addressSchema,
    areaM2: areaM2Schema
  }),
  z.object({
    ...assetBase,
    class: z.literal('car'),
    value: moneyMajorToMinor,
    currency: currencySchema.default('PLN'),
    valuedOn: dateSchema,
    costBasis: optionalMoneyMajorToMinor,
    valueSource: valueSourceSchema,
    make: shortTextSchema('Make', 40),
    model: shortTextSchema('Model', 40),
    year: carYearSchema,
    trim: shortTextSchema('Trim', 40)
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
  /** Units, or number of bonds (always positive in the form; sell flips sign in main). */
  quantity: quantityToScaled,
  /** buy = contribution / purchase; sell = withdrawal / redeem (retirement & ETF). */
  side: z.enum(['buy', 'sell']).default('buy'),
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

export const listMovementsRequestSchema = z.object({
  assetId: z.string().uuid()
})

export const upsertMovementRequestSchema = z.object({
  id: z.string().uuid().optional(),
  assetId: z.string().uuid(),
  date: dateSchema,
  kind: z.enum(['deposit', 'withdrawal']),
  /** Major units from UI → minor (always positive). */
  amount: z
    .number()
    .finite()
    .positive()
    .transform((n) => majorToMinor(n)),
  currency: currencySchema,
  note: z.string().nullable().optional()
})

export const emptyRequestSchema = z.object({}).strict().optional()

const integrationIdSchema = z.enum([
  'yahoo_equity',
  'analizy_funds',
  'frankfurter_fx',
  'property_catalog',
  'property_otodom',
  'vehicle_otomoto'
])

const integrationStateSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['manual', 'auto'])
})

export const setIntegrationsRequestSchema = z.object({
  integrations: z.object({
    yahoo_equity: integrationStateSchema,
    analizy_funds: integrationStateSchema,
    frankfurter_fx: integrationStateSchema,
    property_catalog: integrationStateSchema,
    property_otodom: integrationStateSchema,
    vehicle_otomoto: integrationStateSchema
  })
})

export const setIntegrationSecretRequestSchema = z.object({
  id: integrationIdSchema,
  secret: z.string().min(1).max(2048)
})

export const integrationIdRequestSchema = z.object({
  id: integrationIdSchema
})

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
  [IpcChannels.updateIncome]: updateIncomeRequestSchema,
  [IpcChannels.deleteIncome]: idRequestSchema,
  [IpcChannels.refreshPrices]: emptyRequestSchema,
  [IpcChannels.refreshAssetPrice]: idRequestSchema,
  [IpcChannels.listLiabilities]: emptyRequestSchema,
  [IpcChannels.upsertLiability]: upsertLiabilityRequestSchema,
  [IpcChannels.deleteLiability]: idRequestSchema,
  [IpcChannels.listExpenseCategories]: emptyRequestSchema,
  [IpcChannels.getMonthSummary]: getMonthSummaryRequestSchema,
  [IpcChannels.createExpense]: createExpenseRequestSchema,
  [IpcChannels.updateExpense]: updateExpenseRequestSchema,
  [IpcChannels.deleteExpense]: idRequestSchema,
  [IpcChannels.copyExpensesToMonth]: copyExpensesToMonthRequestSchema,
  [IpcChannels.getFxRate]: getFxRateRequestSchema,
  [IpcChannels.getDatabaseInfo]: emptyRequestSchema,
  [IpcChannels.listLots]: listLotsRequestSchema,
  [IpcChannels.upsertLot]: upsertLotRequestSchema,
  [IpcChannels.deleteLot]: idRequestSchema,
  [IpcChannels.listMovements]: listMovementsRequestSchema,
  [IpcChannels.upsertMovement]: upsertMovementRequestSchema,
  [IpcChannels.deleteMovement]: idRequestSchema,
  [IpcChannels.getNetWorthHistory]: emptyRequestSchema,
  [IpcChannels.getCashflowHistory]: emptyRequestSchema,
  [IpcChannels.getIntegrations]: emptyRequestSchema,
  [IpcChannels.setIntegrations]: setIntegrationsRequestSchema,
  [IpcChannels.setIntegrationSecret]: setIntegrationSecretRequestSchema,
  [IpcChannels.hasIntegrationSecret]: integrationIdRequestSchema,
  [IpcChannels.clearIntegrationSecret]: integrationIdRequestSchema,
  [IpcChannels.testIntegration]: integrationIdRequestSchema,
  [IpcChannels.getAppVersion]: emptyRequestSchema,
  [IpcChannels.getUpdateStatus]: emptyRequestSchema,
  [IpcChannels.checkForUpdates]: emptyRequestSchema,
  [IpcChannels.quitAndInstall]: emptyRequestSchema
} as const

export type GetAssetRequest = z.infer<typeof getAssetRequestSchema>
export type IdRequest = z.infer<typeof idRequestSchema>
/** Input shape before transform (UI / callers) */
export type CreateIncomeRequest = z.input<typeof createIncomeRequestSchema>
export type UpdateIncomeRequest = z.input<typeof updateIncomeRequestSchema>
export type GetFxRateRequest = z.input<typeof getFxRateRequestSchema>
export type CreateExpenseRequest = z.input<typeof createExpenseRequestSchema>
export type UpdateExpenseRequest = z.input<typeof updateExpenseRequestSchema>
export type CopyExpensesToMonthRequest = z.input<typeof copyExpensesToMonthRequestSchema>
export type UpsertAssetRequest = z.input<typeof upsertAssetRequestSchema>
export type UpsertLiabilityRequest = z.input<typeof upsertLiabilityRequestSchema>
export type GetMonthSummaryRequest = z.infer<typeof getMonthSummaryRequestSchema>
export type UpsertAssetParsed = z.output<typeof upsertAssetRequestSchema>
export type UpsertLiabilityParsed = z.output<typeof upsertLiabilityRequestSchema>
export type CreateIncomeParsed = z.output<typeof createIncomeRequestSchema>
export type UpdateIncomeParsed = z.output<typeof updateIncomeRequestSchema>
export type CreateExpenseParsed = z.output<typeof createExpenseRequestSchema>
export type UpdateExpenseParsed = z.output<typeof updateExpenseRequestSchema>
export type ListLotsRequest = z.infer<typeof listLotsRequestSchema>
export type UpsertLotRequest = z.input<typeof upsertLotRequestSchema>
export type UpsertLotParsed = z.output<typeof upsertLotRequestSchema>
export type ListMovementsRequest = z.infer<typeof listMovementsRequestSchema>
export type UpsertMovementRequest = z.input<typeof upsertMovementRequestSchema>
export type UpsertMovementParsed = z.output<typeof upsertMovementRequestSchema>
export type SetIntegrationsRequest = z.infer<typeof setIntegrationsRequestSchema>
export type SetIntegrationSecretRequest = z.infer<typeof setIntegrationSecretRequestSchema>
export type IntegrationIdRequest = z.infer<typeof integrationIdRequestSchema>
