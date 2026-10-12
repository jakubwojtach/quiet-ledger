import type { JSX } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonth, shiftMonth } from '@renderer/components/installments/month'
import { useLocale } from '@renderer/lib/i18n/locale'
import { cn } from '@renderer/lib/utils'

export function MonthStepper({
  month,
  onChange,
  className
}: {
  month: string
  onChange: (month: string) => void
  className?: string
}): JSX.Element {
  const { localeTag } = useLocale()
  const [y, m] = month.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString(localeTag, {
    month: 'long',
    year: 'numeric'
  })
  const next = shiftMonth(month, 1)
  const prev = shiftMonth(month, -1)
  const nextDisabled = next > currentMonth()

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      data-testid="month-stepper"
    >
      <button
        type="button"
        aria-label="Previous month"
        data-testid="month-prev"
        className="inline-flex size-7 items-center justify-center rounded-md text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
        onClick={() => onChange(prev)}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>
      <b className="w-32 text-center text-[13px] leading-5 font-semibold capitalize">{label}</b>
      <button
        type="button"
        aria-label="Next month"
        data-testid="month-next"
        disabled={nextDisabled}
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-md text-[var(--ink-2)] hover:bg-[var(--surface-2)]',
          nextDisabled && 'cursor-not-allowed opacity-60 hover:bg-transparent'
        )}
        onClick={() => !nextDisabled && onChange(next)}
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
