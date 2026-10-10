import type { CurrencyCode, MinorUnits } from './money'

export const ASSET_CLASSES = [
  'etf',
  'bond',
  'retirement',
  'savings_usd',
  'savings_pln',
  'apartment',
  'land',
  'car'
] as const

export type AssetClass = (typeof ASSET_CLASSES)[number]

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  etf: 'ETFs',
  bond: 'Bonds',
  retirement: 'Retirement fund',
  savings_usd: 'USD savings',
  savings_pln: 'PLN savings',
  apartment: 'Apartment',
  land: 'Land',
  car: 'Car'
}

export interface AssetBase {
  id: string
  class: AssetClass
  name: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** ETF: ticker, quantity (scaled ×1e6), cost basis in original currency minor units */
export interface EtfDetails {
  ticker: string
  /** Quantity scaled by 1_000_000 to stay integer */
  quantityScaled: number
  costBasisMinor: MinorUnits
  costCurrency: CurrencyCode
}

export interface BondDetails {
  nominalMinor: MinorUnits
  unitValueMinor: MinorUnits
  currency: CurrencyCode
}

export interface RetirementDetails {
  /** Units scaled by 1_000_000 */
  unitsScaled: number
  unitPriceMinor: MinorUnits
  currency: CurrencyCode
}

export interface SavingsDetails {
  amountMinor: MinorUnits
  currency: CurrencyCode
}

export interface ManualPropertyDetails {
  valueMinor: MinorUnits
  currency: CurrencyCode
  valuedOn: string
}

export type AssetDetails =
  | ({ class: 'etf' } & EtfDetails)
  | ({ class: 'bond' } & BondDetails)
  | ({ class: 'retirement' } & RetirementDetails)
  | ({ class: 'savings_usd' } & SavingsDetails)
  | ({ class: 'savings_pln' } & SavingsDetails)
  | ({ class: 'apartment' } & ManualPropertyDetails)
  | ({ class: 'land' } & ManualPropertyDetails)
  | ({ class: 'car' } & ManualPropertyDetails)

export type Asset = AssetBase & AssetDetails

export interface ValuedAsset {
  asset: Asset
  /** Native-currency market value in minor units */
  nativeValueMinor: MinorUnits
  nativeCurrency: CurrencyCode
  /** PLN market value in grosze */
  plnValueMinor: MinorUnits
  lastUpdated: string
  priceStale: boolean
}

export interface ClassBreakdown {
  class: AssetClass
  label: string
  plnValueMinor: MinorUnits
  percentOfTotal: number
}

/** Installment loan / e-raty style liability */
export interface Liability {
  id: string
  name: string
  provider: string | null
  principalMinor: MinorUnits
  monthlyPaymentMinor: MinorUnits
  currency: CurrencyCode
  nextDueDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ValuedLiability {
  liability: Liability
  principalPlnMinor: MinorUnits
  monthlyPaymentPlnMinor: MinorUnits
  priceStale: boolean
}

export interface DashboardSnapshot {
  /** Gross assets in PLN */
  totalAssetsPlnMinor: MinorUnits
  /** Remaining principal of all liabilities in PLN */
  totalLiabilitiesPlnMinor: MinorUnits
  /** Assets − liabilities */
  netWorthPlnMinor: MinorUnits
  /** @deprecated use netWorthPlnMinor — kept for older UI callers */
  totalPlnMinor: MinorUnits
  breakdown: ClassBreakdown[]
  assets: ValuedAsset[]
  liabilities: ValuedLiability[]
  asOf: string
  fxStale: boolean
}

export interface IncomeAllocation {
  assetId: string
  amountMinor: MinorUnits
}

export interface IncomeEntry {
  id: string
  /** YYYY-MM */
  month: string
  amountMinor: MinorUnits
  currency: CurrencyCode
  note: string | null
  allocations: IncomeAllocation[]
  createdAt: string
}

export interface CreateIncomeInput {
  month: string
  amountMinor: MinorUnits
  currency?: CurrencyCode
  note?: string | null
  allocations: IncomeAllocation[]
}

export interface ExpenseCategory {
  id: string
  name: string
  sortOrder: number
}

export interface ExpenseEntry {
  id: string
  categoryId: string
  categoryName: string
  /** Calendar date YYYY-MM-DD */
  date: string
  amountMinor: MinorUnits
  currency: CurrencyCode
  note: string | null
  /** Optional link to a liability installment payment */
  liabilityId: string | null
  createdAt: string
}

export interface CategorySpend {
  categoryId: string
  categoryName: string
  amountPlnMinor: MinorUnits
  percentOfTotal: number
}

export interface MonthSummary {
  month: string
  incomePlnMinor: MinorUnits
  expensesPlnMinor: MinorUnits
  /** Sum of liability monthly payments (cashflow sketch) */
  installmentsPlnMinor: MinorUnits
  /** income − expenses − installments */
  cashflowPlnMinor: MinorUnits
  expensesByCategory: CategorySpend[]
  expenses: ExpenseEntry[]
  income: IncomeEntry[]
  liabilities: ValuedLiability[]
  fxStale: boolean
}

export const QUANTITY_SCALE = 1_000_000
