import type { JSX } from 'react'
import { Monitor, Moon, Settings2, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@renderer/lib/i18n/locale'
import type { Locale } from '@renderer/lib/i18n/messages'
import { usePreferences } from '@renderer/lib/preferences'
import type { ThemeMode } from '@renderer/lib/theme'
import { cn } from '@renderer/lib/utils'

const THEMES: { mode: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
  { mode: 'light', icon: Sun, labelKey: 'theme.light' },
  { mode: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { mode: 'auto', icon: Monitor, labelKey: 'theme.auto' }
]

const LOCALES: Locale[] = ['en', 'pl']

/** Compact language + theme + settings shortcut (opens Settings page). */
export function PrefsBar(): JSX.Element {
  const navigate = useNavigate()
  const { prefs, setThemeMode } = usePreferences()
  const { locale, setLocale, t } = useLocale()

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 rounded-box border border-line bg-base-100 p-1.5 shadow-[var(--panel-shadow)]"
      data-testid="prefs-bar"
    >
      <div className="join" role="group" aria-label={t('lang.label')}>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              'btn join-item btn-sm uppercase',
              locale === code ? 'btn-primary' : 'btn-ghost'
            )}
            aria-pressed={locale === code}
          >
            {code}
          </button>
        ))}
      </div>
      <div className="join" role="group" aria-label={t('theme.label')}>
        {THEMES.map(({ mode: m, icon: Icon, labelKey }) => (
          <button
            key={m}
            type="button"
            title={t(labelKey)}
            aria-label={t(labelKey)}
            aria-pressed={prefs.themeMode === m}
            onClick={() => setThemeMode(m)}
            className={cn(
              'btn join-item btn-square btn-sm',
              prefs.themeMode === m ? 'btn-primary' : 'btn-ghost'
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      <button
        type="button"
        title={t('settings.open')}
        aria-label={t('settings.open')}
        data-testid="open-settings"
        onClick={() => navigate('/settings')}
        className="btn btn-ghost btn-square btn-sm"
      >
        <Settings2 className="size-3.5" />
      </button>
    </div>
  )
}
