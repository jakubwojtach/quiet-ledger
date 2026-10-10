import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { currentMonth } from './month'

/** Shared month for all Installments subroutes (`?month=YYYY-MM`). */
export function useMonthParam(): [string, (month: string) => void] {
  const [params, setParams] = useSearchParams()
  const month = useMemo(() => {
    const raw = params.get('month')
    if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
    return currentMonth()
  }, [params])

  const setMonth = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('month', next)
          return p
        },
        { replace: true }
      )
    },
    [setParams]
  )

  return [month, setMonth]
}

export function withMonth(path: string, month: string): string {
  return `${path}?month=${encodeURIComponent(month)}`
}
