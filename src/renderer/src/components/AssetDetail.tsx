import type { JSX } from 'react'
import { formatMinorUnits } from '@shared/money'
import { ASSET_CLASS_LABELS, type Asset, type ValuedAsset } from '@shared/types'
import { useAsset } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface AssetDetailProps {
  assetId: string | null
  valued?: ValuedAsset | null
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  onAdd?: () => void
}

export function AssetDetail({
  assetId,
  valued,
  onEdit,
  onDelete,
  onAdd
}: AssetDetailProps): JSX.Element {
  const needsFetch = Boolean(assetId) && !valued
  const { data: fetched, isLoading, isError, error } = useAsset(needsFetch ? assetId : null)
  const data = valued ?? fetched ?? null

  if (!assetId) {
    return (
      <Card className="h-full min-h-48" data-testid="asset-detail-empty">
        <CardHeader>
          <CardTitle>Asset detail</CardTitle>
          <CardDescription>No holding selected.</CardDescription>
        </CardHeader>
        <CardContent>
          {onAdd && (
            <Button onClick={onAdd} data-testid="add-asset-empty">
              Add holding
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!data && isLoading) {
    return (
      <Card className="animate-pulse" data-testid="asset-detail-loading">
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
        </CardHeader>
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (!data || isError) {
    return (
      <Card data-testid="asset-detail-error">
        <CardHeader>
          <CardTitle>Asset unavailable</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Not found'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { asset } = data

  return (
    <Card data-testid="asset-detail">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardDescription>{ASSET_CLASS_LABELS[asset.class]}</CardDescription>
          <CardTitle className="font-display text-2xl">{asset.name}</CardTitle>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(asset)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Delete “${asset.name}”?`)) onDelete(asset)
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Native value" value={formatMinorUnits(data.nativeValueMinor, data.nativeCurrency)} />
          <Stat label="PLN value" value={formatMinorUnits(data.plnValueMinor, 'PLN')} />
          <Stat
            label="Last updated"
            value={
              data.lastUpdated.includes('T')
                ? new Date(data.lastUpdated).toLocaleString('pl-PL')
                : data.lastUpdated
            }
          />
          <Stat label="Price status" value={data.priceStale ? 'Last known (stale)' : 'Fresh'} />
        </div>

        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          {asset.class === 'etf' && (
            <>
              <Row label="Ticker" value={asset.ticker} />
              <Row label="Quantity" value={(asset.quantityScaled / 1_000_000).toLocaleString('pl-PL')} />
              <Row
                label="Cost basis"
                value={formatMinorUnits(asset.costBasisMinor, asset.costCurrency)}
              />
            </>
          )}
          {asset.class === 'bond' && (
            <>
              <Row label="Nominal" value={formatMinorUnits(asset.nominalMinor, asset.currency)} />
              <Row
                label="Unit value"
                value={`${(asset.unitValueMinor / 100).toFixed(2)} / 100`}
              />
            </>
          )}
          {asset.class === 'retirement' && (
            <>
              <Row label="Units" value={(asset.unitsScaled / 1_000_000).toLocaleString('pl-PL')} />
              <Row
                label="Unit price"
                value={formatMinorUnits(asset.unitPriceMinor, asset.currency)}
              />
            </>
          )}
          {(asset.class === 'savings_usd' || asset.class === 'savings_pln') && (
            <Row label="Balance" value={formatMinorUnits(asset.amountMinor, asset.currency)} />
          )}
          {(asset.class === 'apartment' || asset.class === 'land' || asset.class === 'car') && (
            <>
              <Row label="Manual value" value={formatMinorUnits(asset.valueMinor, asset.currency)} />
              <Row label="Valued on" value={asset.valuedOn} />
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-paper-deep/70 p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
