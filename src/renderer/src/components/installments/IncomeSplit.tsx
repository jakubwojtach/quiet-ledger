import type { JSX } from 'react'
import type { MonthSummary } from '@shared/types'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

const MIN_H = 24
const TOTAL_H = 316

/** Flex “where income went” split — Kept + expense categories. */
export function IncomeSplit({
  data,
  monthLabel
}: {
  data: MonthSummary
  monthLabel: string
}): JSX.Element {
  const { t } = useLocale()
  const income = data.income
    .filter((e) => e.status === 'received')
    .reduce((sum, e) => sum + e.plnAmountMinor, 0)
  const kept = Math.max(
    0,
    income - data.expensesPlnMinor - data.installmentsPlnMinor
  )
  const cats = [...data.expensesByCategory].sort((a, b) => b.amountPlnMinor - a.amountPlnMinor)

  const slices: { key: string; label: string; amount: number; tone: 'kept' | 'cat' }[] = [
    { key: 'kept', label: t('cashflow.kept'), amount: kept, tone: 'kept' },
    ...cats.map((c) => ({
      key: c.categoryId,
      label: c.categoryName,
      amount: c.amountPlnMinor,
      tone: 'cat' as const
    }))
  ]

  const denom = income > 0 ? income : slices.reduce((s, x) => s + x.amount, 0) || 1

  // Proportional heights with a floor so tiny categories stay readable
  const raw = slices.map((s) => Math.max(MIN_H, (s.amount / denom) * TOTAL_H))
  const rawSum = raw.reduce((a, b) => a + b, 0) || 1
  const heights = raw.map((h) => Math.round((h / rawSum) * TOTAL_H))

  return (
    <section className="surface-card p-3.5 px-4 pb-4" data-testid="income-split">
      <h2 className="text-[13px] leading-5 font-semibold">
        {t('cashflow.whereIncomeWent', { month: monthLabel })}
      </h2>
      <div className="mt-3.5 grid grid-cols-[96px_1fr] gap-x-3">
        <div
          className="flex flex-col justify-center rounded-md bg-[var(--accent-subtle)] p-2.5"
          style={{ height: TOTAL_H }}
        >
          <span className="text-[12px] font-medium text-[var(--ink-3)]">{t('stat.income')}</span>
          <MoneyAmount
            amountMinor={income}
            showCurrency={false}
            className="!text-[13px] !font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {slices.map((s, i) => {
            const pct = (s.amount / denom) * 100
            return (
              <div
                key={s.key}
                className={cn(
                  'flex flex-col justify-center rounded-md px-2.5',
                  s.tone === 'kept' ? 'bg-[var(--gain-subtle)]' : 'bg-[var(--surface-2)]',
                  heights[i]! <= MIN_H + 4 && 'flex-row items-center justify-between'
                )}
                style={{ height: heights[i] }}
              >
                {heights[i]! <= MIN_H + 4 ? (
                  <>
                    <Sensitive
                      placeholder={MASK.nameShort}
                      className="truncate text-[12px]"
                    >
                      {s.label}
                    </Sensitive>
                    <span className="num shrink-0 text-[12px] text-[var(--ink-3)]">
                      <MoneyAmount
                        amountMinor={s.amount}
                        showCurrency={false}
                        className="!text-[12px]"
                      />
                      <Sensitive placeholder={MASK.percent}> · {pct.toFixed(1)} %</Sensitive>
                    </span>
                  </>
                ) : (
                  <>
                    <Sensitive
                      placeholder={MASK.nameShort}
                      className="text-[12px] font-medium text-[var(--ink-3)]"
                    >
                      {s.label}
                    </Sensitive>
                    <MoneyAmount
                      amountMinor={s.amount}
                      showCurrency={false}
                      className={cn(
                        '!text-[13px] !font-semibold',
                        s.tone === 'kept' && 'text-gain'
                      )}
                    />
                    <Sensitive
                      placeholder={MASK.percent}
                      className="text-[12px] text-[var(--ink-3)]"
                    >
                      {pct.toFixed(1)} %
                    </Sensitive>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
