import { useMemo, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useCashflowHistory, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { CashflowChart } from '@renderer/components/charts/CashflowChart'
import { FadeUp } from '@renderer/components/motion/PageTransition'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { WeightBar } from '@renderer/components/shell/WeightBar'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { IncomeSplit } from './IncomeSplit'
import { useMonthParam, withMonth } from './useMonthParam'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'

export function OverviewPage(): JSX.Element {
  const [month, setMonth] = useMonthParam()
  const { t, localeTag } = useLocale()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const cashflowHistory = useCashflowHistory()

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(localeTag, {
      month: 'long',
      year: 'numeric'
    })
  }, [month, localeTag])

  const rangeHint = useMemo(() => {
    const pts = [...(cashflowHistory.data ?? [])].sort((a, b) => a.month.localeCompare(b.month))
    if (pts.length === 0) return ''
    const fmt = (ym: string) => {
      const [y, m] = ym.split('-').map(Number)
      return new Date(y, m - 1, 1).toLocaleDateString(localeTag, {
        month: 'short',
        year: 'numeric'
      })
    }
    return `${fmt(pts[0].month)} – ${fmt(pts[pts.length - 1].month)} · zł`
  }, [cashflowHistory.data, localeTag])

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4" data-testid="installments-loading">
        <div className="h-20 rounded-[10px] bg-[var(--surface-2)]" />
        <div className="h-64 rounded-[10px] bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('installments.errorOverview')}</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>{t('action.retry')}</Button>
        </CardContent>
      </Card>
    )
  }

  const savingsRate =
    data.incomePlnMinor > 0 ? (data.cashflowPlnMinor / data.incomePlnMinor) * 100 : null
  const keptPositive = data.cashflowPlnMinor >= 0

  return (
    <div className="flex w-full min-w-0 flex-col gap-4" data-testid="installments-overview">
      <FadeUp>
        <section
          className="surface-card grid grid-cols-2 sm:grid-cols-4"
          data-testid="cashflow-kpis"
        >
          <Kpi label={t('stat.income')} amount={data.incomePlnMinor} />
          <Kpi label={t('stat.expenses')} amount={data.expensesPlnMinor} />
          <Kpi
            label={t('cashflow.kept')}
            amount={data.cashflowPlnMinor}
            signed
            gain={keptPositive}
          />
          <div className="border-l border-[var(--line)] p-3.5 px-4">
            <div className="text-[12px] font-medium text-[var(--ink-3)]">
              {t('cashflow.keptOfIncome')}
            </div>
            <div className="num mt-1 text-[22px] leading-7 font-medium tracking-[-0.02em]">
              {savingsRate != null
                ? `${savingsRate.toLocaleString(localeTag, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  })} %`
                : '—'}
            </div>
          </div>
        </section>
        {data.duePlnMinor > 0 ? (
          <Link
            to={withMonth('/installments/expenses', month)}
            className="mt-3 inline-flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--ink-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
            data-testid="still-to-pay-chip"
          >
            <span className="font-medium text-[var(--ink)]">{t('expense.stillToPay')}</span>
            <MoneyAmount amountMinor={data.duePlnMinor} className="!text-[13px] font-medium" />
            <span className="text-[var(--ink-3)]">· {t('action.open')}</span>
          </Link>
        ) : null}
      </FadeUp>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] max-[1359px]:lg:grid-cols-[minmax(0,1fr)_320px]">
        <FadeUp delay={0.03} className="min-w-0">
          <section className="surface-card p-3.5 px-4 pb-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] leading-5 font-semibold">
                {t('installments.incomeVsExpenses')}
              </h2>
              {rangeHint ? (
                <span className="text-[12px] text-[var(--ink-3)]">{rangeHint}</span>
              ) : null}
              <span className="flex-1" />
              <div className="flex gap-3.5 text-[12px] text-[var(--ink-2)]">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2 rounded-sm bg-[var(--accent)]" />
                  {t('chart.income')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2 rounded-sm bg-[var(--cat-5)]" />
                  {t('chart.expenses')}
                </span>
              </div>
            </div>
            <div className="h-[300px] min-h-0 w-full">
              <CashflowChart
                fill
                points={cashflowHistory.data ?? []}
                highlightMonth={month}
                onSelectMonth={setMonth}
              />
            </div>
          </section>
        </FadeUp>

        <FadeUp delay={0.05} className="min-w-0">
          <IncomeSplit data={data} monthLabel={monthLabel} />
        </FadeUp>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_280px]">
        <FadeUp delay={0.06}>
          <ListCard
            title={t('nav.expenses')}
            total={data.expensesPlnMinor}
            empty={t('installments.noExpenses')}
            link={withMonth('/installments/expenses', month)}
            tone="neutral"
            rows={data.expensesByCategory.map((row) => ({
              id: row.categoryId,
              name: row.categoryName,
              amount: row.amountPlnMinor,
              weight: row.percentOfTotal
            }))}
          />
        </FadeUp>
        <FadeUp delay={0.07}>
          <ListCard
            title={t('nav.income')}
            total={data.incomePlnMinor}
            empty={t('installments.noIncome')}
            link={withMonth('/installments/income', month)}
            tone="accent"
            rows={data.income.map((row) => ({
              id: row.id,
              name: row.note?.trim() || t('stat.income'),
              amount: row.amountMinor,
              weight:
                row.currency === 'PLN' && data.incomePlnMinor > 0
                  ? (row.amountMinor / data.incomePlnMinor) * 100
                  : 0
            }))}
          />
        </FadeUp>
        <FadeUp delay={0.08}>
          <section className="surface-card p-3.5 px-4 pb-4">
            <h2 className="text-[13px] leading-5 font-semibold">{t('nav.loans')}</h2>
            {data.liabilities.length === 0 ? (
              <div className="mt-3 flex items-center gap-2.5">
                <span className="whitespace-nowrap text-[12px] text-[var(--ink-3)]">
                  {t('cashflow.noInstalments')}
                </span>
                <span className="flex-1" />
                <Link
                  to={withMonth('/installments/loans', month)}
                  className="btn btn-ghost btn-sm h-7"
                >
                  {t('liabilities.addLoan')}
                </Link>
              </div>
            ) : (
              <ul className="mt-2">
                {data.liabilities.map((v) => (
                  <li
                    key={v.liability.id}
                    className="flex items-baseline justify-between gap-2 border-t border-[var(--line)] py-2.5 first:border-t-0"
                  >
                    <Sensitive
                      placeholder={MASK.name}
                      className="truncate text-[13px] font-medium"
                    >
                      {v.liability.name}
                    </Sensitive>
                    <MoneyAmount
                      amountMinor={v.monthlyPaymentPlnMinor}
                      showCurrency={false}
                      className="!text-[13px]"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </FadeUp>
      </div>
    </div>
  )
}

function Kpi({
  label,
  amount,
  signed,
  gain
}: {
  label: string
  amount: number
  signed?: boolean
  gain?: boolean
}): JSX.Element {
  return (
    <div className="border-l border-[var(--line)] p-3.5 px-4 first:border-l-0">
      <div className="text-[12px] font-medium text-[var(--ink-3)]">{label}</div>
      <div
        className={cn(
          'mt-1 flex items-baseline',
          signed && gain && 'text-gain',
          signed && !gain && 'text-loss'
        )}
      >
        {signed && amount > 0 ? <span className="num text-[22px] font-medium">+</span> : null}
        <MoneyAmount amountMinor={amount} size="kpi" showCurrency={false} />
      </div>
    </div>
  )
}

function ListCard({
  title,
  total,
  empty,
  link,
  rows,
  tone
}: {
  title: string
  total: number
  empty: string
  link: string
  rows: { id: string; name: string; amount: number; weight: number }[]
  tone: 'accent' | 'neutral'
}): JSX.Element {
  const { t, localeTag } = useLocale()
  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">{title}</h2>
        <span className="flex-1" />
        <MoneyAmount
          amountMinor={total}
          showCurrency={false}
          className="!text-[13px] text-[var(--ink-3)]"
        />
        <Link to={link} className="btn btn-ghost btn-sm h-7 px-2 text-[12px]">
          {t('action.open')}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12px] text-[var(--ink-3)]">{empty}</p>
      ) : (
        <ul className="mt-1.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1.5 border-t border-[var(--line)] py-2.5 first:border-t-0"
            >
              <Sensitive
                placeholder={MASK.nameShort}
                className="truncate text-[13px] font-medium"
              >
                {row.name}
              </Sensitive>
              <span className="num text-[13px]">
                <MoneyAmount amountMinor={row.amount} showCurrency={false} className="!text-[13px]" />
                <Sensitive placeholder={MASK.percent} className="text-[var(--ink-3)]">
                  {' '}
                  ·{' '}
                  {row.weight.toLocaleString(localeTag, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  })}{' '}
                  %
                </Sensitive>
              </span>
              <WeightBar
                className="col-span-2"
                percent={row.weight}
                tone={tone === 'accent' ? 'accent' : 'neutral'}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
