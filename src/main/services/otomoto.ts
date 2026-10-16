import { createHash } from 'node:crypto'
import { getCache, getDb, setCache, PRICE_SCALE } from '../db'
import { getIntegrationsConfig, isLive } from './integrations/registry'

const COMPS_TTL_MS = 6 * 60 * 60 * 1000
/** Unfiltered make/model search — need a real sample. */
const MIN_COMPS = 3
/** After trim title-filter, 2 comps is enough; 1 is better than polluting with base trims. */
const MIN_COMPS_TRIMMED = 2

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

/**
 * Otomoto titles BMW performance trims as "xM50", not "M50".
 * Prefer the x-prefixed keyword so real M-cars actually appear on page 1.
 */
function keywordVariantsForTrim(trim: string): string[] {
  const t = trim.trim()
  if (!t) return []
  const out: string[] = [t]
  if (/^m\d/i.test(t)) {
    out.unshift(`x${t}`) // xM50 before M50
    out.push(`X${t}`)
  }
  return [...new Set(out)]
}

export function buildOtomotoSearchUrl(
  input: {
    make: string
    model: string
    year: number
    trim?: string | null
  },
  keyword?: string | null
): string | null {
  const make = slugify(input.make)
  const model = slugify(input.model)
  if (!make || !model) return null
  const yearFrom = Math.max(1980, input.year - 1)
  const yearTo = Math.min(2100, input.year + 1)
  const params = new URLSearchParams({
    'search[filter_float_year:from]': String(yearFrom),
    'search[filter_float_year:to]': String(yearTo)
  })
  const kw = (keyword ?? input.trim)?.trim()
  if (kw) params.set('search[filter_keyword]', kw)
  return `https://www.otomoto.pl/osobowe/${make}/${model}?${params.toString()}`
}

/** Normalize "M 50" / "xM50" / "m50" → comparable token string. */
function normalizeTrimToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Listing matches trim when every alphanumeric token of the trim appears in the
 * title/description. "M50" matches "BMW X3 xM50 mHEV"; also accepts xM50 ↔ M50.
 */
function listingMatchesTrim(haystack: string, trim: string): boolean {
  const hay = normalizeTrimToken(haystack)
  if (!hay) return false
  const variants = keywordVariantsForTrim(trim).map(normalizeTrimToken)
  // Any full variant in the title is enough (xM50 or M50).
  if (variants.some((v) => v && hay.includes(v))) return true
  const tokens = trim
    .trim()
    .split(/[\s/_+-]+/)
    .map(normalizeTrimToken)
    .filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((tok) => hay.includes(tok))
}

type ListingPrice = { price: number; title: string }

function parseListingPrices(urqlState: unknown): ListingPrice[] {
  const state = asRecord(urqlState)
  if (!state) return []
  const out: ListingPrice[] = []
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
      if (units == null || !Number.isFinite(units) || units < 5_000) continue
      const title = typeof node.title === 'string' ? node.title : ''
      const short =
        typeof node.shortDescription === 'string' ? node.shortDescription : ''
      out.push({ price: units, title: `${title} ${short}` })
    }
  }
  return out
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

/** Price-cache + app_meta keys for an Otomoto comps quote (for manual refetch). */
export function otomotoCompsCacheKeys(input: {
  make: string
  model: string
  year: number
  trim?: string | null
}): { priceKey: string; metaKey: string } | null {
  const make = input.make.trim()
  const model = input.model.trim()
  const year = input.year
  if (!make || !model || !Number.isFinite(year) || year < 1980 || year > 2100) return null
  const priceKey = cacheKeyFor({ make, model, year, trim: input.trim })
  return { priceKey, metaKey: compsMetaKey(priceKey) }
}

function quoteFromCache(
  cacheKey: string,
  stale: boolean
): OtomotoCompsQuote | null {
  const cached = getCache(cacheKey)
  if (!cached) return null
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
    stale,
    missing: false
  }
}

async function fetchSearchListings(
  input: {
    make: string
    model: string
    year: number
    trim?: string | null
  },
  keyword?: string | null
): Promise<{ searchUrl: string; listings: ListingPrice[] }> {
  const searchUrl = buildOtomotoSearchUrl(input, keyword)
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
  return { searchUrl, listings: parseListingPrices(pageProps?.urqlState) }
}

async function fetchCompsQuote(input: {
  make: string
  model: string
  year: number
  trim?: string | null
  cacheKey: string
}): Promise<OtomotoCompsQuote> {
  const { cacheKey } = input
  const trim = input.trim?.trim() ?? ''
  const keywords = trim ? keywordVariantsForTrim(trim) : [null]

  // Try xM50 before M50 — plain "M50" keyword mostly returns base X3 + M Sport.
  let searchUrl = ''
  const seen = new Map<string, ListingPrice>()
  for (const kw of keywords) {
    const page = await fetchSearchListings(input, kw)
    searchUrl = searchUrl || page.searchUrl
    for (const listing of page.listings) {
      const dedupe = `${listing.price}|${normalizeTrimToken(listing.title)}`
      if (!seen.has(dedupe)) seen.set(dedupe, listing)
    }
    const matchedSoFar = [...seen.values()].filter((l) =>
      trim ? listingMatchesTrim(l.title, trim) : true
    )
    if (trim && matchedSoFar.length >= MIN_COMPS_TRIMMED) break
    if (!trim && page.listings.length >= MIN_COMPS) break
  }

  const listings = [...seen.values()]
  let prices: number[]
  let minNeeded = MIN_COMPS

  if (trim) {
    // Never fall back to the unfiltered median — that tanks M-cars toward base trims.
    const matched = listings.filter((l) => listingMatchesTrim(l.title, trim))
    prices = matched.map((l) => l.price)
    minNeeded = MIN_COMPS_TRIMMED
    if (prices.length < minNeeded && prices.length >= 1) minNeeded = 1
  } else {
    prices = listings.map((l) => l.price)
  }

  if (prices.length < minNeeded) {
    throw new Error(
      trim
        ? `Only ${prices.length} “${trim}” listings in title (need ${MIN_COMPS_TRIMMED}+) — keeping last known worth`
        : `Only ${prices.length} similar listings (need ${MIN_COMPS}+)`
    )
  }

  const price = median(prices)
  if (price == null || price <= 0) throw new Error('Could not compute median price')

  const fetchedAt = new Date().toISOString()
  setCache(cacheKey, 'equity', Math.round(price * PRICE_SCALE), 'PLN', fetchedAt)
  metaSet(
    compsMetaKey(cacheKey),
    JSON.stringify({ searchUrl, compsCount: prices.length, trim: trim || null })
  )

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
 * Pass `{ force: true }` to skip TTL (manual refetch) — last cache is kept if the live pull fails.
 */
export async function getOtomotoCompsValue(
  input: {
    make: string
    model: string
    year: number
    trim?: string | null
  },
  opts?: { force?: boolean }
): Promise<OtomotoCompsQuote> {
  const make = input.make.trim()
  const model = input.model.trim()
  const year = input.year
  if (!make || !model || !Number.isFinite(year) || year < 1980 || year > 2100) {
    return missingQuote()
  }

  const cacheKey = cacheKeyFor({ make, model, year, trim: input.trim })
  // isLive = enabled + auto. Manual Refetch is allowed whenever the toggle is on.
  const enabled = getIntegrationsConfig().vehicle_otomoto?.enabled === true
  if (!(isLive('vehicle_otomoto') || (opts?.force && enabled))) {
    return quoteFromCache(cacheKey, true) ?? missingQuote()
  }

  if (!opts?.force) {
    const cachedRow = getCache(cacheKey)
    if (cachedRow && Date.now() - new Date(cachedRow.fetchedAt).getTime() < COMPS_TTL_MS) {
      return quoteFromCache(cacheKey, false)!
    }
  }

  try {
    return await fetchCompsQuote({ make, model, year, trim: input.trim, cacheKey })
  } catch (err) {
    console.warn(
      `[otomoto] comps failed for ${make} ${model} ${year}${input.trim ? ` ${input.trim}` : ''}: ${(err as Error).message}`
    )
    return quoteFromCache(cacheKey, true) ?? missingQuote()
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
