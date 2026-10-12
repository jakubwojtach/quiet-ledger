import {
  FORT_WOLA_CATALOG,
  FORT_WOLA_UNIT,
  NEFRYTOWA_CATALOG,
  NEFRYTOWA_PLOT
} from './marketCatalog'

export const FORT_WOLA_ASSET_ID = FORT_WOLA_UNIT.id
export const NEFRYTOWA_ASSET_ID = NEFRYTOWA_PLOT.id

/** Purchase cost in grosze: area × price + parking lump. */
export function purchaseCostMinor(areaM2: number, plnPerM2: number, parkingPln: number): number {
  return Math.round(areaM2 * plnPerM2 * 100) + Math.round(parkingPln * 100)
}

/**
 * Worth now in grosze.
 * Apartment: area × current catalog zł/m².
 * Parking: 2016 lump scaled by the same zł/m² index (catalog has no separate parking series).
 */
export function indexedWorthMinor(input: {
  areaM2: number
  purchasePlnPerM2: number
  purchaseParkingPln: number
  catalogPlnPerM2: number
}): number {
  const apartmentMinor = Math.round(input.areaM2 * input.catalogPlnPerM2 * 100)
  const purchaseParkingMinor = Math.round(input.purchaseParkingPln * 100)
  const parkingMinor = Math.round(
    (purchaseParkingMinor * input.catalogPlnPerM2) / input.purchasePlnPerM2
  )
  return apartmentMinor + parkingMinor
}

export function fortWolaCostMinor(): number {
  return purchaseCostMinor(
    FORT_WOLA_UNIT.areaM2,
    FORT_WOLA_UNIT.purchasePlnPerM2,
    FORT_WOLA_UNIT.purchaseParkingPln
  )
}

export function fortWolaWorthMinor(): number {
  return indexedWorthMinor({
    areaM2: FORT_WOLA_UNIT.areaM2,
    purchasePlnPerM2: FORT_WOLA_UNIT.purchasePlnPerM2,
    purchaseParkingPln: FORT_WOLA_UNIT.purchaseParkingPln,
    catalogPlnPerM2: FORT_WOLA_CATALOG.plnPerM2
  })
}

export function fortWolaBreakdown(): {
  apartmentMinor: number
  parkingMinor: number
  worthMinor: number
  costMinor: number
} {
  const worthMinor = fortWolaWorthMinor()
  const apartmentMinor = Math.round(FORT_WOLA_UNIT.areaM2 * FORT_WOLA_CATALOG.plnPerM2 * 100)
  return {
    apartmentMinor,
    parkingMinor: worthMinor - apartmentMinor,
    worthMinor,
    costMinor: fortWolaCostMinor()
  }
}

export function fortWolaNotes(): string {
  return [
    '67 m², ground floor, 2 gardens, double underground parking, high standard.',
    'Purchased 2016 at 7 700 zł/m² (515 900 zł) plus 75 000 zł parking.',
    'Cost basis 590 900 zł.'
  ].join(' ')
}

export function nefrytowaCostMinor(): number {
  return Math.round(NEFRYTOWA_PLOT.purchasePln * 100)
}

/** Plot area × catalog zł/m². */
export function nefrytowaWorthMinor(): number {
  return Math.round(NEFRYTOWA_PLOT.areaM2 * NEFRYTOWA_CATALOG.plnPerM2 * 100)
}

export function nefrytowaNotes(): string {
  return [
    '1 017 m² building plot for a house, ul. Nefrytowa, Szczecin-Skolwin.',
    'Paid about 280 000 zł; purchase year not recorded.'
  ].join(' ')
}

export interface CatalogEstimate {
  assetId: string
  class: 'apartment' | 'land'
  name: string
  notes: string
  costMinor: number
  worthMinor: number
  /** Seeded created_at; null means first-seed time. */
  createdAt: string | null
  dismissKey: string
  catalog: typeof FORT_WOLA_CATALOG | typeof NEFRYTOWA_CATALOG
  /** Short "how worth is computed" line for the detail card. */
  formula: string
  areaM2: number
  purchaseYear: number | null
  purchaseApprox: boolean
}

function zl(minor: number): string {
  return `${Math.round(minor / 100).toLocaleString('pl-PL')} zł`
}

export function catalogEstimates(): CatalogEstimate[] {
  const fortWola = fortWolaBreakdown()
  return [
    {
      assetId: FORT_WOLA_ASSET_ID,
      class: 'apartment',
      name: FORT_WOLA_UNIT.name,
      notes: fortWolaNotes(),
      costMinor: fortWola.costMinor,
      worthMinor: fortWola.worthMinor,
      createdAt: `${FORT_WOLA_UNIT.purchasedYear}-01-01T00:00:00.000Z`,
      dismissKey: 'fort_wola_dismissed',
      catalog: FORT_WOLA_CATALOG,
      formula: `${zl(fortWola.apartmentMinor)} area + ${zl(fortWola.parkingMinor)} parking`,
      areaM2: FORT_WOLA_UNIT.areaM2,
      purchaseYear: FORT_WOLA_UNIT.purchasedYear,
      purchaseApprox: false
    },
    {
      assetId: NEFRYTOWA_ASSET_ID,
      class: 'land',
      name: NEFRYTOWA_PLOT.name,
      notes: nefrytowaNotes(),
      costMinor: nefrytowaCostMinor(),
      worthMinor: nefrytowaWorthMinor(),
      createdAt: null,
      dismissKey: 'nefrytowa_dismissed',
      catalog: NEFRYTOWA_CATALOG,
      formula: `${NEFRYTOWA_PLOT.areaM2.toLocaleString('pl-PL')} m² × ${NEFRYTOWA_CATALOG.plnPerM2} zł/m² (asking)`,
      areaM2: NEFRYTOWA_PLOT.areaM2,
      purchaseYear: null,
      purchaseApprox: true
    }
  ]
}

export function catalogEstimateFor(assetId: string): CatalogEstimate | null {
  return catalogEstimates().find((e) => e.assetId === assetId) ?? null
}

/** Locked so a catalog or formula edit cannot silently move a seeded worth. */
export const CATALOG_EXPECTED: Record<string, { costMinor: number; worthMinor: number }> = {
  [FORT_WOLA_ASSET_ID]: { costMinor: 59_090_000, worthMinor: 149_244_457 },
  [NEFRYTOWA_ASSET_ID]: { costMinor: 28_000_000, worthMinor: 32_645_700 }
}

export function assertCatalogMath(): void {
  for (const e of catalogEstimates()) {
    const expected = CATALOG_EXPECTED[e.assetId]
    if (!expected || e.costMinor !== expected.costMinor || e.worthMinor !== expected.worthMinor) {
      throw new Error(
        `${e.name} formula drifted: cost ${e.costMinor}, worth ${e.worthMinor} (expected ${JSON.stringify(expected)}). Update the catalog and CATALOG_EXPECTED together.`
      )
    }
  }
}
