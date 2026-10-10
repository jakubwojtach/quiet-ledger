import { getCache, setCache, PRICE_SCALE } from '../db'

const TTL_MS = 15 * 60 * 1000

export interface FxQuote {
  rate: number
  quoteCurrency: 'PLN'
  fetchedAt: string
  stale: boolean
}

/**
 * Returns units of PLN per 1 unit of `from` currency.
 * Uses SQLite cache with 15-minute TTL; falls back to last known if offline.
 */
export async function getFxRateToPln(from: string): Promise<FxQuote> {
  if (from.toUpperCase() === 'PLN') {
    return {
      rate: 1,
      quoteCurrency: 'PLN',
      fetchedAt: new Date().toISOString(),
      stale: false
    }
  }

  const key = `FX:${from.toUpperCase()}:PLN`
  const cached = getCache(key)
  const now = Date.now()

  if (cached) {
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

  try {
    // Frankfurter — no API key; ECB reference rates
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from.toUpperCase())}&to=PLN`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
    const data = (await res.json()) as { rates?: { PLN?: number } }
    const rate = data.rates?.PLN
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new Error('FX response missing PLN rate')
    }
    const fetchedAt = new Date().toISOString()
    setCache(key, 'fx', Math.round(rate * PRICE_SCALE), 'PLN', fetchedAt)
    return { rate, quoteCurrency: 'PLN', fetchedAt, stale: false }
  } catch {
    if (cached) {
      return {
        rate: cached.valueScaled / PRICE_SCALE,
        quoteCurrency: 'PLN',
        fetchedAt: cached.fetchedAt,
        stale: true
      }
    }
    // Hard fallback if never cached (dev / first offline boot)
    const fallback: Record<string, number> = { USD: 3.95, EUR: 4.28 }
    const rate = fallback[from.toUpperCase()] ?? 1
    return {
      rate,
      quoteCurrency: 'PLN',
      fetchedAt: new Date(0).toISOString(),
      stale: true
    }
  }
}

export async function convertToPlnMinor(
  amountMinor: number,
  currency: string
): Promise<{ plnMinor: number; stale: boolean; fetchedAt: string }> {
  const fx = await getFxRateToPln(currency)
  return {
    plnMinor: Math.round(amountMinor * fx.rate),
    stale: fx.stale,
    fetchedAt: fx.fetchedAt
  }
}
