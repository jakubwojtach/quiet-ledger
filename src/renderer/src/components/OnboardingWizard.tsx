import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LottieLight } from 'lottie-react'
import { ArrowDownUp, Check, Columns2, Lock, TrendingUp } from 'lucide-react'
import moneyStack from '@renderer/assets/lottie/money-stack.json'
import { StaggerItem, StaggerList } from '@renderer/components/motion/PageTransition'
import {
  applyInterestDataModes,
  INTEGRATION_DEFS,
  integrationsFromInterests,
  type DataMode,
  type IntegrationId,
  type IntegrationSecretValues,
  type InterestDataModes,
  type IntegrationsConfig
} from '@shared/integrations'
import {
  ACCENT_PRESETS,
  DEFAULT_PREFERENCES,
  FONT_PACKS,
  INTERESTS,
  type AppPreferences,
  type FontPackId,
  type InterestId
} from '@renderer/lib/appPreferences'
import { usePreferences } from '@renderer/lib/preferences'
import { useLocale } from '@renderer/lib/i18n/locale'
import {
  IntegrationCredentialsFields,
  persistCredentialDrafts
} from '@renderer/components/IntegrationCredentialsFields'
import { BrandLockup } from '@renderer/components/BrandLockup'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type Step = 0 | 1 | 2 | 3 | 4 | 5

const STEPS = [
  { titleKey: 'onboarding.step1.title', hintKey: 'onboarding.step1.rail' },
  { titleKey: 'onboarding.step2.title', hintKey: 'onboarding.step2.rail' },
  { titleKey: 'onboarding.step3.title', hintKey: 'onboarding.step3.rail' },
  { titleKey: 'onboarding.step4.title', hintKey: 'onboarding.step4.rail' },
  { titleKey: 'onboarding.step5.title', hintKey: 'onboarding.step5.rail' },
  { titleKey: 'onboarding.step6.title', hintKey: 'onboarding.step6.rail' }
] as const

const LAST_STEP = 5
const ease = [0.22, 1, 0.36, 1] as const

/** First-run quiz: full-window Quiet Ledger layout (no blurred app behind). */
export function OnboardingWizard({
  onEnterApp
}: {
  /** Parent mounts BrandReveal over the shell in the same tick — no wizard blink. */
  onEnterApp: (next: AppPreferences) => void
}): JSX.Element | null {
  const { prefs, setAccent, setFontPack } = usePreferences()
  const { t } = useLocale()
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState<Step>(0)
  const [dir, setDir] = useState(1)
  const prevStep = useRef(step)
  const entering = useRef(false)

  const goTo = useCallback((next: Step): void => {
    setDir(next > prevStep.current ? 1 : -1)
    prevStep.current = next
    setStep(next)
  }, [])
  const [track, setTrack] = useState<'savings' | 'installments' | 'both'>(() => {
    if (prefs.showSavings && prefs.showInstallments) return 'both'
    if (prefs.showInstallments) return 'installments'
    return 'savings'
  })
  const [interests, setInterests] = useState<InterestId[]>(prefs.interests)
  const [dataModes, setDataModes] = useState<InterestDataModes>(() => {
    const initial: InterestDataModes = {}
    for (const id of prefs.interests) initial[id] = 'auto'
    return initial
  })
  const [integrations, setIntegrationsLocal] = useState<IntegrationsConfig>(
    () => prefs.integrations
  )
  const [credentialDrafts, setCredentialDrafts] = useState<
    Partial<Record<IntegrationId, IntegrationSecretValues>>
  >({})
  const [accent, setAccentLocal] = useState(prefs.accent)
  const [fontPack, setFontLocal] = useState<FontPackId>(prefs.fontPack)

  const modules = useMemo(() => {
    if (track === 'savings') return { showSavings: true, showInstallments: false }
    if (track === 'installments') return { showSavings: false, showInstallments: true }
    return { showSavings: true, showInstallments: true }
  }, [track])

  const modeInterests = useMemo(
    () => interests.filter((id) => id !== 'loans'),
    [interests]
  )

  const finishAsync = useCallback(async (): Promise<void> => {
    if (entering.current) return
    entering.current = true
    try {
      await persistCredentialDrafts(credentialDrafts, INTEGRATION_DEFS)
    } catch {
      /* safeStorage may be unavailable in rare environments — prefs still save */
    }
    onEnterApp({
      ...DEFAULT_PREFERENCES,
      ...prefs,
      ...modules,
      interests,
      integrations,
      accent,
      fontPack,
      onboardingCompleted: true
    })
  }, [prefs, modules, interests, integrations, credentialDrafts, accent, fontPack, onEnterApp])

  useEffect(() => {
    if (!prefs.onboardingCompleted) setStep(0)
  }, [prefs.onboardingCompleted])

  useEffect(() => {
    if (prefs.onboardingCompleted) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (step < LAST_STEP) {
          goTo((step + 1) as Step)
          return
        }
        void finishAsync()
      } else if (e.key === 'Escape' && step > 0) {
        e.preventDefault()
        goTo((step - 1) as Step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prefs.onboardingCompleted, step, finishAsync, goTo])

  if (prefs.onboardingCompleted) return null

  const rebuildIntegrations = (nextInterests: InterestId[], modes: InterestDataModes): void => {
    const fromInterests = integrationsFromInterests(nextInterests)
    setIntegrationsLocal(applyInterestDataModes(fromInterests, modes))
  }

  const toggleInterest = (id: InterestId): void => {
    setInterests((prev) => {
      const on = prev.includes(id)
      const next = on ? prev.filter((x) => x !== id) : [...prev, id]
      const nextModes = { ...dataModes }
      if (on) delete nextModes[id]
      else nextModes[id] = nextModes[id] ?? 'auto'
      setDataModes(nextModes)
      rebuildIntegrations(next, nextModes)
      return next
    })
  }

  const setModeFor = (id: InterestId, mode: DataMode): void => {
    const nextModes = { ...dataModes, [id]: mode }
    setDataModes(nextModes)
    rebuildIntegrations(interests, nextModes)
  }

  const toggleProvider = (id: IntegrationId): void => {
    setIntegrationsLocal((prev) => {
      const enabled = !prev[id].enabled
      return {
        ...prev,
        [id]: {
          enabled,
          mode: enabled ? 'auto' : 'manual'
        }
      }
    })
  }

  const finish = (): void => {
    void finishAsync()
  }

  const skip = (): void => {
    if (entering.current) return
    entering.current = true
    onEnterApp({
      ...DEFAULT_PREFERENCES,
      ...prefs,
      onboardingCompleted: true,
      integrations: integrationsFromInterests([])
    })
  }

  const enabledProviders = INTEGRATION_DEFS.filter(
    (d) => !d.comingSoon && integrations[d.id].enabled
  )

  return (
    <div
      className="fixed inset-0 z-[100] grid grid-cols-1 bg-[var(--bg)] md:grid-cols-[300px_1fr] min-[1200px]:grid-cols-[340px_1fr]"
      data-testid="onboarding-wizard"
    >
      <aside className="relative flex flex-col overflow-hidden border-b border-[var(--line)] bg-[var(--rail)] px-7 pt-8 pb-6 md:h-dvh md:border-r md:border-b-0 md:pt-0">
        <div className="app-region-drag -mx-7 mb-2 hidden h-10 shrink-0 md:block" aria-hidden />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <BrandLockup subtitle={t('onboarding.setupTime')} />
          <p className="mt-5 max-w-[240px] text-[13px] leading-5 text-[var(--ink-3)]">
            {t('onboarding.setupIntro')}
          </p>
        </motion.div>

        <ol className="relative mt-10 flex flex-col">
          {STEPS.map((s, i) => {
            const done = i < step
            const on = step === i
            const future = i > step
            const last = i === STEPS.length - 1
            return (
              <motion.li
                key={s.titleKey}
                className="relative flex items-start gap-3.5 pb-5 last:pb-0"
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.05 + i * 0.04, ease }}
              >
                {!last ? (
                  <span
                    className="absolute top-7 bottom-0 left-[11px] w-px overflow-hidden bg-[var(--line)]"
                    aria-hidden
                  >
                    <motion.span
                      className="absolute inset-x-0 top-0 bg-[var(--accent)]"
                      initial={false}
                      animate={{ height: done ? '100%' : '0%' }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease }}
                    />
                  </span>
                ) : null}
                <motion.span
                  className={cn(
                    'relative z-[1] grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] text-[11px] font-semibold',
                    done && 'border-[var(--accent)] bg-[var(--accent)] text-white',
                    on && 'border-[var(--accent)] bg-[var(--accent)] text-white',
                    future && 'border-[var(--line-strong)] bg-[var(--rail)] text-[var(--ink-3)]'
                  )}
                  animate={
                    reduceMotion
                      ? undefined
                      : on
                        ? { scale: [1, 1.12, 1] }
                        : done
                          ? { scale: 1 }
                          : { scale: 1 }
                  }
                  transition={{ duration: 0.35, ease }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span
                        key="check"
                        initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ duration: 0.2, ease }}
                      >
                        <Check className="size-3" strokeWidth={2.5} />
                      </motion.span>
                    ) : (
                      <motion.span key="num" initial={false}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <div className="min-w-0 pt-0.5">
                  <b
                    className={cn(
                      'block text-[13px] font-medium transition-colors duration-200',
                      on || done ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
                    )}
                  >
                    {t(s.titleKey)}
                  </b>
                  <small
                    className={cn(
                      'mt-0.5 block text-[12px] leading-4 transition-colors duration-200',
                      on ? 'text-[var(--ink-2)]' : 'text-[var(--ink-3)]'
                    )}
                  >
                    {t(s.hintKey)}
                  </small>
                </div>
              </motion.li>
            )
          })}
        </ol>

        <div className="mt-auto flex flex-col gap-3">
          <div className="pointer-events-none flex justify-center opacity-90" aria-hidden>
            <LottieLight
              className="h-[88px] w-[112px]"
              src={moneyStack}
              autoplay
              loop={false}
            />
          </div>
          <motion.div
            className="flex gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface-1)] p-3 text-[12px] leading-[18px] text-[var(--ink-2)]"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.35, ease }}
          >
            <Lock className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
            <span>{t('onboarding.localNote')}</span>
          </motion.div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-col bg-[var(--bg)] md:h-dvh">
        <div className="app-region-drag hidden h-10 shrink-0 md:block" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-8 md:px-12 md:pt-10 lg:px-16">
          <div className="mx-auto w-full max-w-[640px]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, x: dir * 28, filter: 'blur(4px)' }
                }
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, x: dir * -20, filter: 'blur(3px)' }
                }
                transition={{ duration: reduceMotion ? 0 : 0.32, ease }}
              >
                <div className="text-[12px] font-medium text-[var(--accent)]">
                  {t('onboarding.stepOf', { n: step + 1, total: LAST_STEP + 1 })}
                  {step === 3 ? (
                    <span className="ml-1.5 font-normal text-[var(--ink-3)]">
                      {t('onboarding.optional')}
                    </span>
                  ) : null}
                </div>
                <h1 className="font-display mt-3 text-[clamp(26px,3.5vw,34px)] leading-tight font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {t(STEPS[step].titleKey)}
                </h1>
                <p className="mt-2 max-w-[48ch] text-[14px] leading-6 text-[var(--ink-2)]">
                  {step === 0 && t('onboarding.step1.hint')}
                  {step === 1 && t('onboarding.step2.hint')}
                  {step === 2 && t('onboarding.step3.hint')}
                  {step === 3 && t('onboarding.step4.hint')}
                  {step === 4 && t('onboarding.step5.hint')}
                  {step === 5 && t('onboarding.step6.hint')}
                </p>

                <div className="mt-9 space-y-2.5">
            {step === 0 && (
              <StaggerList className="space-y-2.5">
                <StaggerItem>
                  <TrackOption
                    active={track === 'savings'}
                    onClick={() => setTrack('savings')}
                    icon={<TrendingUp className="size-[18px]" strokeWidth={1.6} />}
                    title={t('onboarding.track.savings')}
                    hint={t('onboarding.track.savingsHint')}
                  />
                </StaggerItem>
                <StaggerItem>
                  <TrackOption
                    active={track === 'installments'}
                    onClick={() => setTrack('installments')}
                    icon={<ArrowDownUp className="size-[18px]" strokeWidth={1.6} />}
                    title={t('onboarding.track.installments')}
                    hint={t('onboarding.track.installmentsHint')}
                  />
                </StaggerItem>
                <StaggerItem>
                  <TrackOption
                    active={track === 'both'}
                    onClick={() => setTrack('both')}
                    icon={<Columns2 className="size-[18px]" strokeWidth={1.6} />}
                    title={t('onboarding.track.both')}
                    hint={t('onboarding.track.bothHint')}
                  />
                </StaggerItem>
              </StaggerList>
            )}

            {step === 1 && (
              <StaggerList className="flex flex-wrap gap-2">
                {INTERESTS.map((item) => {
                  const on = interests.includes(item.id)
                  return (
                    <StaggerItem key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggleInterest(item.id)}
                        className={cn(
                          'inline-flex h-7 items-center rounded-xl border px-3 text-[12px] font-medium transition-transform active:scale-[0.97]',
                          on
                            ? 'border-transparent bg-[var(--accent-subtle)] text-[var(--accent)]'
                            : 'border-[var(--line-strong)] text-[var(--ink-2)]'
                        )}
                      >
                        {t(item.labelKey)}
                      </button>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            )}

            {step === 2 && (
              <StaggerList className="space-y-2.5">
                {modeInterests.length === 0 ? (
                  <StaggerItem>
                    <p className="text-[13px] text-[var(--ink-3)]">{t('onboarding.dataMode.empty')}</p>
                  </StaggerItem>
                ) : (
                  modeInterests.map((id) => {
                    const mode = dataModes[id] ?? 'auto'
                    return (
                      <StaggerItem key={id}>
                        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface-1)] px-4 py-3.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium">
                              {t(`onboarding.interest.${id}`)}
                            </div>
                            <div className="text-[12px] text-[var(--ink-3)]">
                              {t(`onboarding.dataMode.${id}.hint`)}
                            </div>
                          </div>
                          <div className="inline-flex rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5">
                            {(['auto', 'manual'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setModeFor(id, m)}
                                className={cn(
                                  'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium',
                                  mode === m
                                    ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                                    : 'text-[var(--ink-3)]'
                                )}
                              >
                                {t(`onboarding.dataMode.${m}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </StaggerItem>
                    )
                  })
                )}
              </StaggerList>
            )}

            {step === 3 && (
              <StaggerList className="space-y-2">
                <StaggerItem>
                  <p className="mb-1 text-[12px] text-[var(--ink-3)]">
                    {t('onboarding.providers.credentialsNote')}
                  </p>
                </StaggerItem>
                {INTEGRATION_DEFS.map((def) => {
                  const state = integrations[def.id]
                  const coming = Boolean(def.comingSoon)
                  const hasSecretFields = Boolean(def.secretFields?.length)
                  return (
                    <StaggerItem key={def.id}>
                      <div
                        className={cn(
                          'rounded-[12px] border px-4 py-3 transition-colors',
                          state.enabled
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]'
                            : 'border-[var(--line)] bg-[var(--surface-1)]'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleProvider(def.id)}
                          className="flex w-full items-start gap-3 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <b className="text-[13px] font-medium">{t(def.labelKey)}</b>
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
                            </span>
                            <small className="mt-0.5 block text-[12px] leading-4 text-[var(--ink-3)]">
                              {t(def.hintKey)}
                            </small>
                          </span>
                          <span
                            className={cn(
                              'mt-1 size-[18px] shrink-0 rounded-full border-[1.5px] transition-[border-width]',
                              state.enabled
                                ? 'border-[5px] border-[var(--accent)]'
                                : 'border-[var(--line-strong)]'
                            )}
                          />
                        </button>
                        {hasSecretFields && state.enabled ? (
                          <IntegrationCredentialsFields
                            def={def}
                            values={credentialDrafts[def.id] ?? {}}
                            onChange={(values) =>
                              setCredentialDrafts((prev) => ({ ...prev, [def.id]: values }))
                            }
                          />
                        ) : null}
                      </div>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            )}

            {step === 4 && (
              <StaggerList className="space-y-2.5">
                <StaggerItem>
                  <p className="text-[12px] font-medium text-[var(--ink-3)]">{t('prefs.accent')}</p>
                </StaggerItem>
                <StaggerItem>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={t(p.labelKey)}
                      aria-label={t(p.labelKey)}
                      onClick={() => {
                        setAccentLocal(p.id)
                        setAccent(p.id)
                      }}
                      className={cn(
                        'size-6 rounded-full transition-transform active:scale-90',
                        accent === p.id &&
                          'outline outline-2 outline-offset-2 outline-[var(--ink)]'
                      )}
                      style={{ background: p.dark }}
                    />
                  ))}
                </div>
                </StaggerItem>
                <StaggerItem>
                <p className="mt-2 text-[12px] font-medium text-[var(--ink-3)]">{t('prefs.font')}</p>
                </StaggerItem>
                <StaggerItem>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        setFontLocal(pack.id)
                        setFontPack(pack.id)
                      }}
                      className={cn(
                        'rounded-[10px] border px-3 py-2.5 text-left',
                        fontPack === pack.id
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]'
                          : 'border-[var(--line)] bg-[var(--surface-1)]'
                      )}
                      style={{ fontFamily: pack.display }}
                    >
                      <span className="block text-[13px] font-medium">{t(pack.labelKey)}</span>
                      <span
                        className="mt-0.5 block text-[12px] text-[var(--ink-3)]"
                        style={{ fontFamily: pack.sans }}
                      >
                        Aa Bb 123
                      </span>
                    </button>
                  ))}
                </div>
                </StaggerItem>
              </StaggerList>
            )}

            {step === 5 && (
              <StaggerList className="space-y-2 text-[13px] text-[var(--ink)]">
                <StaggerItem>
                  <div>
                    <span className="text-[var(--ink-3)]">{t('onboarding.summary.track')}: </span>
                    {t(
                      track === 'both'
                        ? 'onboarding.track.both'
                        : track === 'savings'
                          ? 'onboarding.track.savings'
                          : 'onboarding.track.installments'
                    )}
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div>
                    <span className="text-[var(--ink-3)]">{t('onboarding.summary.interests')}: </span>
                    {interests.length === 0
                      ? t('onboarding.summary.none')
                      : interests.map((id) => t(`onboarding.interest.${id}`)).join(', ')}
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div>
                    <span className="text-[var(--ink-3)]">{t('onboarding.summary.sources')}: </span>
                    {enabledProviders.length === 0
                      ? t('onboarding.summary.manualOnly')
                      : enabledProviders.map((d) => t(d.labelKey)).join(', ')}
                  </div>
                </StaggerItem>
              </StaggerList>
            )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--line)] bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] px-6 py-3.5 backdrop-blur-md md:px-12 lg:px-16">
          <div className="mx-auto flex w-full max-w-[640px] flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="h-8"
              disabled={step === 0}
              onClick={() => goTo((step - 1) as Step)}
            >
              ← {t('onboarding.back')}
            </Button>
            <span className="flex-1" />
            <Button variant="outline" className="h-8" onClick={skip}>
              {t('onboarding.skip')}
            </Button>
            {step < LAST_STEP ? (
              <Button className="h-8 gap-1.5 px-4" onClick={() => goTo((step + 1) as Step)}>
                {t('onboarding.next')}
                <kbd className="rounded border border-black/15 px-1 text-[10px] opacity-80">↵</kbd>
              </Button>
            ) : (
              <Button data-testid="onboarding-finish" className="h-8 px-4" onClick={finish}>
                {t('onboarding.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackOption({
  active,
  onClick,
  icon,
  title,
  hint
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  hint: string
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-[12px] border px-5 py-4 text-left transition-[transform,colors,box-shadow] active:scale-[0.99]',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]'
          : 'border-[var(--line)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]'
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-[9px] bg-[var(--surface-2)]',
          active ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[13px] font-medium">{title}</b>
        <small className="text-[12px] leading-4 text-[var(--ink-3)]">{hint}</small>
      </span>
      <span
        className={cn(
          'size-[18px] shrink-0 rounded-full border-[1.5px]',
          active ? 'border-[5px] border-[var(--accent)]' : 'border-[var(--line-strong)]'
        )}
      />
    </button>
  )
}
