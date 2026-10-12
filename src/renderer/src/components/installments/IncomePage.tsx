import { useState, type JSX } from 'react'
import type { IncomeEntry } from '@shared/types'
import { useDeleteIncome, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { IncomeFormDialog } from '@renderer/components/forms/IncomeFormDialog'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { useMonthParam } from './useMonthParam'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

export function IncomePage(): JSX.Element {
  const [month] = useMonthParam()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteIncome = useDeleteIncome(month)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null)

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
          <h2 className="font-display text-2xl font-semibold">Income · {month}</h2>
          <p className="flex items-center gap-1 text-sm text-ink-muted">
            <MoneyAmount amountMinor={data.incomePlnMinor} className="!text-sm" /> total
          </p>
        </div>
        <Button
          className="self-start"
          onClick={() => {
            setEditingIncome(null)
            setIncomeOpen(true)
          }}
          data-testid="add-income-btn"
        >
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
                <Sensitive placeholder={MASK.nameShort}>{entry.note || 'Income'}</Sensitive>
                <div className="flex items-center gap-2">
                  <MoneyAmount
                    amountMinor={entry.amountMinor}
                    currency={entry.currency}
                    className="!text-sm font-medium"
                  />
                  {!entry.id.startsWith('optimistic-') && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIncome(entry)
                          setIncomeOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteIncome.mutate(entry.id)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <IncomeFormDialog
        open={incomeOpen}
        onOpenChange={(open) => {
          setIncomeOpen(open)
          if (!open) setEditingIncome(null)
        }}
        month={month}
        income={editingIncome}
      />
    </div>
  )
}
