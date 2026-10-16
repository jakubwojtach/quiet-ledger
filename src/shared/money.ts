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

/**
 * Parse a major-unit amount typed by a human (PL/EN).
 * Accepts `1855,56`, `1.855,56`, `1,855.56`, `132.54`, spaces.
 * Returns null when empty or not a finite number.
 */
export function parseMajorInput(raw: string): number | null {
  let s = raw.trim().replace(/[\s\u00a0]/g, '')
  if (!s) return null

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    // Last separator is the decimal; the other is thousands.
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma >= 0) {
    s = s.replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // 1.855 or 1.855.000 — thousands dots, no decimal part
    s = s.replace(/\./g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function formatGainPercent(percent: number, locale = 'pl-PL'): string {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`
}
