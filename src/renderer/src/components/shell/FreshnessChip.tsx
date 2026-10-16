import type { JSX } from 'react'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive, usePrivacy } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

function ageMs(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return Date.now() - then
}

function relativeLabel(ms: number, localeTag: string): string {
  const mins = Math.round(ms / 60_000)
  const pl = localeTag.startsWith('pl')
  if (mins < 1) return pl ? 'teraz' : 'just now'
  if (mins < 60) return pl ? `${mins} min` : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return pl ? `${hours} godz.` : `${hours}h ago`
  const days = Math.round(hours / 24)
  return pl ? `${days} dn.` : `${days}d ago`
}

/**
 * Dot + “Snapshot · …”.
 * Label is snapshot age (`asOf`). “Stale” only when the snapshot itself is ≥30d old.
 * `stale` (fx/price approx) only affects color + tooltip — refresh updates `asOf`, so the
 * chip must not keep saying “Stale” just because one quote still fell back to cache.
 */
export function FreshnessChip({
  asOf,
  stale,
  className
}: {
  asOf?: string | null
  /** True when some FX/price used last-known values — warn styling, not the “Stale” label. */
  stale?: boolean
  className?: string
}): JSX.Element | null {
  const { t, localeTag } = useLocale()
  const privacy = usePrivacy()
  if (!asOf) return null

  const ms = ageMs(asOf)
  const day = 24 * 60 * 60 * 1000
  const fresh = ms < day
  const snapshotAncient = ms >= 30 * day
  const warn = snapshotAncient || Boolean(stale)
  const ageLabel = snapshotAncient ? t('freshness.stale') : relativeLabel(ms, localeTag)
  const tip = privacy
    ? undefined
    : [
        new Date(asOf).toLocaleString(localeTag),
        stale && !snapshotAncient ? t('freshness.staleHint') : null
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <div
      className={cn(!privacy && 'tooltip tooltip-bottom before:text-xs', className)}
      data-tip={tip}
    >
      <span
        data-testid="freshness-chip"
        className={cn(
          'inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-[12px] leading-4 font-medium',
          warn
            ? 'bg-[var(--warn-subtle)] text-[var(--warn)]'
            : 'bg-[var(--surface-2)] text-[var(--ink-2)]'
        )}
      >
        <span
          className={cn(
            'inline-block size-1.5 rounded-full',
            fresh && !warn ? 'bg-[var(--gain)]' : 'bg-[var(--warn)]'
          )}
          aria-hidden
        />
        {privacy ? (
          <>
            {t('freshness.snapshot')} ·{' '}
            <Sensitive placeholder={MASK.dateShort}>{ageLabel}</Sensitive>
          </>
        ) : (
          `${t('freshness.snapshot')} · ${ageLabel}`
        )}
      </span>
    </div>
  )
}
