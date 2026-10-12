import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor } from '@shared/money'
import type { Liability } from '@shared/types'
import { useUpsertLiability } from '@renderer/hooks/useNetWorth'
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

interface LiabilityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liability?: Liability | null
}

export function LiabilityFormDialog({
  open,
  onOpenChange,
  liability
}: LiabilityFormDialogProps): JSX.Element {
  const upsert = useUpsertLiability()
  const editing = Boolean(liability)

  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [principal, setPrincipal] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [nextDueDate, setNextDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (!liability) {
      setName('')
      setProvider('')
      setPrincipal('')
      setMonthlyPayment('')
      setCurrency('PLN')
      setNextDueDate('')
      setNotes('')
      return
    }
    setName(liability.name)
    setProvider(liability.provider ?? '')
    setPrincipal(String(minorToMajor(liability.principalMinor)))
    setMonthlyPayment(String(minorToMajor(liability.monthlyPaymentMinor)))
    setCurrency(liability.currency)
    setNextDueDate(liability.nextDueDate ?? '')
    setNotes(liability.notes ?? '')
  }, [open, liability])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    try {
      await upsert.mutateAsync({
        id: liability?.id,
        name: name.trim(),
        provider: provider.trim() || null,
        principal: Number(principal.replace(',', '.')),
        monthlyPayment: Number(monthlyPayment.replace(',', '.')),
        currency,
        nextDueDate: nextDueDate || null,
        notes: notes.trim() || null
      })
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="liability-form-dialog">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit installment' : 'Add installment'}</SheetTitle>
          <SheetDescription>
            Pożyczka / e-raty — principal and monthly payment in normal currency units.
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="liab-name">Name</Label>
              <Input id="liab-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="liab-provider">Provider</Label>
              <Input
                id="liab-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Bank, carrier…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="liab-principal">Remaining principal</Label>
                <Input
                  id="liab-principal"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liab-payment">Monthly payment</Label>
                <Input
                  id="liab-payment"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="liab-ccy">Currency</Label>
                <Input id="liab-ccy" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liab-due">Next due</Label>
                <Input
                  id="liab-due"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="liab-notes">Notes</Label>
              <Input id="liab-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add installment'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
