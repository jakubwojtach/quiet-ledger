import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor } from '@shared/money'
import type { IncomeEntry } from '@shared/types'
import { useCreateIncome, useUpdateIncome } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'

interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  income?: IncomeEntry | null
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  month,
  income = null
}: IncomeFormDialogProps): JSX.Element {
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome(month)
  const editing = Boolean(income)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (income) {
      setAmount(String(minorToMajor(income.amountMinor)))
      setNote(income.note ?? '')
      return
    }
    setAmount('')
    setNote('')
  }, [open, income])

  const saving = createIncome.isPending || updateIncome.isPending

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const major = Number(amount.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setError('Enter a positive income amount.')
      return
    }
    try {
      if (income) {
        await updateIncome.mutateAsync({
          id: income.id,
          month: income.month,
          amount: major,
          currency: income.currency,
          note: note.trim() || null
        })
      } else {
        await createIncome.mutateAsync({
          month,
          amount: major,
          currency: 'PLN',
          note: note.trim() || null,
          allocations: []
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="income-form-dialog">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit income' : 'Add income'}</SheetTitle>
          <SheetDescription>
            {editing ? 'Update this income line.' : `Logged for ${month}.`}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="inc-amount">Amount (PLN)</Label>
              <Input
                id="inc-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-note">Note</Label>
              <Input
                id="inc-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Salary, bonus…"
              />
            </div>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Add income'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
