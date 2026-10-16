import { randomUUID } from 'crypto'
import type { ExpenseCategory, ExpenseEntry, ExpenseStatus } from '@shared/types'
import { getDb } from './index'

/** Shift a YYYY-MM-DD by calendar months, clamping the day into the target month. */
function shiftDateByMonths(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1 + delta, 1))
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
  ).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthDelta(fromMonth: string, toMonth: string): number {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

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

export type CopyExpensesResult = {
  copied: number
  skipped: number
  toMonth: string
}

/**
 * Copy expenses from one month into another (same note/amount/category).
 * Land as `due` with dates shifted; skip rows that already exist in the target month.
 */
export function copyExpensesToMonth(input: {
  fromMonth: string
  toMonth: string
  /** When set, only these expense ids. */
  expenseIds?: string[]
  /** When set (and ids omitted), only these category names. */
  categoryNames?: string[]
}): CopyExpensesResult {
  if (input.fromMonth === input.toMonth) {
    throw new Error('Source and target month must differ')
  }
  const delta = monthDelta(input.fromMonth, input.toMonth)
  if (delta === 0) throw new Error('Source and target month must differ')

  const idSet =
    input.expenseIds && input.expenseIds.length > 0 ? new Set(input.expenseIds) : null
  const source = listExpensesForMonth(input.fromMonth).filter((e) => {
    if (idSet) return idSet.has(e.id)
    if (!input.categoryNames || input.categoryNames.length === 0) return true
    return input.categoryNames.includes(e.categoryName)
  })
  const existing = listExpensesForMonth(input.toMonth)
  const existingKeys = new Set(
    existing.map(
      (e) => `${e.categoryId}\0${e.note ?? ''}\0${e.amountMinor}\0${e.currency}`
    )
  )

  let copied = 0
  let skipped = 0
  for (const e of source) {
    const key = `${e.categoryId}\0${e.note ?? ''}\0${e.amountMinor}\0${e.currency}`
    if (existingKeys.has(key)) {
      skipped += 1
      continue
    }
    const date = shiftDateByMonths(e.date, delta)
    const dueDate = shiftDateByMonths(e.dueDate ?? e.date, delta)
    createExpenseEntry({
      categoryId: e.categoryId,
      date,
      amountMinor: e.amountMinor,
      currency: e.currency,
      note: e.note,
      liabilityId: e.liabilityId,
      status: 'due',
      dueDate
    })
    existingKeys.add(key)
    copied += 1
  }

  return { copied, skipped, toMonth: input.toMonth }
}
