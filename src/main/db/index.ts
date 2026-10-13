import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { DEFAULT_CATEGORIES_SQL, SCHEMA_SQL } from './schema'
import { ensureRealAssets, purgeDemoSeed } from './ensureRealData'
import { describeDatabase } from '../userDataDir'
import type { DatabaseInfo } from '@shared/dataDirs'
import type { Asset, AssetClass, IncomeAllocation, IncomeEntry } from '@shared/types'
import { QUANTITY_SCALE } from '@shared/types'
import { randomUUID } from 'crypto'

let db: Database.Database | null = null
let databasePath: string | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function getDatabasePath(): string {
  if (!databasePath) throw new Error('Database not initialized')
  return databasePath
}

export function getDatabaseInfo(): DatabaseInfo {
  return describeDatabase(getDatabasePath())
}

export function initDatabase(): Database.Database {
  const dbPath = join(app.getPath('userData'), 'networth.sqlite')
  databasePath = dbPath
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  ensureAssetColumns(db)
  ensureExpenseColumns(db)

  const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM expense_categories').get() as {
    c: number
  }
  if (categoryCount.c === 0) {
    db.exec(DEFAULT_CATEGORIES_SQL)
  }

  purgeDemoSeed(db)
  ensureRealAssets(db)

  const info = describeDatabase(dbPath)
  const names = db.prepare('SELECT name FROM assets ORDER BY name').all() as { name: string }[]
  console.log(`[savings-net-worth] appId=${info.appId}`)
  console.log(`[savings-net-worth] SQLite ${info.dbPath}`)
  console.log(
    `[savings-net-worth] assets: ${names.length === 0 ? '(none)' : names.map((row) => row.name).join(', ')}`
  )
  for (const legacy of info.legacyDbPaths) {
    console.warn(`[savings-net-worth] Legacy SQLite still on disk (not opened): ${legacy}`)
  }

  return db
}

/** Columns added after the first schema; CREATE TABLE IF NOT EXISTS skips them on old files. */
function ensureAssetColumns(database: Database.Database): void {
  const cols = new Set(
    (database.prepare('PRAGMA table_info(assets)').all() as { name: string }[]).map((c) => c.name)
  )
  for (const name of ['value_source', 'account']) {
    if (!cols.has(name)) database.exec(`ALTER TABLE assets ADD COLUMN ${name} TEXT`)
  }
}

function ensureExpenseColumns(database: Database.Database): void {
  const cols = new Set(
    (database.prepare('PRAGMA table_info(expense_entries)').all() as { name: string }[]).map(
      (c) => c.name
    )
  )
  if (!cols.has('status')) {
    database.exec(
      `ALTER TABLE expense_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'`
    )
  }
  if (!cols.has('due_date')) {
    database.exec(`ALTER TABLE expense_entries ADD COLUMN due_date TEXT`)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
  databasePath = null
}

type AssetRow = {
  id: string
  class: AssetClass
  name: string
  notes: string | null
  ticker: string | null
  quantity_scaled: number | null
  cost_basis_minor: number | null
  cost_currency: string | null
  nominal_minor: number | null
  unit_value_minor: number | null
  units_scaled: number | null
  unit_price_minor: number | null
  amount_minor: number | null
  currency: string | null
  valued_on: string | null
  value_source: string | null
  account: string | null
  lot_count: number
  created_at: string
  updated_at: string
}

const SELECT_ASSETS = `SELECT a.*, (SELECT COUNT(*) FROM asset_lots l WHERE l.asset_id = a.id) AS lot_count
  FROM assets a`

function rowToAsset(row: AssetRow): Asset {
  const base = {
    id: row.id,
    name: row.name,
    notes: row.notes,
    account: row.account,
    lotCount: row.lot_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }

  switch (row.class) {
    case 'etf':
      return {
        ...base,
        class: 'etf',
        ticker: row.ticker!,
        quantityScaled: row.quantity_scaled!,
        costBasisMinor: row.cost_basis_minor!,
        costCurrency: row.cost_currency!
      }
    case 'bond':
      return {
        ...base,
        class: 'bond',
        nominalMinor: row.nominal_minor!,
        unitValueMinor: row.unit_value_minor!,
        currency: row.currency!,
        statementValueMinor: row.amount_minor,
        valuedOn: row.valued_on
      }
    case 'retirement':
      return {
        ...base,
        class: 'retirement',
        unitsScaled: row.units_scaled!,
        unitPriceMinor: row.unit_price_minor!,
        currency: row.currency!,
        fundCode: row.ticker,
        costBasisMinor: row.cost_basis_minor
      }
    case 'savings_usd':
    case 'savings_pln':
      return {
        ...base,
        class: row.class,
        amountMinor: row.amount_minor!,
        currency: row.currency!
      }
    case 'apartment':
    case 'land':
    case 'car':
      return {
        ...base,
        class: row.class,
        valueMinor: row.amount_minor!,
        currency: row.currency!,
        valuedOn: row.valued_on!,
        costBasisMinor: row.cost_basis_minor,
        valueSource: row.value_source === 'estimate' ? 'estimate' : 'manual'
      }
    default: {
      const _exhaustive: never = row.class
      throw new Error(`Unknown asset class: ${_exhaustive}`)
    }
  }
}

export function listAssets(): Asset[] {
  const rows = getDb().prepare(`${SELECT_ASSETS} ORDER BY a.class, a.name`).all() as AssetRow[]
  return rows.map(rowToAsset)
}

export function getAssetById(id: string): Asset | null {
  const row = getDb().prepare(`${SELECT_ASSETS} WHERE a.id = ?`).get(id) as AssetRow | undefined
  return row ? rowToAsset(row) : null
}

export function listIncomeEntries(): IncomeEntry[] {
  const database = getDb()
  const entries = database
    .prepare('SELECT * FROM income_entries ORDER BY month DESC, created_at DESC')
    .all() as Array<{
    id: string
    month: string
    amount_minor: number
    currency: string
    note: string | null
    created_at: string
  }>

  const allocStmt = database.prepare(
    'SELECT asset_id, amount_minor FROM income_allocations WHERE income_id = ?'
  )

  return entries.map((e) => {
    const allocations = (
      allocStmt.all(e.id) as Array<{ asset_id: string; amount_minor: number }>
    ).map(
      (a): IncomeAllocation => ({
        assetId: a.asset_id,
        amountMinor: a.amount_minor
      })
    )
    return {
      id: e.id,
      month: e.month,
      amountMinor: e.amount_minor,
      currency: e.currency,
      note: e.note,
      allocations,
      createdAt: e.created_at
    }
  })
}

export function createIncomeEntry(input: {
  month: string
  amountMinor: number
  currency: string
  note?: string | null
  allocations: IncomeAllocation[]
}): IncomeEntry {
  const database = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  const insertIncome = database.prepare(`
    INSERT INTO income_entries (id, month, amount_minor, currency, note, created_at)
    VALUES (@id, @month, @amountMinor, @currency, @note, @createdAt)
  `)
  const insertAlloc = database.prepare(`
    INSERT INTO income_allocations (id, income_id, asset_id, amount_minor)
    VALUES (@id, @incomeId, @assetId, @amountMinor)
  `)

  const tx = database.transaction(() => {
    insertIncome.run({
      id,
      month: input.month,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note ?? null,
      createdAt
    })
    for (const a of input.allocations) {
      insertAlloc.run({
        id: randomUUID(),
        incomeId: id,
        assetId: a.assetId,
        amountMinor: a.amountMinor
      })
    }
  })
  tx()

  return {
    id,
    month: input.month,
    amountMinor: input.amountMinor,
    currency: input.currency,
    note: input.note ?? null,
    allocations: input.allocations,
    createdAt
  }
}

export function updateIncomeEntry(input: {
  id: string
  month: string
  amountMinor: number
  currency: string
  note?: string | null
}): IncomeEntry {
  const database = getDb()
  const existing = database
    .prepare(
      `SELECT id, month, amount_minor, currency, note, created_at
       FROM income_entries WHERE id = ?`
    )
    .get(input.id) as
    | {
        id: string
        month: string
        amount_minor: number
        currency: string
        note: string | null
        created_at: string
      }
    | undefined

  if (!existing) throw new Error(`Income not found: ${input.id}`)

  database
    .prepare(
      `UPDATE income_entries SET
        month = @month,
        amount_minor = @amountMinor,
        currency = @currency,
        note = @note
      WHERE id = @id`
    )
    .run({
      id: input.id,
      month: input.month,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note ?? null
    })

  const allocRows = database
    .prepare(
      `SELECT asset_id, amount_minor FROM income_allocations WHERE income_id = ?`
    )
    .all(input.id) as Array<{ asset_id: string; amount_minor: number }>

  return {
    id: input.id,
    month: input.month,
    amountMinor: input.amountMinor,
    currency: input.currency,
    note: input.note ?? null,
    allocations: allocRows.map((a) => ({
      assetId: a.asset_id,
      amountMinor: a.amount_minor
    })),
    createdAt: existing.created_at
  }
}

export function deleteIncomeEntry(id: string): { ok: true } {
  getDb().prepare('DELETE FROM income_entries WHERE id = ?').run(id)
  return { ok: true }
}

export type CacheKind = 'fx' | 'equity'

export interface CacheRow {
  key: string
  kind: CacheKind
  valueScaled: number
  quoteCurrency: string
  fetchedAt: string
}

/** Rate/price stored as integer × 10_000 (4 decimal places). */
export const PRICE_SCALE = 10_000

export function getCache(key: string): CacheRow | null {
  const row = getDb()
    .prepare('SELECT key, kind, value_scaled, quote_currency, fetched_at FROM price_cache WHERE key = ?')
    .get(key) as
    | {
        key: string
        kind: CacheKind
        value_scaled: number
        quote_currency: string
        fetched_at: string
      }
    | undefined

  if (!row) return null
  return {
    key: row.key,
    kind: row.kind,
    valueScaled: row.value_scaled,
    quoteCurrency: row.quote_currency,
    fetchedAt: row.fetched_at
  }
}

export function setCache(
  key: string,
  kind: CacheKind,
  valueScaled: number,
  quoteCurrency: string,
  fetchedAt = new Date().toISOString()
): void {
  getDb()
    .prepare(
      `INSERT INTO price_cache (key, kind, value_scaled, quote_currency, fetched_at)
       VALUES (@key, @kind, @valueScaled, @quoteCurrency, @fetchedAt)
       ON CONFLICT(key) DO UPDATE SET
         value_scaled = excluded.value_scaled,
         quote_currency = excluded.quote_currency,
         fetched_at = excluded.fetched_at`
    )
    .run({ key, kind, valueScaled, quoteCurrency, fetchedAt })
}

export { QUANTITY_SCALE }
