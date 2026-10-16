import { useMemo, useState, type JSX } from 'react'
import { Check } from 'lucide-react'
import { minorToMajor } from '@shared/money'
import type { IncomeEntry } from '@shared/types'
import { useDeleteIncome, useMonthSummary, useUpdateIncome } from '@renderer/hooks/useNetWorth'
import { IncomeFormDialog } from '@renderer/components/forms/IncomeFormDialog'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { useLocale } from '@renderer/lib/i18n/locale'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import { cn } from '@renderer/lib/utils'
import { dueDateClass } from './dateUrgency'
import { useMonthParam } from './useMonthParam'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

export function IncomePage(): JSX.Element {
  const [month] = useMonthParam()
  const { t } = useLocale()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteIncome = useDeleteIncome(month)
  const updateIncome = useUpdateIncome(month)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<'expected' | 'received'>('received')

  const expectedEntries = useMemo(
    () => (data?.income ?? []).filter((e) => e.status === 'expected'),
    [data]
  )
  const receivedEntries = useMemo(
    () => (data?.income ?? []).filter((e) => e.status === 'received'),
    [data]
  )

  async function toggleStatus(entry: IncomeEntry): Promise<void> {
    const nextStatus = entry.status === 'expected' ? 'received' : 'expected'
    await updateIncome.mutateAsync({
      id: entry.id,
      month: entry.month,
      date: entry.date,
      amount: minorToMajor(entry.amountMinor),
      currency: entry.currency,
      status: nextStatus,
      note: entry.note
    })
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>{t('nav.income')}</CardTitle>
        </CardHeader>
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('income.loadError')}</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>{t('action.retry')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-income">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {t('nav.income')} · {month}
          </h2>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            {receivedEntries.length} {t('income.receivedSection').toLowerCase()} ·{' '}
            <MoneyAmount amountMinor={data.incomePlnMinor} className="!text-sm" />
            {data.expectedIncomePlnMinor > 0 ? (
              <>
                {' '}
                · {t('income.expectedSection').toLowerCase()}{' '}
                <MoneyAmount amountMinor={data.expectedIncomePlnMinor} className="!text-sm" />
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Button
            variant="outline"
            onClick={() => {
              setEditingIncome(null)
              setDefaultStatus('expected')
              setIncomeOpen(true)
            }}
          >
            {t('income.statusExpected')}
          </Button>
          <Button
            onClick={() => {
              setEditingIncome(null)
              setDefaultStatus('received')
              setIncomeOpen(true)
            }}
            data-testid="add-income-btn"
          >
            {t('action.addIncome')}
          </Button>
        </div>
      </div>

      <Card className="flex max-h-[min(28rem,55vh)] flex-col" data-testid="income-expected">
        <CardHeader className="shrink-0 flex-row items-baseline justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t('income.expectedSection')}</CardTitle>
            <CardDescription>
              {t('income.expectedHint', { count: String(expectedEntries.length) })}
            </CardDescription>
          </div>
          <MoneyAmount amountMinor={data.expectedIncomePlnMinor} className="!text-sm font-medium" />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
          {expectedEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('income.emptyExpected')}</p>
          ) : (
            expectedEntries.map((entry) => (
              <IncomeRow
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditingIncome(entry)
                  setIncomeOpen(true)
                }}
                onDelete={() => deleteIncome.mutate(entry.id)}
                onToggleStatus={() => void toggleStatus(entry)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="flex max-h-[min(32rem,65vh)] flex-col" data-testid="income-received">
        <CardHeader className="shrink-0 flex-row items-baseline justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t('income.receivedSection')}</CardTitle>
            <CardDescription>
              {t('income.receivedHint', { count: String(receivedEntries.length) })}
            </CardDescription>
          </div>
          <MoneyAmount amountMinor={data.incomePlnMinor} className="!text-sm font-medium" />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
          {receivedEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('income.emptyReceived')}</p>
          ) : (
            receivedEntries.map((entry) => (
              <IncomeRow
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditingIncome(entry)
                  setIncomeOpen(true)
                }}
                onDelete={() => deleteIncome.mutate(entry.id)}
                onToggleStatus={() => void toggleStatus(entry)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <IncomeFormDialog
        open={incomeOpen}
        onOpenChange={(open) => {
          setIncomeOpen(open)
          if (!open) setEditingIncome(null)
        }}
        month={month}
        income={editingIncome}
        defaultStatus={editingIncome?.status ?? defaultStatus}
      />
    </div>
  )
}

function IncomeRow({
  entry,
  onEdit,
  onDelete,
  onToggleStatus
}: {
  entry: IncomeEntry
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}): JSX.Element {
  const { t, localeTag } = useLocale()
  const isExpected = entry.status === 'expected'
  const isReceived = !isExpected
  const fxLabel =
    entry.currency !== 'PLN'
      ? ` · ${entry.currency} @ ${(entry.fxRateScaled / 10_000).toLocaleString(localeTag, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4
        })}`
      : ''

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg bg-paper-deep/60 px-3 py-2 text-sm',
        entry.id.startsWith('optimistic-') && 'opacity-70',
        isReceived && 'opacity-80'
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          {isReceived ? (
            <Check
              className="size-3.5 shrink-0 text-[var(--gain)]"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
          <Sensitive
            placeholder={MASK.name}
            className={cn('block truncate font-medium', isReceived && 'text-[var(--ink-2)]')}
          >
            {entry.note?.trim() || t('income.defaultLabel')}
          </Sensitive>
        </div>
        <div
          className={cn(
            'text-xs',
            isExpected ? dueDateClass(entry.date) : 'text-[var(--ink-3)]'
          )}
        >
          {isExpected ? t('income.expectedOn', { date: entry.date }) : entry.date}
          {fxLabel}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <MoneyAmount
            amountMinor={entry.plnAmountMinor}
            className={cn('!text-sm font-medium', isReceived && '!text-[var(--ink-2)]')}
          />
          {entry.currency !== 'PLN' ? (
            <div className="text-[11px] text-ink-muted">
              <MoneyAmount
                amountMinor={entry.amountMinor}
                currency={entry.currency}
                className="!text-[11px]"
              />
            </div>
          ) : null}
        </div>
        {!entry.id.startsWith('optimistic-') && (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleStatus}>
              {isExpected ? t('action.markReceived') : t('action.markExpected')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {t('action.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              {t('action.delete')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
