import { useState, type FormEvent, type JSX } from 'react'
import { formatMinorUnits, majorToMinor } from '@shared/money'
import { useCreateIncome, useDashboard, useIncomeLog } from '@renderer/hooks/useNetWorth'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function IncomeLog(): JSX.Element {
  const { data: income, isLoading, isError, error } = useIncomeLog()
  const { data: dashboard } = useDashboard()
  const createIncome = useCreateIncome()

  const [month, setMonth] = useState(currentMonth)
  const [amountMajor, setAmountMajor] = useState('5000')
  const [note, setNote] = useState('')
  const [allocAssetId, setAllocAssetId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const assets = dashboard?.assets.map((a) => a.asset) ?? []

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)
    const major = Number(amountMajor.replace(',', '.'))
    if (!Number.isFinite(major) || major <= 0) {
      setFormError('Enter a positive income amount.')
      return
    }
    const amountMinor = majorToMinor(major)
    const allocations =
      allocAssetId.length > 0
        ? [{ assetId: allocAssetId, amountMinor }]
        : []

    try {
      await createIncome.mutateAsync({
        month,
        amountMinor,
        currency: 'PLN',
        note: note.trim() || null,
        allocations
      })
      setNote('')
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly income</CardTitle>
        <CardDescription>Log income and optionally allocate it to an asset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="month">Month</Label>
            <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (PLN)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              placeholder="Salary, bonus…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="alloc">Allocate to asset (optional)</Label>
            <select
              id="alloc"
              className="flex h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
              value={allocAssetId}
              onChange={(e) => setAllocAssetId(e.target.value)}
            >
              <option value="">No allocation</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-sm text-accent md:col-span-2">{formError}</p>}
          {createIncome.isError && (
            <p className="text-sm text-accent md:col-span-2">
              {(createIncome.error as Error).message}
            </p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={createIncome.isPending}>
              {createIncome.isPending ? 'Saving…' : 'Add income'}
            </Button>
          </div>
        </form>

        <div className="space-y-2 border-t border-line pt-4">
          <h4 className="text-sm font-medium text-ink-muted">Recent entries</h4>
          {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
          {isError && (
            <p className="text-sm text-accent">{(error as Error).message}</p>
          )}
          {!isLoading && income && income.length === 0 && (
            <p className="text-sm text-ink-muted">No income logged yet.</p>
          )}
          <ul className="space-y-2">
            {income?.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-center justify-between rounded-lg bg-paper-deep/60 px-3 py-2 text-sm ${
                  entry.id.startsWith('optimistic-') ? 'opacity-70' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{entry.month}</div>
                  <div className="text-xs text-ink-muted">
                    {entry.note || '—'}
                    {entry.allocations.length > 0
                      ? ` · ${entry.allocations.length} allocation(s)`
                      : ''}
                  </div>
                </div>
                <div className="tabular-nums font-medium">
                  {formatMinorUnits(entry.amountMinor, entry.currency)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
