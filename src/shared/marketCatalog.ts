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
  source:
    'RCN transaction median, 38 notarial sales on ul. Fort Wola (mscanner.pl, October 2026 snapshot). Catalog fallback, not a live scrape.',
  sourceUrl: 'https://mscanner.pl/ceny-transakcyjne-mieszkan/warszawa/wola/fort-wola'
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
  source:
    'Median asking price of three building plots on ul. Nefrytowa (adresowo.pl, freedom.pl, October 2026). Asking, not transaction; catalog fallback, not a live scrape.',
  sourceUrl: 'https://adresowo.pl/dzialki/szczecin/ul-nefrytowa-R/'
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
