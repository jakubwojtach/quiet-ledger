import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor } from '@shared/money'
import { LOT_PRICE_SCALE, QUANTITY_SCALE, type Asset, type AssetLot } from '@shared/types'
import { useDeleteLot, useUpsertLot } from '@renderer/hooks/useNetWorth'
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

/** Polish retail treasury bonds are issued at 100 zł each. */
const BOND_UNIT_PRICE = 100

interface LotFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset
  /** When set, the dialog edits this purchase. */
  lot: AssetLot | null
  priceCurrency: string
}

function paidCurrencyOf(asset: Asset): string {
  if (asset.class === 'etf') return asset.costCurrency
  if (asset.class === 'bond' || asset.class === 'retirement') return asset.currency
  return 'PLN'
}

function num(s: string): number {
  return Number(s.replace(/\s/g, '').replace(',', '.'))
}

export function LotFormDialog({
  open,
  onOpenChange,
  asset,
  lot,
  priceCurrency
}: LotFormDialogProps): JSX.Element {
  const upsert = useUpsertLot()
  const remove = useDeleteLot()
  const isBond = asset.class === 'bond'

  const [date, setDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [priceCcy, setPriceCcy] = useState('')
  const [paid, setPaid] = useState('')
  const [paidCcy, setPaidCcy] = useState('')
  const [series, setSeries] = useState('')
  const [estimated, setEstimated] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (lot) {
      setDate(lot.date)
      setQuantity(String(lot.quantityScaled / QUANTITY_SCALE))
      setPrice(lot.priceScaled == null ? '' : String(lot.priceScaled / LOT_PRICE_SCALE))
      setPriceCcy(lot.priceCurrency ?? priceCurrency)
      setPaid(String(minorToMajor(lot.paidMinor)))
      setPaidCcy(lot.paidCurrency)
      setSeries(lot.series ?? '')
      setEstimated(lot.estimated)
      setNote(lot.note ?? '')
      return
    }
    setDate(new Date().toISOString().slice(0, 10))
    setQuantity('')
    setPrice(isBond ? String(BOND_UNIT_PRICE) : '')
    setPriceCcy(priceCurrency)
    setPaid('')
    setPaidCcy(paidCurrencyOf(asset))
    setSeries('')
    setEstimated(false)
    setNote('')
  }, [open, lot, asset, priceCurrency, isBond])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const priceN = price.trim() ? num(price) : null
    let qty = quantity.trim() ? num(quantity) : null
    let paidN = paid.trim() ? num(paid) : null
    const sameCurrency = priceCcy.toUpperCase() === paidCcy.toUpperCase()

    // Fill the one missing figure when price and paid are in the same currency.
    if (priceN != null && sameCurrency) {
      if (qty == null && paidN != null) qty = Math.round((paidN / priceN) * 1e6) / 1e6
      if (paidN == null && qty != null) paidN = Math.round(qty * priceN * 100) / 100
    }
    if (qty == null || !Number.isFinite(qty) || qty <= 0) {
      setError(isBond ? 'Number of bonds is required.' : 'Quantity is required (or price and paid).')
      return
    }
    if (paidN == null || !Number.isFinite(paidN) || paidN < 0) {
      setError('Paid is required.')
      return
    }
    if (priceN != null && (!Number.isFinite(priceN) || priceN <= 0)) {
      setError('Price must be a positive number.')
      return
    }

    try {
      await upsert.mutateAsync({
        id: lot?.id,
        assetId: asset.id,
        date,
        quantity: qty,
        price: priceN,
        priceCurrency: priceN == null ? null : priceCcy.toUpperCase(),
        paid: paidN,
        paidCurrency: paidCcy.toUpperCase(),
        series: isBond ? series.trim() || null : null,
        estimated,
        note: note.trim() || null
      })
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function onDelete(): Promise<void> {
    if (!lot || !confirm(`Delete the ${lot.date} purchase?`)) return
    try {
      await remove.mutateAsync(lot.id)
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="lot-form-dialog">
        <SheetHeader>
          <SheetTitle>{lot ? 'Edit purchase' : 'Add purchase'}</SheetTitle>
          <SheetDescription>
            {asset.name}
            {asset.account ? ` · ${asset.account}` : ''}.{' '}
            {isBond
              ? 'Paid fills in from the number of bonds × 100 zł.'
              : 'Leave quantity or paid blank to work it out from the price, when both are in the same currency.'}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lot-date">Date</Label>
                <Input
                  id="lot-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              {isBond ? (
                <Field label="Bond code (EDO0336)" id="lot-series" value={series} onChange={setSeries} />
              ) : (
                <Field label="Quantity" id="lot-qty" value={quantity} onChange={setQuantity} />
              )}
            </div>
            {isBond ? (
              <Field label="Number of bonds" id="lot-qty" value={quantity} onChange={setQuantity} />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={isBond ? 'Price per bond' : 'Price per unit'}
                id="lot-price"
                value={price}
                onChange={setPrice}
              />
              <Field label="Price currency" id="lot-price-ccy" value={priceCcy} onChange={setPriceCcy} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Paid (incl. fees)" id="lot-paid" value={paid} onChange={setPaid} />
              <Field label="Paid currency" id="lot-paid-ccy" value={paidCcy} onChange={setPaidCcy} />
            </div>
            <Field label="Note" id="lot-note" value={note} onChange={setNote} />
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
              <input
                type="checkbox"
                className="size-3.5 rounded border-[var(--line-strong)]"
                checked={estimated}
                onChange={(e) => setEstimated(e.target.checked)}
              />
              Estimated (opening balance or worked-out units)
            </label>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            {lot ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto text-[var(--loss)]"
                onClick={() => void onDelete()}
                disabled={remove.isPending}
              >
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : lot ? 'Save' : 'Add purchase'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  id,
  value,
  onChange
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
