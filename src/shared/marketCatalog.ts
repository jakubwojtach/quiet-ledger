export type CatalogComparable = {
  areaM2: number
  plnPerM2: number
  note: string
  source: string
}

export type PriceScaleMarker = {
  plnPerM2: number
  label: string
  note: string
  /** Marker sits above (default) or below the track. */
  side: 'above' | 'below'
  /** Accent pin = catalog price in use. */
  kind?: 'used' | 'paid' | 'ref'
}

export type PriceSensitivityRow = {
  plnPerM2: number
  note: string
  highlight?: boolean
}

/**
 * Local market snapshot for Fort Wola. Not a live listing scrape.
 * ul. Fort Wola transaction median from 38 notarial sales (RCN),
 * published by mscanner.pl as 19 448 zł/m² (October 2026 page; figures as of 2 Sep 2026).
 * https://mscanner.pl/ceny-transakcyjne-mieszkan/warszawa/wola/fort-wola
 *
 * A later local scout can replace `plnPerM2`. Until then valuation uses this catalog.
 */
export const FORT_WOLA_CATALOG = {
  key: 'fort-wola',
  label: 'ul. Fort Wola, Warszawa',
  asOf: '2026-10-01',
  plnPerM2: 19_448,
  transactionAvgPlnPerM2: 19_448,
  source:
    'RCN transaction median, 38 notarial sales on ul. Fort Wola (mscanner.pl, October 2026 snapshot). Catalog fallback, not a live scrape.',
  sourceUrl: 'https://mscanner.pl/ceny-transakcyjne-mieszkan/warszawa/wola/fort-wola',
  sourceLinks: [
    { label: 'mscanner.pl', url: 'https://mscanner.pl/ceny-transakcyjne-mieszkan/warszawa/wola/fort-wola' }
  ],
  scale: {
    min: 15_000,
    max: 24_000,
    markers: [
      {
        plnPerM2: 7_700,
        label: '7 700',
        note: 'you paid · 2016',
        side: 'below' as const,
        kind: 'paid' as const
      },
      {
        plnPerM2: 19_448,
        label: '19 448',
        note: 'RCN median · used',
        side: 'above' as const,
        kind: 'used' as const
      }
    ] satisfies PriceScaleMarker[],
    sensitivity: [
      { plnPerM2: 17_500, note: '−10 % vs median' },
      { plnPerM2: 19_448, note: 'current catalog', highlight: true },
      { plnPerM2: 21_400, note: '+10 % vs median' }
    ] satisfies PriceSensitivityRow[]
  },
  comparables: [
    {
      areaM2: 67,
      plnPerM2: 19_448,
      note: 'RCN median · ul. Fort Wola',
      source: 'mscanner.pl'
    }
  ] satisfies CatalogComparable[]
} as const

/**
 * Building-plot asking prices on ul. Nefrytowa, Szczecin-Skolwin (single-family zoning).
 * Median of three listings seen October 2026: 870 m² @ 299 zł/m² (reserved, freedom.pl),
 * 1 024 m² @ 321 zł/m² and 723 m² @ 346 zł/m² (adresowo.pl). The 1 024 m² plot is the
 * closest comparable. Asking prices: Szczecin building-plot transactions average about 25%
 * below asks (267 vs 355 zł/m², dzialkopedia.pl, RCN, 8 Oct 2026), so this likely overstates.
 */
export const NEFRYTOWA_CATALOG = {
  key: 'nefrytowa',
  label: 'ul. Nefrytowa, Szczecin-Skolwin',
  asOf: '2026-10-01',
  plnPerM2: 321,
  transactionAvgPlnPerM2: 267,
  source:
    'Median asking price of three building plots on ul. Nefrytowa (adresowo.pl, freedom.pl, October 2026). The 1 024 m² plot at 321 zł/m² is the closest comparable.',
  sourceUrl: 'https://adresowo.pl/dzialki/szczecin/ul-nefrytowa-R/',
  sourceLinks: [
    { label: 'adresowo.pl', url: 'https://adresowo.pl/dzialki/szczecin/ul-nefrytowa-R/' },
    { label: 'freedom.pl', url: 'https://freedom.pl' }
  ],
  scale: {
    min: 250,
    max: 360,
    askFrom: 299,
    askTo: 346,
    markers: [
      {
        plnPerM2: 267,
        label: '267',
        note: 'RCN transactions',
        side: 'above' as const
      },
      {
        plnPerM2: 275,
        label: '≈275',
        note: 'you paid',
        side: 'below' as const,
        kind: 'paid' as const
      },
      {
        plnPerM2: 299,
        label: '299',
        note: '870 m² · reserved',
        side: 'above' as const
      },
      {
        plnPerM2: 321,
        label: '321',
        note: '1 024 m² · used',
        side: 'above' as const,
        kind: 'used' as const
      },
      {
        plnPerM2: 346,
        label: '346',
        note: '723 m²',
        side: 'below' as const
      },
      {
        plnPerM2: 355,
        label: '355',
        note: 'Szczecin asks',
        side: 'below' as const
      }
    ] satisfies PriceScaleMarker[],
    sensitivity: [
      { plnPerM2: 267, note: 'Szczecin transaction avg' },
      { plnPerM2: 321, note: 'current catalog', highlight: true },
      { plnPerM2: 346, note: 'highest ask' }
    ] satisfies PriceSensitivityRow[]
  },
  comparables: [
    {
      areaM2: 870,
      plnPerM2: 299,
      note: 'reserved',
      source: 'freedom.pl'
    },
    {
      areaM2: 1_024,
      plnPerM2: 321,
      note: 'closest comparable · used',
      source: 'adresowo.pl'
    },
    {
      areaM2: 723,
      plnPerM2: 346,
      note: 'highest ask',
      source: 'adresowo.pl'
    }
  ] satisfies CatalogComparable[]
} as const

/** Plot for the house. Purchase year not recorded yet; paid is approximate. */
export const NEFRYTOWA_PLOT = {
  id: '5ec2ecf1-0f17-4a1d-8b0e-000000280000',
  name: 'Działka Nefrytowa, Szczecin',
  areaM2: 1017,
  purposeNote: 'building plot for a house',
  /** zł, approximate */
  purchasePln: 280_000
} as const

/** The apartment this catalog prices. Purchase figures are the 2016 cost basis. */
export const FORT_WOLA_UNIT = {
  id: 'f07a2016-12b2-4670-8670-000000590900',
  name: 'Fort Wola 12B/23, Warszawa',
  areaM2: 67,
  floor: 'ground',
  gardens: 2,
  parking: 'double underground',
  standard: 'high',
  purchasedYear: 2016,
  /** zł per m² at purchase */
  purchasePlnPerM2: 7_700,
  /** zł lump for both underground spaces, 2016 */
  purchaseParkingPln: 75_000
} as const
