import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  defaultIntegrationsConfig,
  encodeIntegrationSecret,
  isIntegrationLive,
  normalizeIntegrationsConfig,
  parseIntegrationSecret,
  type IntegrationId,
  type IntegrationSecretValues,
  type IntegrationsConfig
} from '@shared/integrations'

let config: IntegrationsConfig = defaultIntegrationsConfig()

function secretsDir(): string {
  const dir = join(app.getPath('userData'), 'integration-secrets')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function secretPath(id: IntegrationId): string {
  return join(secretsDir(), `${id}.bin`)
}

export function getIntegrationsConfig(): IntegrationsConfig {
  return config
}

export function setIntegrationsConfig(raw: unknown): IntegrationsConfig {
  config = normalizeIntegrationsConfig(raw as Partial<IntegrationsConfig>)
  return config
}

export function isLive(id: IntegrationId): boolean {
  return isIntegrationLive(config, id)
}

/**
 * Persist end-user credentials for this install only (OS keychain / safeStorage).
 * Never written into the app package or SQLite.
 */
export function setIntegrationSecret(id: IntegrationId, secret: string): { ok: true } {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable on this machine')
  }
  // Accept raw JSON object string or plain string; normalize to JSON blob.
  const values = parseIntegrationSecret(secret) ?? { value: secret }
  const encrypted = safeStorage.encryptString(encodeIntegrationSecret(values))
  writeFileSync(secretPath(id), encrypted)
  return { ok: true }
}

export function setIntegrationSecretValues(
  id: IntegrationId,
  values: IntegrationSecretValues
): { ok: true } {
  return setIntegrationSecret(id, encodeIntegrationSecret(values))
}

export function hasIntegrationSecret(id: IntegrationId): boolean {
  return existsSync(secretPath(id))
}

export function clearIntegrationSecret(id: IntegrationId): { ok: true } {
  const path = secretPath(id)
  if (existsSync(path)) unlinkSync(path)
  return { ok: true }
}

/** Read decrypted secret for future scrapers; not exposed over IPC. */
export function getIntegrationSecret(id: IntegrationId): string | null {
  const path = secretPath(id)
  if (!existsSync(path)) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(readFileSync(path))
  } catch {
    return null
  }
}

export class IntegrationDisabledError extends Error {
  readonly integrationId: IntegrationId

  constructor(id: IntegrationId, message?: string) {
    super(message ?? `Integration ${id} is disabled`)
    this.name = 'IntegrationDisabledError'
    this.integrationId = id
  }
}
