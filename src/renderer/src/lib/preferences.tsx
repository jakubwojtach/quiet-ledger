import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode
} from 'react'
import {
  applyPreferenceStyles,
  DEFAULT_PREFERENCES,
  normalizePreferences,
  readPreferences,
  syncIntegrationsToMain,
  writePreferences,
  type AppPreferences,
  type FontPackId,
  type InterestId,
  type IntegrationsConfig
} from './appPreferences'
import { useTheme, type ThemeMode } from './theme'

type PreferencesContextValue = {
  prefs: AppPreferences
  setPrefs: (patch: Partial<AppPreferences>) => void
  setThemeMode: (mode: ThemeMode) => void
  setAccent: (hex: string) => void
  setFontPack: (id: FontPackId) => void
  setModules: (modules: { showSavings?: boolean; showInstallments?: boolean }) => void
  setInterests: (interests: InterestId[]) => void
  setIntegrations: (integrations: IntegrationsConfig) => void
  completeOnboarding: (patch?: Partial<AppPreferences>) => void
  reopenOnboarding: () => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }): JSX.Element {
  const { mode, setMode, resolved } = useTheme()
  const [prefs, setPrefsState] = useState<AppPreferences>(() =>
    typeof window === 'undefined' ? DEFAULT_PREFERENCES : readPreferences()
  )

  // Keep theme provider in sync with prefs.themeMode
  useEffect(() => {
    if (prefs.themeMode !== mode) setMode(prefs.themeMode)
  }, [prefs.themeMode, mode, setMode])

  useEffect(() => {
    applyPreferenceStyles(prefs, resolved)
  }, [prefs, resolved])

  const commit = useCallback((next: AppPreferences) => {
    const normalized = normalizePreferences(next)
    setPrefsState(normalized)
    writePreferences(normalized)
    syncIntegrationsToMain(normalized.integrations)
  }, [])

  // Mirror integrations into main on first mount (and after localStorage hydrate).
  useEffect(() => {
    syncIntegrationsToMain(prefs.integrations)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot sync once with initial prefs
  }, [])

  const setPrefs = useCallback(
    (patch: Partial<AppPreferences>) => {
      commit({ ...prefs, ...patch })
    },
    [commit, prefs]
  )

  const setThemeMode = useCallback(
    (themeMode: ThemeMode) => {
      setMode(themeMode)
      commit({ ...prefs, themeMode })
    },
    [commit, prefs, setMode]
  )

  const setAccent = useCallback(
    (accent: string) => commit({ ...prefs, accent }),
    [commit, prefs]
  )

  const setFontPack = useCallback(
    (fontPack: FontPackId) => commit({ ...prefs, fontPack }),
    [commit, prefs]
  )

  const setModules = useCallback(
    (modules: { showSavings?: boolean; showInstallments?: boolean }) => {
      commit({
        ...prefs,
        showSavings: modules.showSavings ?? prefs.showSavings,
        showInstallments: modules.showInstallments ?? prefs.showInstallments
      })
    },
    [commit, prefs]
  )

  const setInterests = useCallback(
    (interests: InterestId[]) => commit({ ...prefs, interests }),
    [commit, prefs]
  )

  const setIntegrations = useCallback(
    (integrations: IntegrationsConfig) => commit({ ...prefs, integrations }),
    [commit, prefs]
  )

  const completeOnboarding = useCallback(
    (patch: Partial<AppPreferences> = {}) => {
      const next = { ...prefs, ...patch, onboardingCompleted: true }
      commit(next)
      if (patch.themeMode) setMode(patch.themeMode)
    },
    [commit, prefs, setMode]
  )

  const reopenOnboarding = useCallback(() => {
    commit({ ...prefs, onboardingCompleted: false })
  }, [commit, prefs])

  const value = useMemo(
    () => ({
      prefs,
      setPrefs,
      setThemeMode,
      setAccent,
      setFontPack,
      setModules,
      setInterests,
      setIntegrations,
      completeOnboarding,
      reopenOnboarding
    }),
    [
      prefs,
      setPrefs,
      setThemeMode,
      setAccent,
      setFontPack,
      setModules,
      setInterests,
      setIntegrations,
      completeOnboarding,
      reopenOnboarding
    ]
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
