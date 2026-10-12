import { useMemo, useState, type JSX } from 'react'
import type { ExpenseEntry } from '@shared/types'
import { useDeleteExpense, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { ExpenseFormDialog } from '@renderer/components/forms/ExpenseFormDialog'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { useMonthParam } from './useMonthParam'
import { EXPENSE_GROUP_ORDER, todayInMonth } from './month'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface ExpenseGroup {
  categoryId: string
  categoryName: string
  totalMinor: number
  entries: ExpenseEntry[]
}

function groupExpenses(entries: ExpenseEntry[]): ExpenseGroup[] {
  const map = new Map<string, ExpenseGroup>()
  for (const e of entries) {
    const g = map.get(e.categoryId) ?? {
      categoryId: e.categoryId,
      categoryName: e.categoryName,
      totalMinor: 0,
      entries: []
    }
    g.totalMinor += e.amountMinor
    g.entries.push(e)
    map.set(e.categoryId, g)
  }
  const groups = [...map.values()]
  groups.sort((a, b) => {
    const ia = EXPENSE_GROUP_ORDER.indexOf(a.categoryName as (typeof EXPENSE_GROUP_ORDER)[number])
    const ib = EXPENSE_GROUP_ORDER.indexOf(b.categoryName as (typeof EXPENSE_GROUP_ORDER)[number])
    const ra = ia === -1 ? 100 : ia
    const rb = ib === -1 ? 100 : ib
    if (ra !== rb) return ra - rb
    return b.totalMinor - a.totalMinor
  })
  for (const g of groups) {
    g.entries.sort((a, b) => b.amountMinor - a.amountMinor)
  }
  return groups
}

export function ExpensesPage(): JSX.Element {
  const [month] = useMonthParam()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteExpense = useDeleteExpense(month)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null)

  const groups = useMemo(() => groupExpenses(data?.expenses ?? []), [data])
  const liabilities = useMemo(
    () => (data?.liabilities ?? []).map((v) => v.liability),
    [data]
  )

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-40" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load expenses</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-expenses">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Expenses · {month}</h2>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            {data.expenses.length} lines ·{' '}
            <MoneyAmount amountMinor={data.expensesPlnMinor} className="!text-sm" /> · grouped like
            the sheet
          </p>
        </div>
        <Button
          className="self-start"
          onClick={() => {
            setEditingExpense(null)
            setExpenseOpen(true)
          }}
          data-testid="add-expense-btn"
        >
          Add expense
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-ink-muted">
            No expenses for this month.
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.categoryId} className="flex max-h-[min(28rem,55vh)] flex-col">
            <CardHeader className="shrink-0 flex-row items-baseline justify-between gap-3 space-y-0">
              <div>
                <CardTitle>
                  <Sensitive placeholder={MASK.nameShort}>{g.categoryName}</Sensitive>
                </CardTitle>
                <CardDescription>
                  {g.entries.length} {g.entries.length === 1 ? 'item' : 'items'}
                </CardDescription>
              </div>
              <MoneyAmount amountMinor={g.totalMinor} className="!text-sm font-medium" />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
              {g.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm ${
                    entry.id.startsWith('optimistic-') ? 'opacity-70' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <Sensitive
                      placeholder={MASK.name}
                      className="block truncate font-medium"
                    >
                      {entry.note?.trim() || entry.categoryName}
                    </Sensitive>
                    <div className="text-xs text-ink-muted">{entry.date}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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
                            setEditingExpense(entry)
                            setExpenseOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense.mutate(entry.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <ExpenseFormDialog
        open={expenseOpen}
        onOpenChange={(open) => {
          setExpenseOpen(open)
          if (!open) setEditingExpense(null)
        }}
        month={month}
        defaultDate={todayInMonth(month)}
        liabilities={liabilities}
        expense={editingExpense}
      />
    </div>
  )
}
