/** Base currency for the app. All dashboard totals are PLN. */
export const BASE_CURRENCY = 'PLN' as const

export type CurrencyCode = 'PLN' | 'USD' | 'EUR' | string

/** Integer minor units (grosze / cents). Never use floating money. */
export type MinorUnits = number

export function formatMinorUnits(
  amount: MinorUnits,
  currency: CurrencyCode = BASE_CURRENCY,
  locale = 'pl-PL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100)
}

/** Number only (no currency symbol) — pair with a small currency suffix in UI. */
export function formatAmountNumber(
  amount: MinorUnits,
  locale = 'pl-PL'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100)
}

export function majorToMinor(major: number): MinorUnits {
  return Math.round(major * 100)
}

export function minorToMajor(minor: MinorUnits): number {
  return minor / 100
}

export function formatGainPercent(percent: number, locale = 'pl-PL'): string {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`
}
