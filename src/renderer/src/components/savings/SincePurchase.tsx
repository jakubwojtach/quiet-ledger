import type { JSX } from 'react'
import type { ValuedAsset } from '@shared/types'
import { formatGainPercent } from '@shared/money'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

export function SincePurchase({ assets }: { assets: ValuedAsset[] }): JSX.Element {
  const { t, localeTag } = useLocale()
  const withCost = assets
    .filter((a) => a.costBasisPlnMinor != null && a.costBasisPlnMinor > 0 && a.gainPlnMinor != null)
    .sort((a, b) => Math.abs(b.gainPlnMinor ?? 0) - Math.abs(a.gainPlnMinor ?? 0))

  return (
    <section className="surface-card p-3.5 px-4 pb-4" data-testid="since-purchase">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">{t('sincePurchase.title')}</h2>
        <span className="flex-1" />
        <Sensitive placeholder={MASK.count} className="text-[12px] text-[var(--ink-3)]">
          {t('sincePurchase.count', { count: withCost.length })}
        </Sensitive>
      </div>

      {withCost.length === 0 ? (
        <p className="mt-3 text-[12px] text-[var(--ink-3)]">{t('sincePurchase.empty')}</p>
      ) : (
        withCost.slice(0, 6).map((a) => {
          const cost = a.costBasisPlnMinor!
          const worth = a.plnValueMinor
          const total = Math.max(cost, worth)
          const costPct = (cost / total) * 100
          const gain = a.gainPlnMinor ?? 0
          const positive = gain >= 0
          return (
            <div
              key={a.asset.id}
              className="mt-1.5 grid grid-cols-1 gap-y-0.5 border-t border-[var(--line)] py-2.5 first:mt-1.5 first:border-t-0 min-[400px]:grid-cols-[1fr_auto] min-[400px]:gap-x-3"
            >
              <Sensitive
                placeholder={MASK.nameShort}
                className="truncate text-[13px] font-medium"
              >
                {a.asset.name}
              </Sensitive>
              <span className={cn('num text-[13px]', positive ? 'text-gain' : 'text-loss')}>
                {positive ? '+' : ''}
                <MoneyAmount amountMinor={Math.abs(gain)} showCurrency={false} />
              </span>
              <span className="num flex flex-wrap items-baseline gap-1 text-[12px] text-[var(--ink-3)]">
                <MoneyAmount amountMinor={cost} showCurrency={false} className="!text-[12px]" />
                <span>→</span>
                <MoneyAmount amountMinor={worth} showCurrency={false} className="!text-[12px]" />
              </span>
              <Sensitive
                placeholder={MASK.percent}
                className={cn(
                  'num text-right text-[12px]',
                  positive ? 'text-gain' : 'text-loss'
                )}
              >
                {a.gainPercent != null ? formatGainPercent(a.gainPercent, localeTag) : '—'}
              </Sensitive>
              <div className="relative col-span-2 mt-2 h-1.5 rounded-sm bg-[var(--surface-3)]">
                <i
                  className="absolute inset-y-0 left-0 rounded-sm bg-[var(--cat-5)]"
                  style={{ width: `${costPct}%` }}
                />
                {positive ? (
                  <em
                    className="absolute inset-y-0 rounded-sm bg-[var(--gain)] not-italic"
                    style={{ left: `${costPct}%`, right: 0 }}
                  />
                ) : null}
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}
