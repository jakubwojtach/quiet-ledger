import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { formatMinorUnits } from '@shared/money'
import { useDeleteIncome, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { IncomeFormDialog } from '@renderer/components/forms/IncomeFormDialog'
import { useMonthParam, withMonth } from './useMonthParam'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

export function IncomePage(): JSX.Element {
  const [month] = useMonthParam()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteIncome = useDeleteIncome(month)
  const [incomeOpen, setIncomeOpen] = useState(false)

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Income</CardTitle>
        </CardHeader>
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load income</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-income">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={withMonth('/installments', month)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ← Overview
          </Link>
          <h2 className="font-display text-2xl font-semibold">Income · {month}</h2>
          <p className="text-sm text-ink-muted">
            {formatMinorUnits(data.incomePlnMinor, 'PLN')} total
          </p>
        </div>
        <Button className="self-start" onClick={() => setIncomeOpen(true)} data-testid="add-income-btn">
          Add income
        </Button>
      </div>

      <Card className="flex max-h-[min(32rem,65vh)] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Entries</CardTitle>
          <CardDescription>{data.income.length} for this month</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {data.income.length === 0 ? (
            <p className="text-sm text-ink-muted">No income logged.</p>
          ) : (
            data.income.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm"
              >
                <span>{entry.note || 'Income'}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium">
                    {formatMinorUnits(entry.amountMinor, entry.currency)}
                  </span>
                  {!entry.id.startsWith('optimistic-') && (
                    <Button variant="ghost" size="sm" onClick={() => deleteIncome.mutate(entry.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <IncomeFormDialog open={incomeOpen} onOpenChange={setIncomeOpen} month={month} />
    </div>
  )
}
