import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownUp, Columns2, Lock, TrendingUp } from 'lucide-react'
import {
  ACCENT_PRESETS,
  DEFAULT_PREFERENCES,
  FONT_PACKS,
  INTERESTS,
  defaultHomePath,
  type FontPackId,
  type InterestId
} from '@renderer/lib/appPreferences'
import { usePreferences } from '@renderer/lib/preferences'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  { titleKey: 'onboarding.step1.title', hintKey: 'onboarding.step1.rail' },
  { titleKey: 'onboarding.step2.title', hintKey: 'onboarding.step2.rail' },
  { titleKey: 'onboarding.step3.title', hintKey: 'onboarding.step3.rail' },
  { titleKey: 'onboarding.step4.title', hintKey: 'onboarding.step4.rail' }
] as const

/** First-run quiz: full-window Quiet Ledger layout (no blurred app behind). */
export function OnboardingWizard(): JSX.Element | null {
  const { prefs, completeOnboarding, setAccent, setFontPack } = usePreferences()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [track, setTrack] = useState<'savings' | 'installments' | 'both'>(() => {
    if (prefs.showSavings && prefs.showInstallments) return 'both'
    if (prefs.showInstallments) return 'installments'
    return 'savings'
  })
  const [interests, setInterests] = useState<InterestId[]>(prefs.interests)
  const [accent, setAccentLocal] = useState(prefs.accent)
  const [fontPack, setFontLocal] = useState<FontPackId>(prefs.fontPack)

  const modules = useMemo(() => {
    if (track === 'savings') return { showSavings: true, showInstallments: false }
    if (track === 'installments') return { showSavings: false, showInstallments: true }
    return { showSavings: true, showInstallments: true }
  }, [track])

  useEffect(() => {
    if (!prefs.onboardingCompleted) setStep(0)
  }, [prefs.onboardingCompleted])

  useEffect(() => {
    if (prefs.onboardingCompleted) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (step < 3) {
          setStep((s) => (s + 1) as Step)
          return
        }
        const next = {
          ...DEFAULT_PREFERENCES,
          ...prefs,
          ...modules,
          interests,
          accent,
          fontPack,
          onboardingCompleted: true
        }
        completeOnboarding(next)
        navigate(defaultHomePath(next), { replace: true })
      } else if (e.key === 'Escape' && step > 0) {
        e.preventDefault()
        setStep((s) => (s - 1) as Step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    prefs,
    step,
    track,
    interests,
    accent,
    fontPack,
    modules,
    completeOnboarding,
    navigate
  ])

  if (prefs.onboardingCompleted) return null

  const finish = (): void => {
    const next = {
      ...DEFAULT_PREFERENCES,
      ...prefs,
      ...modules,
      interests,
      accent,
      fontPack,
      onboardingCompleted: true
    }
    completeOnboarding(next)
    navigate(defaultHomePath(next), { replace: true })
  }

  const skip = (): void => {
    completeOnboarding({ onboardingCompleted: true })
    navigate(defaultHomePath(prefs), { replace: true })
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid grid-cols-1 bg-[var(--bg)] md:grid-cols-[360px_1fr]"
      data-testid="onboarding-wizard"
    >
      <aside className="flex flex-col border-b border-[var(--line)] bg-[var(--rail)] px-7 pt-8 pb-7 md:h-dvh md:border-r md:border-b-0 md:pt-0">
        <div className="app-region-drag -mx-7 mb-2 hidden h-10 shrink-0 md:block" aria-hidden />
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-[var(--accent)] text-[13px] font-bold text-white">
            zł
          </span>
          <div>
            <div className="text-[13px] font-semibold">{t('app.name')}</div>
            <div className="text-[12px] text-[var(--ink-3)]">{t('onboarding.setupTime')}</div>
          </div>
        </div>

        <ol className="relative mt-12 flex flex-col gap-1">
          <span
            className="absolute top-5 bottom-5 left-[10.5px] border-l-[1.5px] border-[var(--line)]"
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const on = step === i
            return (
              <li key={s.titleKey} className="relative flex items-start gap-3 py-2">
                <span
                  className={cn(
                    'relative z-[1] grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] text-[11px] font-semibold',
                    on
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--line-strong)] bg-[var(--rail)] text-[var(--ink-3)]'
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <b
                    className={cn(
                      'block text-[13px] font-medium',
                      on ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'
                    )}
                  >
                    {t(s.titleKey)}
                  </b>
                  <small className="text-[12px] leading-4 text-[var(--ink-3)]">{t(s.hintKey)}</small>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="mt-auto flex gap-2.5 rounded-[10px] border border-[var(--line)] p-3 text-[12px] leading-[18px] text-[var(--ink-2)]">
          <Lock className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
          <span>{t('onboarding.localNote')}</span>
        </div>
      </aside>

      <div className="flex items-center justify-center overflow-y-auto bg-[var(--bg)] px-6 py-10 md:h-dvh">
        <div className="w-full max-w-[560px]">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-3)] uppercase">
            {t('onboarding.stepOf', { n: step + 1, total: 4 })}
          </div>
          <h1 className="mt-2 text-[28px] leading-9 font-semibold tracking-[-0.025em]">
            {t(STEPS[step].titleKey)}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--ink-2)]">
            {step === 0 && t('onboarding.step1.hint')}
            {step === 1 && t('onboarding.step2.hint')}
            {step === 2 && t('onboarding.step3.hint')}
            {step === 3 && t('onboarding.step4.hint')}
          </p>

          <div className="mt-7 space-y-2.5">
            {step === 0 && (
              <>
                <TrackOption
                  active={track === 'savings'}
                  onClick={() => setTrack('savings')}
                  icon={<TrendingUp className="size-[18px]" strokeWidth={1.6} />}
                  title={t('onboarding.track.savings')}
                  hint={t('onboarding.track.savingsHint')}
                />
                <TrackOption
                  active={track === 'installments'}
                  onClick={() => setTrack('installments')}
                  icon={<ArrowDownUp className="size-[18px]" strokeWidth={1.6} />}
                  title={t('onboarding.track.installments')}
                  hint={t('onboarding.track.installmentsHint')}
                />
                <TrackOption
                  active={track === 'both'}
                  onClick={() => setTrack('both')}
                  icon={<Columns2 className="size-[18px]" strokeWidth={1.6} />}
                  title={t('onboarding.track.both')}
                  hint={t('onboarding.track.bothHint')}
                />
              </>
            )}

            {step === 1 && (
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((item) => {
                  const on = interests.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setInterests((prev) =>
                          on ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                        )
                      }
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
            )}

            {step === 2 && (
              <>
                <p className="text-[12px] font-medium text-[var(--ink-3)]">{t('prefs.accent')}</p>
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
                        'size-5 rounded-full',
                        accent === p.id &&
                          'outline outline-2 outline-offset-2 outline-[var(--ink)]'
                      )}
                      style={{ background: p.dark }}
                    />
                  ))}
                </div>
                <p className="mt-4 text-[12px] font-medium text-[var(--ink-3)]">{t('prefs.font')}</p>
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
              </>
            )}

            {step === 3 && (
              <ul className="space-y-2 text-[13px] text-[var(--ink)]">
                <li>
                  <span className="text-[var(--ink-3)]">{t('onboarding.summary.track')}: </span>
                  {t(
                    track === 'both'
                      ? 'onboarding.track.both'
                      : track === 'savings'
                        ? 'onboarding.track.savings'
                        : 'onboarding.track.installments'
                  )}
                </li>
                <li>
                  <span className="text-[var(--ink-3)]">{t('onboarding.summary.interests')}: </span>
                  {interests.length === 0
                    ? t('onboarding.summary.none')
                    : interests.map((id) => t(`onboarding.interest.${id}`)).join(', ')}
                </li>
              </ul>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="h-7" onClick={skip}>
              {t('onboarding.skip')}
            </Button>
            <span className="flex-1" />
            <Button
              variant="outline"
              className="h-7"
              disabled={step === 0}
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              {t('onboarding.back')}
            </Button>
            {step < 3 ? (
              <Button className="h-7 gap-1.5" onClick={() => setStep((s) => (s + 1) as Step)}>
                {t('onboarding.next')}
                <kbd className="rounded border border-black/20 px-1 text-[10px] opacity-80">↵</kbd>
              </Button>
            ) : (
              <Button data-testid="onboarding-finish" className="h-7" onClick={finish}>
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
        'flex w-full items-center gap-3.5 rounded-[10px] border px-4 py-3.5 text-left transition-colors',
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
