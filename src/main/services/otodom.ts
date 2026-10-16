import { createHash } from 'node:crypto'
import { getCache, getDb, setCache, PRICE_SCALE } from '../db'
import { isLive } from './integrations/registry'

const COMPS_TTL_MS = 6 * 60 * 60 * 1000
const GEO_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MIN_COMPS = 3
const NOMINATIM_GAP_MS = 1100

export type OtodomCompsQuote = {
  /** Estimated worth in major units of `currency` (median zł/m² × area). */
  price: number
  currency: string
  plnPerM2: number
  compsCount: number
  locationLabel: string
  searchUrl: string
  fetchedAt: string
  stale: boolean
  missing: boolean
}

type GeoLocation = {
  voivodeship: string
  city: string
  district: string | null
  label: string
  fetchedAt: string
}

type EstateKind = 'mieszkanie' | 'dzialka'

let lastNominatimAt = 0

function uaHeaders(): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml'
  }
}

function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/^wojewodztwo\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function areaBand(areaM2: number, kind: EstateKind): { min: number; max: number } {
  const pct = kind === 'dzialka' ? 0.2 : 0.15
  const pad = kind === 'dzialka' ? 50 : 5
  const delta = Math.max(pad, Math.round(areaM2 * pct))
  return {
    min: Math.max(1, Math.floor(areaM2 - delta)),
    max: Math.ceil(areaM2 + delta)
  }
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

function geoCacheKey(address: string): string {
  const hash = createHash('sha1').update(address.trim().toLowerCase()).digest('hex').slice(0, 16)
  return `geocode:otodom:${hash}`
}

async function throttleNominatim(): Promise<void> {
  const wait = NOMINATIM_GAP_MS - (Date.now() - lastNominatimAt)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatimAt = Date.now()
}

async function geocodeAddress(address: string): Promise<GeoLocation> {
  const key = geoCacheKey(address)
  const cachedRaw = metaGet(key)
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as GeoLocation
      if (
        cached?.voivodeship &&
        cached?.city &&
        Date.now() - new Date(cached.fetchedAt).getTime() < GEO_TTL_MS
      ) {
        return cached
      }
    } catch {
      /* refresh */
    }
  }

  await throttleNominatim()
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=pl&q=' +
    encodeURIComponent(address)
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'QuietLedger/1.0 (local net-worth desktop app)',
      Accept: 'application/json',
      'Accept-Language': 'pl'
    }
  })
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`)
  const rows = (await res.json()) as Array<{
    display_name?: string
    address?: Record<string, string>
  }>
  const hit = rows[0]
  const addr = hit?.address
  if (!addr) throw new Error('Could not resolve that address in Poland')

  const state = addr.state ?? ''
  const city = addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? ''
  const district = addr.suburb ?? addr.city_district ?? addr.borough ?? null
  const voivodeship = slugify(state)
  const citySlug = slugify(city)
  if (!voivodeship || !citySlug) {
    throw new Error('Address needs a city and voivodeship (e.g. “Wola, Warszawa”)')
  }

  const location: GeoLocation = {
    voivodeship,
    city: citySlug,
    district: district ? slugify(district) : null,
    label: hit.display_name ?? `${city}${district ? `, ${district}` : ''}`,
    fetchedAt: new Date().toISOString()
  }
  metaSet(key, JSON.stringify(location))
  return location
}

function buildSearchUrl(kind: EstateKind, geo: GeoLocation, areaM2: number): string {
  const { min, max } = areaBand(areaM2, kind)
  const base = [
    'https://www.otodom.pl/pl/wyniki/sprzedaz',
    kind,
    geo.voivodeship,
    geo.city,
    geo.city,
    geo.city,
    geo.district
  ]
    .filter(Boolean)
    .join('/')
  const params = new URLSearchParams({
    areaMin: String(min),
    areaMax: String(max),
    limit: '36',
    by: 'DEFAULT',
    direction: 'DESC',
    viewType: 'listing'
  })
  return `${base}?${params.toString()}`
}

type CompItem = {
  plnPerM2: number
  areaM2: number
  totalPln: number
}

function parseSearchComps(html: string): CompItem[] {
  const next = extractNextData(html)
  const root = asRecord(next)
  const props = root ? asRecord(root.props) : null
  const pageProps = props ? asRecord(props.pageProps) : null
  const data = pageProps ? asRecord(pageProps.data) : null
  const searchAds = data ? asRecord(data.searchAds) : null
  const items = searchAds?.items
  if (!Array.isArray(items)) throw new Error('Otodom search returned no listings')

  const comps: CompItem[] = []
  for (const raw of items) {
    const item = asRecord(raw)
    if (!item) continue
    const total = asRecord(item.totalPrice)
    const ppm = asRecord(item.pricePerSquareMeter)
    const area = item.areaInSquareMeters
    const totalValue = typeof total?.value === 'number' ? total.value : null
    const ppmValue = typeof ppm?.value === 'number' ? ppm.value : null
    const areaValue = typeof area === 'number' ? area : null
    if (totalValue == null || totalValue < 10_000) continue
    if (areaValue == null || areaValue <= 0) continue
    const plnPerM2 = ppmValue && ppmValue > 0 ? ppmValue : totalValue / areaValue
    if (!Number.isFinite(plnPerM2) || plnPerM2 <= 0) continue
    comps.push({ plnPerM2, areaM2: areaValue, totalPln: totalValue })
  }
  return comps
}

function missingQuote(): OtodomCompsQuote {
  return {
    price: 0,
    currency: 'PLN',
    plnPerM2: 0,
    compsCount: 0,
    locationLabel: '',
    searchUrl: '',
    fetchedAt: new Date(0).toISOString(),
    stale: true,
    missing: true
  }
}

function fromPriceCache(
  key: string,
  stale: boolean,
  meta: { locationLabel: string; searchUrl: string; compsCount: number } | null
): OtodomCompsQuote | null {
  const cached = getCache(key)
  if (!cached) return null
  const plnPerM2 = cached.valueScaled / PRICE_SCALE
  return {
    price: 0, // filled by caller with area
    currency: cached.quoteCurrency,
    plnPerM2,
    compsCount: meta?.compsCount ?? 0,
    locationLabel: meta?.locationLabel ?? '',
    searchUrl: meta?.searchUrl ?? '',
    fetchedAt: cached.fetchedAt,
    stale,
    missing: false
  }
}

function compsMetaKey(cacheKey: string): string {
  return `otodom-comps-meta:${cacheKey}`
}

function readCompsMeta(
  cacheKey: string
): { locationLabel: string; searchUrl: string; compsCount: number } | null {
  const metaRaw = metaGet(compsMetaKey(cacheKey))
  if (!metaRaw) return null
  try {
    return JSON.parse(metaRaw) as { locationLabel: string; searchUrl: string; compsCount: number }
  } catch {
    return null
  }
}

async function fetchCompsQuote(input: {
  class: 'apartment' | 'land'
  address: string
  areaM2: number
  cacheKey: string
  kind: EstateKind
}): Promise<OtodomCompsQuote> {
  const { address, areaM2, cacheKey, kind } = input
  const geo = await geocodeAddress(address)
  const searchUrl = buildSearchUrl(kind, geo, areaM2)
  const res = await fetch(searchUrl, {
    signal: AbortSignal.timeout(14_000),
    headers: uaHeaders()
  })
  if (!res.ok) throw new Error(`Otodom HTTP ${res.status}`)
  const html = await res.text()
  const comps = parseSearchComps(html)
  if (comps.length < MIN_COMPS) {
    throw new Error(`Only ${comps.length} similar listings (need ${MIN_COMPS}+)`)
  }
  const plnPerM2 = median(comps.map((c) => c.plnPerM2))
  if (plnPerM2 == null || plnPerM2 <= 0) throw new Error('Could not compute median zł/m²')

  const fetchedAt = new Date().toISOString()
  setCache(cacheKey, 'equity', Math.round(plnPerM2 * PRICE_SCALE), 'PLN', fetchedAt)
  metaSet(
    compsMetaKey(cacheKey),
    JSON.stringify({
      locationLabel: geo.label,
      searchUrl,
      compsCount: comps.length
    })
  )

  return {
    price: Math.round(plnPerM2 * areaM2),
    currency: 'PLN',
    plnPerM2,
    compsCount: comps.length,
    locationLabel: geo.label,
    searchUrl,
    fetchedAt,
    stale: false,
    missing: false
  }
}

/** Price-cache + app_meta keys for an Otodom comps quote (for manual refetch). */
export function otodomCompsCacheKeys(input: {
  class: 'apartment' | 'land'
  address: string
  areaM2: number
}): { priceKey: string; metaKey: string } | null {
  const address = input.address.trim()
  const areaM2 = input.areaM2
  if (!address || !(areaM2 > 0)) return null
  const kind: EstateKind = input.class === 'land' ? 'dzialka' : 'mieszkanie'
  const areaKey = Math.round(areaM2)
  const addrHash = createHash('sha1').update(address.toLowerCase()).digest('hex').slice(0, 12)
  const priceKey = `OTODOM_COMPS:${kind}:${addrHash}:${areaKey}`
  return { priceKey, metaKey: compsMetaKey(priceKey) }
}

/**
 * Comparable listings near `address`, similar `areaM2`, median zł/m² × area.
 * Public Otodom search — no portal login required.
 */
export async function getOtodomCompsValue(
  input: {
    class: 'apartment' | 'land'
    address: string
    areaM2: number
  },
  opts?: { force?: boolean }
): Promise<OtodomCompsQuote> {
  const address = input.address.trim()
  const areaM2 = input.areaM2
  if (!address || !(areaM2 > 0)) return missingQuote()

  const keys = otodomCompsCacheKeys({ class: input.class, address, areaM2 })
  if (!keys) return missingQuote()
  const kind: EstateKind = input.class === 'land' ? 'dzialka' : 'mieszkanie'
  const cacheKey = keys.priceKey

  if (!isLive('property_otodom')) {
    const cached = fromPriceCache(cacheKey, true, readCompsMeta(cacheKey))
    if (!cached) return missingQuote()
    return { ...cached, price: Math.round(cached.plnPerM2 * areaM2), missing: false }
  }

  if (!opts?.force) {
    const cachedRow = getCache(cacheKey)
    if (cachedRow && Date.now() - new Date(cachedRow.fetchedAt).getTime() < COMPS_TTL_MS) {
      const cached = fromPriceCache(cacheKey, false, readCompsMeta(cacheKey))!
      return { ...cached, price: Math.round(cached.plnPerM2 * areaM2) }
    }
  }

  try {
    return await fetchCompsQuote({ ...input, address, cacheKey, kind })
  } catch (err) {
    console.warn(`[otodom] comps failed for "${address}": ${(err as Error).message}`)
    const cached = fromPriceCache(cacheKey, true, readCompsMeta(cacheKey))
    if (!cached) return missingQuote()
    return { ...cached, price: Math.round(cached.plnPerM2 * areaM2), stale: true }
  }
}

/** Settings → Test: resolve a known area and pull comps (bypasses live toggle). */
export async function probeOtodom(): Promise<{ ok: true; detail: string }> {
  const address = 'Wola, Warszawa'
  const areaM2 = 60
  const kind: EstateKind = 'mieszkanie'
  const addrHash = createHash('sha1').update(address.toLowerCase()).digest('hex').slice(0, 12)
  const cacheKey = `OTODOM_COMPS:${kind}:${addrHash}:${Math.round(areaM2)}`
  const quote = await fetchCompsQuote({
    class: 'apartment',
    address,
    areaM2,
    cacheKey,
    kind
  })
  return {
    ok: true as const,
    detail: `${quote.compsCount} comps · median ${Math.round(quote.plnPerM2).toLocaleString('pl-PL')} zł/m²`
  }
}
