import { getCache, setCache, PRICE_SCALE } from '../db'

const TTL_MS = 15 * 60 * 1000

export interface EquityQuote {
  priceMinor: number
  currency: string
  fetchedAt: string
  stale: boolean
}

/**
 * ETF / equity last price in minor units of the quote currency.
 * Cached in SQLite for 15 minutes; last-known used when offline.
 */
export async function getEquityPrice(ticker: string): Promise<EquityQuote> {
  const key = `EQ:${ticker.toUpperCase()}`
  const cached = getCache(key)
  const now = Date.now()

  if (cached) {
    const age = now - new Date(cached.fetchedAt).getTime()
    if (age < TTL_MS) {
      return {
        // valueScaled stores major×PRICE_SCALE; convert to minor (×100)
        priceMinor: Math.round((cached.valueScaled / PRICE_SCALE) * 100),
        currency: cached.quoteCurrency,
        fetchedAt: cached.fetchedAt,
        stale: false
      }
    }
  }

  try {
    // Stooq CSV — no key required. European tickers often use .de / .uk suffix.
    const stooqSymbol = toStooqSymbol(ticker)
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Price HTTP ${res.status}`)
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) throw new Error('Empty price CSV')
    const cols = lines[1].split(',')
    const close = Number(cols[6])
    if (!Number.isFinite(close) || close <= 0) throw new Error('Invalid close')

    const currency = inferCurrency(ticker)
    const fetchedAt = new Date().toISOString()
    setCache(key, 'equity', Math.round(close * PRICE_SCALE), currency, fetchedAt)
    return {
      priceMinor: Math.round(close * 100),
      currency,
      fetchedAt,
      stale: false
    }
  } catch {
    if (cached) {
      return {
        priceMinor: Math.round((cached.valueScaled / PRICE_SCALE) * 100),
        currency: cached.quoteCurrency,
        fetchedAt: cached.fetchedAt,
        stale: true
      }
    }
    return {
      priceMinor: 10000,
      currency: inferCurrency(ticker),
      fetchedAt: new Date(0).toISOString(),
      stale: true
    }
  }
}

function toStooqSymbol(ticker: string): string {
  const t = ticker.toLowerCase()
  if (t.includes('.')) return t
  return `${t}.us`
}

function inferCurrency(ticker: string): string {
  const upper = ticker.toUpperCase()
  if (upper.endsWith('.DE') || upper.endsWith('.PA') || upper.endsWith('.AS')) return 'EUR'
  if (upper.endsWith('.L')) return 'GBP'
  if (upper.endsWith('.WA')) return 'PLN'
  return 'USD'
}
