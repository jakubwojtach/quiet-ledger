import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { minorToMajor, parseMajorInput } from '@shared/money'
import type { IncomeEntry, IncomeStatus } from '@shared/types'
import { isIntegrationLive } from '@shared/integrations'
import { useCreateIncome, useUpdateIncome } from '@renderer/hooks/useNetWorth'
import { usePreferences } from '@renderer/lib/preferences'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { NativeSelect } from '@renderer/components/ui/native-select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { cn } from '@renderer/lib/utils'
import { todayInMonth } from '@renderer/components/installments/month'

const INCOME_CURRENCIES = ['PLN', 'EUR', 'USD'] as const

interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  income?: IncomeEntry | null
  defaultStatus?: IncomeStatus
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  month,
  income = null,
  defaultStatus = 'received'
}: IncomeFormDialogProps): JSX.Element {
  const { t, localeTag } = useLocale()
  const { prefs } = usePreferences()
  const fxLive = isIntegrationLive(prefs.integrations, 'frankfurter_fx')
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome(month)
  const editing = Boolean(income)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayInMonth(month))
  const [currency, setCurrency] = useState('PLN')
  const [status, setStatus] = useState<IncomeStatus>(defaultStatus)
  const [fxRate, setFxRate] = useState<number | null>(null)
  const [fxAsOf, setFxAsOf] = useState<string | null>(null)
  const [fxStale, setFxStale] = useState(false)
  const [fxLoading, setFxLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (income) {
      setAmount(String(minorToMajor(income.amountMinor)))
      setNote(income.note ?? '')
      setDate(income.date)
      setCurrency(income.currency)
      setStatus(income.status)
      setFxRate(income.fxRateScaled / 10_000)
      setFxAsOf(income.date)
      setFxStale(false)
      return
    }
    setAmount('')
    setNote('')
    setDate(todayInMonth(month))
    setCurrency('PLN')
    setStatus(defaultStatus)
    setFxRate(1)
    setFxAsOf(null)
    setFxStale(false)
  }, [open, income, month, defaultStatus])

  useEffect(() => {
    if (!open) return
    if (currency.toUpperCase() === 'PLN') {
      setFxRate(1)
      setFxAsOf(date)
      setFxStale(false)
      setFxLoading(false)
      return
    }
    if (!fxLive) {
      setFxRate(null)
      setFxAsOf(null)
      setFxStale(false)
      setFxLoading(false)
      setError(t('income.errorFxOff'))
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

    let cancelled = false
    setFxLoading(true)
    void window.api
      .getFxRate({ currency, date })
      .then((q) => {
        if (cancelled) return
        setFxRate(q.rate)
        setFxAsOf(q.date)
        setFxStale(q.stale)
        setError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setFxRate(null)
        setError(err.message.includes('FX provider is off') ? t('income.errorFxOff') : err.message)
      })
      .finally(() => {
        if (!cancelled) setFxLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, currency, date, fxLive, t])

  const saving = createIncome.isPending || updateIncome.isPending
  const major = parseMajorInput(amount)
  const plnPreview = major != null && major > 0 && fxRate != null ? major * fxRate : null

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (major == null || major <= 0) {
      setError(t('income.errorAmount'))
      return
    }
    if (currency.toUpperCase() !== 'PLN' && !fxLive) {
      setError(t('income.errorFxOff'))
      return
    }
    if (currency.toUpperCase() !== 'PLN' && (fxRate == null || fxLoading)) {
      setError(t('income.errorFx'))
      return
    }
    try {
      const payload = {
        month: date.slice(0, 7),
        date,
        amount: major,
        currency,
        status,
        note: note.trim() || null
      }
      if (income) {
        await updateIncome.mutateAsync({ id: income.id, ...payload })
      } else {
        await createIncome.mutateAsync({ ...payload, allocations: [] })
      }
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="income-form-dialog">
        <SheetHeader>
          <SheetTitle>{editing ? t('income.editTitle') : t('income.addTitle')}</SheetTitle>
          <SheetDescription>
            {editing ? t('income.editHint') : t('income.addHint', { month })}
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void onSubmit(e)}>
          <SheetBody className="grid content-start gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('income.status')}</Label>
              <div
                className="inline-flex w-fit rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
                role="group"
                aria-label={t('income.status')}
              >
                {(['received', 'expected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'h-7 rounded-[5px] px-3 text-[12px] font-medium transition-colors',
                      status === s
                        ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                        : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                    )}
                  >
                    {s === 'received' ? t('income.statusReceived') : t('income.statusExpected')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc-date">{t('income.date')}</Label>
                <Input
                  id="inc-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc-currency">{t('income.currency')}</Label>
                <NativeSelect
                  id="inc-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {INCOME_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inc-amount">
                {t('income.amount')} ({currency})
              </Label>
              <Input
                id="inc-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {currency.toUpperCase() !== 'PLN' ? (
              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] text-[var(--ink-2)]">
                {fxLoading ? (
                  <span>{t('income.fxLoading')}</span>
                ) : fxRate != null ? (
                  <div className="flex flex-col gap-0.5">
                    <span>
                      {t('income.fxRate', {
                        rate: fxRate.toLocaleString(localeTag, {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4
                        }),
                        date: fxAsOf ?? date
                      })}
                      {fxStale ? ` · ${t('income.fxStale')}` : ''}
                    </span>
                    {plnPreview != null ? (
                      <span className="font-medium text-[var(--ink)]">
                        {t('income.plnEquivalent', {
                          amount: plnPreview.toLocaleString(localeTag, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span>{t('income.fxMissing')}</span>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inc-note">{t('income.note')}</Label>
              <Input
                id="inc-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('income.notePlaceholder')}
              />
            </div>
            {error ? <p className="text-[13px] text-[var(--loss)]">{error}</p> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving || fxLoading}>
              {saving
                ? t('action.saving')
                : editing
                  ? t('action.save')
                  : t('action.addIncome')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
