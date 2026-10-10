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
  /** Wrapper or institution, e.g. IKE, IKZE Kaja, Broker USD */
  account: string | null
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
  /**
   * Current value from the bond account statement. Polish retail treasury bonds do not trade,
   * so when set this wins over nominal × unit value.
   */
  statementValueMinor: MinorUnits | null
  valuedOn: string | null
}

export interface RetirementDetails {
  /** Units scaled by 1_000_000 */
  unitsScaled: number
  /** Last known unit price; replaced by the live NAV when fundCode is set. */
  unitPriceMinor: MinorUnits
  currency: CurrencyCode
  /** analizy.pl fund code, e.g. ING80K */
  fundCode: string | null
  costBasisMinor: MinorUnits | null
}

export interface SavingsDetails {
  amountMinor: MinorUnits
  currency: CurrencyCode
}

export type ValueSource = 'estimate' | 'manual'

export interface ManualPropertyDetails {
  valueMinor: MinorUnits
  currency: CurrencyCode
  valuedOn: string
  /** What you paid, in `currency` minor units. Null when unknown. */
  costBasisMinor: MinorUnits | null
  valueSource: ValueSource
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
  /** Paid amount converted to PLN, when the asset records what was paid. */
  costBasisPlnMinor: MinorUnits | null
  /** Worth now minus paid, in PLN grosze. */
  gainPlnMinor: MinorUnits | null
  /** Gain as a percent of paid. */
  gainPercent: number | null
  /** Live or last-known unit price in major units of nativeCurrency (ETF, fund). */
  unitPrice: number | null
  lastUpdated: string
  priceStale: boolean
  /** No quote has ever been fetched; value is 0 and should not be trusted. */
  priceMissing: boolean
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
