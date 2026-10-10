import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import {
  SCHEMA_SQL,
  SEED_ASSETS_SQL,
  SEED_CATEGORIES_SQL,
  SEED_LIABILITIES_SQL
} from './schema'
import type { Asset, AssetClass, IncomeAllocation, IncomeEntry } from '@shared/types'
import { QUANTITY_SCALE } from '@shared/types'
import { randomUUID } from 'crypto'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): Database.Database {
  const dbPath = join(app.getPath('userData'), 'networth.sqlite')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA_SQL)

  const assetCount = db.prepare('SELECT COUNT(*) AS c FROM assets').get() as { c: number }
  if (assetCount.c === 0) {
    db.exec(SEED_ASSETS_SQL)
  }

  const liabilityCount = db.prepare('SELECT COUNT(*) AS c FROM liabilities').get() as { c: number }
  if (liabilityCount.c === 0) {
    db.exec(SEED_LIABILITIES_SQL)
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM expense_categories').get() as {
    c: number
  }
  if (categoryCount.c === 0) {
    db.exec(SEED_CATEGORIES_SQL)
  }

  seedDemoExpensesIfEmpty(db)

  return db
}

function seedDemoExpensesIfEmpty(database: Database.Database): void {
  const expenseCount = database.prepare('SELECT COUNT(*) AS c FROM expense_entries').get() as {
    c: number
  }
  if (expenseCount.c > 0) return

  const month = new Date().toISOString().slice(0, 7)
  const day = (d: number): string => `${month}-${String(d).padStart(2, '0')}`
  const now = new Date().toISOString()
  const insert = database.prepare(
    `INSERT INTO expense_entries (
      id, category_id, date, amount_minor, currency, note, liability_id, created_at
    ) VALUES (@id, @categoryId, @date, @amountMinor, @currency, @note, @liabilityId, @createdAt)`
  )

  const rows = [
    {
      id: 'c1111111-1111-4111-8111-111111111111',
      categoryId: 'b1111111-1111-4111-8111-111111111111',
      date: day(3),
      amountMinor: 28750,
      currency: 'PLN',
      note: 'Weekly groceries',
      liabilityId: null as string | null
    },
    {
      id: 'c2222222-2222-4222-8222-222222222222',
      categoryId: 'b2222222-2222-4222-8222-222222222222',
      date: day(5),
      amountMinor: 12000,
      currency: 'PLN',
      note: 'Fuel',
      liabilityId: null
    },
    {
      id: 'c3333333-3333-4333-8333-333333333333',
      categoryId: 'b4444444-4444-4444-8444-444444444444',
      date: day(1),
      amountMinor: 32000,
      currency: 'PLN',
      note: 'Electricity',
      liabilityId: null
    },
    {
      id: 'c4444444-4444-4444-8444-444444444444',
      categoryId: 'b5555555-5555-4555-8555-555555555555',
      date: day(8),
      amountMinor: 20000,
      currency: 'PLN',
      note: 'Phone installment',
      liabilityId: 'a1111111-1111-4111-8111-111111111111'
    }
  ]

  const tx = database.transaction(() => {
    for (const r of rows) {
      insert.run({ ...r, createdAt: now })
    }
  })
  tx()
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
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
  created_at: string
  updated_at: string
}

function rowToAsset(row: AssetRow): Asset {
  const base = {
    id: row.id,
    name: row.name,
    notes: row.notes,
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
        currency: row.currency!
      }
    case 'retirement':
      return {
        ...base,
        class: 'retirement',
        unitsScaled: row.units_scaled!,
        unitPriceMinor: row.unit_price_minor!,
        currency: row.currency!
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
        valuedOn: row.valued_on!
      }
    default: {
      const _exhaustive: never = row.class
      throw new Error(`Unknown asset class: ${_exhaustive}`)
    }
  }
}

export function listAssets(): Asset[] {
  const rows = getDb().prepare('SELECT * FROM assets ORDER BY class, name').all() as AssetRow[]
  return rows.map(rowToAsset)
}

export function getAssetById(id: string): Asset | null {
  const row = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined
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
