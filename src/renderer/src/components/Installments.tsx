import { useMemo, useState, type FormEvent, type JSX } from 'react'
import { formatMinorUnits } from '@shared/money'
import type { Liability } from '@shared/types'
import {
  useCreateExpense,
  useCreateIncome,
  useDeleteExpense,
  useDeleteIncome,
  useDeleteLiability,
  useExpenseCategories,
  useMonthSummary
} from '@renderer/hooks/useNetWorth'
import { LiabilityFormDialog } from '@renderer/components/forms/LiabilityFormDialog'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Progress } from '@renderer/components/ui/progress'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayInMonth(month: string): string {
  const today = new Date().toISOString().slice(0, 10)
  if (today.startsWith(month)) return today
  return `${month}-01`
}

/** Installments tab: pożyczki / e-raty + monthly income & spend cashflow. */
export function Installments(): JSX.Element {
  const [month, setMonth] = useState(currentMonth)
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const { data: categories } = useExpenseCategories()
  const createExpense = useCreateExpense(month)
  const createIncome = useCreateIncome()
  const deleteExpense = useDeleteExpense(month)
  const deleteIncome = useDeleteIncome(month)
  const deleteLiability = useDeleteLiability()

  const [liabilityOpen, setLiabilityOpen] = useState(false)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)

  const [expenseAmount, setExpenseAmount] = useState('50')
  const [expenseNote, setExpenseNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayInMonth(month))
  const [liabilityId, setLiabilityId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [incomeAmount, setIncomeAmount] = useState('8000')
  const [incomeNote, setIncomeNote] = useState('')

  const resolvedCategoryId = useMemo(() => {
    if (categoryId) return categoryId
    return categories?.[0]?.id ?? ''
  }, [categoryId, categories])

  const totalPrincipalPln = useMemo(
    () => (data?.liabilities ?? []).reduce((sum, v) => sum + v.principalPlnMinor, 0),
    [data]
  )

  async function onAddExpense(e: FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)
    const major = Number(expenseAmount.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setFormError('Enter a positive expense amount.')
      return
    }
    if (!resolvedCategoryId) {
      setFormError('Pick a category.')
      return
    }
    try {
      await createExpense.mutateAsync({
        categoryId: resolvedCategoryId,
        date: expenseDate,
        amount: major,
        currency: 'PLN',
        note: expenseNote.trim() || null,
        liabilityId: liabilityId || null
      })
      setExpenseNote('')
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  async function onAddIncome(e: FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)
    const major = Number(incomeAmount.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setFormError('Enter a positive income amount.')
      return
    }
    try {
      await createIncome.mutateAsync({
        month,
        amount: major,
        currency: 'PLN',
        note: incomeNote.trim() || null,
        allocations: []
      })
      setIncomeNote('')
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Installments</CardTitle>
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
          <CardTitle>Could not load installments</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-view">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription>Pożyczki & e-raty · remaining principal</CardDescription>
            <CardTitle className="font-display text-3xl text-forest md:text-4xl">
              {formatMinorUnits(totalPrincipalPln, 'PLN')}
            </CardTitle>
            <p className="text-xs text-ink-muted">
              Monthly installment burden:{' '}
              <span className="font-medium text-ink">
                {formatMinorUnits(data.installmentsPlnMinor, 'PLN')}
              </span>
            </p>
          </div>
          <Button
            data-testid="add-liability-btn"
            onClick={() => {
              setEditingLiability(null)
              setLiabilityOpen(true)
            }}
          >
            Add installment
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.liabilities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
              <p className="text-sm text-ink-muted">No loans or e-raty yet.</p>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingLiability(null)
                  setLiabilityOpen(true)
                }}
              >
                Add installment
              </Button>
            </div>
          ) : (
            data.liabilities.map((v) => (
              <div
                key={v.liability.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-paper-deep/60 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{v.liability.name}</div>
                  <div className="text-xs text-ink-muted">
                    {v.liability.provider ?? 'Loan'}
                    {v.liability.nextDueDate ? ` · due ${v.liability.nextDueDate}` : ''}
                    {' · '}
                    {formatMinorUnits(v.monthlyPaymentPlnMinor, 'PLN')}/mo
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right tabular-nums">
                    <div className="font-medium">{formatMinorUnits(v.principalPlnMinor, 'PLN')}</div>
                    <div className="text-xs text-ink-muted">principal</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingLiability(v.liability)
                      setLiabilityOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete “${v.liability.name}”?`)) {
                        deleteLiability.mutate(v.liability.id)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LiabilityFormDialog
        open={liabilityOpen}
        onOpenChange={setLiabilityOpen}
        liability={editingLiability}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardDescription>Monthly cashflow · PLN</CardDescription>
            <CardTitle
              className={`mt-1 font-display text-3xl md:text-4xl ${
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
          <div className="space-y-1.5">
            <Label htmlFor="month-picker">Month</Label>
            <Input
              id="month-picker"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setExpenseDate(todayInMonth(e.target.value))
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Stat label="Income" value={formatMinorUnits(data.incomePlnMinor, 'PLN')} />
          <Stat label="Expenses" value={formatMinorUnits(data.expensesPlnMinor, 'PLN')} />
          <Stat
            label="Installments"
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
                    {row.percentOfTotal.toFixed(1)}% ·{' '}
                    {formatMinorUnits(row.amountPlnMinor, 'PLN')}
                  </span>
                </div>
                <Progress value={Math.min(100, row.percentOfTotal)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="add-expense-card">
          <CardHeader>
            <CardTitle>Add expense</CardTitle>
            <CardDescription>Food, transport, and other spending</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={(e) => void onAddExpense(e)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-date">Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-amount">Amount (PLN)</Label>
                  <Input
                    id="exp-amount"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-cat">Category</Label>
                <select
                  id="exp-cat"
                  className="flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                  value={resolvedCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-liability">Link to installment (optional)</Label>
                <select
                  id="exp-liability"
                  className="flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                  value={liabilityId}
                  onChange={(e) => setLiabilityId(e.target.value)}
                >
                  <option value="">None</option>
                  {data.liabilities.map((v) => (
                    <option key={v.liability.id} value={v.liability.id}>
                      {v.liability.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-note">Note</Label>
                <Input
                  id="exp-note"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Groceries, ticket…"
                />
              </div>
              <Button type="submit" disabled={createExpense.isPending}>
                {createExpense.isPending ? 'Saving…' : 'Add expense'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add income</CardTitle>
            <CardDescription>Logged for {month}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={(e) => void onAddIncome(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="inc-amount">Amount (PLN)</Label>
                <Input
                  id="inc-amount"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-note">Note</Label>
                <Input
                  id="inc-note"
                  value={incomeNote}
                  onChange={(e) => setIncomeNote(e.target.value)}
                  placeholder="Salary, bonus…"
                />
              </div>
              <Button type="submit" disabled={createIncome.isPending}>
                {createIncome.isPending ? 'Saving…' : 'Add income'}
              </Button>
            </form>

            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <h4 className="text-sm font-medium text-ink-muted">Income this month</h4>
              {data.income.length === 0 && (
                <p className="text-sm text-ink-muted">No income logged.</p>
              )}
              {data.income.map((entry) => (
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIncome.mutate(entry.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {formError && <p className="text-sm text-accent">{formError}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Expense log</CardTitle>
          <CardDescription>Entries for {month}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.expenses.length === 0 ? (
            <p className="text-sm text-ink-muted">No expenses yet.</p>
          ) : (
            data.expenses.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm ${
                  entry.id.startsWith('optimistic-') ? 'opacity-70' : ''
                }`}
              >
                <div>
                  <div className="font-medium">
                    {entry.categoryName}
                    <span className="ml-2 text-xs font-normal text-ink-muted">{entry.date}</span>
                  </div>
                  <div className="text-xs text-ink-muted">{entry.note || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="tabular-nums font-medium">
                    {formatMinorUnits(entry.amountMinor, entry.currency)}
                  </div>
                  {!entry.id.startsWith('optimistic-') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExpense.mutate(entry.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
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
