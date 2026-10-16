import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor, parseMajorInput } from '@shared/money'
import type { Asset, AssetMovement, MovementKind } from '@shared/types'
import { useDeleteMovement, useUpsertMovement } from '@renderer/hooks/useNetWorth'
import { useLocale } from '@renderer/lib/i18n/locale'
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
import { cn } from '@renderer/lib/utils'

interface MovementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Extract<Asset, { class: 'savings_pln' | 'savings_usd' }>
  movement: AssetMovement | null
  defaultKind?: MovementKind
}

export function MovementFormDialog({
  open,
  onOpenChange,
  asset,
  movement,
  defaultKind = 'deposit'
}: MovementFormDialogProps): JSX.Element {
  const { t } = useLocale()
  const upsert = useUpsertMovement()
  const remove = useDeleteMovement()
  const [kind, setKind] = useState<MovementKind>(defaultKind)
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const wasOpen = useRef(false)

  // Reset only when the sheet opens — not on every defaultKind change while typing.
  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) return
    wasOpen.current = true
    setError(null)
    if (movement) {
      setKind(movement.kind)
      setDate(movement.date)
      setAmount(String(minorToMajor(movement.amountMinor)))
      setNote(movement.note ?? '')
      return
    }
    setKind(defaultKind)
    setDate(new Date().toISOString().slice(0, 10))
    setAmount('')
    setNote('')
  }, [open, movement, defaultKind])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const major = parseMajorInput(amount)
    if (major == null || major <= 0) {
      setError(t('movements.errorAmount'))
      return
    }
    try {
      await upsert.mutateAsync({
        id: movement?.id,
        assetId: asset.id,
        date,
        kind,
        amount: major,
        currency: asset.currency,
        note: note.trim() || null
      })
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function onDelete(): Promise<void> {
    if (!movement || !confirm(t('movements.confirmDelete'))) return
    try {
      await remove.mutateAsync(movement.id)
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="movement-form-dialog">
        <SheetHeader>
          <SheetTitle>
            {movement
              ? t('movements.editTitle')
              : kind === 'deposit'
                ? t('movements.addDeposit')
                : t('movements.addWithdrawal')}
          </SheetTitle>
          <SheetDescription>
            {asset.name}
            {asset.account ? ` · ${asset.account}` : ''} · {asset.currency}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="inline-flex w-fit rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5">
              {(['deposit', 'withdrawal'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium',
                    kind === k
                      ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                      : 'text-[var(--ink-3)]'
                  )}
                >
                  {t(k === 'deposit' ? 'movements.deposit' : 'movements.withdrawal')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mv-date">{t('movements.date')}</Label>
                <Input
                  id="mv-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mv-amount">{t('movements.amount')}</Label>
                <Input
                  id="mv-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mv-note">{t('movements.note')}</Label>
              <Input id="mv-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
          </SheetBody>
          <SheetFooter className="gap-2">
            {movement ? (
              <Button type="button" variant="outline" className="h-7" onClick={() => void onDelete()}>
                {t('action.delete')}
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button type="button" variant="ghost" className="h-7" onClick={() => onOpenChange(false)}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" className="h-7" disabled={upsert.isPending}>
              {t('action.save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
