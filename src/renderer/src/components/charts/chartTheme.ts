/** Chart colors from CSS variables so light/dark stay in sync. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function chartColors(): string[] {
  return [
    cssVar('--chart-1', '#1a3d30'),
    cssVar('--chart-2', '#2a5c46'),
    cssVar('--chart-3', '#6b8f78'),
    cssVar('--chart-4', '#b8923a'),
    cssVar('--chart-5', '#c45c26'),
    cssVar('--chart-6', '#5a675f')
  ]
}

export function chartGrid(): string {
  return cssVar('--chart-grid', 'rgba(210, 204, 188, 0.7)')
}

export function chartAxis(): string {
  return cssVar('--chart-axis', '#5a675f')
}

export function chartIncome(): string {
  return cssVar('--accent', '#6DB0F4')
}

export function chartExpense(): string {
  return cssVar('--cat-5', '#81878D')
}

export function chartNet(): string {
  return cssVar('--accent', '#6DB0F4')
}

/** @deprecated use chartColors() */
export const CHART_COLORS = [
  '#1a3d30',
  '#2a5c46',
  '#6b8f78',
  '#b8923a',
  '#c45c26',
  '#5a675f'
] as const

export const CHART_GRID = 'rgba(210, 204, 188, 0.7)'
export const CHART_AXIS = '#5a675f'
export const CHART_INCOME = '#2a5c46'
export const CHART_EXPENSE = '#c45c26'
export const CHART_LOAN = '#6b8f78'
export const CHART_NET = '#1a3d30'

export function formatPlnCompact(minor: number, locale = 'pl-PL'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(minor / 100)
}

export function chartTokens(): {
  accent: string
  gain: string
  loss: string
  grid: string
  axis: string
  cat: string[]
} {
  return {
    accent: cssVar('--accent', '#6DB0F4'),
    gain: cssVar('--gain', '#62D286'),
    loss: cssVar('--loss', '#F2716A'),
    grid: cssVar('--line', 'rgba(255,255,255,0.08)'),
    axis: cssVar('--ink-3', '#767B81'),
    cat: [
      cssVar('--cat-1', '#6DB0F4'),
      cssVar('--cat-2', '#50BFBE'),
      cssVar('--cat-3', '#B093E5'),
      cssVar('--cat-4', '#EBB25F'),
      cssVar('--cat-5', '#81878D')
    ]
  }
}
