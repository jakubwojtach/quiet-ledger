import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { ASSET_CLASS_LABELS, QUANTITY_SCALE, type Asset, type AssetClass } from '@shared/types'
import { majorToMinor, minorToMajor } from '@shared/money'
import { catalogEstimateFor } from '@shared/valuationFormulas'
import type { UpsertAssetRequest } from '@shared/ipc'
import { useUpsertAsset } from '@renderer/hooks/useNetWorth'
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
  const totalsFromLots = (asset?.lotCount ?? 0) > 0
  const catalogEstimate =
    asset &&
    (asset.class === 'apartment' || asset.class === 'land' || asset.class === 'car') &&
    asset.valueSource === 'estimate'
      ? catalogEstimateFor(asset.id)
      : null

  const [cls, setCls] = useState<AssetClass>('savings_pln')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [account, setAccount] = useState('')
  const [fundCode, setFundCode] = useState('')
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costBasis, setCostBasis] = useState('')
  const [costCurrency, setCostCurrency] = useState('EUR')
  const [nominal, setNominal] = useState('')
  const [unitValue, setUnitValue] = useState('')
  const [units, setUnits] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [value, setValue] = useState('')
  const [paid, setPaid] = useState('')
  const [valuedOn, setValuedOn] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (!asset) {
      setCls('savings_pln')
      setName('')
      setNotes('')
      setAccount('')
      setFundCode('')
      setTicker('')
      setQuantity('')
      setCostBasis('')
      setCostCurrency('EUR')
      setNominal('')
      setUnitValue('')
      setUnits('')
      setUnitPrice('')
      setAmount('')
      setCurrency('PLN')
      setValue('')
      setPaid('')
      setValuedOn(new Date().toISOString().slice(0, 10))
      return
    }
    setCls(asset.class)
    setName(asset.name)
    setNotes(asset.notes ?? '')
    setAccount(asset.account ?? '')
    if (asset.class === 'etf') {
      setTicker(asset.ticker)
      setQuantity(String(asset.quantityScaled / QUANTITY_SCALE))
      setCostBasis(String(minorToMajor(asset.costBasisMinor)))
      setCostCurrency(asset.costCurrency)
    } else if (asset.class === 'bond') {
      setNominal(String(minorToMajor(asset.nominalMinor)))
      setUnitValue(String(minorToMajor(asset.unitValueMinor)))
      setCurrency(asset.currency)
      setValue(
        asset.statementValueMinor == null ? '' : String(minorToMajor(asset.statementValueMinor))
      )
      setValuedOn(asset.valuedOn ?? new Date().toISOString().slice(0, 10))
    } else if (asset.class === 'retirement') {
      setUnits(String(asset.unitsScaled / QUANTITY_SCALE))
      setUnitPrice(String(minorToMajor(asset.unitPriceMinor)))
      setCurrency(asset.currency)
      setFundCode(asset.fundCode ?? '')
      setPaid(asset.costBasisMinor == null ? '' : String(minorToMajor(asset.costBasisMinor)))
    } else if (asset.class === 'savings_usd' || asset.class === 'savings_pln') {
      setAmount(String(minorToMajor(asset.amountMinor)))
      setCurrency(asset.currency)
    } else {
      setValue(String(minorToMajor(asset.valueMinor)))
      setPaid(asset.costBasisMinor == null ? '' : String(minorToMajor(asset.costBasisMinor)))
      setCurrency(asset.currency)
      setValuedOn(asset.valuedOn)
    }
  }, [open, asset])

  function num(s: string): number {
    return Number(s.replace(/\s/g, '').replace(',', '.'))
  }

  /** Blank → null; otherwise a non-negative number or an error message. */
  function optionalAmount(s: string, label: string): number | null {
    const trimmed = s.trim()
    if (!trimmed) return null
    const n = num(trimmed)
    if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative amount.`)
    return n
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
        notes: notes.trim() || null,
        account: account.trim() || null
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
            currency,
            statementValue: optionalAmount(value, 'Statement value'),
            valuedOn: value.trim() ? valuedOn : null
          }
          break
        case 'retirement':
          payload = {
            ...base,
            class: 'retirement',
            units: num(units),
            unitPrice: num(unitPrice),
            currency,
            fundCode: fundCode.trim() || null,
            costBasis: optionalAmount(paid, 'Paid')
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
        case 'car': {
          const worth = num(value)
          if (!Number.isFinite(worth) || worth < 0) {
            setError('Worth now must be a non-negative amount.')
            return
          }
          const paidTrimmed = paid.trim()
          let paidMajor: number | null = null
          if (paidTrimmed) {
            paidMajor = num(paidTrimmed)
            if (!Number.isFinite(paidMajor) || paidMajor < 0) {
              setError('Paid must be a non-negative amount.')
              return
            }
          }
          const keepEstimate =
            catalogEstimate != null && majorToMinor(worth) === catalogEstimate.worthMinor
          payload = {
            ...base,
            class: cls,
            value: worth,
            currency,
            valuedOn,
            costBasis: paidMajor,
            valueSource: keepEstimate ? 'estimate' : 'manual'
          }
          break
        }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="asset-form-dialog" className="max-w-[460px]">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit holding' : 'Add holding'}</SheetTitle>
          <SheetDescription>
            Enter amounts in normal currency units (e.g. 1000.50). Saved as grosze/cents locally.
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="asset-class">Type</Label>
            <NativeSelect
              id="asset-class"
              value={cls}
              disabled={editing}
              onChange={(e) => setCls(e.target.value as AssetClass)}
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ASSET_CLASS_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Field
            label="Account (IKE, IKZE Kaja, Broker USD…)"
            id="asset-account"
            value={account}
            onChange={setAccount}
          />

          {totalsFromLots && (
            <p className="text-xs text-ink-muted">
              Quantity and paid add up from {asset?.lotCount} purchases. Change them under Purchases.
            </p>
          )}
          {cls === 'etf' && (
            <>
              <Field
                label="Yahoo symbol (VWCE.DE, ISAC.L, ETFBM40TR.WA)"
                id="ticker"
                value={ticker}
                onChange={setTicker}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Quantity"
                  id="qty"
                  value={quantity}
                  onChange={setQuantity}
                  disabled={totalsFromLots}
                />
                <Field
                  label="Cost basis"
                  id="cost"
                  value={costBasis}
                  onChange={setCostBasis}
                  disabled={totalsFromLots}
                />
              </div>
              <Field
                label="Cost currency"
                id="cost-ccy"
                value={costCurrency}
                onChange={setCostCurrency}
                disabled={totalsFromLots}
              />
            </>
          )}
          {cls === 'bond' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nominal"
                  id="nominal"
                  value={nominal}
                  onChange={setNominal}
                  disabled={totalsFromLots}
                />
                <Field
                  label="Unit value (/100)"
                  id="unit-val"
                  value={unitValue}
                  onChange={setUnitValue}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Statement value (optional)"
                  id="bond-stmt"
                  value={value}
                  onChange={setValue}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="bond-valued-on">Statement date</Label>
                  <Input
                    id="bond-valued-on"
                    type="date"
                    value={valuedOn}
                    onChange={(e) => setValuedOn(e.target.value)}
                  />
                </div>
              </div>
              <Field label="Currency" id="bond-ccy" value={currency} onChange={setCurrency} />
            </>
          )}
          {cls === 'retirement' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Units"
                  id="units"
                  value={units}
                  onChange={setUnits}
                  disabled={totalsFromLots}
                />
                <Field
                  label="Unit price (fallback)"
                  id="uprice"
                  value={unitPrice}
                  onChange={setUnitPrice}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="analizy.pl fund code (ING80K)"
                  id="fund-code"
                  value={fundCode}
                  onChange={setFundCode}
                />
                <Field
                  label="Paid (optional)"
                  id="ret-paid"
                  value={paid}
                  onChange={setPaid}
                  disabled={totalsFromLots}
                />
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
              <Field label="Paid" id="paid" value={paid} onChange={setPaid} />
              <Field label="Worth now" id="mval" value={value} onChange={setValue} />
              {catalogEstimate && (
                <p className="text-xs text-ink-muted">
                  Worth is the {catalogEstimate.catalog.label} catalog estimate and refreshes on launch. Change worth to
                  keep a manual figure. Paid stays as you save it.
                </p>
              )}
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

          {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add holding'}
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
  onChange,
  disabled
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
