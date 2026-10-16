import { useMemo, useState, type JSX, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import type { ValuedAsset } from '@shared/types'
import { AssetClassIcon } from '@renderer/lib/assetIcons'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { formatGainPercent } from '@shared/money'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type SortKey = 'value' | 'gain' | 'name'

function classLabel(
  assetClass: ValuedAsset['asset']['class'],
  t: (k: string) => string
): string {
  return t(`class.${assetClass}`)
}

function valuedLabel(v: ValuedAsset, localeTag: string, t: (k: string) => string): {
  text: string
  stale: boolean
} {
  if (v.asset.class === 'savings_pln' || v.asset.class === 'savings_usd') {
    return { text: t('holdings.valuedManual'), stale: false }
  }
  const on = 'valuedOn' in v.asset ? v.asset.valuedOn : null
  if (!on) return { text: t('holdings.valuedManual'), stale: false }
  const age = Date.now() - new Date(on).getTime()
  const stale = age > 30 * 24 * 60 * 60 * 1000
  const d = new Date(on)
  return {
    text: d.toLocaleDateString(localeTag, { day: 'numeric', month: 'short' }),
    stale
  }
}

function subline(v: ValuedAsset, t: (k: string) => string): string {
  const klass = classLabel(v.asset.class, t)
  const source =
    v.asset.class === 'apartment' || v.asset.class === 'land'
      ? v.asset.valueSource === 'estimate'
        ? t('holdings.sourceCatalog')
        : t('holdings.sourceManual')
      : v.asset.class === 'savings_pln' || v.asset.class === 'savings_usd'
        ? t('holdings.sourceCash')
        : t('holdings.sourceMarket')
  return `${klass} · ${source}`
}

export function HoldingsPanel({
  assets,
  totalAssetsMinor,
  onOpenAsset,
  onAdd
}: {
  assets: ValuedAsset[]
  totalAssetsMinor: number
  onOpenAsset: (id: string) => void
  onAdd: () => void
  /** @deprecated ignored — table lives in page flow */
  compact?: boolean
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const [sort, setSort] = useState<SortKey>('value')

  const rows = useMemo(() => {
    const list = [...assets]
    list.sort((a, b) => {
      if (sort === 'name') return a.asset.name.localeCompare(b.asset.name, localeTag)
      if (sort === 'gain') {
        const ga = a.gainPercent ?? -Infinity
        const gb = b.gainPercent ?? -Infinity
        return gb - ga
      }
      return b.plnValueMinor - a.plnValueMinor
    })
    return list
  }, [assets, sort, localeTag])

  const denom = totalAssetsMinor > 0 ? totalAssetsMinor : 1

  return (
    <section className="surface-card px-4 pt-3.5 pb-1" data-testid="holdings-panel">
      <div className="mb-2.5 flex items-center gap-2">
        <h2 className="text-[13px] leading-5 font-semibold">{t('dashboard.holdings')}</h2>
        <Sensitive placeholder={MASK.count} className="text-[var(--ink-3)]">
          {assets.length}
        </Sensitive>
        <span className="flex-1" />
        <div
          className="inline-flex rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
          role="group"
          aria-label={t('holdings.sort')}
        >
          {(['value', 'gain', 'name'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium',
                sort === key
                  ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--ink-3)]'
              )}
            >
              {t(`holdings.sort.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <p className="text-[13px] text-[var(--ink-3)]">{t('dashboard.emptyHoldings')}</p>
          <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" />
            {t('action.addHolding')}
          </Button>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-[var(--line)] pb-2 text-left text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase">
                {t('holdings.col.holding')}
              </th>
              <th className="w-[96px] border-b border-[var(--line)] pb-2 text-right text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase sm:w-[120px]">
                {t('holdings.col.value')}
              </th>
              <th className="w-[72px] border-b border-[var(--line)] pb-2 text-right text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase min-[1100px]:w-[136px]">
                {t('holdings.col.share')}
              </th>
              <th className="w-[88px] border-b border-[var(--line)] pb-2 text-right text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase max-[899px]:hidden">
                {t('holdings.col.since')}
              </th>
              <th className="col-valued w-[72px] border-b border-[var(--line)] pb-2 text-right text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase max-[1359px]:hidden">
                {t('holdings.col.valued')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const share = (v.plnValueMinor / denom) * 100
              const valued = valuedLabel(v, localeTag, t)
              const onKey = (e: KeyboardEvent) => {
                if (e.key === 'Enter') onOpenAsset(v.asset.id)
              }
              return (
                <tr
                  key={v.asset.id}
                  tabIndex={0}
                  role="link"
                  data-testid={`holding-row-${v.asset.id}`}
                  onClick={() => onOpenAsset(v.asset.id)}
                  onKeyDown={onKey}
                  className="cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--surface-2)]"
                  style={{ height: 'var(--row-h)' }}
                >
                  <td className="pr-2">
                    <div className="flex items-center gap-2.5">
                      <AssetClassIcon
                        assetClass={v.asset.class}
                        size="sm"
                        className="!size-7 !rounded-[7px] bg-[var(--surface-2)] text-[var(--ink-2)]"
                      />
                      <span className="min-w-0">
                        <Sensitive
                          as="b"
                          placeholder={MASK.name}
                          className="block truncate text-[13px] leading-[18px] font-medium"
                        >
                          {v.asset.name}
                        </Sensitive>
                        <Sensitive
                          as="small"
                          placeholder={MASK.nameShort}
                          className="block truncate text-[12px] leading-4 text-[var(--ink-3)]"
                        >
                          {subline(v, t)}
                        </Sensitive>
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <MoneyAmount
                      amountMinor={v.plnValueMinor}
                      showCurrency={false}
                      className="!text-[13px] !leading-5"
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="hidden h-1 w-12 overflow-hidden rounded-sm bg-[var(--surface-3)] min-[1100px]:block min-[1360px]:w-[72px]">
                        <i
                          className="block h-full bg-[var(--accent)]"
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                      <Sensitive
                        placeholder={MASK.percent}
                        className="num w-10 text-right text-[13px] min-[1100px]:w-12"
                      >
                        {share.toLocaleString(localeTag, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1
                        })}{' '}
                        %
                      </Sensitive>
                    </div>
                  </td>
                  <td className="text-right max-[899px]:hidden">
                    {v.gainPercent != null ? (
                      <Sensitive
                        placeholder={MASK.percent}
                        className={cn(
                          'num text-[13px]',
                          v.gainPercent > 0 && 'text-gain',
                          v.gainPercent < 0 && 'text-loss'
                        )}
                      >
                        {formatGainPercent(v.gainPercent, localeTag)}
                      </Sensitive>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>
                  <td className="col-valued text-right text-[13px] text-[var(--ink-3)] max-[1359px]:hidden">
                    <span className="inline-flex items-center justify-end gap-1">
                      {valued.stale ? (
                        <span className="size-1.5 rounded-full bg-[var(--warn)]" aria-hidden />
                      ) : null}
                      <Sensitive placeholder={MASK.dateShort}>{valued.text}</Sensitive>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </section>
  )
}
