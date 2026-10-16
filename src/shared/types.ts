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
  /** Purchases recorded for this holding; when > 0 its totals come from them. */
  lotCount: number
  createdAt: string
  updatedAt: string
}

/** Classes whose totals can be built from individual purchases. */
export const LOT_CLASSES = ['etf', 'bond', 'retirement'] as const satisfies readonly AssetClass[]
export type LotClass = (typeof LOT_CLASSES)[number]

export function supportsLots(cls: AssetClass): cls is LotClass {
  return (LOT_CLASSES as readonly AssetClass[]).includes(cls)
}

/** Cash deposit / withdrawal ledger (balance derived). */
export const MOVEMENT_CLASSES = ['savings_usd', 'savings_pln'] as const satisfies readonly AssetClass[]
export type MovementClass = (typeof MOVEMENT_CLASSES)[number]

export function supportsMovements(cls: AssetClass): cls is MovementClass {
  return (MOVEMENT_CLASSES as readonly AssetClass[]).includes(cls)
}

export type MovementKind = 'deposit' | 'withdrawal'

export interface AssetMovement {
  id: string
  assetId: string
  /** YYYY-MM-DD */
  date: string
  kind: MovementKind
  /** Always positive; sign comes from kind */
  amountMinor: MinorUnits
  currency: CurrencyCode
  estimated: boolean
  note: string | null
  createdAt: string
}

/** One purchase of an ETF, bond series or fund units. */
export interface AssetLot {
  id: string
  assetId: string
  /** YYYY-MM-DD */
  date: string
  /** Units ×1e6; for bonds the number of bonds ×1e6 */
  quantityScaled: number
  /** Price per unit ×1e4 in priceCurrency */
  priceScaled: number | null
  priceCurrency: CurrencyCode | null
  paidMinor: MinorUnits
  paidCurrency: CurrencyCode
  /** Bond code, e.g. EDO0335 */
  series: string | null
  estimated: boolean
  note: string | null
  createdAt: string
}

export interface ValuedLot {
  lot: AssetLot
  plnValueMinor: MinorUnits
  paidPlnMinor: MinorUnits
  gainPlnMinor: MinorUnits | null
  gainPercent: number | null
  /** Bond lots: value is this lot's share of the statement value, not its own accrual. */
  valueIsShare: boolean
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

export type ValueSource = 'estimate' | 'manual' | 'otodom' | 'otomoto'

export interface ManualPropertyDetails {
  valueMinor: MinorUnits
  currency: CurrencyCode
  valuedOn: string
  /** What you paid, in `currency` minor units. Null when unknown. */
  costBasisMinor: MinorUnits | null
  valueSource: ValueSource
  /** Street / district / city — used by Otodom comps (apartment/land). */
  address?: string | null
  /** Floor area in m² — used by Otodom comps (apartment/land). */
  areaM2?: number | null
  /** Car: Otomoto make slug / name (e.g. BMW). */
  make?: string | null
  /** Car: Otomoto model (e.g. X3). */
  model?: string | null
  /** Car: model year for Otomoto comps. */
  year?: number | null
  /** Car: optional trim/keyword filter (e.g. M50). */
  trim?: string | null
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

/** expected = planned (not in cashflow); received = landed (counts) */
export type IncomeStatus = 'expected' | 'received'

export interface IncomeEntry {
  id: string
  /** YYYY-MM — derived from `date` */
  month: string
  /** Settlement or expected date YYYY-MM-DD */
  date: string
  /** Amount in `currency` minor units */
  amountMinor: MinorUnits
  currency: CurrencyCode
  /**
   * PLN per 1 unit of currency × 10_000 (PRICE_SCALE).
   * PLN entries use 10_000 (rate 1).
   */
  fxRateScaled: number
  /** Cached PLN equivalent at the stored FX rate */
  plnAmountMinor: MinorUnits
  status: IncomeStatus
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

export interface FxRateQuote {
  currency: string
  date: string
  /** PLN per 1 unit of currency */
  rate: number
  stale: boolean
}

export interface ExpenseCategory {
  id: string
  name: string
  sortOrder: number
}

export type ExpenseStatus = 'due' | 'paid'

export interface ExpenseEntry {
  id: string
  categoryId: string
  categoryName: string
  /** Calendar date YYYY-MM-DD — spend date when paid; planned month anchor when due */
  date: string
  amountMinor: MinorUnits
  currency: CurrencyCode
  note: string | null
  /** Optional link to a liability installment payment */
  liabilityId: string | null
  /** due = still to pay (excluded from cashflow totals); paid = spent */
  status: ExpenseStatus
  /** Optional due date; falls back to `date` in the UI when null */
  dueDate: string | null
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
  /** Received income only — what landed */
  incomePlnMinor: MinorUnits
  /** Expected income not yet received (not in cashflow) */
  expectedIncomePlnMinor: MinorUnits
  /** Paid expenses only — what left the account */
  expensesPlnMinor: MinorUnits
  /** Due expenses still to pay (not in cashflow) */
  duePlnMinor: MinorUnits
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

/** One calendar-day net-worth point for sparklines. */
export interface NetWorthHistoryPoint {
  day: string
  assetsPlnMinor: MinorUnits
  liabilitiesPlnMinor: MinorUnits
  netWorthPlnMinor: MinorUnits
}

/** Aggregated month for cashflow charts. */
export interface CashflowMonthPoint {
  month: string
  incomePlnMinor: MinorUnits
  expensesPlnMinor: MinorUnits
  installmentsPlnMinor: MinorUnits
  cashflowPlnMinor: MinorUnits
  /** True when this month has no expense rows (vs a real 0). */
  expensesMissing: boolean
}

export const QUANTITY_SCALE = 1_000_000
/** Lot unit prices are stored ×1e4. */
export const LOT_PRICE_SCALE = 10_000
