import { listAssets, getAssetById, QUANTITY_SCALE } from '../db'
import { recordNetWorthSnapshot } from '../db/analytics'
import { listLiabilities } from '../db/liabilities'
import { listLots } from '../db/lots'
import { convertToPlnMinor } from './fx'
import { isLive } from './integrations/registry'
import { getEquityPrice, getFundNav } from './prices'
import { emitLocalEvent } from '../hooks/localEvents'
import {
  ASSET_CLASS_LABELS,
  type Asset,
  type AssetClass,
  type ClassBreakdown,
  type DashboardSnapshot,
  supportsLots,
  type Liability,
  type ValuedAsset,
  type ValuedLiability,
  type ValuedLot
} from '@shared/types'
import { catalogEstimateFor, type CatalogEstimate } from '@shared/valuationFormulas'
import { getOtodomCompsValue } from './otodom'
import { getOtomotoCompsValue } from './otomoto'

type MarketValue = Omit<ValuedAsset, 'costBasisPlnMinor' | 'gainPlnMinor' | 'gainPercent'>
type ValueOpts = { force?: boolean }

function activeEstimate(
  asset: Extract<Asset, { class: 'apartment' | 'land' | 'car' }>
): CatalogEstimate | null {
  if (asset.valueSource !== 'estimate') return null
  if (!isLive('property_catalog')) return null
  return catalogEstimateFor(asset.id)
}

async function valueAsset(asset: Asset, opts?: ValueOpts): Promise<ValuedAsset> {
  const market = await valueAssetMarket(asset, opts)
  return attachGain(asset, market, opts)
}

/** What was paid, in its own currency. Cash has no cost basis. */
function costBasisOf(asset: Asset): { minor: number; currency: string } | null {
  switch (asset.class) {
    case 'etf':
      return { minor: asset.costBasisMinor, currency: asset.costCurrency }
    case 'bond':
      return { minor: asset.nominalMinor, currency: asset.currency }
    case 'retirement':
    case 'apartment':
    case 'land':
    case 'car':
      return asset.costBasisMinor == null
        ? null
        : { minor: asset.costBasisMinor, currency: asset.currency }
    default:
      return null
  }
}

async function attachGain(
  asset: Asset,
  market: MarketValue,
  opts?: ValueOpts
): Promise<ValuedAsset> {
  const empty = { ...market, costBasisPlnMinor: null, gainPlnMinor: null, gainPercent: null }
  const basis = costBasisOf(asset)
  if (!basis || market.priceMissing) return empty

  const cost = await convertToPlnMinor(basis.minor, basis.currency, opts)
  const gainPlnMinor = market.plnValueMinor - cost.plnMinor
  return {
    ...market,
    costBasisPlnMinor: cost.plnMinor,
    gainPlnMinor,
    gainPercent: cost.plnMinor === 0 ? null : (gainPlnMinor / cost.plnMinor) * 100,
    priceStale: market.priceStale || cost.stale
  }
}

async function valueAssetMarket(asset: Asset, opts?: ValueOpts): Promise<MarketValue> {
  const force = opts?.force
  switch (asset.class) {
    case 'etf': {
      const quote = await getEquityPrice(asset.ticker, { force })
      const qty = asset.quantityScaled / QUANTITY_SCALE
      const nativeValueMinor = Math.round(qty * quote.price * 100)
      const { plnMinor, stale } = await convertToPlnMinor(nativeValueMinor, quote.currency, {
        force
      })
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: quote.currency,
        plnValueMinor: plnMinor,
        unitPrice: quote.missing ? null : quote.price,
        lastUpdated: quote.fetchedAt,
        priceStale: quote.stale || stale,
        priceMissing: quote.missing
      }
    }
    case 'bond': {
      const nativeValueMinor =
        asset.statementValueMinor ??
        Math.round((asset.nominalMinor * asset.unitValueMinor) / 10_000)
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        nativeValueMinor,
        asset.currency,
        { force }
      )
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        unitPrice: null,
        lastUpdated: asset.valuedOn ?? fetchedAt,
        priceStale: stale,
        priceMissing: false
      }
    }
    case 'retirement': {
      const units = asset.unitsScaled / QUANTITY_SCALE
      const nav = asset.fundCode ? await getFundNav(asset.fundCode, { force }) : null
      const live = nav && !nav.missing ? nav : null
      const price = live ? live.price : asset.unitPriceMinor / 100
      const nativeValueMinor = Math.round(units * price * 100)
      const { plnMinor, stale } = await convertToPlnMinor(nativeValueMinor, asset.currency, {
        force
      })
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        unitPrice: price,
        lastUpdated: live ? live.fetchedAt : asset.updatedAt,
        priceStale: stale || (nav != null && (nav.stale || nav.missing)),
        priceMissing: false
      }
    }
    case 'savings_usd':
    case 'savings_pln': {
      const { plnMinor, stale, fetchedAt } = await convertToPlnMinor(
        asset.amountMinor,
        asset.currency,
        { force }
      )
      return {
        asset,
        nativeValueMinor: asset.amountMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        unitPrice: null,
        lastUpdated: stale ? fetchedAt : asset.updatedAt,
        priceStale: stale,
        priceMissing: false
      }
    }
    case 'apartment':
    case 'land':
    case 'car': {
      if (
        (asset.class === 'apartment' || asset.class === 'land') &&
        asset.valueSource === 'otodom' &&
        asset.address &&
        asset.areaM2 != null &&
        asset.areaM2 > 0
      ) {
        const quote = await getOtodomCompsValue(
          {
            class: asset.class,
            address: asset.address,
            areaM2: asset.areaM2
          },
          { force }
        )
        if (!quote.missing) {
          const nativeValueMinor = Math.round(quote.price * 100)
          const { plnMinor, stale } = await convertToPlnMinor(nativeValueMinor, quote.currency, {
            force
          })
          return {
            asset,
            nativeValueMinor,
            nativeCurrency: quote.currency,
            plnValueMinor: plnMinor,
            unitPrice: quote.plnPerM2,
            lastUpdated: quote.fetchedAt,
            priceStale: quote.stale || stale,
            priceMissing: false
          }
        }
        // Fall back to saved manual worth when comps fail.
        const { plnMinor } = await convertToPlnMinor(asset.valueMinor, asset.currency, { force })
        return {
          asset,
          nativeValueMinor: asset.valueMinor,
          nativeCurrency: asset.currency,
          plnValueMinor: plnMinor,
          unitPrice: null,
          lastUpdated: asset.valuedOn,
          priceStale: true,
          priceMissing: true
        }
      }
      if (
        asset.class === 'car' &&
        asset.valueSource === 'otomoto' &&
        asset.make &&
        asset.model &&
        asset.year != null
      ) {
        const quote = await getOtomotoCompsValue(
          {
            make: asset.make,
            model: asset.model,
            year: asset.year,
            trim: asset.trim
          },
          { force }
        )
        if (!quote.missing) {
          const nativeValueMinor = Math.round(quote.price * 100)
          const { plnMinor, stale } = await convertToPlnMinor(nativeValueMinor, quote.currency, {
            force
          })
          return {
            asset,
            nativeValueMinor,
            nativeCurrency: quote.currency,
            plnValueMinor: plnMinor,
            unitPrice: null,
            lastUpdated: quote.fetchedAt,
            priceStale: quote.stale || stale,
            priceMissing: false
          }
        }
        const { plnMinor } = await convertToPlnMinor(asset.valueMinor, asset.currency, { force })
        return {
          asset,
          nativeValueMinor: asset.valueMinor,
          nativeCurrency: asset.currency,
          plnValueMinor: plnMinor,
          unitPrice: null,
          lastUpdated: asset.valuedOn,
          priceStale: true,
          priceMissing: true
        }
      }
      const estimate = activeEstimate(asset)
      const nativeValueMinor = estimate ? estimate.worthMinor : asset.valueMinor
      const { plnMinor, stale } = await convertToPlnMinor(nativeValueMinor, asset.currency, {
        force
      })
      return {
        asset,
        nativeValueMinor,
        nativeCurrency: asset.currency,
        plnValueMinor: plnMinor,
        unitPrice: null,
        lastUpdated: estimate ? estimate.catalog.asOf : asset.valuedOn,
        priceStale: stale,
        priceMissing: false
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

/**
 * Force a live refetch for one holding (bypass TTL), then revalue it.
 * Keeps the last cached quote if the live pull fails — never wipes first.
 */
export async function refreshAssetPrice(id: string): Promise<ValuedAsset | null> {
  const asset = getAssetById(id)
  if (!asset) return null
  return valueAsset(asset, { force: true })
}

/**
 * Each purchase valued at today's price. Bond lots get their share of the holding's statement
 * value by amount paid, since the statement does not split value per purchase.
 */
export async function getValuedLots(assetId: string): Promise<ValuedLot[]> {
  const asset = getAssetById(assetId)
  if (!asset || !supportsLots(asset.class)) return []
  const lots = listLots(assetId)
  if (lots.length === 0) return []

  const market = await valueAssetMarket(asset)
  const totalPaid = lots.reduce((sum, lot) => sum + lot.paidMinor, 0)

  return Promise.all(
    lots.map(async (lot): Promise<ValuedLot> => {
      const qty = lot.quantityScaled / QUANTITY_SCALE
      const nativeValueMinor =
        asset.class === 'bond'
          ? totalPaid === 0
            ? 0
            : Math.round((market.nativeValueMinor * lot.paidMinor) / totalPaid)
          : Math.round(qty * (market.unitPrice ?? 0) * 100)
      const value = await convertToPlnMinor(nativeValueMinor, market.nativeCurrency)
      const paid = await convertToPlnMinor(lot.paidMinor, lot.paidCurrency)
      const known = !market.priceMissing && paid.plnMinor > 0
      const gainPlnMinor = known ? value.plnMinor - paid.plnMinor : null
      return {
        lot,
        plnValueMinor: value.plnMinor,
        paidPlnMinor: paid.plnMinor,
        gainPlnMinor,
        gainPercent: gainPlnMinor == null ? null : (gainPlnMinor / paid.plnMinor) * 100,
        valueIsShare: asset.class === 'bond'
      }
    })
  )
}

export async function buildDashboard(): Promise<DashboardSnapshot> {
  const assets = listAssets()
  const liabilities = listLiabilities()
  const valued = await Promise.all(assets.map((a) => valueAsset(a)))
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

  recordNetWorthSnapshot({
    assetsMinor: totalAssetsPlnMinor,
    liabilitiesMinor: totalLiabilitiesPlnMinor,
    netWorthMinor: netWorthPlnMinor
  })

  emitLocalEvent('dashboard.updated', {
    netWorthPlnMinor: snapshot.netWorthPlnMinor,
    asOf: snapshot.asOf
  })

  return snapshot
}

export async function refreshAllPrices(): Promise<DashboardSnapshot> {
  return buildDashboard()
}
