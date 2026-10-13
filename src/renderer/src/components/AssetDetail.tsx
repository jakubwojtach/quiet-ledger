import { useLayoutEffect, useRef, type JSX, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatAmountNumber, formatGainPercent } from '@shared/money'
import {
  catalogEstimateFor,
  FORT_WOLA_ASSET_ID,
  fortWolaBreakdown,
  type CatalogEstimate
} from '@shared/valuationFormulas'
import { FORT_WOLA_CATALOG, FORT_WOLA_UNIT, NEFRYTOWA_PLOT } from '@shared/marketCatalog'
import { supportsLots, type Asset, type ValuedAsset } from '@shared/types'
import { useAsset, useDashboard } from '@renderer/hooks/useNetWorth'
import { LotsSection } from '@renderer/components/LotsSection'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { PrivacyToggle } from '@renderer/components/shell/PrivacyToggle'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

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
  const { data: dashboard } = useDashboard()
  const { t, localeTag } = useLocale()

  const rootRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)

  const stickyKey = data
    ? `${data.asset.id}:${data.plnValueMinor}:${data.lastUpdated ?? ''}:${data.gainPlnMinor ?? ''}:${data.gainPercent ?? ''}`
    : 'empty'

  useLayoutEffect(() => {
    const sticky = stickyRef.current
    const root = rootRef.current
    if (!sticky || !root) return
    const sync = (): void => {
      root.style.setProperty('--holding-sticky-h', `${sticky.offsetHeight}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(sticky)
    return () => ro.disconnect()
  }, [stickyKey])

  if (!data && isLoading) {
    return (
      <div className="animate-pulse space-y-4" data-testid="asset-detail-loading">
        <div className="h-8 w-64 rounded-md bg-[var(--surface-2)]" />
        <div className="h-24 rounded-[10px] bg-[var(--surface-2)]" />
        <div className="h-48 rounded-[10px] bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (!data || isError) {
    return (
      <section className="surface-card p-4" data-testid="asset-detail-error">
        <h2 className="text-[15px] font-semibold">{t('detail.unavailable')}</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-3)]">
          {(error as Error)?.message ?? 'Not found'}
        </p>
      </section>
    )
  }

  const { asset } = data
  const estimate = catalogEstimateFor(asset.id)
  const isCatalog =
    (asset.class === 'apartment' || asset.class === 'land') &&
    asset.valueSource === 'estimate' &&
    estimate != null

  const totalAssets = dashboard?.totalAssetsPlnMinor ?? 0
  const assets = dashboard?.assets ?? []
  const sharePct = totalAssets > 0 ? (data.plnValueMinor / totalAssets) * 100 : 0
  const rank =
    [...assets].sort((a, b) => b.plnValueMinor - a.plnValueMinor).findIndex((a) => a.asset.id === asset.id) +
    1

  const subtitle = holdingSubtitle(asset, estimate, t, localeTag)
  const valuedLabel = formatValuedOn(data.lastUpdated, localeTag)
  const gainChip =
    data.gainPlnMinor != null && data.gainPercent != null
      ? `${data.gainPlnMinor > 0 ? '+' : ''}${formatAmountNumber(data.gainPlnMinor, localeTag)} zł · ${formatGainPercent(data.gainPercent, localeTag)} ${t('detail.vsPaid')}`
      : null

  const askingWarn =
    isCatalog && asset.class === 'land'
      ? t('detail.askingPrice')
      : asset.class === 'land' && asset.valueSource === 'estimate'
        ? t('detail.askingPrice')
        : null

  return (
    <div
      ref={rootRef}
      className="flex w-full min-w-0 flex-col gap-4"
      data-testid="asset-detail"
    >
      {/* Sticky: crumb/actions + value + % chips */}
      <div
        ref={stickyRef}
        data-testid="holding-sticky-bar"
        className="app-region-drag sticky-frost sticky top-0 z-30 -mx-4 -mt-6 space-y-3 border-b border-[var(--line)] px-4 pt-2.5 pb-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10"
      >
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[var(--ink-3)]">
            <Link
              to="/savings"
              className="hover:text-[var(--ink)]"
              data-testid="back-to-savings"
            >
              {t('savings.title')}
            </Link>
            <span>/</span>
            <Sensitive
              as="b"
              placeholder={MASK.name}
              className="truncate font-semibold text-[var(--ink)]"
            >
              {asset.name}
            </Sensitive>
          </nav>
          <span className="flex-1" />
          <PrivacyToggle />
          {onEdit ? (
            <Button variant="outline" size="sm" className="h-7" onClick={() => onEdit(asset)}>
              {t('action.edit')}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[var(--loss)] hover:text-[var(--loss)]"
              onClick={() => {
                if (confirm(`Delete “${asset.name}”?`)) onDelete(asset)
              }}
            >
              {t('action.delete')}
            </Button>
          ) : null}
        </div>

        <header>
          <Sensitive
            placeholder={MASK.name}
            className="text-[12px] leading-4 font-medium text-[var(--ink-3)]"
          >
            {subtitle}
          </Sensitive>
          <Sensitive
            as="b"
            placeholder={MASK.name}
            className="mt-1 block text-[24px] leading-8 font-semibold tracking-[-0.02em]"
          >
            {asset.name}
          </Sensitive>
          <div className="mt-2">
            <MoneyAmount amountMinor={data.plnValueMinor} size="detail" />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {gainChip ? (
              <Chip className={(data.gainPlnMinor ?? 0) >= 0 ? 'text-gain' : 'text-loss'}>
                <Sensitive placeholder={MASK.delta}>{gainChip}</Sensitive>
              </Chip>
            ) : null}
            <Chip>
              <span
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  data.priceStale || data.priceMissing
                    ? 'bg-[var(--warn)]'
                    : 'bg-[var(--gain)]'
                )}
              />
              <Sensitive placeholder={`${t('detail.valuedOn')} ${MASK.dateShort}`}>
                {t('detail.valuedOn')} {valuedLabel}
              </Sensitive>
            </Chip>
            {askingWarn ? <Chip tone="warn">{askingWarn}</Chip> : null}
          </div>
        </header>
      </div>

      {/* Body: left scrolls; right rail sticks under the sticky hero */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] max-[1359px]:lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {isCatalog && estimate ? (
            <>
              <CatalogHowCalculated estimate={estimate} localeTag={localeTag} t={t} />
              <SensitivityCard estimate={estimate} localeTag={localeTag} t={t} />
            </>
          ) : (
            <GenericFacts data={data} localeTag={localeTag} t={t} />
          )}

          {supportsLots(asset.class) ? (
            <section className="surface-card p-3.5 px-4 pb-4">
              <LotsSection asset={asset} priceCurrency={data.nativeCurrency} />
            </section>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[var(--holding-sticky-h,5rem)]">
          <ValuationSideCard
            data={data}
            estimate={isCatalog ? estimate : null}
            localeTag={localeTag}
            t={t}
          />
          <PurchaseSideCard
            data={data}
            estimate={isCatalog ? estimate : null}
            localeTag={localeTag}
            t={t}
          />
          {totalAssets > 0 && rank > 0 ? (
            <ShareCard
              sharePct={sharePct}
              rank={rank}
              total={assets.length}
              localeTag={localeTag}
              t={t}
            />
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function Chip({
  children,
  className,
  tone
}: {
  children: ReactNode
  className?: string
  tone?: 'warn'
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-[12px] font-medium',
        tone === 'warn'
          ? 'bg-[var(--warn-subtle)] text-[var(--warn)]'
          : 'bg-[var(--surface-2)] text-[var(--ink-2)]',
        className
      )}
    >
      {children}
    </span>
  )
}

function holdingSubtitle(
  asset: Asset,
  estimate: CatalogEstimate | null,
  t: (k: string) => string,
  localeTag: string
): string {
  const klass = t(`class.${asset.class}`)
  if (asset.id === FORT_WOLA_ASSET_ID) {
    return `${klass} · Warszawa-Wola · ${FORT_WOLA_UNIT.areaM2} m² · ${FORT_WOLA_UNIT.floor}, ${FORT_WOLA_UNIT.gardens} gardens`
  }
  if (asset.id === NEFRYTOWA_PLOT.id || (estimate && asset.class === 'land')) {
    const area = estimate?.areaM2 ?? NEFRYTOWA_PLOT.areaM2
    return `${klass} · Szczecin-Skolwin · ${area.toLocaleString(localeTag)} m² · ${NEFRYTOWA_PLOT.purposeNote}`
  }
  if (asset.account) return `${klass} · ${asset.account}`
  return klass
}

function formatValuedOn(raw: string, localeTag: string): string {
  if (!raw) return '—'
  const d = raw.includes('T') ? new Date(raw) : new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(localeTag, { day: 'numeric', month: 'short', year: 'numeric' })
}

type TFn = (k: string, vars?: Record<string, string | number>) => string

function CatalogHowCalculated({
  estimate,
  localeTag,
  t
}: {
  estimate: CatalogEstimate
  localeTag: string
  t: TFn
}): JSX.Element {
  const catalog = estimate.catalog
  const area = estimate.areaM2
  const plnPerM2 = catalog.plnPerM2
  const areaWorth = Math.round(area * plnPerM2 * 100)
  const fort = estimate.assetId === FORT_WOLA_ASSET_ID ? fortWolaBreakdown() : null

  const scale = catalog.scale
  const span = scale.max - scale.min
  const pct = (v: number) => `${((v - scale.min) / span) * 100}%`
  const askFrom = 'askFrom' in scale ? scale.askFrom : undefined
  const askTo = 'askTo' in scale ? scale.askTo : undefined

  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <h2 className="text-[13px] leading-5 font-semibold">{t('detail.howCalculated')}</h2>

      <div className="mt-3.5 grid grid-cols-[auto_auto_auto_auto_1fr] items-baseline gap-x-4 gap-y-1 text-[15px] leading-6 tabular-nums">
        <span className="text-[12px] leading-4 text-[var(--ink-3)]">{t('detail.area')}</span>
        <span />
        <span className="text-[12px] leading-4 text-[var(--ink-3)]">{t('detail.catalogPrice')}</span>
        <span />
        <span className="text-[12px] leading-4 text-[var(--ink-3)]">{t('detail.worthNow')}</span>

        <Sensitive placeholder={MASK.nameShort}>
          {area.toLocaleString(localeTag)} m²
        </Sensitive>
        <span className="text-[var(--ink-3)]">×</span>
        <Sensitive placeholder={MASK.nameShort}>
          {plnPerM2.toLocaleString(localeTag)} zł/m²
        </Sensitive>
        <span className="text-[var(--ink-3)]">=</span>
        <Sensitive placeholder={MASK.money} className="font-semibold">
          {formatAmountNumber(fort?.apartmentMinor ?? areaWorth, localeTag)} zł
        </Sensitive>

        {fort ? (
          <>
            <Sensitive
              placeholder={MASK.nameShort}
              className="col-span-5 text-[13px] text-[var(--ink-2)]"
            >
              {t('detail.parkingLine', {
                paid: (FORT_WOLA_UNIT.purchaseParkingPln).toLocaleString(localeTag),
                buy: FORT_WOLA_UNIT.purchasePlnPerM2.toLocaleString(localeTag),
                now: FORT_WOLA_CATALOG.plnPerM2.toLocaleString(localeTag),
                result: formatAmountNumber(fort.parkingMinor, localeTag)
              })}
            </Sensitive>
          </>
        ) : null}
      </div>

      <p className="mt-2.5 text-[12px] leading-[18px] text-[var(--ink-2)]">
        <Sensitive placeholder={MASK.name}>{catalog.source}</Sensitive>
      </p>

      <div className="relative mt-5 h-28 px-2">
        <div className="absolute inset-x-2 top-10 h-1 rounded-sm bg-[var(--surface-3)]" />
        {askFrom != null && askTo != null ? (
          <div
            className="absolute top-10 h-1 rounded-sm bg-[var(--warn)] opacity-55"
            style={{ left: pct(askFrom), right: `calc(100% - ${pct(askTo)})` }}
          />
        ) : null}
        {scale.markers.map((m) => {
          const used = m.kind === 'used'
          const below = m.side === 'below'
          return (
            <div
              key={`${m.plnPerM2}-${m.label}`}
              className={cn(
                'absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-[12px] leading-4',
                below ? 'top-[52px]' : 'top-0'
              )}
              style={{ left: pct(m.plnPerM2) }}
            >
              {below ? (
                <>
                  <i
                    className={cn(
                      'mb-1 block w-0.5',
                      used ? 'h-[18px] w-[3px] bg-[var(--accent)]' : 'h-3.5 bg-[var(--ink)]'
                    )}
                  />
                  <Sensitive placeholder="···" className={used ? 'font-semibold text-[var(--accent)]' : undefined}>
                    {m.label}
                  </Sensitive>
                  <span className="text-[11px] text-[var(--ink-3)]">{m.note}</span>
                </>
              ) : (
                <>
                  <Sensitive placeholder="···" className={used ? 'font-semibold text-[var(--accent)]' : 'text-[var(--ink-3)]'}>
                    {m.label}
                  </Sensitive>
                  <span className="text-[11px] text-[var(--ink-3)]">{m.note}</span>
                  <i
                    className={cn(
                      'mt-1 block w-0.5',
                      used ? 'h-[18px] w-[3px] bg-[var(--accent)]' : 'h-3.5 bg-[var(--ink-3)]'
                    )}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-[12px] text-[var(--ink-3)]">{t('detail.scaleHint')}</p>
    </section>
  )
}

function SensitivityCard({
  estimate,
  localeTag,
  t
}: {
  estimate: CatalogEstimate
  localeTag: string
  t: TFn
}): JSX.Element {
  const rows = estimate.catalog.scale.sensitivity
  const cost = estimate.costMinor
  const area = estimate.areaM2

  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <h2 className="text-[13px] leading-5 font-semibold">{t('detail.whatIf')}</h2>
      <table className="mt-2 w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="text-left text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase">
            <th className="pb-2 font-medium">{t('detail.pricePerM2')}</th>
            <th className="pb-2 text-right font-medium">{t('detail.worthNow')}</th>
            <th className="pb-2 text-right font-medium">
              {t('detail.vsPaidAmount', {
                amount: formatAmountNumber(cost, localeTag)
              })}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const worth =
              estimate.assetId === FORT_WOLA_ASSET_ID
                ? // scale apartment+parking with same index
                  Math.round(
                    (estimate.worthMinor * row.plnPerM2) / estimate.catalog.plnPerM2
                  )
                : Math.round(area * row.plnPerM2 * 100)
            const delta = worth - cost
            const pct = cost > 0 ? (delta / cost) * 100 : 0
            const last = i === rows.length - 1
            return (
              <tr
                key={row.plnPerM2}
                className={cn(row.highlight && 'bg-[var(--accent-subtle)]')}
                style={{ height: 40 }}
              >
                <td className={cn('pr-2', last && 'border-0')}>
                  <Sensitive placeholder={MASK.nameShort}>
                    {row.plnPerM2.toLocaleString(localeTag)} zł/m²
                  </Sensitive>
                  <span className="text-[var(--ink-3)]"> · {row.note}</span>
                </td>
                <td className={cn('text-right', row.highlight && 'font-semibold', last && 'border-0')}>
                  <Sensitive placeholder={MASK.moneyShort}>
                    {formatAmountNumber(worth, localeTag)}
                  </Sensitive>
                </td>
                <td
                  className={cn(
                    'text-right',
                    delta >= 0 ? 'text-gain' : 'text-loss',
                    last && 'border-0'
                  )}
                >
                  <Sensitive placeholder={MASK.delta}>
                    {`${delta > 0 ? '+' : ''}${formatAmountNumber(delta, localeTag)} · ${formatGainPercent(pct, localeTag)}`}
                  </Sensitive>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function ValuationSideCard({
  data,
  estimate,
  localeTag,
  t
}: {
  data: ValuedAsset
  estimate: CatalogEstimate | null
  localeTag: string
  t: TFn
}): JSX.Element {
  const status = data.priceMissing
    ? t('detail.priceMissing')
    : data.priceStale
      ? t('detail.priceStale')
      : t('detail.priceFresh')
  const asset = data.asset
  const manual =
    asset.class === 'savings_pln' ||
    asset.class === 'savings_usd' ||
    ((asset.class === 'apartment' || asset.class === 'land' || asset.class === 'car') &&
      asset.valueSource === 'manual')
  const method = estimate
    ? t('detail.methodCatalog')
    : manual
      ? t('detail.methodManual')
      : t('detail.methodMarket')

  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <h2 className="text-[13px] leading-5 font-semibold">{t('detail.valuation')}</h2>
      <dl className="mt-2">
        <DlRow label={t('detail.method')} value={method} />
        <DlRow
          label={t('detail.valuedOn')}
          value={
            <Sensitive placeholder={MASK.date}>
              {formatValuedOn(data.lastUpdated, localeTag)}
            </Sensitive>
          }
        />
        <DlRow
          label={t('detail.priceStatus')}
          value={
            <span className={data.priceStale || data.priceMissing ? 'text-[var(--warn)]' : 'text-gain'}>
              {status}
            </span>
          }
        />
        {estimate ? (
          <DlRow
            label={t('detail.source')}
            value={
              <span className="inline-flex flex-wrap justify-end gap-x-1.5">
                {estimate.catalog.sourceLinks.map((l, i) => (
                  <span key={l.url}>
                    {i > 0 ? <span className="text-[var(--ink-3)]"> · </span> : null}
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {l.label}
                    </a>
                  </span>
                ))}
              </span>
            }
          />
        ) : null}
      </dl>
      {estimate ? (
        <p className="mt-2.5 text-[12px] leading-[18px] text-[var(--ink-2)]">
          {t('detail.catalogFallback')}
        </p>
      ) : null}
    </section>
  )
}

function PurchaseSideCard({
  data,
  estimate,
  localeTag,
  t
}: {
  data: ValuedAsset
  estimate: CatalogEstimate | null
  localeTag: string
  t: TFn
}): JSX.Element {
  const cost = data.costBasisPlnMinor
  const perM2 =
    estimate && cost != null && estimate.areaM2 > 0
      ? cost / 100 / estimate.areaM2
      : null

  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <h2 className="text-[13px] leading-5 font-semibold">{t('detail.purchase')}</h2>
      <dl className="mt-2">
        <DlRow
          label={t('detail.paid')}
          value={
            cost == null ? (
              '—'
            ) : (
              <Sensitive placeholder={MASK.money}>
                {estimate?.purchaseApprox ? '≈ ' : ''}
                {formatAmountNumber(cost, localeTag)} zł
              </Sensitive>
            )
          }
        />
        {perM2 != null ? (
          <DlRow
            label={t('detail.perM2')}
            value={
              <Sensitive placeholder={MASK.moneyShort}>
                {estimate?.purchaseApprox ? '≈ ' : ''}
                {perM2.toLocaleString(localeTag, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}{' '}
                zł
              </Sensitive>
            }
          />
        ) : null}
        <DlRow
          label={t('detail.gain')}
          value={
            data.gainPlnMinor == null ? (
              '—'
            ) : (
              <Sensitive
                placeholder={MASK.moneyShort}
                className={data.gainPlnMinor >= 0 ? 'text-gain' : 'text-loss'}
              >
                {`${data.gainPlnMinor > 0 ? '+' : ''}${formatAmountNumber(data.gainPlnMinor, localeTag)}`}
              </Sensitive>
            )
          }
        />
        {estimate ? (
          <DlRow
            label={t('detail.purchaseYear')}
            value={
              estimate.purchaseYear != null ? (
                <Sensitive placeholder={MASK.dateShort}>{String(estimate.purchaseYear)}</Sensitive>
              ) : (
                <Chip tone="warn">{t('detail.yearNotRecorded')}</Chip>
              )
            }
          />
        ) : null}
      </dl>
      {estimate && estimate.purchaseYear == null ? (
        <p className="mt-2.5 text-[12px] leading-[18px] text-[var(--ink-2)]">
          {t('detail.addPurchaseYear')}
        </p>
      ) : null}
    </section>
  )
}

function ShareCard({
  sharePct,
  rank,
  total,
  localeTag,
  t
}: {
  sharePct: number
  rank: number
  total: number
  localeTag: string
  t: TFn
}): JSX.Element {
  const r = 18
  const c = 2 * Math.PI * r
  const dash = (sharePct / 100) * c

  return (
    <section className="surface-card flex items-center gap-3.5 p-3.5 px-4">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="5"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--cat-4)"
          strokeWidth="5"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 22 22)"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <Sensitive
          placeholder={MASK.percent}
          className="num text-[18px] leading-6 font-semibold"
        >
          {sharePct.toLocaleString(localeTag, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}{' '}
          %
        </Sensitive>
        <div className="text-[12px] text-[var(--ink-3)]">
          <Sensitive placeholder={MASK.nameShort}>
            {t('detail.shareOf', { rank, total })}
          </Sensitive>
        </div>
      </div>
    </section>
  )
}

function GenericFacts({
  data,
  localeTag,
  t
}: {
  data: ValuedAsset
  localeTag: string
  t: TFn
}): JSX.Element {
  const { asset } = data
  return (
    <section className="surface-card p-3.5 px-4 pb-4">
      <h2 className="text-[13px] leading-5 font-semibold">{t('detail.facts')}</h2>
      <dl className="mt-2">
        <DlRow
          label={t('detail.nativeValue')}
          value={
            <MoneyAmount
              amountMinor={data.nativeValueMinor}
              currency={data.nativeCurrency as 'PLN'}
              className="!text-[13px]"
            />
          }
        />
        <DlRow
          label={t('detail.plnValue')}
          value={<MoneyAmount amountMinor={data.plnValueMinor} className="!text-[13px]" />}
        />
        {asset.class === 'etf' ? (
          <>
            <DlRow label="Yahoo symbol" value={asset.ticker} />
            <DlRow
              label="Quantity"
              value={(asset.quantityScaled / 1_000_000).toLocaleString(localeTag)}
            />
          </>
        ) : null}
        {asset.class === 'retirement' && asset.fundCode ? (
          <DlRow label="analizy.pl" value={asset.fundCode} />
        ) : null}
        {(asset.class === 'savings_pln' || asset.class === 'savings_usd') && (
          <DlRow
            label={t('detail.balance')}
            value={
              <MoneyAmount
                amountMinor={asset.amountMinor}
                currency={asset.currency as 'PLN'}
                className="!text-[13px]"
              />
            }
          />
        )}
      </dl>
    </section>
  )
}

function DlRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-[var(--line)] py-2 text-[13px] first:border-t-0">
      <dt className="text-[var(--ink-3)]">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}
