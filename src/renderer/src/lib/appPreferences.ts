import {
  defaultIntegrationsConfig,
  normalizeIntegrationsConfig,
  type InterestId,
  type IntegrationsConfig
} from '@shared/integrations'
import type { ThemeMode } from './theme'

export type FontPackId = 'quiet' | 'editorial' | 'classic' | 'system'
export type DensityId = 'comfortable' | 'compact'
export type { InterestId, IntegrationsConfig }

export type AppPreferences = {
  themeMode: ThemeMode
  /** Accent preset id or raw oklch/hex */
  accent: string
  fontPack: FontPackId
  density: DensityId
  privacy: boolean
  showSavings: boolean
  showInstallments: boolean
  interests: InterestId[]
  integrations: IntegrationsConfig
  onboardingCompleted: boolean
}

export const ACCENT_PRESETS = [
  {
    id: 'blue',
    dark: 'oklch(0.74 0.12 250)',
    light: 'oklch(0.52 0.15 255)',
    labelKey: 'prefs.accent.blue'
  },
  {
    id: 'teal',
    dark: 'oklch(0.74 0.10 195)',
    light: 'oklch(0.52 0.10 195)',
    labelKey: 'prefs.accent.teal'
  },
  {
    id: 'violet',
    dark: 'oklch(0.72 0.12 300)',
    light: 'oklch(0.52 0.14 300)',
    labelKey: 'prefs.accent.violet'
  },
  {
    id: 'amber',
    dark: 'oklch(0.80 0.12 75)',
    light: 'oklch(0.64 0.13 70)',
    labelKey: 'prefs.accent.amber'
  },
  {
    id: 'graphite',
    dark: 'oklch(0.70 0.02 255)',
    light: 'oklch(0.45 0.02 255)',
    labelKey: 'prefs.accent.graphite'
  }
] as const

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id']

export const FONT_PACKS: {
  id: FontPackId
  labelKey: string
  sans: string
  display: string
}[] = [
  {
    id: 'quiet',
    labelKey: 'prefs.font.quiet',
    sans: "'Geist', Inter, system-ui, sans-serif",
    display: "'Geist', Inter, system-ui, sans-serif"
  },
  {
    id: 'editorial',
    labelKey: 'prefs.font.editorial',
    sans: "'Geist', Inter, system-ui, sans-serif",
    display: "'Instrument Serif', 'Libre Baskerville', Georgia, serif"
  },
  {
    id: 'classic',
    labelKey: 'prefs.font.classic',
    sans: "'Plus Jakarta Sans', 'Segoe UI', Candara, sans-serif",
    display: "'Fraunces', 'Iowan Old Style', Georgia, serif"
  },
  {
    id: 'system',
    labelKey: 'prefs.font.system',
    sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "system-ui, -apple-system, 'Segoe UI', sans-serif"
  }
]

export const INTERESTS: { id: InterestId; labelKey: string }[] = [
  { id: 'etf', labelKey: 'onboarding.interest.etf' },
  { id: 'property', labelKey: 'onboarding.interest.property' },
  { id: 'cash', labelKey: 'onboarding.interest.cash' },
  { id: 'loans', labelKey: 'onboarding.interest.loans' },
  { id: 'retirement', labelKey: 'onboarding.interest.retirement' }
]

export const DEFAULT_PREFERENCES: AppPreferences = {
  themeMode: 'auto',
  accent: 'blue',
  fontPack: 'quiet',
  density: 'comfortable',
  privacy: false,
  showSavings: true,
  showInstallments: true,
  interests: [],
  integrations: defaultIntegrationsConfig(),
  onboardingCompleted: false
}

const STORAGE_KEY = 'app-preferences'

const LEGACY_FONT: Record<string, FontPackId> = {
  night: 'quiet',
  modern: 'quiet',
  editorial: 'editorial',
  classic: 'classic',
  system: 'system',
  quiet: 'quiet'
}

const LEGACY_ACCENT: Record<string, AccentPresetId> = {
  brass: 'blue',
  forest: 'teal',
  copper: 'amber',
  slate: 'graphite',
  wine: 'violet',
  blue: 'blue',
  teal: 'teal',
  violet: 'violet',
  amber: 'amber',
  graphite: 'graphite',
  '#9a7420': 'blue',
  '#1f6f63': 'teal',
  '#2a8a7a': 'teal',
  '#2d6a8f': 'blue',
  '#3d5a6c': 'graphite',
  '#7a3b4a': 'violet'
}

export function resolveAccent(
  accent: string,
  theme: 'light' | 'dark'
): string {
  const key = accent.toLowerCase()
  const id = (LEGACY_ACCENT[key] ??
    (ACCENT_PRESETS.some((p) => p.id === key) ? key : null)) as AccentPresetId | null
  const preset = ACCENT_PRESETS.find((p) => p.id === (id ?? 'blue')) ?? ACCENT_PRESETS[0]
  return theme === 'dark' ? preset.dark : preset.light
}

export function readPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppPreferences>
      // Prefs written before the wizard existed have no flag — don't re-show it.
      let onboardingCompleted =
        typeof parsed.onboardingCompleted === 'boolean' ? parsed.onboardingCompleted : true

      // One-shot Quiet Ledger migration: existing installs got defaulted to false.
      try {
        if (!localStorage.getItem('app-onboarding-migrate-ql1')) {
          localStorage.setItem('app-onboarding-migrate-ql1', '1')
          onboardingCompleted = true
        }
      } catch {
        /* ignore */
      }

      const prefs = normalizePreferences({
        ...DEFAULT_PREFERENCES,
        ...parsed,
        onboardingCompleted
      })
      writePreferences(prefs)
      return prefs
    }
  } catch {
    /* ignore */
  }

  let themeMode: ThemeMode = 'auto'
  let returningUser = false
  try {
    const legacy = localStorage.getItem('app-theme-mode')
    if (legacy === 'light' || legacy === 'dark' || legacy === 'auto') {
      themeMode = legacy
      returningUser = true
    }
    if (localStorage.getItem('app-locale')) returningUser = true
  } catch {
    /* ignore */
  }

  return normalizePreferences({
    ...DEFAULT_PREFERENCES,
    themeMode,
    onboardingCompleted: returningUser
  })
}

export function writePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    localStorage.setItem('app-theme-mode', prefs.themeMode)
  } catch {
    /* ignore */
  }
}

export function normalizePreferences(prefs: AppPreferences): AppPreferences {
  let showSavings = Boolean(prefs.showSavings)
  let showInstallments = Boolean(prefs.showInstallments)
  if (!showSavings && !showInstallments) {
    showSavings = true
    showInstallments = true
  }

  const fontRaw = String(prefs.fontPack ?? 'quiet')
  const fontPack = LEGACY_FONT[fontRaw] ?? DEFAULT_PREFERENCES.fontPack

  const accentRaw = String(prefs.accent ?? 'blue').toLowerCase()
  const accent =
    LEGACY_ACCENT[accentRaw] ??
    (ACCENT_PRESETS.some((p) => p.id === accentRaw) ? accentRaw : DEFAULT_PREFERENCES.accent)

  return {
    ...prefs,
    accent,
    fontPack,
    density: prefs.density === 'compact' ? 'compact' : 'comfortable',
    privacy: Boolean(prefs.privacy),
    showSavings,
    showInstallments,
    interests: Array.isArray(prefs.interests) ? prefs.interests : [],
    integrations: normalizeIntegrationsConfig(prefs.integrations),
    onboardingCompleted: Boolean(prefs.onboardingCompleted)
  }
}

/** Push renderer prefs integrations into the main-process registry. */
export function syncIntegrationsToMain(integrations: IntegrationsConfig): void {
  try {
    void window.api?.setIntegrations?.({ integrations })
  } catch {
    /* ignore — preload may be unavailable in tests */
  }
}

export function applyPreferenceStyles(
  prefs: AppPreferences,
  resolvedTheme: 'light' | 'dark'
): void {
  const root = document.documentElement
  const pack = FONT_PACKS.find((f) => f.id === prefs.fontPack) ?? FONT_PACKS[0]
  const accent = resolveAccent(prefs.accent, resolvedTheme)

  root.style.setProperty('--font-sans', pack.sans)
  root.style.setProperty('--font-display', pack.display)
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--color-primary', accent)
  root.style.setProperty('--color-brass', accent)
  root.style.setProperty('--color-forest', accent)
  root.dataset.density = prefs.density
  root.classList.toggle('privacy', prefs.privacy)
}

export function defaultHomePath(prefs: AppPreferences): string {
  if (prefs.showSavings) return '/savings'
  if (prefs.showInstallments) return '/installments'
  return '/savings'
}
