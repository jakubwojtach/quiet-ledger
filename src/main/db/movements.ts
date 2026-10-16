import { randomUUID } from 'crypto'
import type BetterSqlite3 from 'better-sqlite3'
import { supportsMovements, type AssetMovement, type MovementKind } from '@shared/types'
import type { UpsertMovementParsed } from '@shared/ipc'
import { getAssetById, getDb } from './index'

type MovementRow = {
  id: string
  asset_id: string
  date: string
  kind: MovementKind
  amount_minor: number
  currency: string
  estimated: number
  note: string | null
  created_at: string
}

function rowToMovement(row: MovementRow): AssetMovement {
  return {
    id: row.id,
    assetId: row.asset_id,
    date: row.date,
    kind: row.kind,
    amountMinor: row.amount_minor,
    currency: row.currency,
    estimated: row.estimated === 1,
    note: row.note,
    createdAt: row.created_at
  }
}

export function listMovements(assetId: string): AssetMovement[] {
  ensureOpeningMovement(assetId)
  const rows = getDb()
    .prepare('SELECT * FROM asset_movements WHERE asset_id = ? ORDER BY date, created_at')
    .all(assetId) as MovementRow[]
  return rows.map(rowToMovement)
}

/** If a savings account has a balance but no ledger yet, seed one opening deposit. */
export function ensureOpeningMovement(assetId: string): void {
  const asset = getAssetById(assetId)
  if (!asset || !supportsMovements(asset.class)) return
  if (asset.class !== 'savings_pln' && asset.class !== 'savings_usd') return
  const database = getDb()
  const count = (
    database.prepare('SELECT COUNT(*) AS n FROM asset_movements WHERE asset_id = ?').get(assetId) as {
      n: number
    }
  ).n
  if (count > 0) return
  const amount = asset.amountMinor
  if (amount <= 0) return
  const id = randomUUID()
  const now = new Date().toISOString()
  const date = asset.updatedAt.slice(0, 10) || now.slice(0, 10)
  database
    .prepare(
      `INSERT INTO asset_movements
       (id, asset_id, date, kind, amount_minor, currency, estimated, note, created_at)
       VALUES (?, ?, ?, 'deposit', ?, ?, 1, ?, ?)`
    )
    .run(id, assetId, date, amount, asset.currency, 'Opening balance', now)
}

export function syncAssetFromMovements(
  database: BetterSqlite3.Database,
  assetId: string
): void {
  const totals = database
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_minor ELSE 0 END), 0) AS deposits,
         COALESCE(SUM(CASE WHEN kind = 'withdrawal' THEN amount_minor ELSE 0 END), 0) AS withdrawals,
         COUNT(*) AS n,
         COUNT(DISTINCT currency) AS currencies,
         MIN(currency) AS currency
       FROM asset_movements WHERE asset_id = ?`
    )
    .get(assetId) as {
    deposits: number
    withdrawals: number
    n: number
    currencies: number
    currency: string | null
  }

  if (totals.n === 0) return
  if (totals.currencies > 1) {
    throw new Error('All movements on one account must use the same currency.')
  }

  const balance = totals.deposits - totals.withdrawals
  if (balance < 0) {
    throw new Error('Withdrawals cannot exceed deposits on this account.')
  }

  const now = new Date().toISOString()
  database
    .prepare('UPDATE assets SET amount_minor = ?, currency = ?, updated_at = ? WHERE id = ?')
    .run(balance, totals.currency, now, assetId)
}

export function upsertMovement(input: UpsertMovementParsed): AssetMovement {
  const asset = getAssetById(input.assetId)
  if (!asset) throw new Error('Holding not found')
  if (!supportsMovements(asset.class)) {
    throw new Error('This holding type has no deposit/withdrawal ledger.')
  }
  if (asset.class !== 'savings_pln' && asset.class !== 'savings_usd') {
    throw new Error('This holding type has no deposit/withdrawal ledger.')
  }

  const database = getDb()
  ensureOpeningMovement(input.assetId)

  const current = getAssetById(input.assetId)
  if (
    !current ||
    (current.class !== 'savings_pln' && current.class !== 'savings_usd')
  ) {
    throw new Error('Holding not found')
  }
  if (input.currency !== current.currency) {
    throw new Error(`Movements must be in ${current.currency}`)
  }

  const id = input.id ?? randomUUID()
  const existing = input.id
    ? (database.prepare('SELECT created_at FROM asset_movements WHERE id = ?').get(input.id) as
        | { created_at: string }
        | undefined)
    : undefined

  const createdAt = existing?.created_at ?? new Date().toISOString()
  database
    .prepare(
      `INSERT INTO asset_movements
       (id, asset_id, date, kind, amount_minor, currency, estimated, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         date = excluded.date,
         kind = excluded.kind,
         amount_minor = excluded.amount_minor,
         currency = excluded.currency,
         estimated = 0,
         note = excluded.note`
    )
    .run(
      id,
      input.assetId,
      input.date,
      input.kind,
      input.amount,
      input.currency,
      input.note ?? null,
      createdAt
    )

  syncAssetFromMovements(database, input.assetId)
  const row = database.prepare('SELECT * FROM asset_movements WHERE id = ?').get(id) as MovementRow
  return rowToMovement(row)
}

export function deleteMovement(id: string): { ok: true } {
  const database = getDb()
  const row = database.prepare('SELECT asset_id FROM asset_movements WHERE id = ?').get(id) as
    | { asset_id: string }
    | undefined
  if (!row) throw new Error('Movement not found')
  database.prepare('DELETE FROM asset_movements WHERE id = ?').run(id)
  syncAssetFromMovements(database, row.asset_id)
  // If ledger emptied, leave amount at last synced 0 from sync (n===0 no-op). Force 0 when empty:
  const n = (
    database
      .prepare('SELECT COUNT(*) AS n FROM asset_movements WHERE asset_id = ?')
      .get(row.asset_id) as { n: number }
  ).n
  if (n === 0) {
    database
      .prepare('UPDATE assets SET amount_minor = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), row.asset_id)
  }
  return { ok: true }
}
