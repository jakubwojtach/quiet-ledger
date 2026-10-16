/** Provider ids known to the integration registry. */
export type IntegrationId =
  | 'yahoo_equity'
  | 'analizy_funds'
  | 'frankfurter_fx'
  | 'property_catalog'
  | 'property_otodom'
  | 'vehicle_otomoto'

export type DataMode = 'manual' | 'auto'

export type IntegrationState = {
  enabled: boolean
  mode: DataMode
}

export type IntegrationsConfig = Record<IntegrationId, IntegrationState>

export type InterestId = 'etf' | 'property' | 'cash' | 'loans' | 'retirement'

export type SecretFieldId = string

export type SecretFieldDef = {
  id: SecretFieldId
  labelKey: string
  /** password → masked input; text → normal; never echoed back from main. */
  input: 'text' | 'password'
  placeholderKey?: string
}

export type IntegrationDef = {
  id: IntegrationId
  labelKey: string
  hintKey: string
  /** Interests that suggest enabling this provider. */
  interests: InterestId[]
  requiresSecret: boolean
  /** Fields the end-user must enter on their machine (never shipped in the package). */
  secretFields?: SecretFieldDef[]
  /**
   * Fetch/scrape not implemented yet. Credentials can still be saved per install;
   * live network use stays off until this flag is cleared.
   */
  comingSoon?: boolean
}

/** Values collected in the UI before encrypting to safeStorage as JSON. */
export type IntegrationSecretValues = Record<string, string>

export const INTEGRATION_IDS: IntegrationId[] = [
  'yahoo_equity',
  'analizy_funds',
  'frankfurter_fx',
  'property_catalog',
  'property_otodom',
  'vehicle_otomoto'
]

export const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    id: 'yahoo_equity',
    labelKey: 'integrations.yahoo.label',
    hintKey: 'integrations.yahoo.hint',
    interests: ['etf'],
    requiresSecret: false
  },
  {
    id: 'analizy_funds',
    labelKey: 'integrations.analizy.label',
    hintKey: 'integrations.analizy.hint',
    interests: ['retirement'],
    requiresSecret: false
  },
  {
    id: 'frankfurter_fx',
    labelKey: 'integrations.frankfurter.label',
    hintKey: 'integrations.frankfurter.hint',
    interests: ['etf', 'cash', 'retirement'],
    requiresSecret: false
  },
  {
    id: 'property_catalog',
    labelKey: 'integrations.propertyCatalog.label',
    hintKey: 'integrations.propertyCatalog.hint',
    interests: ['property'],
    requiresSecret: false
  },
  {
    id: 'property_otodom',
    labelKey: 'integrations.otodom.label',
    hintKey: 'integrations.otodom.hint',
    interests: ['property'],
    /** Comps use public search; optional login fields kept for a richer path later. */
    requiresSecret: false,
    secretFields: [
      {
        id: 'email',
        labelKey: 'integrations.secret.email',
        input: 'text',
        placeholderKey: 'integrations.secret.emailPlaceholder'
      },
      {
        id: 'password',
        labelKey: 'integrations.secret.password',
        input: 'password',
        placeholderKey: 'integrations.secret.passwordPlaceholder'
      }
    ]
  },
  {
    id: 'vehicle_otomoto',
    labelKey: 'integrations.otomoto.label',
    hintKey: 'integrations.otomoto.hint',
    interests: [],
    /** Comps use public search; optional login kept separate from Otodom. */
    requiresSecret: false,
    secretFields: [
      {
        id: 'email',
        labelKey: 'integrations.secret.email',
        input: 'text',
        placeholderKey: 'integrations.secret.emailPlaceholder'
      },
      {
        id: 'password',
        labelKey: 'integrations.secret.password',
        input: 'password',
        placeholderKey: 'integrations.secret.passwordPlaceholder'
      }
    ]
  }
]

export function defaultIntegrationsConfig(): IntegrationsConfig {
  return {
    yahoo_equity: { enabled: true, mode: 'auto' },
    analizy_funds: { enabled: true, mode: 'auto' },
    frankfurter_fx: { enabled: true, mode: 'auto' },
    property_catalog: { enabled: true, mode: 'auto' },
    property_otodom: { enabled: false, mode: 'manual' },
    vehicle_otomoto: { enabled: false, mode: 'manual' }
  }
}

const OPT_IN_INTEGRATIONS: IntegrationId[] = ['property_otodom', 'vehicle_otomoto']

/**
 * Derive provider toggles from selected interests.
 * Public providers related to an interest turn on (auto); others stay off.
 * Skip / empty interests → all public providers on. Otodom/Otomoto stay off until enabled
 * (need address/area or make/model/year per holding).
 */
export function integrationsFromInterests(interests: InterestId[]): IntegrationsConfig {
  const base = defaultIntegrationsConfig()
  if (interests.length === 0) return base

  const related = new Set<IntegrationId>()
  for (const def of INTEGRATION_DEFS) {
    if (def.comingSoon) continue
    if (OPT_IN_INTEGRATIONS.includes(def.id)) continue
    if (def.interests.some((i) => interests.includes(i))) related.add(def.id)
  }

  // Always keep FX on when any market/cash interest is present, or when installments
  // alone might need foreign income — if nothing related, base defaults already on.
  const next: IntegrationsConfig = { ...base }
  for (const id of INTEGRATION_IDS) {
    const def = INTEGRATION_DEFS.find((d) => d.id === id)!
    if (def.comingSoon) {
      next[id] = { enabled: false, mode: 'manual' }
      continue
    }
    if (OPT_IN_INTEGRATIONS.includes(id)) {
      next[id] = base[id]
      continue
    }
    const on = related.has(id)
    next[id] = {
      enabled: on,
      mode: on ? 'auto' : 'manual'
    }
  }
  return next
}

/** Per-interest preferred data mode used in onboarding step 3. */
export type InterestDataModes = Partial<Record<InterestId, DataMode>>

/**
 * Apply per-interest data modes onto an integrations config.
 * Manual for an interest disables auto fetches for providers tied only to that interest.
 */
export function applyInterestDataModes(
  config: IntegrationsConfig,
  modes: InterestDataModes
): IntegrationsConfig {
  const next: IntegrationsConfig = { ...config }
  for (const def of INTEGRATION_DEFS) {
    if (def.comingSoon) continue
    const interestModes = def.interests.map((i) => modes[i]).filter(Boolean) as DataMode[]
    if (interestModes.length === 0) continue
    // If any linked interest wants auto and provider is enabled, keep auto; else manual.
    const wantsAuto = interestModes.includes('auto')
    next[def.id] = {
      ...next[def.id],
      mode: wantsAuto && next[def.id].enabled ? 'auto' : 'manual'
    }
  }
  return next
}

export function normalizeIntegrationsConfig(
  raw: Partial<IntegrationsConfig> | null | undefined
): IntegrationsConfig {
  const base = defaultIntegrationsConfig()
  if (!raw || typeof raw !== 'object') return base
  const next = { ...base }
  for (const id of INTEGRATION_IDS) {
    const entry = raw[id]
    if (!entry || typeof entry !== 'object') continue
    next[id] = {
      enabled: Boolean(entry.enabled),
      mode: entry.mode === 'manual' ? 'manual' : 'auto'
    }
  }
  return next
}

export function encodeIntegrationSecret(values: IntegrationSecretValues): string {
  return JSON.stringify(values)
}

export function parseIntegrationSecret(raw: string | null): IntegrationSecretValues | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: IntegrationSecretValues = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return null
  }
}

/** True when every required secret field has a non-empty value. */
export function secretValuesComplete(
  def: IntegrationDef,
  values: IntegrationSecretValues
): boolean {
  if (!def.requiresSecret || !def.secretFields?.length) return true
  return def.secretFields.every((f) => Boolean(values[f.id]?.trim()))
}

/** True when the provider may hit the network. */
export function isIntegrationLive(config: IntegrationsConfig, id: IntegrationId): boolean {
  const state = config[id]
  if (!state?.enabled) return false
  if (state.mode !== 'auto') return false
  const def = INTEGRATION_DEFS.find((d) => d.id === id)
  if (def?.comingSoon) return false
  return true
}
