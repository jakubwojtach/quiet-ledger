import type { JSX } from 'react'
import type { ValuedAsset } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

const CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-4)', 'var(--cat-5)'] as const

export function CompositionBar({
  assets,
  totalMinor
}: {
  assets: ValuedAsset[]
  totalMinor: number
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const sorted = [...assets].sort((a, b) => b.plnValueMinor - a.plnValueMinor)
  const top = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const restMinor = rest.reduce((s, a) => s + a.plnValueMinor, 0)

  const slices: { key: string; label: string; minor: number; color: string }[] = top.map(
    (a, i) => ({
      key: a.asset.id,
      label: a.asset.name,
      minor: a.plnValueMinor,
      color: CAT[i] ?? CAT[3]
    })
  )
  if (rest.length > 0) {
    slices.push({
      key: 'rest',
      label: t('composition.more', { count: rest.length }),
      minor: restMinor,
      color: CAT[3]
    })
  }

  const denom = totalMinor > 0 ? totalMinor : 1

  return (
    <section className="surface-card p-3.5 px-4 pb-4" data-testid="composition-bar">
      <h2 className="text-[13px] leading-5 font-semibold">{t('composition.title')}</h2>
      <div className="mt-3.5 mb-3.5 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
        {slices.map((s) => (
          <i
            key={s.key}
            className="block h-full"
            style={{
              width: `${(s.minor / denom) * 100}%`,
              background: s.color
            }}
          />
        ))}
      </div>
      <div className="flex flex-col">
        {slices.map((s) => {
          const pct = (s.minor / denom) * 100
          const pctLabel = `${pct.toLocaleString(localeTag, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })} %`
          return (
            <div key={s.key} className="flex h-7 items-center gap-2 text-[13px]">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ background: s.color }}
                aria-hidden
              />
              <Sensitive
                placeholder={MASK.nameShort}
                className="min-w-0 truncate"
              >
                {s.label}
              </Sensitive>
              <Sensitive
                placeholder={MASK.percent}
                className={cn('num ml-auto w-[52px] text-right text-[var(--ink-3)]')}
              >
                {pctLabel}
              </Sensitive>
            </div>
          )
        })}
      </div>
    </section>
  )
}
