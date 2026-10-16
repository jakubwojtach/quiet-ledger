import { useEffect, useState, type JSX } from 'react'
import {
  encodeIntegrationSecret,
  secretValuesComplete,
  type IntegrationDef,
  type IntegrationId,
  type IntegrationSecretValues
} from '@shared/integrations'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { cn } from '@renderer/lib/utils'

type Props = {
  def: IntegrationDef
  /** Controlled draft values (onboarding). If omitted, component owns state (settings). */
  values?: IntegrationSecretValues
  onChange?: (values: IntegrationSecretValues) => void
  /** When true, show Save / Clear that hit IPC. */
  persist?: boolean
  className?: string
}

/**
 * Per-install credential fields. Values never leave this machine except into
 * Electron safeStorage via IPC — nothing is shipped in the DMG.
 */
export function IntegrationCredentialsFields({
  def,
  values: controlled,
  onChange,
  persist = false,
  className
}: Props): JSX.Element | null {
  const { t } = useLocale()
  const fields = def.secretFields
  const [local, setLocal] = useState<IntegrationSecretValues>({})
  const [hasSecret, setHasSecret] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const values = controlled ?? local

  useEffect(() => {
    if (!persist) return
    let cancelled = false
    void window.api
      .hasIntegrationSecret({ id: def.id })
      .then((r) => {
        if (!cancelled) setHasSecret(r.hasSecret)
      })
      .catch(() => {
        if (!cancelled) setHasSecret(false)
      })
    return () => {
      cancelled = true
    }
  }, [def.id, persist])

  if (!fields?.length) return null

  const setField = (id: string, value: string): void => {
    const next = { ...values, [id]: value }
    if (onChange) onChange(next)
    else setLocal(next)
    setStatus(null)
  }

  const save = async (): Promise<void> => {
    if (!secretValuesComplete(def, values)) {
      setStatus(t('integrations.secret.incomplete'))
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await window.api.setIntegrationSecret({
        id: def.id,
        secret: encodeIntegrationSecret(values)
      })
      setHasSecret(true)
      setLocal({})
      onChange?.({})
      setStatus(t('settings.sources.secretSaved'))
    } catch (err) {
      setStatus((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const clear = async (): Promise<void> => {
    setBusy(true)
    setStatus(null)
    try {
      await window.api.clearIntegrationSecret({ id: def.id })
      setHasSecret(false)
      setLocal({})
      onChange?.({})
      setStatus(t('settings.sources.secretCleared'))
    } catch (err) {
      setStatus((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn('mt-2 space-y-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3', className)}
      data-testid={`integration-credentials-${def.id}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] leading-4 text-[var(--ink-3)]">{t('integrations.secret.localOnly')}</p>
      {hasSecret && persist ? (
        <p className="text-[12px] font-medium text-[var(--ink-2)]">
          {t('integrations.secret.savedOnDevice')}
        </p>
      ) : null}
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={`${def.id}-${field.id}`} className="text-[12px]">
            {t(field.labelKey)}
          </Label>
          <Input
            id={`${def.id}-${field.id}`}
            type={field.input}
            autoComplete={field.input === 'password' ? 'new-password' : 'off'}
            value={values[field.id] ?? ''}
            placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
            onChange={(e) => setField(field.id, e.target.value)}
            className="h-8"
          />
        </div>
      ))}
      {persist ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="h-7"
            disabled={busy}
            onClick={() => void save()}
          >
            {t('integrations.secret.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            disabled={busy || !hasSecret}
            onClick={() => void clear()}
          >
            {t('settings.sources.clearSecret')}
          </Button>
        </div>
      ) : null}
      {status ? <p className="text-[12px] text-[var(--ink-2)]">{status}</p> : null}
    </div>
  )
}

/** Flush onboarding drafts into safeStorage for every keyed provider that has values. */
export async function persistCredentialDrafts(
  drafts: Partial<Record<IntegrationId, IntegrationSecretValues>>,
  defs: IntegrationDef[]
): Promise<void> {
  for (const def of defs) {
    if (!def.secretFields?.length) continue
    const values = drafts[def.id]
    if (!values) continue
    // Optional logins: save only when every field is filled.
    if (!secretValuesComplete({ ...def, requiresSecret: true }, values)) continue
    await window.api.setIntegrationSecret({
      id: def.id,
      secret: encodeIntegrationSecret(values)
    })
  }
}
