import { getCache, setCache, PRICE_SCALE } from '../db'
import { IntegrationDisabledError, isLive } from './integrations/registry'

const TTL_MS = 15 * 60 * 1000
const FALLBACK: Record<string, number> = { USD: 3.95, EUR: 4.28 }

export interface FxQuote {
  rate: number
  quoteCurrency: 'PLN'
  /** Calendar date the quote applies to (YYYY-MM-DD), when known */
  asOfDate?: string
  fetchedAt: string
  stale: boolean
}

function plnIdentity(): FxQuote {
  return {
    rate: 1,
    quoteCurrency: 'PLN',
    fetchedAt: new Date().toISOString(),
    stale: false
  }
}

function shiftDate(isoDate: string, dayDelta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dayDelta)
  return d.toISOString().slice(0, 10)
}

async function fetchFrankfurter(from: string, dateOrLatest: string): Promise<FxQuote> {
  if (!isLive('frankfurter_fx')) {
    throw new IntegrationDisabledError(
      'frankfurter_fx',
      'FX provider is off — use PLN or enable Frankfurter in Settings → Data sources'
    )
  }
  const path = dateOrLatest === 'latest' ? 'latest' : dateOrLatest
  const url = `https://api.frankfurter.app/${path}?from=${encodeURIComponent(from)}&to=PLN`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
  const data = (await res.json()) as { date?: string; rates?: { PLN?: number } }
  const rate = data.rates?.PLN
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error('FX response missing PLN rate')
  }
  const fetchedAt = new Date().toISOString()
  return {
    rate,
    quoteCurrency: 'PLN',
    asOfDate: data.date ?? (dateOrLatest === 'latest' ? undefined : dateOrLatest),
    fetchedAt,
    stale: false
  }
}

/**
 * Returns units of PLN per 1 unit of `from` currency.
 * Uses SQLite cache with 15-minute TTL; falls back to last known if offline.
 */
export async function getFxRateToPln(from: string, opts?: { force?: boolean }): Promise<FxQuote> {
  const currency = from.toUpperCase()
  if (currency === 'PLN') return plnIdentity()

  const key = `FX:${currency}:PLN`
  const cached = getCache(key)
  const now = Date.now()

  if (cached && !opts?.force) {
    const age = now - new Date(cached.fetchedAt).getTime()
    if (age < TTL_MS) {
      return {
        rate: cached.valueScaled / PRICE_SCALE,
        quoteCurrency: 'PLN',
        fetchedAt: cached.fetchedAt,
        stale: false
      }
    }
  }

  if (!isLive('frankfurter_fx')) {
    if (cached) {
      return {
        rate: cached.valueScaled / PRICE_SCALE,
        quoteCurrency: 'PLN',
        fetchedAt: cached.fetchedAt,
        stale: true
      }
    }
    throw new IntegrationDisabledError(
      'frankfurter_fx',
      'FX provider is off — use PLN or enable Frankfurter in Settings → Data sources'
    )
  }

  try {
    const quote = await fetchFrankfurter(currency, 'latest')
    setCache(key, 'fx', Math.round(quote.rate * PRICE_SCALE), 'PLN', quote.fetchedAt)
    return quote
  } catch (err) {
    if (err instanceof IntegrationDisabledError) throw err
    if (cached) {
      return {
        rate: cached.valueScaled / PRICE_SCALE,
        quoteCurrency: 'PLN',
        fetchedAt: cached.fetchedAt,
        stale: true
      }
    }
    return {
      rate: FALLBACK[currency] ?? 1,
      quoteCurrency: 'PLN',
      fetchedAt: new Date(0).toISOString(),
      stale: true
    }
  }
}

/**
 * Historical ECB reference rate for a calendar day (weekends → prior business day).
 * Cached per currency+date so income PLN amounts stay stable.
 */
export async function getFxRateToPlnOnDate(from: string, date: string): Promise<FxQuote> {
  const currency = from.toUpperCase()
  if (currency === 'PLN') {
    return { ...plnIdentity(), asOfDate: date }
  }

  const key = `FX:${currency}:PLN:${date}`
  const cached = getCache(key)
  if (cached) {
    return {
      rate: cached.valueScaled / PRICE_SCALE,
      quoteCurrency: 'PLN',
      asOfDate: date,
      fetchedAt: cached.fetchedAt,
      stale: false
    }
  }

  if (!isLive('frankfurter_fx')) {
    throw new IntegrationDisabledError(
      'frankfurter_fx',
      'FX provider is off — use PLN or enable Frankfurter in Settings → Data sources'
    )
  }

  let lastError: unknown
  for (let back = 0; back <= 7; back++) {
    const tryDate = shiftDate(date, -back)
    try {
      const quote = await fetchFrankfurter(currency, tryDate)
      setCache(key, 'fx', Math.round(quote.rate * PRICE_SCALE), 'PLN', quote.fetchedAt)
      return { ...quote, asOfDate: quote.asOfDate ?? tryDate }
    } catch (err) {
      if (err instanceof IntegrationDisabledError) throw err
      lastError = err
    }
  }

  // Fall back to latest live rate if history unavailable
  try {
    const live = await getFxRateToPln(currency)
    return { ...live, asOfDate: date, stale: true }
  } catch (err) {
    if (err instanceof IntegrationDisabledError) throw err
    void lastError
    return {
      rate: FALLBACK[currency] ?? 1,
      quoteCurrency: 'PLN',
      asOfDate: date,
      fetchedAt: new Date(0).toISOString(),
      stale: true
    }
  }
}

export async function convertToPlnMinor(
  amountMinor: number,
  currency: string,
  opts?: { force?: boolean }
): Promise<{ plnMinor: number; stale: boolean; fetchedAt: string }> {
  try {
    const fx = await getFxRateToPln(currency, opts)
    return {
      plnMinor: Math.round(amountMinor * fx.rate),
      stale: fx.stale,
      fetchedAt: fx.fetchedAt
    }
  } catch (err) {
    if (!(err instanceof IntegrationDisabledError)) throw err
    // Valuation still needs a number when FX is off and no cache — use static fallback.
    const rate = currency.toUpperCase() === 'PLN' ? 1 : (FALLBACK[currency.toUpperCase()] ?? 1)
    return {
      plnMinor: Math.round(amountMinor * rate),
      stale: true,
      fetchedAt: new Date(0).toISOString()
    }
  }
}
