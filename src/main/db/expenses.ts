import { randomUUID } from 'crypto'
import type { ExpenseCategory, ExpenseEntry, ExpenseStatus } from '@shared/types'
import { getDb } from './index'

type ExpenseRow = {
  id: string
  category_id: string
  category_name: string
  date: string
  amount_minor: number
  currency: string
  note: string | null
  liability_id: string | null
  status: string
  due_date: string | null
  created_at: string
}

function mapExpense(r: ExpenseRow): ExpenseEntry {
  const status: ExpenseStatus = r.status === 'due' ? 'due' : 'paid'
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name,
    date: r.date,
    amountMinor: r.amount_minor,
    currency: r.currency,
    note: r.note,
    liabilityId: r.liability_id,
    status,
    dueDate: r.due_date,
    createdAt: r.created_at
  }
}

const EXPENSE_SELECT = `SELECT e.id, e.category_id, c.name AS category_name, e.date, e.amount_minor,
              e.currency, e.note, e.liability_id,
              COALESCE(e.status, 'paid') AS status, e.due_date, e.created_at
       FROM expense_entries e
       JOIN expense_categories c ON c.id = e.category_id`

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
      `${EXPENSE_SELECT}
       WHERE substr(e.date, 1, 7) = ?
       ORDER BY
         CASE COALESCE(e.status, 'paid') WHEN 'due' THEN 0 ELSE 1 END,
         COALESCE(e.due_date, e.date) ASC,
         e.created_at DESC`
    )
    .all(month) as ExpenseRow[]

  return rows.map(mapExpense)
}

export function createExpenseEntry(input: {
  categoryId: string
  date: string
  amountMinor: number
  currency: string
  note?: string | null
  liabilityId?: string | null
  status?: ExpenseStatus
  dueDate?: string | null
}): ExpenseEntry {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const status: ExpenseStatus = input.status === 'due' ? 'due' : 'paid'
  getDb()
    .prepare(
      `INSERT INTO expense_entries (
        id, category_id, date, amount_minor, currency, note, liability_id,
        status, due_date, created_at
      ) VALUES (
        @id, @categoryId, @date, @amountMinor, @currency, @note, @liabilityId,
        @status, @dueDate, @createdAt
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
      status,
      dueDate: input.dueDate ?? null,
      createdAt
    })

  return getExpenseById(id)
}

function getExpenseById(id: string): ExpenseEntry {
  const row = getDb()
    .prepare(`${EXPENSE_SELECT} WHERE e.id = ?`)
    .get(id) as ExpenseRow | undefined

  if (!row) throw new Error(`Expense not found: ${id}`)
  return mapExpense(row)
}

export function updateExpenseEntry(
  id: string,
  input: {
    categoryId: string
    date: string
    amountMinor: number
    currency: string
    note?: string | null
    liabilityId?: string | null
    status?: ExpenseStatus
    dueDate?: string | null
  }
): ExpenseEntry {
  const status: ExpenseStatus = input.status === 'due' ? 'due' : 'paid'
  const result = getDb()
    .prepare(
      `UPDATE expense_entries SET
        category_id = @categoryId,
        date = @date,
        amount_minor = @amountMinor,
        currency = @currency,
        note = @note,
        liability_id = @liabilityId,
        status = @status,
        due_date = @dueDate
      WHERE id = @id`
    )
    .run({
      id,
      categoryId: input.categoryId,
      date: input.date,
      amountMinor: input.amountMinor,
      currency: input.currency,
      note: input.note ?? null,
      liabilityId: input.liabilityId ?? null,
      status,
      dueDate: input.dueDate ?? null
    })

  if (result.changes === 0) throw new Error(`Expense not found: ${id}`)
  return getExpenseById(id)
}

export function deleteExpenseEntry(id: string): { ok: true } {
  getDb().prepare('DELETE FROM expense_entries WHERE id = ?').run(id)
  return { ok: true }
}
