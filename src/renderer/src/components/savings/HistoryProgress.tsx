import type { JSX } from 'react'
import type { NetWorthHistoryPoint } from '@shared/types'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

const TARGET = 7

function addDays(isoDay: string, n: number): string {
  const d = new Date(`${isoDay}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatShort(day: string, localeTag: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(localeTag, {
    day: 'numeric',
    month: 'short'
  })
}

/** Shown when there are fewer than 7 daily snapshots — no fake trend line. */
export function HistoryProgress({
  points,
  periodPoints,
  periodLabel
}: {
  /** Full history — drives the 7-slot unlock track. */
  points: NetWorthHistoryPoint[]
  /** Snapshots inside the selected period — highlighted on the track. */
  periodPoints?: NetWorthHistoryPoint[]
  periodLabel?: string
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day))
  const byDay = new Map(sorted.map((p) => [p.day, p]))
  const inPeriod = new Set((periodPoints ?? points).map((p) => p.day))
  const start = sorted[0]?.day ?? new Date().toISOString().slice(0, 10)
  const slots = Array.from({ length: TARGET }, (_, i) => {
    const day = addDays(start, i)
    const point = byDay.get(day) ?? null
    return { day, point, index: i }
  })
  const filled = sorted.length
  const remaining = Math.max(0, TARGET - filled)
  const periodCount = periodPoints?.length ?? filled

  return (
    <section className="surface-card p-3.5 px-4 pb-4" data-testid="history-progress">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">{t('dashboard.trend')}</h2>
        <span className="inline-flex h-[22px] items-center rounded-md bg-[var(--surface-2)] px-2 text-[12px] font-medium text-[var(--ink-2)]">
          <Sensitive placeholder={`${MASK.count} / ${MASK.count}`}>
            {t('history.progress', { filled, total: TARGET })}
          </Sensitive>
        </span>
        {periodLabel ? (
          <span
            className="inline-flex h-[22px] items-center rounded-md bg-[var(--accent-subtle)] px-2 text-[12px] font-medium text-[var(--accent)]"
            data-testid="history-period-chip"
          >
            {periodLabel} · <Sensitive placeholder={MASK.count}>{periodCount}</Sensitive>
          </span>
        ) : null}
        <span className="flex-1" />
        <Sensitive placeholder={MASK.nameShort} className="text-[12px] text-[var(--ink-3)]">
          {t('history.unlocks', { remaining, total: TARGET })}
        </Sensitive>
      </div>

      <div className="relative mt-4 grid grid-cols-7 gap-0">
        <div
          className="pointer-events-none absolute top-1 right-[calc(100%/7-4px)] left-1 border-t border-dashed border-[var(--line-strong)]"
          aria-hidden
        />
        {slots.map((slot) => {
          const filledDot = Boolean(slot.point)
          const highlighted = filledDot && inPeriod.has(slot.day)
          const dimmed = filledDot && !highlighted
          const isFirst = slot.index === 0 && filledDot
          const isLastSlot = slot.index === TARGET - 1
          return (
            <div key={slot.day} className="relative flex flex-col gap-0.5 text-[12px] leading-4">
              <i
                className={cn(
                  'mb-2 inline-block size-2.5 rounded-full border-[1.5px]',
                  highlighted &&
                    'border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-subtle)]',
                  dimmed && 'border-[var(--ink-3)] bg-[var(--ink-3)] opacity-35',
                  !filledDot && 'border-[var(--line-strong)] bg-[var(--surface-1)]'
                )}
              />
              <Sensitive
                placeholder={MASK.dateShort}
                className={cn('text-[var(--ink-3)]', dimmed && 'opacity-40')}
              >
                {formatShort(slot.day, localeTag)}
              </Sensitive>
              {isFirst ? (
                <span className={cn('text-[var(--ink-2)]', dimmed && 'opacity-40')}>
                  {t('history.firstSnapshot')}
                </span>
              ) : filledDot && slot.point ? (
                <span className={cn(dimmed && 'opacity-40')}>
                  <MoneyAmount
                    amountMinor={slot.point.netWorthPlnMinor}
                    showCurrency={false}
                    className="!text-[12px]"
                  />
                </span>
              ) : isLastSlot ? (
                <span className="text-[var(--ink-3)]">{t('history.trendUnlocks')}</span>
              ) : (
                <span className="text-[var(--ink-3)]">&nbsp;</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
