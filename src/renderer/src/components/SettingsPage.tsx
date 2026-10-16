import { useEffect, useState, type JSX, type ReactNode } from 'react'
import type { UpdateStatus } from '@shared/updates'
import {
  INTEGRATION_DEFS,
  type IntegrationId,
  type IntegrationsConfig
} from '@shared/integrations'
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
import { BrandLockup } from '@renderer/components/BrandLockup'
import { IntegrationCredentialsFields } from '@renderer/components/IntegrationCredentialsFields'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

const SECTIONS = [
  { id: 'general', labelKey: 'settings.nav.general' },
  { id: 'appearance', labelKey: 'settings.nav.appearance' },
  { id: 'modules', labelKey: 'settings.nav.modules' },
  { id: 'sources', labelKey: 'settings.nav.sources' },
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
    setIntegrations,
    reopenOnboarding
  } = usePreferences()
  const dbInfo = useDatabaseInfo()
  const [active, setActive] = useState<SectionId>('general')
  const [testStatus, setTestStatus] = useState<Partial<Record<IntegrationId, string>>>({})
  const [testingId, setTestingId] = useState<IntegrationId | null>(null)
  const [appVersion, setAppVersion] = useState(__APP_VERSION__)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    void window.api.getAppVersion().then((r) => setAppVersion(r.version))
    void window.api.getUpdateStatus().then(setUpdateStatus)
    return window.api.onUpdateStatus(setUpdateStatus)
  }, [])

  const toggleInterest = (id: InterestId): void => {
    const on = prefs.interests.includes(id)
    setInterests(on ? prefs.interests.filter((x) => x !== id) : [...prefs.interests, id])
  }

  const patchIntegration = (
    id: IntegrationId,
    patch: Partial<IntegrationsConfig[IntegrationId]>
  ): void => {
    // comingSoon providers may still be toggled so each user can store their own credentials
    setIntegrations({
      ...prefs.integrations,
      [id]: { ...prefs.integrations[id], ...patch }
    })
  }

  const runTest = async (id: IntegrationId): Promise<void> => {
    setTestingId(id)
    setTestStatus((s) => ({ ...s, [id]: t('settings.sources.testing') }))
    try {
      const result = await window.api.testIntegration({ id })
      setTestStatus((s) => ({
        ...s,
        [id]: t('settings.sources.testOk', { detail: result.detail })
      }))
    } catch (err) {
      setTestStatus((s) => ({
        ...s,
        [id]: t('settings.sources.testFail', {
          detail: (err as Error).message || 'error'
        })
      }))
    } finally {
      setTestingId(null)
    }
  }

  const dbPath =
    dbInfo.data?.dbPath ??
    '~/Library/Application Support/quiet-ledger/networth.sqlite'

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
        <BrandLockup className="mb-5" subtitle={`v${__APP_VERSION__}`} />
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
            <SettingsRow
              title={t('settings.updates')}
              description={
                updateStatus.state === 'ready'
                  ? t('settings.updates.ready', { version: updateStatus.version })
                  : updateStatus.state === 'downloading'
                    ? t('settings.updates.downloading', {
                        percent: Math.round(updateStatus.percent)
                      })
                    : updateStatus.state === 'available'
                      ? t('settings.updates.available', { version: updateStatus.version })
                      : updateStatus.state === 'not-available'
                        ? t('settings.updates.upToDate', { version: updateStatus.version })
                        : updateStatus.state === 'disabled'
                          ? t('settings.updates.disabled')
                          : updateStatus.state === 'error'
                            ? t('settings.updates.error', { detail: updateStatus.message })
                            : updateStatus.state === 'checking'
                              ? t('settings.updates.checking')
                              : t('settings.updates.current', { version: appVersion })
              }
              control={
                updateStatus.state === 'ready' ? (
                  <Button
                    size="sm"
                    className="h-7 rounded-md"
                    onClick={() => void window.api.quitAndInstall()}
                  >
                    {t('settings.updates.restart')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md"
                    disabled={
                      checkingUpdate ||
                      updateStatus.state === 'checking' ||
                      updateStatus.state === 'downloading' ||
                      updateStatus.state === 'disabled'
                    }
                    onClick={() => {
                      setCheckingUpdate(true)
                      void window.api
                        .checkForUpdates()
                        .then(setUpdateStatus)
                        .finally(() => setCheckingUpdate(false))
                    }}
                  >
                    {checkingUpdate || updateStatus.state === 'checking'
                      ? t('settings.updates.checking')
                      : t('settings.updates.check')}
                  </Button>
                )
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

        {active === 'sources' ? (
          <div className="space-y-3">
            <p className="text-[12px] leading-4 text-[var(--ink-3)]">{t('settings.sources.hint')}</p>
            <p className="text-[12px] leading-4 text-[var(--ink-3)]">
              {t('settings.sources.credentialsHint')}
            </p>
            <div className="surface-card overflow-hidden">
              {INTEGRATION_DEFS.map((def) => {
                const state = prefs.integrations[def.id]
                const coming = Boolean(def.comingSoon)
                const hasSecretFields = Boolean(def.secretFields?.length)
                const canTest =
                  !coming &&
                  (def.id === 'yahoo_equity' ||
                    def.id === 'frankfurter_fx' ||
                    def.id === 'analizy_funds' ||
                    def.id === 'property_catalog' ||
                    def.id === 'property_otodom' ||
                    def.id === 'vehicle_otomoto')
                return (
                  <div
                    key={def.id}
                    className="border-t border-[var(--line)] px-4 py-3 first:border-t-0"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium">{t(def.labelKey)}</span>
                          {coming ? (
                            <span className="rounded bg-[var(--surface-2)] px-1.5 text-[10px] font-semibold tracking-wide text-[var(--ink-3)] uppercase">
                              {t('integrations.comingSoon')}
                            </span>
                          ) : null}
                          {hasSecretFields ? (
                            <span className="rounded bg-[var(--surface-2)] px-1.5 text-[10px] font-semibold tracking-wide text-[var(--ink-3)] uppercase">
                              {def.requiresSecret
                                ? t('integrations.secret.badge')
                                : t('integrations.secret.optional')}
                            </span>
                          ) : (
                            <span className="rounded bg-[var(--surface-2)] px-1.5 text-[10px] font-semibold tracking-wide text-[var(--ink-3)] uppercase">
                              {t('integrations.secret.noKey')}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[12px] leading-4 text-[var(--ink-3)]">
                          {t(def.hintKey)}
                        </div>
                        {testStatus[def.id] ? (
                          <div className="mt-1 text-[12px] text-[var(--ink-2)]">
                            {testStatus[def.id]}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Segment>
                          <Seg
                            active={state.mode === 'auto' && state.enabled}
                            onClick={() =>
                              patchIntegration(def.id, { enabled: true, mode: 'auto' })
                            }
                          >
                            {t('settings.sources.modeAuto')}
                          </Seg>
                          <Seg
                            active={state.mode === 'manual' || !state.enabled}
                            onClick={() =>
                              patchIntegration(def.id, { enabled: false, mode: 'manual' })
                            }
                          >
                            {t('settings.sources.modeManual')}
                          </Seg>
                        </Segment>
                        <Toggle
                          checked={state.enabled}
                          onChange={(enabled) =>
                            patchIntegration(def.id, {
                              enabled,
                              mode: enabled ? 'auto' : 'manual'
                            })
                          }
                        />
                        {canTest ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={testingId === def.id || !state.enabled}
                            onClick={() => void runTest(def.id)}
                          >
                            {t('settings.sources.test')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {hasSecretFields && state.enabled ? (
                      <IntegrationCredentialsFields def={def} persist />
                    ) : null}
                  </div>
                )
              })}
            </div>
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
