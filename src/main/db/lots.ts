import { randomUUID } from 'crypto'
import type BetterSqlite3 from 'better-sqlite3'
import { supportsLots, type AssetLot } from '@shared/types'
import type { UpsertLotParsed } from '@shared/ipc'
import { getAssetById, getDb } from './index'

type LotRow = {
  id: string
  asset_id: string
  date: string
  quantity_scaled: number
  price_scaled: number | null
  price_currency: string | null
  paid_minor: number
  paid_currency: string
  series: string | null
  estimated: number
  note: string | null
  created_at: string
}

function rowToLot(row: LotRow): AssetLot {
  return {
    id: row.id,
    assetId: row.asset_id,
    date: row.date,
    quantityScaled: row.quantity_scaled,
    priceScaled: row.price_scaled,
    priceCurrency: row.price_currency,
    paidMinor: row.paid_minor,
    paidCurrency: row.paid_currency,
    series: row.series,
    estimated: row.estimated === 1,
    note: row.note,
    createdAt: row.created_at
  }
}

export function listLots(assetId: string): AssetLot[] {
  const rows = getDb()
    .prepare('SELECT * FROM asset_lots WHERE asset_id = ? ORDER BY date, created_at')
    .all(assetId) as LotRow[]
  return rows.map(rowToLot)
}

/**
 * Rewrites the holding's totals from its lots so valuation and the dashboard keep reading
 * one row per holding. No-op when the holding has no lots.
 */
export function syncAssetFromLots(database: BetterSqlite3.Database, assetId: string): void {
  const totals = database
    .prepare(
      `SELECT COUNT(*) AS n, SUM(quantity_scaled) AS qty, SUM(paid_minor) AS paid,
              COUNT(DISTINCT paid_currency) AS currencies, MIN(paid_currency) AS currency
       FROM asset_lots WHERE asset_id = ?`
    )
    .get(assetId) as { n: number; qty: number; paid: number; currencies: number; currency: string }
  if (totals.n === 0) return
  if (totals.currencies > 1) {
    throw new Error('All purchases of one holding must be paid in the same currency.')
  }

  const cls = (
    database.prepare('SELECT class FROM assets WHERE id = ?').get(assetId) as { class: string }
  ).class
  const now = new Date().toISOString()
  if (cls === 'etf') {
    database
      .prepare(
        `UPDATE assets SET quantity_scaled = ?, cost_basis_minor = ?, cost_currency = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(totals.qty, totals.paid, totals.currency, now, assetId)
  } else if (cls === 'retirement') {
    database
      .prepare(
        `UPDATE assets SET units_scaled = ?, cost_basis_minor = ?, cost_currency = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(totals.qty, totals.paid, totals.currency, now, assetId)
  } else if (cls === 'bond') {
    database
      .prepare('UPDATE assets SET nominal_minor = ?, updated_at = ? WHERE id = ?')
      .run(totals.paid, now, assetId)
  }
}

export function upsertLot(input: UpsertLotParsed): AssetLot {
  const asset = getAssetById(input.assetId)
  if (!asset) throw new Error('Holding not found')
  if (!supportsLots(asset.class)) throw new Error('This holding type has no purchases.')

  const database = getDb()
  const id = input.id ?? randomUUID()
  const existing = input.id
    ? (database.prepare('SELECT created_at FROM asset_lots WHERE id = ?').get(input.id) as
        | { created_at: string }
        | undefined)
    : undefined

  const row = {
    id,
    asset_id: input.assetId,
    date: input.date,
    quantity_scaled: input.quantity,
    price_scaled: input.price,
    price_currency: input.price == null ? null : input.priceCurrency,
    paid_minor: input.paid,
    paid_currency: input.paidCurrency,
    series: input.series?.trim().toUpperCase() || null,
    estimated: input.estimated ? 1 : 0,
    note: input.note?.trim() || null,
    created_at: existing?.created_at ?? new Date().toISOString()
  }

  database.transaction(() => {
    database
      .prepare(
        `INSERT INTO asset_lots (
          id, asset_id, date, quantity_scaled, price_scaled, price_currency,
          paid_minor, paid_currency, series, estimated, note, created_at
        ) VALUES (
          @id, @asset_id, @date, @quantity_scaled, @price_scaled, @price_currency,
          @paid_minor, @paid_currency, @series, @estimated, @note, @created_at
        )
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          quantity_scaled = excluded.quantity_scaled,
          price_scaled = excluded.price_scaled,
          price_currency = excluded.price_currency,
          paid_minor = excluded.paid_minor,
          paid_currency = excluded.paid_currency,
          series = excluded.series,
          estimated = excluded.estimated,
          note = excluded.note`
      )
      .run(row)
    syncAssetFromLots(database, input.assetId)
  })()

  return rowToLot(database.prepare('SELECT * FROM asset_lots WHERE id = ?').get(id) as LotRow)
}

export function deleteLot(id: string): { ok: true } {
  const database = getDb()
  const row = database.prepare('SELECT asset_id FROM asset_lots WHERE id = ?').get(id) as
    | { asset_id: string }
    | undefined
  if (!row) return { ok: true }
  database.transaction(() => {
    database.prepare('DELETE FROM asset_lots WHERE id = ?').run(id)
    syncAssetFromLots(database, row.asset_id)
  })()
  return { ok: true }
}
