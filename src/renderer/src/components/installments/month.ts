/** YYYY-MM for the current calendar month. */
export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Shift a YYYY-MM by `delta` calendar months. */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function compareMonth(a: string, b: string): number {
  return a.localeCompare(b)
}

export function todayInMonth(month: string): string {
  const today = new Date().toISOString().slice(0, 10)
  if (today.startsWith(month)) return today
  return `${month}-01`
}

/** Preferred order for sheet-style expense groups. */
export const EXPENSE_GROUP_ORDER = ['Opłaty', 'Abonamenty', 'Wydatki'] as const

/** Categories that typically roll month-to-month (not one-off Wydatki). */
export const RECURRING_EXPENSE_CATEGORIES = ['Opłaty', 'Abonamenty'] as const

/** Shift a YYYY-MM-DD by calendar months, clamping the day into the target month. */
export function shiftDateByMonths(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1 + delta, 1))
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
  ).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
