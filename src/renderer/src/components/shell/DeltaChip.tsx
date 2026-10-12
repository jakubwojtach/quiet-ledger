import type { JSX } from 'react'
import { formatGainPercent } from '@shared/money'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

/** Compact up/down % chip using success/error tokens. */
export function DeltaChip({
  percent,
  className
}: {
  percent: number | null | undefined
  className?: string
}): JSX.Element | null {
  const { localeTag } = useLocale()
  if (percent == null || Number.isNaN(percent)) return null

  const up = percent > 0
  const flat = percent === 0

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        flat && 'bg-base-200 text-ink-muted',
        up && 'bg-success/15 text-success',
        !up && !flat && 'bg-error/15 text-error',
        className
      )}
    >
      <Sensitive placeholder={MASK.percent}>{formatGainPercent(percent, localeTag)}</Sensitive>
    </span>
  )
}
