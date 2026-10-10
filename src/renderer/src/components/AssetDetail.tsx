import type { JSX } from 'react'
import { formatGainPercent, formatMinorUnits } from '@shared/money'
import { catalogEstimateFor } from '@shared/valuationFormulas'
import { ASSET_CLASS_LABELS, supportsLots, type Asset, type ValuedAsset } from '@shared/types'
import { useAsset } from '@renderer/hooks/useNetWorth'
import { LotsSection } from '@renderer/components/LotsSection'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface AssetDetailProps {
  assetId: string | null
  valued?: ValuedAsset | null
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
}

export function AssetDetail({
  assetId,
  valued,
  onEdit,
  onDelete
}: AssetDetailProps): JSX.Element {
  const needsFetch = Boolean(assetId) && !valued
  const { data: fetched, isLoading, isError, error } = useAsset(needsFetch ? assetId : null)
  const data = valued ?? fetched ?? null

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
          <CardDescription>
            {ASSET_CLASS_LABELS[asset.class]}
            {asset.account ? ` · ${asset.account}` : ''}
          </CardDescription>
          <CardTitle className="font-display text-2xl md:text-3xl">{asset.name}</CardTitle>
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
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <Stat
            label="Price status"
            value={
              data.priceMissing
                ? 'No quote yet'
                : data.priceStale
                  ? 'Last known (stale)'
                  : 'Fresh'
            }
          />
        </div>

        <dl className="space-y-2 text-sm">
          {asset.class === 'etf' && (
            <>
              <Row label="Yahoo symbol" value={asset.ticker} />
              {data.unitPrice != null && (
                <Row label="Price" value={formatPrice(data.unitPrice, data.nativeCurrency)} />
              )}
              <Row label="Quantity" value={(asset.quantityScaled / 1_000_000).toLocaleString('pl-PL')} />
              <Row label="Paid" value={formatMinorUnits(asset.costBasisMinor, asset.costCurrency)} />
              <GainRow data={data} />
            </>
          )}
          {asset.class === 'bond' && (
            <>
              <Row label="Nominal (paid)" value={formatMinorUnits(asset.nominalMinor, asset.currency)} />
              {asset.statementValueMinor != null ? (
                <Row
                  label="Statement value"
                  value={formatMinorUnits(asset.statementValueMinor, asset.currency)}
                />
              ) : (
                <Row
                  label="Unit value"
                  value={`${(asset.unitValueMinor / 100).toFixed(2)} / 100`}
                />
              )}
              <GainRow data={data} />
            </>
          )}
          {asset.class === 'retirement' && (
            <>
              {asset.fundCode && <Row label="analizy.pl code" value={asset.fundCode} />}
              <Row label="Units" value={(asset.unitsScaled / 1_000_000).toLocaleString('pl-PL')} />
              {data.unitPrice != null && (
                <Row label="Unit price" value={formatPrice(data.unitPrice, data.nativeCurrency)} />
              )}
              {asset.costBasisMinor != null && (
                <Row label="Paid" value={formatMinorUnits(asset.costBasisMinor, asset.currency)} />
              )}
              <GainRow data={data} />
            </>
          )}
          {(asset.class === 'savings_usd' || asset.class === 'savings_pln') && (
            <Row label="Balance" value={formatMinorUnits(asset.amountMinor, asset.currency)} />
          )}
          {(asset.class === 'apartment' || asset.class === 'land' || asset.class === 'car') && (
            <>
              <Row
                label="Paid"
                value={
                  asset.costBasisMinor == null
                    ? '—'
                    : formatMinorUnits(asset.costBasisMinor, asset.currency)
                }
              />
              <Row label="Worth now" value={formatMinorUnits(data.nativeValueMinor, data.nativeCurrency)} />
              <Row
                label="Gain"
                value={
                  data.gainPlnMinor == null || data.gainPercent == null
                    ? '—'
                    : `${formatMinorUnits(data.gainPlnMinor, 'PLN')} (${formatGainPercent(data.gainPercent)})`
                }
              />
              <Row label="Valued on" value={data.lastUpdated} />
              {asset.valueSource === 'estimate' && <CatalogRows assetId={asset.id} />}
            </>
          )}
        </dl>
        {supportsLots(asset.class) && (
          <LotsSection asset={asset} priceCurrency={data.nativeCurrency} />
        )}
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

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(price)
}

function GainRow({ data }: { data: ValuedAsset }): JSX.Element | null {
  if (data.gainPlnMinor == null || data.gainPercent == null) return null
  return (
    <Row
      label="Gain (PLN)"
      value={`${formatMinorUnits(data.gainPlnMinor, 'PLN')} (${formatGainPercent(data.gainPercent)})`}
    />
  )
}

function CatalogRows({ assetId }: { assetId: string }): JSX.Element | null {
  const estimate = catalogEstimateFor(assetId)
  if (!estimate) return null
  return (
    <>
      <Row
        label="Catalog"
        value={`${estimate.catalog.plnPerM2.toLocaleString('pl-PL')} zł/m² · ${estimate.catalog.asOf}`}
      />
      <Row label="Formula" value={estimate.formula} />
      <p className="text-xs text-ink-muted">{estimate.catalog.source}</p>
    </>
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
