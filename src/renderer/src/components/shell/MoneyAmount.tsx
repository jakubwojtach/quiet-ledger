import type { JSX } from 'react'
import NumberFlow from '@number-flow/react'
import { type CurrencyCode } from '@shared/money'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, usePrivacy } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

const NBSP = '\u202F'

function splitFormatted(amountMinor: number, localeTag: string): {
  int: string
  dec: string
  value: number
} {
  const value = amountMinor / 100
  const parts = new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).formatToParts(value)

  let int = ''
  let dec = ''
  for (const p of parts) {
    if (p.type === 'integer' || p.type === 'group') {
      int += p.type === 'group' ? NBSP : p.value
    } else if (p.type === 'decimal' || p.type === 'fraction') {
      dec += p.value
    } else if (p.type === 'minusSign') {
      int = p.value + int
    }
  }
  return { int, dec, value }
}

const SIZE: Record<
  'hero' | 'detail' | 'kpi' | 'body',
  { wrap: string; cur: string; animate: boolean; mask: string }
> = {
  hero: {
    wrap: 'text-[48px] leading-[52px] font-medium tracking-[-0.035em] min-[1360px]:text-[56px] min-[1360px]:leading-[60px]',
    cur: 'text-[50%] tracking-[-0.02em]',
    animate: true,
    mask: MASK.moneyHero
  },
  detail: {
    wrap: 'text-[40px] leading-[44px] font-medium tracking-[-0.03em]',
    cur: 'text-[50%]',
    animate: false,
    mask: MASK.moneyHero
  },
  kpi: {
    wrap: 'text-[22px] leading-7 font-medium tracking-[-0.02em]',
    cur: 'text-[50%]',
    animate: true,
    mask: MASK.money
  },
  body: {
    wrap: 'text-[13px] leading-5 font-medium tracking-[-0.005em]',
    cur: 'text-[0.75em]',
    animate: false,
    mask: MASK.moneyShort
  }
}

/** Amount + currency. In privacy mode shows a placeholder (no blur, no real digits). */
export function MoneyAmount({
  amountMinor,
  currency = 'PLN',
  size = 'body',
  className,
  currencyClassName,
  showCurrency = true,
  localeTag: localeOverride
}: {
  amountMinor: number
  currency?: CurrencyCode
  size?: 'hero' | 'detail' | 'kpi' | 'body'
  className?: string
  currencyClassName?: string
  showCurrency?: boolean
  localeTag?: string
}): JSX.Element {
  const { localeTag } = useLocale()
  const privacy = usePrivacy()
  const tag = localeOverride ?? localeTag
  const { int, dec, value } = splitFormatted(amountMinor, tag)
  const cfg = SIZE[size]
  const curLabel = currency === 'PLN' ? 'zł' : currency

  if (privacy) {
    return (
      <span
        className={cn(
          'money privacy-mask num inline-flex max-w-full items-baseline whitespace-nowrap select-none',
          cfg.wrap,
          className
        )}
        aria-hidden
        data-privacy="masked"
      >
        <span>{cfg.mask}</span>
        {showCurrency ? (
          <span
            className={cn(
              'ml-2.5 shrink-0 font-medium text-[var(--ink-3)]',
              cfg.cur,
              currencyClassName
            )}
          >
            {curLabel}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'money num inline-flex max-w-full items-baseline whitespace-nowrap',
        cfg.wrap,
        className
      )}
    >
      {cfg.animate ? (
        <NumberFlow
          value={value}
          locales={tag}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          className="tabular-nums"
        />
      ) : (
        <>
          <span>{int}</span>
          {dec ? <span className="text-[var(--ink-3)]">{dec}</span> : null}
        </>
      )}
      {showCurrency ? (
        <span
          className={cn(
            'ml-2.5 shrink-0 font-medium text-[var(--ink-3)]',
            cfg.cur,
            currencyClassName
          )}
        >
          {curLabel}
        </span>
      ) : null}
    </span>
  )
}
