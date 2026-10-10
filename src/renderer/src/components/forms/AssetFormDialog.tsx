import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { ASSET_CLASS_LABELS, QUANTITY_SCALE, type Asset, type AssetClass } from '@shared/types'
import { minorToMajor } from '@shared/money'
import type { UpsertAssetRequest } from '@shared/ipc'
import { useUpsertAsset } from '@renderer/hooks/useNetWorth'
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

const CLASSES = Object.keys(ASSET_CLASS_LABELS) as AssetClass[]

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, form edits this asset */
  asset?: Asset | null
}

export function AssetFormDialog({ open, onOpenChange, asset }: AssetFormDialogProps): JSX.Element {
  const upsert = useUpsertAsset()
  const editing = Boolean(asset)

  const [cls, setCls] = useState<AssetClass>('savings_pln')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [costBasis, setCostBasis] = useState('0')
  const [costCurrency, setCostCurrency] = useState('EUR')
  const [nominal, setNominal] = useState('10000')
  const [unitValue, setUnitValue] = useState('100')
  const [units, setUnits] = useState('100')
  const [unitPrice, setUnitPrice] = useState('10')
  const [amount, setAmount] = useState('1000')
  const [currency, setCurrency] = useState('PLN')
  const [value, setValue] = useState('100000')
  const [valuedOn, setValuedOn] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (!asset) {
      setCls('savings_pln')
      setName('')
      setNotes('')
      setTicker('VWCE.DE')
      setQuantity('10')
      setCostBasis('1000')
      setCostCurrency('EUR')
      setNominal('10000')
      setUnitValue('100')
      setUnits('100')
      setUnitPrice('10')
      setAmount('1000')
      setCurrency('PLN')
      setValue('100000')
      setValuedOn(new Date().toISOString().slice(0, 10))
      return
    }
    setCls(asset.class)
    setName(asset.name)
    setNotes(asset.notes ?? '')
    if (asset.class === 'etf') {
      setTicker(asset.ticker)
      setQuantity(String(asset.quantityScaled / QUANTITY_SCALE))
      setCostBasis(String(minorToMajor(asset.costBasisMinor)))
      setCostCurrency(asset.costCurrency)
    } else if (asset.class === 'bond') {
      setNominal(String(minorToMajor(asset.nominalMinor)))
      setUnitValue(String(minorToMajor(asset.unitValueMinor)))
      setCurrency(asset.currency)
    } else if (asset.class === 'retirement') {
      setUnits(String(asset.unitsScaled / QUANTITY_SCALE))
      setUnitPrice(String(minorToMajor(asset.unitPriceMinor)))
      setCurrency(asset.currency)
    } else if (asset.class === 'savings_usd' || asset.class === 'savings_pln') {
      setAmount(String(minorToMajor(asset.amountMinor)))
      setCurrency(asset.currency)
    } else {
      setValue(String(minorToMajor(asset.valueMinor)))
      setCurrency(asset.currency)
      setValuedOn(asset.valuedOn)
    }
  }, [open, asset])

  function num(s: string): number {
    return Number(s.replace(',', '.'))
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    let payload: UpsertAssetRequest
    try {
      const base = {
        id: asset?.id,
        name: name.trim(),
        notes: notes.trim() || null
      }
      switch (cls) {
        case 'etf':
          payload = {
            ...base,
            class: 'etf',
            ticker: ticker.trim(),
            quantity: num(quantity),
            costBasis: num(costBasis),
            costCurrency
          }
          break
        case 'bond':
          payload = {
            ...base,
            class: 'bond',
            nominal: num(nominal),
            unitValue: num(unitValue),
            currency
          }
          break
        case 'retirement':
          payload = {
            ...base,
            class: 'retirement',
            units: num(units),
            unitPrice: num(unitPrice),
            currency
          }
          break
        case 'savings_usd':
          payload = {
            ...base,
            class: 'savings_usd',
            amount: num(amount),
            currency: currency || 'USD'
          }
          break
        case 'savings_pln':
          payload = {
            ...base,
            class: 'savings_pln',
            amount: num(amount),
            currency: 'PLN'
          }
          break
        case 'apartment':
        case 'land':
        case 'car':
          payload = {
            ...base,
            class: cls,
            value: num(value),
            currency,
            valuedOn
          }
          break
        default: {
          const _e: never = cls
          throw new Error(`Unknown class ${_e}`)
        }
      }
    } catch (err) {
      setError((err as Error).message)
      return
    }

    try {
      await upsert.mutateAsync(payload)
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="asset-form-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit holding' : 'Add holding'}</DialogTitle>
          <DialogDescription>
            Enter amounts in normal currency units (e.g. 1000.50). Saved as grosze/cents locally.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="asset-class">Type</Label>
            <select
              id="asset-class"
              className="flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
              value={cls}
              disabled={editing}
              onChange={(e) => setCls(e.target.value as AssetClass)}
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ASSET_CLASS_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {cls === 'etf' && (
            <>
              <Field label="Ticker" id="ticker" value={ticker} onChange={setTicker} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" id="qty" value={quantity} onChange={setQuantity} />
                <Field label="Cost basis" id="cost" value={costBasis} onChange={setCostBasis} />
              </div>
              <Field label="Cost currency" id="cost-ccy" value={costCurrency} onChange={setCostCurrency} />
            </>
          )}
          {cls === 'bond' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nominal" id="nominal" value={nominal} onChange={setNominal} />
                <Field
                  label="Unit value (/100)"
                  id="unit-val"
                  value={unitValue}
                  onChange={setUnitValue}
                />
              </div>
              <Field label="Currency" id="bond-ccy" value={currency} onChange={setCurrency} />
            </>
          )}
          {cls === 'retirement' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Units" id="units" value={units} onChange={setUnits} />
                <Field label="Unit price" id="uprice" value={unitPrice} onChange={setUnitPrice} />
              </div>
              <Field label="Currency" id="ret-ccy" value={currency} onChange={setCurrency} />
            </>
          )}
          {(cls === 'savings_usd' || cls === 'savings_pln') && (
            <>
              <Field label="Balance" id="bal" value={amount} onChange={setAmount} />
              {cls === 'savings_usd' && (
                <Field label="Currency" id="sav-ccy" value={currency} onChange={setCurrency} />
              )}
            </>
          )}
          {(cls === 'apartment' || cls === 'land' || cls === 'car') && (
            <>
              <Field label="Manual value" id="mval" value={value} onChange={setValue} />
              <Field label="Currency" id="man-ccy" value={currency} onChange={setCurrency} />
              <div className="space-y-1.5">
                <Label htmlFor="valued-on">Valued on</Label>
                <Input
                  id="valued-on"
                  type="date"
                  value={valuedOn}
                  onChange={(e) => setValuedOn(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="asset-notes">Notes</Label>
            <Input id="asset-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-accent">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add holding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
