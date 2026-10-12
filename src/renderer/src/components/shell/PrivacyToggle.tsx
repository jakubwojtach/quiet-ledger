import { useEffect, type JSX } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLocale } from '@renderer/lib/i18n/locale'
import { usePreferences } from '@renderer/lib/preferences'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

/** Global privacy eye — toggles prefs.privacy. ⌘/Ctrl+Shift+H. */
export function PrivacyToggle({ className }: { className?: string }): JSX.Element {
  const { t } = useLocale()
  const { prefs, setPrefs } = usePreferences()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return
      if (e.key.toLowerCase() !== 'h') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      setPrefs({ privacy: !prefs.privacy })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prefs.privacy, setPrefs])

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-7 w-7 shrink-0 px-0', className)}
      title={`${t('privacy.toggle')} (⌘⇧H)`}
      aria-label={t('privacy.toggle')}
      aria-pressed={prefs.privacy}
      data-testid="privacy-toggle"
      onClick={() => setPrefs({ ...prefs, privacy: !prefs.privacy })}
    >
      {prefs.privacy ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </Button>
  )
}
