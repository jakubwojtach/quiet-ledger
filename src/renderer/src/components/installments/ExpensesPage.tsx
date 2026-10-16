import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Check } from 'lucide-react'
import { minorToMajor } from '@shared/money'
import type { ExpenseEntry } from '@shared/types'
import {
  useCopyExpensesToMonth,
  useDeleteExpense,
  useMonthSummary,
  useUpdateExpense
} from '@renderer/hooks/useNetWorth'
import { ExpenseFormDialog } from '@renderer/components/forms/ExpenseFormDialog'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'
import { dueDateClass } from './dateUrgency'
import { useMonthParam } from './useMonthParam'
import { EXPENSE_GROUP_ORDER, shiftMonth, todayInMonth } from './month'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

function categorySortIndex(name: string): number {
  const i = EXPENSE_GROUP_ORDER.indexOf(name as (typeof EXPENSE_GROUP_ORDER)[number])
  return i === -1 ? 100 : i
}

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
    const ra = categorySortIndex(a.categoryName)
    const rb = categorySortIndex(b.categoryName)
    if (ra !== rb) return ra - rb
    return b.totalMinor - a.totalMinor
  })
  for (const g of groups) {
    g.entries.sort((a, b) => b.amountMinor - a.amountMinor)
  }
  return groups
}

export function ExpensesPage(): JSX.Element {
  const [month, setMonth] = useMonthParam()
  const { t } = useLocale()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteExpense = useDeleteExpense(month)
  const updateExpense = useUpdateExpense(month)
  const copyExpenses = useCopyExpensesToMonth()
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<'due' | 'paid'>('paid')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const selectionBarRef = useRef<HTMLDivElement>(null)

  const nextMonth = useMemo(() => shiftMonth(month, 1), [month])

  useEffect(() => {
    setSelectedIds(new Set())
    setCopyMessage(null)
  }, [month])

  const dueEntries = useMemo(() => {
    const rows = (data?.expenses ?? []).filter((e) => e.status === 'due')
    rows.sort((a, b) => {
      const ca = categorySortIndex(a.categoryName)
      const cb = categorySortIndex(b.categoryName)
      if (ca !== cb) return ca - cb
      const da = a.dueDate ?? a.date
      const db = b.dueDate ?? b.date
      return da.localeCompare(db) || a.categoryName.localeCompare(b.categoryName)
    })
    return rows
  }, [data])
  const paidEntries = useMemo(
    () => (data?.expenses ?? []).filter((e) => e.status !== 'due'),
    [data]
  )
  const groups = useMemo(() => groupExpenses(paidEntries), [paidEntries])
  const liabilities = useMemo(
    () => (data?.liabilities ?? []).map((v) => v.liability),
    [data]
  )
  const allIds = useMemo(
    () => (data?.expenses ?? []).map((e) => e.id).filter((id) => !id.startsWith('optimistic-')),
    [data]
  )
  const selectedCount = selectedIds.size

  useEffect(() => {
    const bar = selectionBarRef.current
    const header = document.querySelector<HTMLElement>('[data-testid="app-sticky-header"]')
    if (!bar || !header) return
    const sync = (): void => {
      bar.style.top = `${header.offsetHeight}px`
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(header)
    return () => ro.disconnect()
  }, [allIds.length])

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectIds(ids: string[]): void {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }

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

  async function runCopySelected(): Promise<void> {
    setCopyMessage(null)
    if (selectedCount === 0) {
      setCopyMessage(t('expense.copyEmpty'))
      return
    }
    try {
      const result = await copyExpenses.mutateAsync({
        fromMonth: month,
        toMonth: nextMonth,
        expenseIds: [...selectedIds]
      })
      setCopyMessage(
        t('expense.copyDone', {
          copied: String(result.copied),
          skipped: String(result.skipped),
          month: nextMonth
        })
      )
      setSelectedIds(new Set())
      setMonth(nextMonth)
    } catch (err) {
      setCopyMessage((err as Error).message)
    }
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

      {allIds.length > 0 ? (
        <div
          ref={selectionBarRef}
          className="sticky-frost sticky z-20 -mx-4 flex flex-wrap items-center gap-2 border-y border-[var(--line)] px-4 py-2.5 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10"
          data-testid="copy-selection-bar"
        >
          <span className="text-[12px] font-medium text-[var(--ink-3)] tabular-nums">
            {selectedCount}/{allIds.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectIds(allIds)}
            disabled={selectedCount === allIds.length}
          >
            {t('expense.copySelectAll')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedCount === 0}
          >
            {t('expense.copyClear')}
          </Button>
          <span className="flex-1" />
          <Button
            size="sm"
            disabled={selectedCount === 0 || copyExpenses.isPending}
            onClick={() => void runCopySelected()}
            data-testid="copy-selected-expenses"
          >
            {copyExpenses.isPending
              ? t('expense.copying')
              : t('expense.copySelected', {
                  count: String(selectedCount),
                  month: nextMonth
                })}
          </Button>
        </div>
      ) : null}

      {copyMessage ? (
        <p className="text-[13px] text-[var(--ink-2)]" data-testid="copy-expenses-result">
          {copyMessage}
        </p>
      ) : null}

      <Card className="flex max-h-[min(28rem,55vh)] flex-col" data-testid="expenses-due">
        <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t('expense.stillToPay')}</CardTitle>
            <CardDescription>
              {t('expense.stillToPayCount', { count: dueEntries.length })}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {dueEntries.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  selectIds(dueEntries.map((e) => e.id).filter((id) => !id.startsWith('optimistic-')))
                }
              >
                {t('expense.copySelectAll')}
              </Button>
            ) : null}
            <MoneyAmount amountMinor={data.duePlnMinor} className="!text-sm font-medium" />
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
          {dueEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">{t('expense.emptyDue')}</p>
          ) : (
            dueEntries.map((entry) => (
              <ExpenseRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onToggleSelect={() => toggleSelected(entry.id)}
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
            <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle>
                  <Sensitive placeholder={MASK.nameShort}>{g.categoryName}</Sensitive>
                </CardTitle>
                <CardDescription>
                  {g.entries.length} {g.entries.length === 1 ? 'item' : 'items'}
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    selectIds(
                      g.entries.map((e) => e.id).filter((id) => !id.startsWith('optimistic-'))
                    )
                  }
                >
                  {t('expense.copySelectAll')}
                </Button>
                <MoneyAmount amountMinor={g.totalMinor} className="!text-sm font-medium" />
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
              {g.entries.map((entry) => (
                <ExpenseRow
                  key={entry.id}
                  entry={entry}
                  selected={selectedIds.has(entry.id)}
                  onToggleSelect={() => toggleSelected(entry.id)}
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
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleStatus
}: {
  entry: ExpenseEntry
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}): JSX.Element {
  const { t } = useLocale()
  const dueLabel = entry.dueDate ?? entry.date
  const isDue = entry.status === 'due'
  const isPaid = !isDue
  const canSelect = !entry.id.startsWith('optimistic-')

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm',
        entry.id.startsWith('optimistic-') && 'opacity-70',
        isPaid && 'opacity-80',
        selected && 'ring-1 ring-[var(--accent)] bg-[var(--accent-subtle)]'
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {canSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 size-3.5 shrink-0 cursor-pointer accent-[var(--accent)]"
            aria-label={t('expense.selectForCopy')}
          />
        ) : (
          <span className="mt-1 size-3.5 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            {isPaid ? (
              <Check
                className="size-3.5 shrink-0 text-[var(--gain)]"
                strokeWidth={2.25}
                aria-hidden
              />
            ) : null}
            <Sensitive
              placeholder={MASK.name}
              className={cn('block truncate font-medium', isPaid && 'text-[var(--ink-2)]')}
            >
              {entry.note?.trim() || entry.categoryName}
            </Sensitive>
            {isDue && entry.note?.trim() ? (
              <span className="shrink-0 rounded-[5px] border border-[var(--line)] bg-[var(--surface-1)] px-1.5 py-px text-[10px] font-medium tracking-wide text-[var(--ink-3)]">
                <Sensitive placeholder={MASK.nameShort}>{entry.categoryName}</Sensitive>
              </span>
            ) : null}
          </div>
          <div
            className={cn('text-xs', isDue ? dueDateClass(dueLabel) : 'text-[var(--ink-3)]')}
          >
            {isDue ? t('expense.dueOn', { date: dueLabel }) : entry.date}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MoneyAmount
          amountMinor={entry.amountMinor}
          currency={entry.currency}
          className={cn('!text-sm font-medium', isPaid && '!text-[var(--ink-2)]')}
        />
        {canSelect && (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleStatus}>
              {isDue ? t('action.markPaid') : t('action.markDue')}
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
