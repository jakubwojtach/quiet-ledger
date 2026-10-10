/** Forest-ledger palette for charts — no neon / purple defaults. */
export const CHART_COLORS = [
  '#1f4d38',
  '#2f6b4f',
  '#6b8f78',
  '#a8c4b0',
  '#c45c26',
  '#b87333',
  '#3d5248',
  '#0f2e22'
] as const

export const CHART_GRID = 'rgba(197, 209, 200, 0.55)'
export const CHART_AXIS = '#3d5248'
export const CHART_INCOME = '#2f6b4f'
export const CHART_EXPENSE = '#c45c26'
export const CHART_LOAN = '#6b8f78'
export const CHART_NET = '#1f4d38'

export function formatPlnCompact(minor: number): string {
  const major = minor / 100
  const abs = Math.abs(major)
  const sign = major < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)}k`
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`
  return `${sign}${Math.round(abs)}`
}
