import { useState, type JSX, type ReactNode } from 'react'
import {
  ACCENT_PRESETS,
  FONT_PACKS,
  INTERESTS,
  type InterestId
} from '@renderer/lib/appPreferences'
import { useDatabaseInfo } from '@renderer/hooks/useNetWorth'
import { usePreferences } from '@renderer/lib/preferences'
import { useLocale } from '@renderer/lib/i18n/locale'
import type { Locale } from '@renderer/lib/i18n/messages'
import type { ThemeMode } from '@renderer/lib/theme'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

const SECTIONS = [
  { id: 'general', labelKey: 'settings.nav.general' },
  { id: 'appearance', labelKey: 'settings.nav.appearance' },
  { id: 'modules', labelKey: 'settings.nav.modules' },
  { id: 'privacy', labelKey: 'settings.nav.privacy' },
  { id: 'setup', labelKey: 'settings.nav.setup' }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' }
]

const THEMES: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'light', labelKey: 'theme.light' },
  { mode: 'dark', labelKey: 'theme.dark' },
  { mode: 'auto', labelKey: 'theme.auto' }
]

export function SettingsPage(): JSX.Element {
  const { locale, setLocale, t } = useLocale()
  const {
    prefs,
    setPrefs,
    setThemeMode,
    setAccent,
    setFontPack,
    setModules,
    setInterests,
    reopenOnboarding
  } = usePreferences()
  const dbInfo = useDatabaseInfo()
  const [active, setActive] = useState<SectionId>('general')

  const toggleInterest = (id: InterestId): void => {
    const on = prefs.interests.includes(id)
    setInterests(on ? prefs.interests.filter((x) => x !== id) : [...prefs.interests, id])
  }

  const dbPath =
    dbInfo.data?.dbPath ??
    '~/Library/Application Support/savings-net-worth/networth.sqlite'

  const activeLabel = t(SECTIONS.find((s) => s.id === active)!.labelKey)

  return (
    <div
      className="grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-[184px_minmax(0,1fr)] md:gap-10"
      data-testid="settings-page"
    >
      <nav
        className="flex flex-row flex-wrap gap-0.5 md:sticky md:top-0 md:flex-col md:self-start"
        aria-label={t('settings.title')}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            aria-current={active === s.id ? 'page' : undefined}
            className={cn(
              'flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium transition-colors',
              active === s.id
                ? 'bg-[var(--surface-2)] text-[var(--ink)]'
                : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
            )}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        <h3 className="mb-2 text-[13px] leading-5 font-semibold">{activeLabel}</h3>

        {active === 'general' ? (
          <div className="surface-card overflow-hidden">
            <SettingsRow
              title={t('lang.label')}
              description={t('settings.langHint')}
              control={
                <Segment>
                  {LOCALES.map(({ code, label }) => (
                    <Seg
                      key={code}
                      active={locale === code}
                      onClick={() => setLocale(code)}
                    >
                      {label}
                    </Seg>
                  ))}
                </Segment>
              }
            />
            <SettingsRow
              title={t('settings.baseCurrency')}
              description={t('settings.baseCurrencyHint')}
              control={
                <span className="inline-flex h-[22px] items-center rounded-md bg-[var(--surface-2)] px-2 text-[12px] font-medium tabular-nums text-[var(--ink-2)]">
                  PLN · zł
                </span>
              }
            />
          </div>
        ) : null}

        {active === 'appearance' ? (
          <div className="surface-card overflow-hidden">
            <SettingsRow
              title={t('theme.label')}
              control={
                <Segment>
                  {THEMES.map(({ mode, labelKey }) => (
                    <Seg
                      key={mode}
                      active={prefs.themeMode === mode}
                      onClick={() => setThemeMode(mode)}
                    >
                      {t(labelKey)}
                    </Seg>
                  ))}
                </Segment>
              }
            />
            <SettingsRow
              title={t('prefs.accent')}
              description={t('prefs.accent.hint')}
              control={
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((p) => {
                    const activeSwatch = prefs.accent === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={t(p.labelKey)}
                        aria-label={t(p.labelKey)}
                        onClick={() => setAccent(p.id)}
                        className={cn(
                          'size-5 rounded-full',
                          activeSwatch && 'outline outline-2 outline-offset-2 outline-[var(--ink)]'
                        )}
                        style={{
                          background: p.dark,
                          boxShadow: 'inset 0 0 0 1px oklch(1 0 0 / 0.1)'
                        }}
                      />
                    )
                  })}
                </div>
              }
            />
            <SettingsRow
              title={t('settings.density')}
              description={t('settings.densityHint')}
              control={
                <Segment>
                  <Seg
                    active={prefs.density === 'comfortable'}
                    onClick={() => setPrefs({ density: 'comfortable' })}
                  >
                    {t('settings.density.comfortable')}
                  </Seg>
                  <Seg
                    active={prefs.density === 'compact'}
                    onClick={() => setPrefs({ density: 'compact' })}
                  >
                    {t('settings.density.compact')}
                  </Seg>
                </Segment>
              }
            />
            <div className="border-t border-[var(--line)] px-4 pt-2 pb-1">
              <div className="text-[13px] font-medium">{t('prefs.font')}</div>
              <div className="text-[12px] leading-4 text-[var(--ink-3)]">{t('settings.fontHint')}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pt-2 pb-3.5 min-[900px]:grid-cols-4">
              {FONT_PACKS.map((pack) => {
                const on = prefs.fontPack === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setFontPack(pack.id)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      on
                        ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]'
                        : 'border-[var(--line)] hover:bg-[var(--surface-2)]'
                    )}
                  >
                    <div
                      className="num text-[20px] leading-[26px] tracking-[-0.02em]"
                      style={{ fontFamily: pack.display }}
                    >
                      3 365 429
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--ink-3)]">{t(pack.labelKey)}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {active === 'modules' ? (
          <div className="surface-card overflow-hidden">
            <SettingsRow
              title={t('tab.savings')}
              description={t('settings.moduleSavingsHint')}
              control={
                <Toggle
                  checked={prefs.showSavings}
                  onChange={(showSavings) => setModules({ showSavings })}
                />
              }
            />
            <SettingsRow
              title={t('tab.installments')}
              description={t('settings.moduleCashflowHint')}
              control={
                <Toggle
                  checked={prefs.showInstallments}
                  onChange={(showInstallments) => setModules({ showInstallments })}
                />
              }
            />
            <SettingsRow
              title={t('onboarding.step2.title')}
              description={t('settings.interestsHint')}
              control={
                <div className="flex max-w-md flex-wrap justify-end gap-1.5">
                  {INTERESTS.map((item) => {
                    const on = prefs.interests.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleInterest(item.id)}
                        className={cn(
                          'inline-flex h-6 items-center rounded-xl border px-2.5 text-[12px] font-medium',
                          on
                            ? 'border-transparent bg-[var(--accent-subtle)] text-[var(--accent)]'
                            : 'border-[var(--line-strong)] text-[var(--ink-2)]'
                        )}
                      >
                        {t(item.labelKey)}
                      </button>
                    )
                  })}
                </div>
              }
            />
          </div>
        ) : null}

        {active === 'privacy' ? (
          <div className="surface-card overflow-hidden">
            <SettingsRow
              title={t('settings.database')}
              description={
                <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--ink-2)]">
                  {dbPath.replace(/\/Users\/[^/]+/, '~')}
                </code>
              }
            />
            <SettingsRow
              title={t('settings.hideAmounts')}
              description={t('settings.hideAmountsHint')}
              control={
                <Toggle
                  checked={prefs.privacy}
                  onChange={(privacy) => setPrefs({ privacy })}
                />
              }
            />
          </div>
        ) : null}

        {active === 'setup' ? (
          <div className="surface-card overflow-hidden">
            <SettingsRow
              title={t('settings.rerunOnboarding')}
              description={t('settings.rerunOnboardingHint')}
              control={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => reopenOnboarding()}
                >
                  {t('settings.rerunOnboarding')}
                </Button>
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SettingsRow({
  title,
  description,
  control
}: {
  title: string
  description?: ReactNode
  control?: ReactNode
}): JSX.Element {
  return (
    <div className="flex min-h-12 items-center gap-4 border-t border-[var(--line)] px-4 py-2 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{title}</div>
        {description ? (
          <div className="text-[12px] leading-4 text-[var(--ink-3)]">{description}</div>
        ) : null}
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  )
}

function Segment({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="inline-flex rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5">
      {children}
    </div>
  )
}

function Seg({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
          : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
      )}
    >
      {children}
    </button>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-4 w-7 rounded-full transition-colors',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-white transition-[left]',
          checked ? 'left-3.5' : 'left-0.5'
        )}
      />
    </button>
  )
}
