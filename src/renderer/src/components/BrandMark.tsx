import type { JSX } from 'react'
import { cn } from '@renderer/lib/utils'

/** Compact wordmark for tight spots (collapsed rail) — same type as the splash. */
export function BrandMark({
  className,
  title = 'Quiet Ledger'
}: {
  className?: string
  title?: string
}): JSX.Element {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn(
        'font-display shrink-0 text-[18px] leading-none font-semibold tracking-[-0.03em] text-[var(--ink)]',
        className
      )}
    >
      QL
    </span>
  )
}
