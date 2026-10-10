import type { JSX } from 'react'
import { formatGainPercent, formatMinorUnits } from '@shared/money'
import type { ValuedAsset } from '@shared/types'

interface HoldingsListProps {
  assets: ValuedAsset[]
  selectedAssetId: string | null
  onSelectAsset: (id: string) => void
}

export function HoldingsList({
  assets,
  selectedAssetId,
  onSelectAsset
}: HoldingsListProps): JSX.Element {
  return (
    <div className="space-y-1" role="listbox" aria-label="Holdings">
      {assets.map((v) => {
        const active = selectedAssetId === v.asset.id
        return (
          <div
            key={v.asset.id}
            role="option"
            tabIndex={0}
            aria-selected={active}
            data-testid={`holding-${v.asset.id}`}
            onClick={() => onSelectAsset(v.asset.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectAsset(v.asset.id)
              }
            }}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors select-none ${
              active ? 'bg-forest text-white' : 'hover:bg-paper-deep'
            }`}
          >
            <div>
              <div className="font-medium">{v.asset.name}</div>
              <div className={`text-xs ${active ? 'text-white/80' : 'text-ink-muted'}`}>
                {v.asset.account ?? v.asset.class}
                {v.priceMissing ? ' · no quote yet' : v.priceStale ? ' · stale price' : ''}
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-sm font-medium">{formatMinorUnits(v.plnValueMinor, 'PLN')}</div>
              <div className={`text-xs ${active ? 'text-white/80' : 'text-ink-muted'}`}>
                {v.gainPercent != null
                  ? formatGainPercent(v.gainPercent)
                  : v.nativeCurrency === 'PLN'
                    ? ''
                    : formatMinorUnits(v.nativeValueMinor, v.nativeCurrency)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
