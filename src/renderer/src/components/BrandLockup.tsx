import type { JSX, ReactNode } from 'react'
import { BrandMark } from '@renderer/components/BrandMark'
import { useLocale } from '@renderer/lib/i18n/locale'
import { cn } from '@renderer/lib/utils'

/** Product wordmark in the splash typeface — rail, settings, onboarding. */
export function BrandLockup({
  className,
  compact = false,
  subtitle
}: {
  className?: string
  /** Monogram only (collapsed rail). */
  compact?: boolean
  subtitle?: ReactNode
}): JSX.Element {
  const { t } = useLocale()
  if (compact) {
    return <BrandMark title={t('app.name')} />
  }
  return (
    <div className={cn('min-w-0', className)}>
      <div className="font-display truncate text-[20px] leading-6 font-semibold tracking-[-0.03em] text-[var(--ink)]">
        {t('app.name')}
      </div>
      {subtitle ? (
        <div className="mt-0.5 truncate text-[11px] leading-4 text-[var(--ink-3)]">{subtitle}</div>
      ) : null}
    </div>
  )
}
