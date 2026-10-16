import { useState, type JSX } from 'react'
import { formatGainPercent, formatMinorUnits } from '@shared/money'
import {
  LOT_PRICE_SCALE,
  QUANTITY_SCALE,
  type Asset,
  type AssetLot,
  type ValuedLot
} from '@shared/types'
import { useLots } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { LotFormDialog } from '@renderer/components/forms/LotFormDialog'

interface LotsSectionProps {
  asset: Asset
  /** Currency the live price is quoted in; default for a new purchase's price. */
  priceCurrency: string
}

interface MonthGroup {
  month: string
  lots: ValuedLot[]
  paidPlnMinor: number
  plnValueMinor: number
}

function groupByMonth(lots: ValuedLot[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>()
  for (const v of lots) {
    const month = v.lot.date.slice(0, 7)
    const g = groups.get(month) ?? { month, lots: [], paidPlnMinor: 0, plnValueMinor: 0 }
    g.lots.push(v)
    g.paidPlnMinor += v.paidPlnMinor
    g.plnValueMinor += v.plnValueMinor
    groups.set(month, g)
  }
  return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month))
}

function gainLabel(gainMinor: number, paidMinor: number): string {
  if (paidMinor === 0) return '—'
  return formatGainPercent((gainMinor / paidMinor) * 100)
}

function quantityLabel(asset: Asset, lot: AssetLot): string {
  const sell = lot.quantityScaled < 0
  const qty = (Math.abs(lot.quantityScaled) / QUANTITY_SCALE).toLocaleString('pl-PL', {
    maximumFractionDigits: 6
  })
  const prefix = sell ? '−' : ''
  if (asset.class === 'bond') return `${prefix}${qty} szt.${lot.series ? ` ${lot.series}` : ''}`
  if (lot.priceScaled == null || !lot.priceCurrency) return `${prefix}${qty}`
  const price = (lot.priceScaled / LOT_PRICE_SCALE).toLocaleString('pl-PL', {
    maximumFractionDigits: 4
  })
  return `${prefix}${qty} @ ${price} ${lot.priceCurrency}${sell ? ' · out' : ''}`
}

export function LotsSection({ asset, priceCurrency }: LotsSectionProps): JSX.Element {
  const { data: lots = [], isLoading } = useLots(asset.id)
  const [editing, setEditing] = useState<AssetLot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const groups = groupByMonth(lots)
  const valueIsShare = lots.some((v) => v.valueIsShare)

  const fundStyle = asset.class === 'retirement'

  function openNew(): void {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <section className="space-y-3" data-testid="lots-section">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">
          {fundStyle ? 'Contributions & withdrawals' : 'Purchases'}
        </h2>
        <Button size="sm" variant="outline" className="h-7" onClick={openNew} data-testid="add-lot">
          {fundStyle ? 'Add movement' : 'Add purchase'}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!isLoading && lots.length === 0 && (
        <p className="text-sm text-ink-muted">
          No purchases yet. The first purchase replaces the totals above, so add an opening
          purchase for anything bought earlier.
        </p>
      )}

      {groups.map((g) => (
        <div key={g.month} className="space-y-1">
          <div className="flex justify-between text-xs text-ink-muted">
            <span>{g.month}</span>
            <span className="tabular-nums">
              {formatMinorUnits(g.paidPlnMinor, 'PLN')} → {formatMinorUnits(g.plnValueMinor, 'PLN')}{' '}
              ({gainLabel(g.plnValueMinor - g.paidPlnMinor, g.paidPlnMinor)})
            </span>
          </div>
          <ul className="divide-y divide-line rounded-lg bg-paper-deep/50">
            {g.lots.map((v) => (
              <li key={v.lot.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-paper-deep"
                  onClick={() => {
                    setEditing(v.lot)
                    setDialogOpen(true)
                  }}
                >
                  <span className="min-w-0">
                    <span className="block tabular-nums">
                      {v.lot.date}
                      {v.lot.estimated && <span className="ml-1 text-xs text-ink-muted">(est.)</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {quantityLabel(asset, v.lot)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block">{formatMinorUnits(v.plnValueMinor, 'PLN')}</span>
                    <span className="block text-xs text-ink-muted">
                      paid {formatMinorUnits(v.lot.paidMinor, v.lot.paidCurrency)}
                      {v.gainPercent != null && ` · ${formatGainPercent(v.gainPercent)}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {valueIsShare && lots.length > 0 && (
        <p className="text-xs text-ink-muted">
          Worth per purchase is its share of the statement value, by amount paid.
        </p>
      )}

      <LotFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={asset}
        lot={editing}
        priceCurrency={priceCurrency}
      />
    </section>
  )
}
