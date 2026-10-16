/** Calendar-day delta from today to YYYY-MM-DD (negative = overdue). */
export function daysUntil(isoDate: string): number {
  const today = new Date()
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d)
  return Math.round((target - start) / 86_400_000)
}

/** Quiet urgency color for due / expected dates. */
export function dueDateClass(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days < 3) return 'text-[var(--loss)]'
  if (days < 14) return 'text-[var(--warn)]'
  return 'text-[var(--ink-3)]'
}
