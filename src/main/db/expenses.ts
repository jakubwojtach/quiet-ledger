import { randomUUID } from 'crypto'
import type { ExpenseCategory, ExpenseEntry } from '@shared/types'
import { getDb } from './index'

export function listExpenseCategories(): ExpenseCategory[] {
  const rows = getDb()
    .prepare('SELECT id, name, sort_order FROM expense_categories ORDER BY sort_order, name')
    .all() as Array<{ id: string; name: string; sort_order: number }>
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order
  }))
}

export function listExpensesForMonth(month: string): ExpenseEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT e.id, e.category_id, c.name AS category_name, e.date, e.amount_minor,
              e.currency, e.note, e.liability_id, e.created_at
       FROM expense_entries e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE substr(e.date, 1, 7) = ?
       ORDER BY e.date DESC, e.created_at DESC`
    )
    .all(month) as Array<{
    id: string
    category_id: string
    category_name: string
    date: string
    amount_minor: number
    currency: string
    note: string | null
    liability_id: string | null
    created_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name,
    date: r.date,
    amountMinor: r.amount_minor,
    currency: r.currency,
    note: r.note,
    liabilityId: r.liability_id,
    createdAt: r.created_at
  }))
}

export function createExpenseEntry(input: {
  categoryId: string
  date: string
  amountMinor: number
  currency: string
  note?: string | null
  liabilityId?: string | null
}): ExpenseEntry {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO expense_entries (
        id, category_id, date, amount_minor, currency, note, liability_id, created_at
      ) VALUES (
        @id, @categoryId, @date, @amountMinor, @currency, @note, @liabilityId, @createdAt
      )`
    )
    .run({
      id,
      categoryId: input.categoryId,
      date: input.date,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note ?? null,
      liabilityId: input.liabilityId ?? null,
      createdAt
    })

  const row = getDb()
    .prepare(
      `SELECT e.id, e.category_id, c.name AS category_name, e.date, e.amount_minor,
              e.currency, e.note, e.liability_id, e.created_at
       FROM expense_entries e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE e.id = ?`
    )
    .get(id) as {
    id: string
    category_id: string
    category_name: string
    date: string
    amount_minor: number
    currency: string
    note: string | null
    liability_id: string | null
    created_at: string
  }

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    date: row.date,
    amountMinor: row.amount_minor,
    currency: row.currency,
    note: row.note,
    liabilityId: row.liability_id,
    createdAt: row.created_at
  }
}
