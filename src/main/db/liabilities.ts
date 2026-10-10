import { randomUUID } from 'crypto'
import type { Liability } from '@shared/types'
import { getDb } from './index'

type LiabilityRow = {
  id: string
  name: string
  provider: string | null
  principal_minor: number
  monthly_payment_minor: number
  currency: string
  next_due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToLiability(row: LiabilityRow): Liability {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    principalMinor: row.principal_minor,
    monthlyPaymentMinor: row.monthly_payment_minor,
    currency: row.currency,
    nextDueDate: row.next_due_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listLiabilities(): Liability[] {
  const rows = getDb()
    .prepare('SELECT * FROM liabilities ORDER BY name')
    .all() as LiabilityRow[]
  return rows.map(rowToLiability)
}

export function getLiabilityById(id: string): Liability | null {
  const row = getDb().prepare('SELECT * FROM liabilities WHERE id = ?').get(id) as
    | LiabilityRow
    | undefined
  return row ? rowToLiability(row) : null
}

export function upsertLiability(input: {
  id?: string
  name: string
  provider?: string | null
  principalMinor: number
  monthlyPaymentMinor: number
  currency: string
  nextDueDate?: string | null
  notes?: string | null
}): Liability {
  const id = input.id ?? randomUUID()
  const now = new Date().toISOString()
  const existing = input.id ? getLiabilityById(input.id) : null
  const createdAt = existing?.createdAt ?? now

  getDb()
    .prepare(
      `INSERT INTO liabilities (
        id, name, provider, principal_minor, monthly_payment_minor, currency,
        next_due_date, notes, created_at, updated_at
      ) VALUES (
        @id, @name, @provider, @principalMinor, @monthlyPaymentMinor, @currency,
        @nextDueDate, @notes, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        provider = excluded.provider,
        principal_minor = excluded.principal_minor,
        monthly_payment_minor = excluded.monthly_payment_minor,
        currency = excluded.currency,
        next_due_date = excluded.next_due_date,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    )
    .run({
      id,
      name: input.name,
      provider: input.provider ?? null,
      principalMinor: input.principalMinor,
      monthlyPaymentMinor: input.monthlyPaymentMinor,
      currency: input.currency,
      nextDueDate: input.nextDueDate ?? null,
      notes: input.notes ?? null,
      createdAt,
      updatedAt: now
    })
  return getLiabilityById(id)!
}

/** @deprecated use upsertLiability */
export const createLiability = upsertLiability

export function deleteLiability(id: string): { ok: true } {
  getDb().prepare('DELETE FROM liabilities WHERE id = ?').run(id)
  return { ok: true }
}
