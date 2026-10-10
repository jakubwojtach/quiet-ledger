import { useMemo, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { formatMinorUnits } from '@shared/money'
import { useMonthSummary } from '@renderer/hooks/useNetWorth'
import { ExpenseFormDialog } from '@renderer/components/forms/ExpenseFormDialog'
import { IncomeFormDialog } from '@renderer/components/forms/IncomeFormDialog'
import { useMonthParam, withMonth } from './useMonthParam'
import { todayInMonth } from './month'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'

export function OverviewPage(): JSX.Element {
  const [month] = useMonthParam()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)

  const liabilities = useMemo(
    () => (data?.liabilities ?? []).map((v) => v.liability),
    [data]
  )

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-40" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load overview</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-overview">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <CardDescription>Monthly cashflow · PLN</CardDescription>
            <CardTitle
              className={`mt-1 font-display text-3xl break-words md:text-4xl ${
                data.cashflowPlnMinor >= 0 ? 'text-forest' : 'text-accent'
              }`}
            >
              {formatMinorUnits(data.cashflowPlnMinor, 'PLN')}
            </CardTitle>
            <p className="mt-2 text-xs text-ink-muted">
              Income − expenses − installment payments
              {data.fxStale ? ' · last-known FX' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIncomeOpen(true)} data-testid="add-income-btn">
              Add income
            </Button>
            <Button onClick={() => setExpenseOpen(true)} data-testid="add-expense-btn">
              Add expense
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Stat label="Income" value={formatMinorUnits(data.incomePlnMinor, 'PLN')} />
          <Stat label="Expenses" value={formatMinorUnits(data.expensesPlnMinor, 'PLN')} />
          <Stat
            label="Loan payments"
            value={formatMinorUnits(data.installmentsPlnMinor, 'PLN')}
            hint="Scheduled this month"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by category</CardTitle>
          <CardDescription>Share of this month’s expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.expensesByCategory.length === 0 ? (
            <p className="text-sm text-ink-muted">No expenses logged yet.</p>
          ) : (
            data.expensesByCategory.map((row) => (
              <div key={row.categoryId} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{row.categoryName}</span>
                  <span className="tabular-nums text-ink-muted">
                    {row.percentOfTotal.toFixed(1)}% · {formatMinorUnits(row.amountPlnMinor, 'PLN')}
                  </span>
                </div>
                <Progress value={Math.min(100, row.percentOfTotal)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <NavCard
          title="Expenses"
          detail={`${data.expenses.length} lines · ${formatMinorUnits(data.expensesPlnMinor, 'PLN')}`}
          to={withMonth('/installments/expenses', month)}
        />
        <NavCard
          title="Income"
          detail={`${data.income.length} entries · ${formatMinorUnits(data.incomePlnMinor, 'PLN')}`}
          to={withMonth('/installments/income', month)}
        />
        <NavCard
          title="Loans"
          detail={`${data.liabilities.length} · ${formatMinorUnits(data.installmentsPlnMinor, 'PLN')}/mo`}
          to={withMonth('/installments/loans', month)}
        />
      </div>

      <ExpenseFormDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        month={month}
        defaultDate={todayInMonth(month)}
        liabilities={liabilities}
      />
      <IncomeFormDialog open={incomeOpen} onOpenChange={setIncomeOpen} month={month} />
    </div>
  )
}

function NavCard({
  title,
  detail,
  to
}: {
  title: string
  detail: string
  to: string
}): JSX.Element {
  return (
    <Link
      to={to}
      className="rounded-xl border border-line/80 bg-white/70 p-4 shadow-sm transition-colors hover:bg-paper-deep/50"
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-ink-muted">{detail}</div>
      <div className="mt-2 text-sm text-forest">Open →</div>
    </Link>
  )
}

function Stat({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint?: string
}): JSX.Element {
  return (
    <div className="rounded-lg bg-paper-deep/70 p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  )
}
