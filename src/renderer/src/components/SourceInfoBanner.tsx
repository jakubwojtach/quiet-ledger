import { useEffect, useState, type JSX } from 'react'
import { Info, X } from 'lucide-react'
import { catalogEstimateFor } from '@shared/valuationFormulas'
import type { Asset, AssetClass, ValuedAsset } from '@shared/types'
import { useLocale } from '@renderer/lib/i18n/locale'
import { cn } from '@renderer/lib/utils'

const STORAGE_PREFIX = 'holding-source-banner:'

function storageKey(assetClass: AssetClass): string {
  return `${STORAGE_PREFIX}${assetClass}`
}

function sourceMessage(
  asset: Asset,
  valued: ValuedAsset,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  switch (asset.class) {
    case 'etf':
      return t('source.etf', {
        fx: valued.nativeCurrency !== 'PLN' ? t('source.etfFx') : ''
      }).trim()
    case 'bond':
      return t('source.bond', {
        worth:
          asset.statementValueMinor != null ? t('source.bondStatement') : t('source.bondUnit')
      })
    case 'retirement':
      return asset.fundCode
        ? t('source.retirementFund', { code: asset.fundCode })
        : t('source.retirementManual')
    case 'savings_usd':
      return t('source.savingsUsd')
    case 'savings_pln':
      return t('source.savingsPln')
    case 'apartment':
    case 'land': {
      if (asset.valueSource === 'estimate') {
        const estimate = catalogEstimateFor(asset.id)
        if (estimate) return estimate.catalog.source
      }
      return t('source.propertyManual')
    }
    case 'car':
      return t('source.car')
    default:
      return t('source.default')
  }
}

export function SourceInfoBanner({
  asset,
  valued,
  className
}: {
  asset: Asset
  valued: ValuedAsset
  className?: string
}): JSX.Element | null {
  const { t } = useLocale()
  const key = storageKey(asset.class)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(key) !== '1')
    } catch {
      setOpen(true)
    }
  }, [key])

  if (!open) return null

  return (
    <div
      role="note"
      data-testid="source-info-banner"
      className={cn(
        'flex gap-3 rounded-2xl border border-forest/25 bg-gradient-to-br from-[var(--banner-from)] via-[var(--banner-via)] to-[var(--color-card)] px-4 py-3 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
        className
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-soft">
          {t('source.title')}
        </p>
        <p className="mt-1 leading-relaxed text-ink-muted">{sourceMessage(asset, valued, t)}</p>
      </div>
      <button
        type="button"
        aria-label={t('source.dismiss')}
        className="shrink-0 rounded-md p-1 text-ink-muted transition-colors hover:bg-paper-deep/80 hover:text-ink"
        onClick={() => {
          try {
            localStorage.setItem(key, '1')
          } catch {
            /* ignore */
          }
          setOpen(false)
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
