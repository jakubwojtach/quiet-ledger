import { useMemo, useState, type JSX } from 'react'
import { minorToMajor } from '@shared/money'
import type { ExpenseEntry } from '@shared/types'
import { useDeleteExpense, useMonthSummary, useUpdateExpense } from '@renderer/hooks/useNetWorth'
import { ExpenseFormDialog } from '@renderer/components/forms/ExpenseFormDialog'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
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
  const { t } = useLocale()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteExpense = useDeleteExpense(month)
  const updateExpense = useUpdateExpense(month)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<'due' | 'paid'>('paid')

  const dueEntries = useMemo(
    () => (data?.expenses ?? []).filter((e) => e.status === 'due'),
    [data]
  )
  const paidEntries = useMemo(
    () => (data?.expenses ?? []).filter((e) => e.status !== 'due'),
    [data]
  )
  const groups = useMemo(() => groupExpenses(paidEntries), [paidEntries])
  const liabilities = useMemo(
    () => (data?.liabilities ?? []).map((v) => v.liability),
    [data]
  )

  async function toggleStatus(entry: ExpenseEntry): Promise<void> {
    const nextStatus = entry.status === 'due' ? 'paid' : 'due'
    await updateExpense.mutateAsync({
      id: entry.id,
      categoryId: entry.categoryId,
      date: entry.date,
      amount: minorToMajor(entry.amountMinor),
      currency: entry.currency,
      note: entry.note,
      liabilityId: entry.liabilityId,
      status: nextStatus,
      dueDate: nextStatus === 'due' ? entry.dueDate ?? entry.date : null
    })
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>{t('nav.expenses')}</CardTitle>
        </CardHeader>
        <CardContent className="h-40" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.error')}</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>{t('action.retry')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-expenses">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {t('nav.expenses')} · {month}
          </h2>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            {paidEntries.length} {t('expense.paidSection').toLowerCase()} ·{' '}
            <MoneyAmount amountMinor={data.expensesPlnMinor} className="!text-sm" />
            {data.duePlnMinor > 0 ? (
              <>
                {' '}
                · {t('expense.stillToPay').toLowerCase()}{' '}
                <MoneyAmount amountMinor={data.duePlnMinor} className="!text-sm" />
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Button
            variant="outline"
            onClick={() => {
              setEditingExpense(null)
              setDefaultStatus('due')
              setExpenseOpen(true)
            }}
          >
            {t('expense.statusDue')}
          </Button>
          <Button
            onClick={() => {
              setEditingExpense(null)
              setDefaultStatus('paid')
              setExpenseOpen(true)
            }}
            data-testid="add-expense-btn"
          >
            {t('action.addExpense')}
          </Button>
        </div>
      </div>

      <Card className="flex max-h-[min(28rem,55vh)] flex-col" data-testid="expenses-due">
        <CardHeader className="shrink-0 flex-row items-baseline justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t('expense.stillToPay')}</CardTitle>
            <CardDescription>
              {t('expense.stillToPayCount', { count: dueEntries.length })}
            </CardDescription>
          </div>
          <MoneyAmount amountMinor={data.duePlnMinor} className="!text-sm font-medium" />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
          {dueEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">{t('expense.emptyDue')}</p>
          ) : (
            dueEntries.map((entry) => (
              <ExpenseRow
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditingExpense(entry)
                  setExpenseOpen(true)
                }}
                onDelete={() => deleteExpense.mutate(entry.id)}
                onToggleStatus={() => void toggleStatus(entry)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-ink-muted">
            {t('expense.emptyPaid')}
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
                <ExpenseRow
                  key={entry.id}
                  entry={entry}
                  onEdit={() => {
                    setEditingExpense(entry)
                    setExpenseOpen(true)
                  }}
                  onDelete={() => deleteExpense.mutate(entry.id)}
                  onToggleStatus={() => void toggleStatus(entry)}
                />
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
        defaultStatus={editingExpense?.status ?? defaultStatus}
      />
    </div>
  )
}

function ExpenseRow({
  entry,
  onEdit,
  onDelete,
  onToggleStatus
}: {
  entry: ExpenseEntry
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}): JSX.Element {
  const { t } = useLocale()
  const dueLabel = entry.dueDate ?? entry.date

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm ${
        entry.id.startsWith('optimistic-') ? 'opacity-70' : ''
      }`}
    >
      <div className="min-w-0">
        <Sensitive placeholder={MASK.name} className="block truncate font-medium">
          {entry.note?.trim() || entry.categoryName}
        </Sensitive>
        <div className="text-xs text-ink-muted">
          {entry.status === 'due'
            ? t('expense.dueOn', { date: dueLabel })
            : entry.date}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MoneyAmount
          amountMinor={entry.amountMinor}
          currency={entry.currency}
          className="!text-sm font-medium"
        />
        {!entry.id.startsWith('optimistic-') && (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleStatus}>
              {entry.status === 'due' ? t('action.markPaid') : t('action.markDue')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {t('action.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              {t('action.delete')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
