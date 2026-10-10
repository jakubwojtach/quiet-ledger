import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { useCreateIncome } from '@renderer/hooks/useNetWorth'
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

interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  month
}: IncomeFormDialogProps): JSX.Element {
  const createIncome = useCreateIncome()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAmount('')
    setNote('')
  }, [open])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const major = Number(amount.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setError('Enter a positive income amount.')
      return
    }
    try {
      await createIncome.mutateAsync({
        month,
        amount: major,
        currency: 'PLN',
        note: note.trim() || null,
        allocations: []
      })
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="income-form-dialog">
        <DialogHeader>
          <DialogTitle>Add income</DialogTitle>
          <DialogDescription>Logged for {month}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => void onSubmit(e)}>
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
          {error && <p className="text-sm text-accent">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIncome.isPending}>
              {createIncome.isPending ? 'Saving…' : 'Add income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
