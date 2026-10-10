import { listAssets, getAssetById, QUANTITY_SCALE } from '../db'
import { convertToPlnMinor } from './fx'
import { getEquityPrice } from './prices'
import {
  ASSET_CLASS_LABELS,
  type Asset,
  type AssetClass,
  type ClassBreakdown,
  type DashboardSnapshot,
  type ValuedAsset
} from '@shared/types'
import { BASE_CURRENCY } from '@shared/money'

async function valueAsset(asset: Asset): Promise<ValuedAsset> {
  switch (asset.class) {
    case 'etf': {
      const quote = await getEquityPrice(asset.ticker)
      const qty = asset.quantityScaled / QUANTITY_SCALE
      const nativeValueMinor = Math.round(qty * quote.priceMinor)
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        nativeValueMinor,
        quote.currency
      )
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: quote.currency,
        plnValueMinor: plnMinor,
        lastUpdated: fetchedAt,
        priceStale: quote.stale || stale
      }
    }
    case 'bond': {
      // nominal is face value in minor; unit_value is price per 100 face (×100 scale like 98.50 → 9850)
      const faceMajor = asset.nominalMinor / 100
      const pricePercent = asset.unitValueMinor / 100
      const nativeValueMinor = Math.round(faceMajor * (pricePercent / 100) * 100)
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        nativeValueMinor,
        asset.currency
      )
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        lastUpdated: fetchedAt,
        priceStale: stale
      }
    }
    case 'retirement': {
      const units = asset.unitsScaled / QUANTITY_SCALE
      const nativeValueMinor = Math.round(units * asset.unitPriceMinor)
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        nativeValueMinor,
        asset.currency
      )
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        lastUpdated: asset.updatedAt > fetchedAt ? asset.updatedAt : fetchedAt,
        priceStale: stale
      }
    }
    case 'savings_usd':
    case 'savings_pln': {
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        asset.amountMinor,
        asset.currency
      )
      return {
        asset,
        nativeValueMinor: asset.amountMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        lastUpdated: stale ? fetchedAt : asset.updatedAt,
        priceStale: stale
      }
    }
    case 'apartment':
    case 'land':
    case 'car': {
      const { plnMinor, stale } = await convertToPlnMinor(asset.valueMinor, asset.currency)
      return {
        asset,
        nativeValueMinor: asset.valueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        lastUpdated: asset.valuedOn,
        priceStale: stale
      }
    }
    default: {
      const _exhaustive: never = asset
      throw new Error(`Unhandled asset: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

export async function getValuedAsset(id: string): Promise<ValuedAsset | null> {
  const asset = getAssetById(id)
  if (!asset) return null
  return valueAsset(asset)
}

export async function buildDashboard(): Promise<DashboardSnapshot> {
  const assets = listAssets()
  const valued = await Promise.all(assets.map(valueAsset))

  const byClass = new Map<AssetClass, number>()
  let totalPlnMinor = 0
  let fxStale = false

  for (const v of valued) {
    totalPlnMinor += v.plnValueMinor
    byClass.set(v.asset.class, (byClass.get(v.asset.class) ?? 0) + v.plnValueMinor)
    if (v.priceStale) fxStale = true
  }

  const breakdown: ClassBreakdown[] = [...byClass.entries()]
    .map(([cls, plnValueMinor]) => ({
      class: cls,
      label: ASSET_CLASS_LABELS[cls],
      plnValueMinor,
      percentOfTotal: totalPlnMinor === 0 ? 0 : (plnValueMinor / totalPlnMinor) * 100
    }))
    .sort((a, b) => b.plnValueMinor - a.plnValueMinor)

  return {
    totalPlnMinor,
    breakdown,
    assets: valued.sort((a, b) => b.plnValueMinor - a.plnValueMinor),
    asOf: new Date().toISOString(),
    fxStale
  }
}

export async function refreshAllPrices(): Promise<DashboardSnapshot> {
  // Force re-fetch by valuing everything (services check TTL; callers may clear cache later)
  void BASE_CURRENCY
  return buildDashboard()
}
