import { createHash } from 'node:crypto'
import { getCache, getDb, setCache, PRICE_SCALE } from '../db'
import { isLive } from './integrations/registry'

const COMPS_TTL_MS = 6 * 60 * 60 * 1000
const MIN_COMPS = 3

export type OtomotoCompsQuote = {
  /** Median asking price in major PLN. */
  price: number
  currency: string
  compsCount: number
  searchUrl: string
  fetchedAt: string
  stale: boolean
  missing: boolean
}

function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function extractNextData(html: string): unknown | null {
  const marker = 'id="__NEXT_DATA__"'
  const idx = html.indexOf(marker)
  if (idx < 0) return null
  const open = html.indexOf('>', idx)
  if (open < 0) return null
  const close = html.indexOf('</script>', open)
  if (close < 0) return null
  try {
    return JSON.parse(html.slice(open + 1, close).trim()) as unknown
  } catch {
    return null
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function metaGet(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function metaSet(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value)
}

function missingQuote(): OtomotoCompsQuote {
  return {
    price: 0,
    currency: 'PLN',
    compsCount: 0,
    searchUrl: '',
    fetchedAt: new Date(0).toISOString(),
    stale: true,
    missing: true
  }
}

export function buildOtomotoSearchUrl(input: {
  make: string
  model: string
  year: number
  trim?: string | null
}): string | null {
  const make = slugify(input.make)
  const model = slugify(input.model)
  if (!make || !model) return null
  const yearFrom = Math.max(1980, input.year - 1)
  const yearTo = Math.min(2100, input.year + 1)
  const params = new URLSearchParams({
    'search[filter_float_year:from]': String(yearFrom),
    'search[filter_float_year:to]': String(yearTo)
  })
  const trim = input.trim?.trim()
  if (trim) params.set('search[filter_keyword]', trim)
  return `https://www.otomoto.pl/osobowe/${make}/${model}?${params.toString()}`
}

function parsePricesFromUrql(urqlState: unknown): number[] {
  const state = asRecord(urqlState)
  if (!state) return []
  const prices: number[] = []
  for (const entry of Object.values(state)) {
    const row = asRecord(entry)
    if (!row?.data) continue
    let inner: unknown = row.data
    if (typeof inner === 'string') {
      try {
        inner = JSON.parse(inner)
      } catch {
        continue
      }
    }
    const advertSearch = asRecord(asRecord(inner)?.advertSearch)
    const edges = advertSearch?.edges
    if (!Array.isArray(edges)) continue
    for (const edge of edges) {
      const node = asRecord(asRecord(edge)?.node)
      if (!node) continue
      const amount = asRecord(asRecord(node.price)?.amount)
      const units =
        typeof amount?.units === 'number'
          ? amount.units
          : typeof amount?.value === 'string'
            ? Number(amount.value)
            : null
      if (units != null && Number.isFinite(units) && units >= 5_000) prices.push(units)
    }
  }
  return prices
}

function cacheKeyFor(input: {
  make: string
  model: string
  year: number
  trim?: string | null
}): string {
  const raw = `${slugify(input.make)}|${slugify(input.model)}|${input.year}|${(input.trim ?? '').trim().toLowerCase()}`
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 16)
  return `OTOMOTO_COMPS:${hash}`
}

function compsMetaKey(cacheKey: string): string {
  return `otomoto-comps-meta:${cacheKey}`
}

async function fetchCompsQuote(input: {
  make: string
  model: string
  year: number
  trim?: string | null
  cacheKey: string
}): Promise<OtomotoCompsQuote> {
  const { cacheKey } = input
  const searchUrl = buildOtomotoSearchUrl(input)
  if (!searchUrl) throw new Error('Make and model are required')

  const res = await fetch(searchUrl, {
    signal: AbortSignal.timeout(14_000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml'
    }
  })
  if (!res.ok) throw new Error(`Otomoto HTTP ${res.status}`)
  const html = await res.text()
  const next = extractNextData(html)
  const pageProps = asRecord(asRecord(asRecord(next)?.props)?.pageProps)
  const prices = parsePricesFromUrql(pageProps?.urqlState)
  if (prices.length < MIN_COMPS) {
    throw new Error(`Only ${prices.length} similar listings (need ${MIN_COMPS}+)`)
  }
  const price = median(prices)
  if (price == null || price <= 0) throw new Error('Could not compute median price')

  const fetchedAt = new Date().toISOString()
  setCache(cacheKey, 'equity', Math.round(price * PRICE_SCALE), 'PLN', fetchedAt)
  metaSet(compsMetaKey(cacheKey), JSON.stringify({ searchUrl, compsCount: prices.length }))

  return {
    price: Math.round(price),
    currency: 'PLN',
    compsCount: prices.length,
    searchUrl,
    fetchedAt,
    stale: false,
    missing: false
  }
}

/**
 * Median asking price of similar Otomoto passenger-car listings (make/model/year ±1, optional trim).
 */
export async function getOtomotoCompsValue(input: {
  make: string
  model: string
  year: number
  trim?: string | null
}): Promise<OtomotoCompsQuote> {
  const make = input.make.trim()
  const model = input.model.trim()
  const year = input.year
  if (!make || !model || !Number.isFinite(year) || year < 1980 || year > 2100) {
    return missingQuote()
  }

  const cacheKey = cacheKeyFor({ make, model, year, trim: input.trim })
  if (!isLive('vehicle_otomoto')) {
    const cached = getCache(cacheKey)
    if (!cached) return missingQuote()
    const metaRaw = metaGet(compsMetaKey(cacheKey))
    let compsCount = 0
    let searchUrl = ''
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as { compsCount?: number; searchUrl?: string }
        compsCount = meta.compsCount ?? 0
        searchUrl = meta.searchUrl ?? ''
      } catch {
        /* ignore */
      }
    }
    return {
      price: cached.valueScaled / PRICE_SCALE,
      currency: cached.quoteCurrency,
      compsCount,
      searchUrl,
      fetchedAt: cached.fetchedAt,
      stale: true,
      missing: false
    }
  }

  const cachedRow = getCache(cacheKey)
  if (cachedRow && Date.now() - new Date(cachedRow.fetchedAt).getTime() < COMPS_TTL_MS) {
    const metaRaw = metaGet(compsMetaKey(cacheKey))
    let compsCount = 0
    let searchUrl = ''
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as { compsCount?: number; searchUrl?: string }
        compsCount = meta.compsCount ?? 0
        searchUrl = meta.searchUrl ?? ''
      } catch {
        /* ignore */
      }
    }
    return {
      price: cachedRow.valueScaled / PRICE_SCALE,
      currency: cachedRow.quoteCurrency,
      compsCount,
      searchUrl,
      fetchedAt: cachedRow.fetchedAt,
      stale: false,
      missing: false
    }
  }

  try {
    return await fetchCompsQuote({ make, model, year, trim: input.trim, cacheKey })
  } catch (err) {
    console.warn(
      `[otomoto] comps failed for ${make} ${model} ${year}: ${(err as Error).message}`
    )
    const cached = getCache(cacheKey)
    if (!cached) return missingQuote()
    return {
      price: cached.valueScaled / PRICE_SCALE,
      currency: cached.quoteCurrency,
      compsCount: 0,
      searchUrl: '',
      fetchedAt: cached.fetchedAt,
      stale: true,
      missing: false
    }
  }
}

/** Settings → Test: BMW X3 ~2025 probe. */
export async function probeOtomoto(): Promise<{ ok: true; detail: string }> {
  const cacheKey = cacheKeyFor({ make: 'bmw', model: 'x3', year: 2025, trim: null })
  const quote = await fetchCompsQuote({
    make: 'bmw',
    model: 'x3',
    year: 2025,
    trim: null,
    cacheKey
  })
  return {
    ok: true as const,
    detail: `${quote.compsCount} comps · median ${Math.round(quote.price).toLocaleString('pl-PL')} zł`
  }
}
