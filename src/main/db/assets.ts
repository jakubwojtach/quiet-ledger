import { randomUUID } from 'crypto'
import type { Asset, AssetClass } from '@shared/types'
import type { UpsertAssetParsed } from '@shared/ipc'
import { getDb, getAssetById } from './index'
import { markCatalogAssetDismissed } from './ensureRealData'

export function upsertAsset(input: UpsertAssetParsed): Asset {
  const id = input.id ?? randomUUID()
  const now = new Date().toISOString()
  const existing = input.id ? getAssetById(input.id) : null
  const createdAt = existing?.createdAt ?? now

  const row = {
    id,
    class: input.class as AssetClass,
    name: input.name,
    notes: input.notes ?? null,
    ticker: null as string | null,
    quantity_scaled: null as number | null,
    cost_basis_minor: null as number | null,
    cost_currency: null as string | null,
    nominal_minor: null as number | null,
    unit_value_minor: null as number | null,
    units_scaled: null as number | null,
    unit_price_minor: null as number | null,
    amount_minor: null as number | null,
    currency: null as string | null,
    valued_on: null as string | null,
    value_source: null as string | null,
    account: input.account ?? null,
    created_at: createdAt,
    updated_at: now
  }

  switch (input.class) {
    case 'etf':
      row.ticker = input.ticker
      row.quantity_scaled = input.quantity
      row.cost_basis_minor = input.costBasis
      row.cost_currency = input.costCurrency
      row.currency = input.costCurrency
      break
    case 'bond':
      row.nominal_minor = input.nominal
      row.unit_value_minor = input.unitValue
      row.currency = input.currency
      row.amount_minor = input.statementValue
      row.valued_on = input.valuedOn ?? null
      break
    case 'retirement':
      row.units_scaled = input.units
      row.unit_price_minor = input.unitPrice
      row.currency = input.currency
      row.ticker = input.fundCode?.trim().toUpperCase() || null
      row.cost_basis_minor = input.costBasis
      row.cost_currency = input.costBasis == null ? null : input.currency
      break
    case 'savings_usd':
    case 'savings_pln':
      row.amount_minor = input.amount
      row.currency = input.currency
      break
    case 'apartment':
    case 'land':
    case 'car':
      row.amount_minor = input.value
      row.currency = input.currency
      row.valued_on = input.valuedOn
      row.cost_basis_minor = input.costBasis
      row.cost_currency = input.costBasis == null ? null : input.currency
      row.value_source = input.valueSource
      break
    default: {
      const _e: never = input
      throw new Error(`Unhandled class: ${JSON.stringify(_e)}`)
    }
  }

  getDb()
    .prepare(
      `INSERT INTO assets (
        id, class, name, notes,
        ticker, quantity_scaled, cost_basis_minor, cost_currency,
        nominal_minor, unit_value_minor, units_scaled, unit_price_minor,
        amount_minor, currency, valued_on, value_source, account, created_at, updated_at
      ) VALUES (
        @id, @class, @name, @notes,
        @ticker, @quantity_scaled, @cost_basis_minor, @cost_currency,
        @nominal_minor, @unit_value_minor, @units_scaled, @unit_price_minor,
        @amount_minor, @currency, @valued_on, @value_source, @account, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        class = excluded.class,
        name = excluded.name,
        notes = excluded.notes,
        ticker = excluded.ticker,
        quantity_scaled = excluded.quantity_scaled,
        cost_basis_minor = excluded.cost_basis_minor,
        cost_currency = excluded.cost_currency,
        nominal_minor = excluded.nominal_minor,
        unit_value_minor = excluded.unit_value_minor,
        units_scaled = excluded.units_scaled,
        unit_price_minor = excluded.unit_price_minor,
        amount_minor = excluded.amount_minor,
        currency = excluded.currency,
        valued_on = excluded.valued_on,
        value_source = excluded.value_source,
        account = excluded.account,
        updated_at = excluded.updated_at`
    )
    .run(row)

  const asset = getAssetById(id)
  if (!asset) throw new Error('Failed to upsert asset')
  return asset
}

export function deleteAsset(id: string): { ok: true } {
  const database = getDb()
  markCatalogAssetDismissed(database, id)
  database.prepare('DELETE FROM assets WHERE id = ?').run(id)
  return { ok: true }
}
