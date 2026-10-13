import type { JSX, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { PanelLeft, PanelLeftClose, Settings2 } from 'lucide-react'
import { DeltaChip } from '@renderer/components/shell/DeltaChip'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'

export interface RailNavItem {
  id: string
  label: string
  active: boolean
  onClick: () => void
  icon?: LucideIcon
}

export interface RailPeriodItem {
  id: string
  label: string
  shortLabel?: string
  detail?: string
  changePercent?: number | null
  active: boolean
  onClick: () => void
}

function RailTooltip({
  label,
  collapsed,
  children
}: {
  label: string
  collapsed: boolean
  children: ReactNode
}): JSX.Element {
  if (!collapsed) return <>{children}</>
  // Custom tip (not daisyUI) — overflow:hidden on ancestors clips daisy tips
  return (
    <div className="group/tip relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-[60] -translate-y-1/2 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-[var(--ink)] opacity-0 shadow-[0_4px_16px_oklch(0_0_0/0.35)] ring-1 ring-[var(--line)] transition-opacity duration-100 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </div>
  )
}

export function AppRail({
  nav,
  summary,
  periods,
  periodsLabel,
  footer,
  className,
  settingsActive,
  onOpenSettings,
  collapsed,
  onToggleCollapsed,
  asOf
}: {
  nav: RailNavItem[]
  summary?: ReactNode
  periods: RailPeriodItem[]
  periodsLabel: string
  footer?: ReactNode
  className?: string
  settingsActive?: boolean
  onOpenSettings: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  /** ISO timestamp or YYYY-MM-DD — shown instead of a redundant app title */
  asOf?: string | null
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const expandLabel = collapsed ? t('rail.expand') : t('rail.collapse')
  const { isToday, dateLabel, weekday } = formatRailDate(asOf, localeTag)

  return (
    <aside
      data-testid="app-rail"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'surface-rail flex w-full shrink-0 flex-col border-b border-[var(--line)] transition-[width] duration-200 md:border-b-0',
        'md:sticky md:top-0 md:h-dvh md:max-h-dvh',
        // Expanded: clip period list. Collapsed: visible so hover tips aren't clipped.
        collapsed ? 'md:w-14 md:overflow-visible' : 'md:w-[208px] md:overflow-hidden min-[1360px]:md:w-[232px]',
        className
      )}
    >
      {/* Traffic-light clearance + window drag (hiddenInset has no native titlebar drag) */}
      <div className="app-region-drag hidden h-8 shrink-0 md:block" aria-hidden />

      {/* Date context (not a second "Savings" label) */}
      {!collapsed ? (
        <div
          className="app-region-drag flex min-h-10 shrink-0 flex-col justify-center gap-0.5 border-b border-[var(--line)] px-3 py-2"
          data-testid="rail-date"
        >
          <p className="hidden text-[10px] font-semibold tracking-[0.16em] text-[var(--ink-3)] uppercase md:block">
            {isToday ? t('rail.today') : t('rail.asOf')}
            {weekday ? ` · ${weekday}` : ''}
          </p>
          <p className="hidden text-[13px] leading-4 font-medium tracking-[-0.01em] text-[var(--ink)] md:block">
            <Sensitive placeholder={MASK.date}>{dateLabel}</Sensitive>
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          'app-region-no-drag flex min-h-0 flex-1 flex-col gap-1 p-1.5',
          collapsed
            ? 'md:items-center md:gap-1 md:overflow-visible md:px-1.5 md:pt-1'
            : 'overflow-y-auto md:gap-2 md:p-2'
        )}
      >
        {nav.length > 0 && (
          <nav
            className={cn(
              'flex shrink-0 gap-1',
              collapsed ? 'md:w-full md:flex-col md:items-center' : 'md:flex-col'
            )}
            aria-label="Primary"
            role="tablist"
          >
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <RailTooltip key={item.id} label={item.label} collapsed={collapsed}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={item.active}
                    aria-label={item.label}
                    data-testid={`rail-${item.id}`}
                    onClick={item.onClick}
                    className={cn(
                      'font-medium transition-colors',
                      collapsed
                        ? 'inline-flex size-9 items-center justify-center rounded-lg'
                        : 'inline-flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]',
                      item.active
                        ? 'bg-[var(--accent-subtle)] text-[var(--ink)]'
                        : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                    )}
                  >
                    {Icon ? (
                      <Icon
                        className={cn('shrink-0', collapsed ? 'size-4' : 'size-4')}
                        strokeWidth={1.7}
                      />
                    ) : null}
                    {!collapsed ? <span>{item.label}</span> : null}
                  </button>
                </RailTooltip>
              )
            })}
          </nav>
        )}

        {!collapsed ? <div className="hidden w-full md:block">{summary}</div> : null}

        {!collapsed && periods.length > 0 ? (
          <div className="min-h-0 w-full flex-1">
            <p className="mb-2 px-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--ink-3)] uppercase">
              {periodsLabel}
            </p>
            <ul
              className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0"
              role="list"
            >
              {periods.map((p) => (
                <li key={p.id} className="shrink-0 md:w-full">
                  <button
                    type="button"
                    aria-label={p.label}
                    data-testid={`rail-period-${p.id}`}
                    onClick={p.onClick}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                      p.active
                        ? 'bg-[var(--surface-2)] ring-1 ring-[var(--accent)]/40'
                        : 'hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium whitespace-nowrap text-[var(--ink)]">
                        {p.label}
                      </span>
                      {p.detail ? (
                        <Sensitive
                          placeholder={MASK.moneyShort}
                          className="hidden truncate text-[11px] text-[var(--ink-3)] tabular-nums md:block"
                        >
                          {p.detail}
                        </Sensitive>
                      ) : null}
                    </span>
                    {p.changePercent != null ? <DeltaChip percent={p.changePercent} /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!collapsed ? <div className="min-h-0 flex-1" /> : null}

        {footer}
      </div>

      {/* Footer: sidebar toggle above settings */}
      <div
        className={cn(
          'app-region-no-drag mt-auto flex shrink-0 flex-col gap-1 border-t border-[var(--line)] p-1.5',
          collapsed ? 'items-center' : 'md:p-2'
        )}
      >
        {!collapsed ? <div className="min-w-0 md:hidden">{summary}</div> : null}

        <RailTooltip label={expandLabel} collapsed={collapsed}>
          <button
            type="button"
            data-testid="rail-collapse"
            aria-label={expandLabel}
            aria-expanded={!collapsed}
            title={expandLabel}
            onClick={onToggleCollapsed}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]',
              collapsed
                ? 'size-9 justify-center'
                : 'h-8 w-full justify-start px-2.5 text-[12px] font-medium'
            )}
          >
            {collapsed ? (
              <PanelLeft className="size-4" strokeWidth={1.7} />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" strokeWidth={1.7} />
                <span>{t('rail.collapse')}</span>
              </>
            )}
          </button>
        </RailTooltip>

        <RailTooltip label={t('settings.open')} collapsed={collapsed}>
          <button
            type="button"
            data-testid="rail-settings"
            aria-label={t('settings.open')}
            onClick={onOpenSettings}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg transition-colors',
              collapsed
                ? 'size-9 justify-center'
                : 'h-8 w-full justify-start px-2.5 text-[12px] font-medium',
              settingsActive
                ? 'bg-[var(--accent-subtle)] text-[var(--ink)]'
                : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
            )}
          >
            <Settings2 className="size-4 shrink-0" strokeWidth={1.7} />
            {!collapsed ? <span>{t('settings.open')}</span> : null}
          </button>
        </RailTooltip>
      </div>
    </aside>
  )
}

function formatRailDate(
  asOf: string | null | undefined,
  localeTag: string
): { isToday: boolean; dateLabel: string; weekday: string } {
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  let source = now
  let isToday = true

  if (asOf) {
    const parsed = new Date(asOf.includes('T') ? asOf : `${asOf}T12:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      source = parsed
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
      isToday = key === todayKey
    }
  }

  return {
    isToday,
    weekday: source.toLocaleDateString(localeTag, { weekday: 'short' }),
    dateLabel: source.toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
}

export function YtdSummaryCard({
  label,
  changePercent,
  sublabel
}: {
  label: string
  changePercent: number | null
  sublabel?: string
}): JSX.Element {
  return (
    <div className="surface-card rounded-[10px] px-3 py-3" data-testid="ytd-summary">
      <div className="text-[10px] font-semibold tracking-[0.16em] text-[var(--ink-3)] uppercase">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {changePercent != null ? (
          <Sensitive
            placeholder={MASK.percent}
            className={cn(
              'text-2xl font-medium tabular-nums',
              changePercent > 0 && 'text-gain',
              changePercent < 0 && 'text-loss',
              changePercent === 0 && 'text-[var(--ink)]'
            )}
          >
            {changePercent > 0 ? '+' : ''}
            {changePercent.toFixed(1)}%
          </Sensitive>
        ) : (
          <span className="text-2xl text-[var(--ink-3)]">—</span>
        )}
      </div>
      {sublabel ? (
        <Sensitive placeholder={MASK.nameShort} className="mt-1 text-[11px] text-[var(--ink-3)]">
          {sublabel}
        </Sensitive>
      ) : null}
    </div>
  )
}
