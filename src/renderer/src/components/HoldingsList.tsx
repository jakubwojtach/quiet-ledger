import type { JSX } from 'react'
import { formatGainPercent, formatMinorUnits } from '@shared/money'
import type { ValuedAsset } from '@shared/types'
import { StaggerItem, StaggerList } from '@renderer/components/motion/PageTransition'

interface HoldingsListProps {
  assets: ValuedAsset[]
  onOpenAsset: (id: string) => void
}

export function HoldingsList({ assets, onOpenAsset }: HoldingsListProps): JSX.Element {
  return (
    <StaggerList className="space-y-1" role="list" aria-label="Holdings">
      {assets.map((v) => (
        <StaggerItem key={v.asset.id}>
          <button
            type="button"
            data-testid={`holding-${v.asset.id}`}
            onClick={() => onOpenAsset(v.asset.id)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors select-none hover:bg-paper-deep/80 active:bg-paper-deep"
          >
            <div>
              <div className="font-medium">{v.asset.name}</div>
              <div className="text-xs text-ink-muted">
                {v.asset.account ?? v.asset.class}
                {v.priceMissing ? ' · no quote yet' : v.priceStale ? ' · stale price' : ''}
                {(v.asset.lotCount ?? 0) > 0 ? ` · ${v.asset.lotCount} purchases` : ''}
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-sm font-medium">{formatMinorUnits(v.plnValueMinor, 'PLN')}</div>
              <div className="text-xs text-ink-muted">
                {v.gainPercent != null
                  ? formatGainPercent(v.gainPercent)
                  : v.nativeCurrency === 'PLN'
                    ? ''
                    : formatMinorUnits(v.nativeValueMinor, v.nativeCurrency)}
              </div>
            </div>
          </button>
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
