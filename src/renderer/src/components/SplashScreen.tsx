import { useEffect, useId, useState, type JSX } from 'react'
import { LottieLight } from 'lottie-react'
import moneyStack from '@renderer/assets/lottie/money-stack.json'
import { useLocale } from '@renderer/lib/i18n/locale'
import { cn } from '@renderer/lib/utils'

const SESSION_KEY = 'ql-splash-seen-v6'
const HOLD_MS = 500
const FADE_MS = 450

export function shouldShowSplash(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  } catch {
    return true
  }
}

/**
 * Brand Lottie + handwrite wordmark. Used for cold-start splash and onboarding → app handoff.
 * Replay entry splash: `sessionStorage.removeItem('ql-splash-seen-v6')` then reload.
 */
export function BrandReveal({
  onDone,
  persistSession = false,
  className,
  testId = 'brand-reveal'
}: {
  onDone: () => void
  /** When true, marks the session splash as seen (cold start only). */
  persistSession?: boolean
  className?: string
  testId?: string
}): JSX.Element {
  const { t } = useLocale()
  const maskId = useId()
  const [phase, setPhase] = useState<'play' | 'hold' | 'out'>('play')

  useEffect(() => {
    const fallback = window.setTimeout(() => setPhase((p) => (p === 'play' ? 'hold' : p)), 4000)
    return () => window.clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (phase !== 'hold') return
    const id = window.setTimeout(() => setPhase('out'), HOLD_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'out') return
    const id = window.setTimeout(() => {
      if (persistSession) {
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {
          /* private mode */
        }
      }
      onDone()
    }, FADE_MS)
    return () => window.clearTimeout(id)
  }, [phase, onDone, persistSession])

  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[var(--bg)] transition-opacity duration-[450ms] ease-out',
        phase === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100',
        className
      )}
      data-testid={testId}
      role="img"
      aria-label={t('app.name')}
    >
      <div className="app-region-drag absolute inset-x-0 top-0 h-10" aria-hidden />

      <LottieLight
        className="h-[min(40vh,300px)] w-[min(50.7vh,380px)]"
        src={moneyStack}
        autoplay
        loop={false}
        subscriptions={{ complete: () => setPhase('hold') }}
      />

      <svg
        className="ql-handwrite mt-3 aspect-[420/72] w-[min(86vw,620px)] overflow-visible"
        viewBox="0 0 420 72"
        aria-hidden
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect className="ql-handwrite-pen" x="0" y="0" width="420" height="72" fill="white" />
          </mask>
        </defs>
        <text
          x="210"
          y="52"
          textAnchor="middle"
          mask={`url(#${maskId})`}
          className="ql-handwrite-text font-display"
        >
          {t('app.name')}
        </text>
      </svg>
    </div>
  )
}

export function SplashScreen({ onDone }: { onDone: () => void }): JSX.Element {
  return <BrandReveal onDone={onDone} persistSession testId="splash-screen" />
}
