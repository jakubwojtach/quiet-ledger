import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor, parseMajorInput } from '@shared/money'
import type { ExpenseEntry, ExpenseStatus, Liability } from '@shared/types'
import { useCreateExpense, useExpenseCategories, useUpdateExpense } from '@renderer/hooks/useNetWorth'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { NativeSelect } from '@renderer/components/ui/native-select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { cn } from '@renderer/lib/utils'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  defaultDate: string
  liabilities: Liability[]
  expense?: ExpenseEntry | null
  defaultStatus?: ExpenseStatus
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  month,
  defaultDate,
  liabilities,
  expense = null,
  defaultStatus = 'paid'
}: ExpenseFormDialogProps): JSX.Element {
  const { t } = useLocale()
  const createExpense = useCreateExpense(month)
  const updateExpense = useUpdateExpense(month)
  const { data: categories } = useExpenseCategories()
  const editing = Boolean(expense)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [liabilityId, setLiabilityId] = useState('')
  const [status, setStatus] = useState<ExpenseStatus>(defaultStatus)
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resolvedCategoryId = useMemo(() => {
    if (categoryId) return categoryId
    return categories?.[0]?.id ?? ''
  }, [categoryId, categories])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (expense) {
      setAmount(String(minorToMajor(expense.amountMinor)))
      setNote(expense.note ?? '')
      setCategoryId(expense.categoryId)
      setDate(expense.date)
      setLiabilityId(expense.liabilityId ?? '')
      setStatus(expense.status)
      setDueDate(expense.dueDate ?? '')
      return
    }
    setAmount('')
    setNote('')
    setCategoryId('')
    setDate(defaultDate)
    setLiabilityId('')
    setStatus(defaultStatus)
    setDueDate(defaultStatus === 'due' ? defaultDate : '')
  }, [open, defaultDate, expense, defaultStatus])

  const saving = createExpense.isPending || updateExpense.isPending

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const major = parseMajorInput(amount)
    if (major == null || major <= 0) {
      setError(t('expense.errorAmount'))
      return
    }
    if (!resolvedCategoryId) {
      setError(t('expense.errorCategory'))
      return
    }
    try {
      const payload = {
        categoryId: resolvedCategoryId,
        date,
        amount: major,
        currency: 'PLN' as const,
        note: note.trim() || null,
        liabilityId: liabilityId || null,
        status,
        dueDate: status === 'due' ? dueDate || date : null
      }
      if (expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload })
      } else {
        await createExpense.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="expense-form-dialog">
        <SheetHeader>
          <SheetTitle>{editing ? t('expense.editTitle') : t('expense.addTitle')}</SheetTitle>
          <SheetDescription>
            {editing ? t('expense.editHint') : t('expense.addHint', { month })}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('expense.status')}</Label>
              <div
                className="inline-flex w-fit rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
                role="group"
                aria-label={t('expense.status')}
              >
                {(['paid', 'due'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'h-7 rounded-[5px] px-3 text-[12px] font-medium transition-colors',
                      status === s
                        ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                        : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                    )}
                  >
                    {s === 'paid' ? t('expense.statusPaid') : t('expense.statusDue')}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">{t('expense.date')}</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">{t('expense.amount')}</Label>
                <Input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            {status === 'due' ? (
              <div className="space-y-1.5">
                <Label htmlFor="exp-due">{t('expense.dueDate')}</Label>
                <Input
                  id="exp-due"
                  type="date"
                  value={dueDate || date}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="exp-cat">{t('expense.category')}</Label>
              <NativeSelect
                id="exp-cat"
                value={resolvedCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-liability">{t('expense.linkInstallment')}</Label>
              <NativeSelect
                id="exp-liability"
                value={liabilityId}
                onChange={(e) => setLiabilityId(e.target.value)}
              >
                <option value="">{t('expense.linkNone')}</option>
                {liabilities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-note">{t('expense.note')}</Label>
              <Input
                id="exp-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('expense.notePlaceholder')}
              />
            </div>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving
                ? t('action.saving')
                : editing
                  ? t('action.save')
                  : t('action.addExpense')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
