import { getCache, setCache, PRICE_SCALE } from '../db'

const TTL_MS = 15 * 60 * 1000

export interface EquityQuote {
  /** Price in major units of `currency` (kept unrounded so value = qty × price stays exact) */
  price: number
  currency: string
  fetchedAt: string
  stale: boolean
  /** No live or cached quote exists; price is 0 and the holding is excluded from value. */
  missing: boolean
}

function fromCache(key: string, stale: boolean): EquityQuote | null {
  const cached = getCache(key)
  if (!cached) return null
  return {
    price: cached.valueScaled / PRICE_SCALE,
    currency: cached.quoteCurrency,
    fetchedAt: cached.fetchedAt,
    stale,
    missing: false
  }
}

async function cachedQuote(
  key: string,
  fetchLive: () => Promise<{ price: number; currency: string }>
): Promise<EquityQuote> {
  const cached = getCache(key)
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS) {
    return fromCache(key, false)!
  }

  try {
    const { price, currency } = await fetchLive()
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price')
    const fetchedAt = new Date().toISOString()
    setCache(key, 'equity', Math.round(price * PRICE_SCALE), currency, fetchedAt)
    return { price, currency, fetchedAt, stale: false, missing: false }
  } catch (err) {
    console.warn(`[prices] ${key} fetch failed: ${(err as Error).message}`)
    return (
      fromCache(key, true) ?? {
        price: 0,
        currency: 'PLN',
        fetchedAt: new Date(0).toISOString(),
        stale: true,
        missing: true
      }
    )
  }
}

/**
 * ETF / equity last price from the Yahoo Finance chart endpoint (no key; unofficial).
 * Tickers are Yahoo symbols: VWCE.DE, ISAC.L, ETFBM40TR.WA …
 */
export function getEquityPrice(ticker: string): Promise<EquityQuote> {
  const symbol = ticker.toUpperCase()
  return cachedQuote(`EQ:${symbol}`, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`)
    const data = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; currency?: string } }> }
    }
    const meta = data.chart?.result?.[0]?.meta
    const raw = meta?.regularMarketPrice
    const currency = meta?.currency
    if (typeof raw !== 'number' || !currency) throw new Error('Yahoo response missing price')
    // London lines quoted in pence
    if (currency === 'GBp' || currency === 'GBX') return { price: raw / 100, currency: 'GBP' }
    return { price: raw, currency: currency.toUpperCase() }
  })
}

/** Polish mutual fund NAV (wartość jednostki) from analizy.pl, by fund code such as ING80K. */
export function getFundNav(fundCode: string): Promise<EquityQuote> {
  const code = fundCode.toUpperCase()
  return cachedQuote(`FUND:${code}`, async () => {
    const url = `https://www.analizy.pl/api/quotation/fio/${encodeURIComponent(code)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) throw new Error(`analizy.pl HTTP ${res.status}`)
    const data = (await res.json()) as {
      currency?: string
      series?: Array<{ price?: Array<{ date: string; value: number }> }>
    }
    const points = data.series?.[0]?.price
    const last = points?.[points.length - 1]
    if (!last) throw new Error('analizy.pl response missing NAV')
    return { price: last.value, currency: (data.currency ?? 'PLN').toUpperCase() }
  })
}
