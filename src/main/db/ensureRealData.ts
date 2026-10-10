import type BetterSqlite3 from 'better-sqlite3'
import {
  assertCatalogMath,
  catalogEstimateFor,
  catalogEstimates,
  type CatalogEstimate
} from '@shared/valuationFormulas'

/** Fixed ids from the removed scaffold seed (ETF, bond, cash, generic apartment, land, car, loans). */
const DEMO_ASSET_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
]

const DEMO_LIABILITY_IDS = [
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222'
]

const DEMO_EXPENSE_IDS = [
  'c1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222',
  'c3333333-3333-4333-8333-333333333333',
  'c4444444-4444-4444-8444-444444444444'
]

const DEMO_PRICE_KEYS = ['FX:USD:PLN', 'FX:EUR:PLN', 'EQ:VWCE.DE']

function placeholders(ids: readonly string[]): string {
  return ids.map(() => '?').join(', ')
}

export function purgeDemoSeed(database: BetterSqlite3.Database): void {
  const tx = database.transaction(() => {
    database
      .prepare(
        `DELETE FROM expense_entries WHERE id IN (${placeholders(DEMO_EXPENSE_IDS)}) OR liability_id IN (${placeholders(DEMO_LIABILITY_IDS)})`
      )
      .run(...DEMO_EXPENSE_IDS, ...DEMO_LIABILITY_IDS)
    database
      .prepare(`DELETE FROM liabilities WHERE id IN (${placeholders(DEMO_LIABILITY_IDS)})`)
      .run(...DEMO_LIABILITY_IDS)
    database
      .prepare(`DELETE FROM assets WHERE id IN (${placeholders(DEMO_ASSET_IDS)})`)
      .run(...DEMO_ASSET_IDS)
    database
      .prepare(
        `DELETE FROM price_cache WHERE key IN (${placeholders(DEMO_PRICE_KEYS)}) AND fetched_at = '2025-10-01T12:00:00.000Z'`
      )
      .run(...DEMO_PRICE_KEYS)
  })
  tx()
}

export function ensureRealAssets(database: BetterSqlite3.Database): void {
  assertCatalogMath()
  for (const estimate of catalogEstimates()) {
    ensureCatalogAsset(database, estimate)
  }
}

function ensureCatalogAsset(database: BetterSqlite3.Database, estimate: CatalogEstimate): void {
  const existing = database
    .prepare('SELECT value_source FROM assets WHERE id = ?')
    .get(estimate.assetId) as { value_source: string | null } | undefined

  const now = new Date().toISOString()

  if (existing) {
    if (existing.value_source === 'estimate') {
      database
        .prepare(
          `UPDATE assets
           SET amount_minor = @worth,
               valued_on = @valuedOn,
               currency = 'PLN',
               updated_at = @updatedAt
           WHERE id = @id AND value_source = 'estimate'`
        )
        .run({
          id: estimate.assetId,
          worth: estimate.worthMinor,
          valuedOn: estimate.catalog.asOf,
          updatedAt: now
        })
    }
    return
  }

  const dismissed = database
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(estimate.dismissKey) as { value: string } | undefined
  if (dismissed?.value === '1') return

  database
    .prepare(
      `INSERT INTO assets (
        id, class, name, notes,
        cost_basis_minor, cost_currency,
        amount_minor, currency, valued_on, value_source,
        created_at, updated_at
      ) VALUES (
        @id, @class, @name, @notes,
        @cost, 'PLN',
        @worth, 'PLN', @valuedOn, 'estimate',
        @createdAt, @updatedAt
      )`
    )
    .run({
      id: estimate.assetId,
      class: estimate.class,
      name: estimate.name,
      notes: estimate.notes,
      cost: estimate.costMinor,
      worth: estimate.worthMinor,
      valuedOn: estimate.catalog.asOf,
      createdAt: estimate.createdAt ?? now,
      updatedAt: now
    })
}

/** Remember a user delete so the seed does not bring the asset back on next launch. */
export function markCatalogAssetDismissed(database: BetterSqlite3.Database, assetId: string): void {
  const estimate = catalogEstimateFor(assetId)
  if (!estimate) return
  database
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, '1')
       ON CONFLICT(key) DO UPDATE SET value = '1'`
    )
    .run(estimate.dismissKey)
}
