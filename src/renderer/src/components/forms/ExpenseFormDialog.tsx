import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react'
import type { Liability } from '@shared/types'
import { useCreateExpense, useExpenseCategories } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  defaultDate: string
  liabilities: Liability[]
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  month,
  defaultDate,
  liabilities
}: ExpenseFormDialogProps): JSX.Element {
  const createExpense = useCreateExpense(month)
  const { data: categories } = useExpenseCategories()
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
    setAmount('')
    setNote('')
    setCategoryId('')
    setDate(defaultDate)
    setLiabilityId('')
  }, [open, defaultDate])

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
      await createExpense.mutateAsync({
        categoryId: resolvedCategoryId,
        date,
        amount: major,
        currency: 'PLN',
        note: note.trim() || null,
        liabilityId: liabilityId || null
      })
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="expense-form-dialog">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Food, transport, and other spending for {month}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
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
              {liabilities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
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
          {error && <p className="text-sm text-accent">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Saving…' : 'Add expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
