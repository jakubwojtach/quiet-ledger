import { useState, type JSX } from 'react'
import { formatMinorUnits } from '@shared/money'
import type { Asset, AssetMovement, MovementKind } from '@shared/types'
import { useMovements } from '@renderer/hooks/useNetWorth'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MovementFormDialog } from '@renderer/components/forms/MovementFormDialog'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type SavingsAsset = Extract<Asset, { class: 'savings_pln' | 'savings_usd' }>

interface MovementsSectionProps {
  asset: SavingsAsset
  /** Controlled dialog from sticky header (optional). */
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
  dialogKind?: MovementKind
  onDialogKindChange?: (kind: MovementKind) => void
}

export function MovementsSection({
  asset,
  dialogOpen,
  onDialogOpenChange,
  dialogKind,
  onDialogKindChange
}: MovementsSectionProps): JSX.Element {
  const { t, localeTag } = useLocale()
  const { data: movements = [], isLoading, isError, error } = useMovements(asset.id)
  const [editing, setEditing] = useState<AssetMovement | null>(null)
  const [localKind, setLocalKind] = useState<MovementKind>('deposit')
  const [localOpen, setLocalOpen] = useState(false)

  const controlled = onDialogOpenChange != null
  const open = controlled ? Boolean(dialogOpen) : localOpen
  const kind = controlled ? (dialogKind ?? 'deposit') : localKind

  const setOpen = (next: boolean): void => {
    if (controlled) onDialogOpenChange?.(next)
    else setLocalOpen(next)
    if (!next) setEditing(null)
  }

  const setKind = (next: MovementKind): void => {
    if (controlled) onDialogKindChange?.(next)
    else setLocalKind(next)
  }

  const deposits = movements
    .filter((m) => m.kind === 'deposit')
    .reduce((s, m) => s + m.amountMinor, 0)
  const withdrawals = movements
    .filter((m) => m.kind === 'withdrawal')
    .reduce((s, m) => s + m.amountMinor, 0)

  function openNew(nextKind: MovementKind): void {
    setEditing(null)
    setKind(nextKind)
    setOpen(true)
  }

  return (
    <section className="space-y-3" data-testid="movements-section" id="movements">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] leading-5 font-semibold">{t('movements.title')}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--ink-3)]">{t('movements.hint')}</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-7"
            onClick={() => openNew('deposit')}
            data-testid="add-deposit"
          >
            {t('movements.addDeposit')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => openNew('withdrawal')}
            data-testid="add-withdrawal"
          >
            {t('movements.addWithdrawal')}
          </Button>
        </div>
      </div>

      <p className="text-[12px] text-[var(--ink-3)]">
        {t('movements.summary', {
          in: formatMinorUnits(deposits, asset.currency, localeTag),
          out: formatMinorUnits(withdrawals, asset.currency, localeTag),
          balance: formatMinorUnits(asset.amountMinor, asset.currency, localeTag)
        })}
      </p>

      {isError ? (
        <p className="text-sm text-rose-600" role="alert">
          {(error as Error)?.message || t('movements.loadError')}
        </p>
      ) : null}
      {isLoading && <p className="text-sm text-ink-muted">{t('movements.loading')}</p>}
      {!isLoading && !isError && movements.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[var(--line-strong)] px-4 py-6 text-center">
          <p className="text-sm text-ink-muted">{t('movements.empty')}</p>
        </div>
      )}

      {movements.length > 0 ? (
        <ul className="divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)]">
          {[...movements].reverse().map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                onClick={() => {
                  setEditing(m)
                  setKind(m.kind)
                  setOpen(true)
                }}
              >
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                    m.kind === 'deposit'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  )}
                >
                  {t(m.kind === 'deposit' ? 'movements.deposit' : 'movements.withdrawal')}
                </span>
                <span className="text-[13px] tabular-nums text-[var(--ink-2)]">{m.date}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink-3)]">
                  {m.note ?? (m.estimated ? t('movements.opening') : '')}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-medium tabular-nums',
                    m.kind === 'withdrawal' ? 'text-rose-600' : 'text-[var(--ink)]'
                  )}
                >
                  {m.kind === 'withdrawal' ? '−' : '+'}
                  {formatMinorUnits(m.amountMinor, m.currency, localeTag)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <MovementFormDialog
        open={open}
        onOpenChange={setOpen}
        asset={asset}
        movement={editing}
        defaultKind={kind}
      />
    </section>
  )
}
