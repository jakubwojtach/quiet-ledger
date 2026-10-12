import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor } from '@shared/money'
import type { ExpenseEntry, Liability } from '@shared/types'
import { useCreateExpense, useExpenseCategories, useUpdateExpense } from '@renderer/hooks/useNetWorth'
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

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  defaultDate: string
  liabilities: Liability[]
  expense?: ExpenseEntry | null
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  month,
  defaultDate,
  liabilities,
  expense = null
}: ExpenseFormDialogProps): JSX.Element {
  const createExpense = useCreateExpense(month)
  const updateExpense = useUpdateExpense(month)
  const { data: categories } = useExpenseCategories()
  const editing = Boolean(expense)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [liabilityId, setLiabilityId] = useState('')
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
      return
    }
    setAmount('')
    setNote('')
    setCategoryId('')
    setDate(defaultDate)
    setLiabilityId('')
  }, [open, defaultDate, expense])

  const saving = createExpense.isPending || updateExpense.isPending

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const major = Number(amount.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setError('Enter a positive expense amount.')
      return
    }
    if (!resolvedCategoryId) {
      setError('Pick a category.')
      return
    }
    try {
      const payload = {
        categoryId: resolvedCategoryId,
        date,
        amount: major,
        currency: 'PLN' as const,
        note: note.trim() || null,
        liabilityId: liabilityId || null
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
          <SheetTitle>{editing ? 'Edit expense' : 'Add expense'}</SheetTitle>
          <SheetDescription>
            {editing
              ? 'Update this spending line.'
              : `Food, transport, and other spending for ${month}.`}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Amount (PLN)</Label>
                <Input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-cat">Category</Label>
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
              <Label htmlFor="exp-liability">Link to installment (optional)</Label>
              <NativeSelect
                id="exp-liability"
                value={liabilityId}
                onChange={(e) => setLiabilityId(e.target.value)}
              >
                <option value="">None</option>
                {liabilities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-note">Note</Label>
              <Input
                id="exp-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Groceries, ticket…"
              />
            </div>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Add expense'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
