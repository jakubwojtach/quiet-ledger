import { listAssets, getAssetById, QUANTITY_SCALE } from '../db'
import { listLiabilities } from '../db/liabilities'
import { convertToPlnMinor } from './fx'
import { getEquityPrice } from './prices'
import { emitLocalEvent } from '../hooks/localEvents'
import {
  ASSET_CLASS_LABELS,
  type Asset,
  type AssetClass,
  type ClassBreakdown,
  type DashboardSnapshot,
  type Liability,
  type ValuedAsset,
  type ValuedLiability
} from '@shared/types'

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

export async function valueLiability(liability: Liability): Promise<ValuedLiability> {
  const principal = await convertToPlnMinor(liability.principalMinor, liability.currency)
  const payment = await convertToPlnMinor(liability.monthlyPaymentMinor, liability.currency)
  return {
    liability,
    principalPlnMinor: principal.plnMinor,
    monthlyPaymentPlnMinor: payment.plnMinor,
    priceStale: principal.stale || payment.stale
  }
}

export async function getValuedAsset(id: string): Promise<ValuedAsset | null> {
  const asset = getAssetById(id)
  if (!asset) return null
  return valueAsset(asset)
}

export async function buildDashboard(): Promise<DashboardSnapshot> {
  const assets = listAssets()
  const liabilities = listLiabilities()
  const valued = await Promise.all(assets.map(valueAsset))
  const valuedLiabilities = await Promise.all(liabilities.map(valueLiability))

  const byClass = new Map<AssetClass, number>()
  let totalAssetsPlnMinor = 0
  let fxStale = false

  for (const v of valued) {
    totalAssetsPlnMinor += v.plnValueMinor
    byClass.set(v.asset.class, (byClass.get(v.asset.class) ?? 0) + v.plnValueMinor)
    if (v.priceStale) fxStale = true
  }

  let totalLiabilitiesPlnMinor = 0
  for (const l of valuedLiabilities) {
    totalLiabilitiesPlnMinor += l.principalPlnMinor
    if (l.priceStale) fxStale = true
  }

  const netWorthPlnMinor = totalAssetsPlnMinor - totalLiabilitiesPlnMinor

  const breakdown: ClassBreakdown[] = [...byClass.entries()]
    .map(([cls, plnValueMinor]) => ({
      class: cls,
      label: ASSET_CLASS_LABELS[cls],
      plnValueMinor,
      percentOfTotal:
        totalAssetsPlnMinor === 0 ? 0 : (plnValueMinor / totalAssetsPlnMinor) * 100
    }))
    .sort((a, b) => b.plnValueMinor - a.plnValueMinor)

  const snapshot: DashboardSnapshot = {
    totalAssetsPlnMinor,
    totalLiabilitiesPlnMinor,
    netWorthPlnMinor,
    totalPlnMinor: netWorthPlnMinor,
    breakdown,
    assets: valued.sort((a, b) => b.plnValueMinor - a.plnValueMinor),
    liabilities: valuedLiabilities.sort((a, b) => b.principalPlnMinor - a.principalPlnMinor),
    asOf: new Date().toISOString(),
    fxStale
  }

  emitLocalEvent('dashboard.updated', {
    netWorthPlnMinor: snapshot.netWorthPlnMinor,
    asOf: snapshot.asOf
  })

  return snapshot
}

export async function refreshAllPrices(): Promise<DashboardSnapshot> {
  return buildDashboard()
}
