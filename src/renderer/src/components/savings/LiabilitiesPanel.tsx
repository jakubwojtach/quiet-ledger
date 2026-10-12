import type { JSX } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import type { ValuedLiability } from '@shared/types'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { WeightBar } from '@renderer/components/shell/WeightBar'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive, usePrivacy } from '@renderer/lib/privacy'
import { Button } from '@renderer/components/ui/button'

export function LiabilitiesPanel({
  liabilities,
  totalLiabilitiesMinor,
  onAdd
}: {
  liabilities: ValuedLiability[]
  totalLiabilitiesMinor: number
  /** @deprecated ignored */
  compact?: boolean
  onAdd?: () => void
}): JSX.Element {
  const { t } = useLocale()
  const privacy = usePrivacy()

  if (liabilities.length === 0) {
    return (
      <section
        className="surface-card flex items-center gap-2.5 px-4 py-3"
        data-testid="liabilities-panel"
      >
        <span className="inline-flex size-7 items-center justify-center rounded-[7px] bg-[var(--surface-2)] text-[var(--ink-3)]">
          <CreditCard className="size-3.5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <Sensitive
            placeholder={MASK.nameShort}
            className="block text-[13px] font-medium"
          >
            {t('liabilities.none')}
          </Sensitive>
          <Sensitive
            placeholder={MASK.name}
            className="block text-[12px] leading-4 text-[var(--ink-3)]"
          >
            {t('liabilities.debtFree')}
          </Sensitive>
        </div>
        <span className="flex-1" />
        {onAdd && !privacy ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={onAdd}>
            <Plus className="size-3.5" />
            {t('liabilities.addLoan')}
          </Button>
        ) : null}
      </section>
    )
  }

  // Privacy: fixed placeholder rows so loan count / weights don't leak
  const rows = privacy
    ? [
        { id: 'p0', name: MASK.name, amount: 0, weight: 55 },
        { id: 'p1', name: MASK.name, amount: 0, weight: 35 }
      ]
    : liabilities.map((v) => ({
        id: v.liability.id,
        name: v.liability.name,
        amount: v.principalPlnMinor,
        weight:
          totalLiabilitiesMinor > 0
            ? (v.principalPlnMinor / totalLiabilitiesMinor) * 100
            : 0
      }))

  return (
    <section className="surface-card p-3.5 px-4" data-testid="liabilities-panel">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">{t('dashboard.liabilities')}</h2>
        <span className="flex-1" />
        {privacy ? (
          <Sensitive placeholder={MASK.money} className="text-[13px]">
            {totalLiabilitiesMinor}
          </Sensitive>
        ) : (
          <MoneyAmount amountMinor={totalLiabilitiesMinor} className="!text-[13px]" />
        )}
      </div>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md px-1 py-2">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <Sensitive placeholder={MASK.name} className="truncate font-medium">
                {row.name}
              </Sensitive>
              {privacy ? (
                <Sensitive placeholder={MASK.moneyShort} className="text-[13px]">
                  {row.amount}
                </Sensitive>
              ) : (
                <MoneyAmount
                  amountMinor={row.amount}
                  showCurrency={false}
                  className="!text-[13px]"
                />
              )}
            </div>
            <WeightBar className="mt-2" percent={row.weight} tone="neutral" />
          </li>
        ))}
      </ul>
    </section>
  )
}
