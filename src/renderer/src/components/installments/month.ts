/** YYYY-MM for the current calendar month. */
export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayInMonth(month: string): string {
  const today = new Date().toISOString().slice(0, 10)
  if (today.startsWith(month)) return today
  return `${month}-01`
}

/** Preferred order for sheet-style expense groups. */
export const EXPENSE_GROUP_ORDER = ['Opłaty', 'Abonamenty', 'Wydatki'] as const
