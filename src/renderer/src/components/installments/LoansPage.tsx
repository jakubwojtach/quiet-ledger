import { useMemo, useState, type JSX } from 'react'
import { MoneyAmount } from '@renderer/components/shell/MoneyAmount'
import { MASK, Sensitive } from '@renderer/lib/privacy'
import type { Liability } from '@shared/types'
import { useDeleteLiability, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { LiabilityFormDialog } from '@renderer/components/forms/LiabilityFormDialog'
import { useMonthParam } from './useMonthParam'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

export function LoansPage(): JSX.Element {
  const [month] = useMonthParam()
  const { data, isLoading, isError, error, refetch } = useMonthSummary(month)
  const deleteLiability = useDeleteLiability()
  const [liabilityOpen, setLiabilityOpen] = useState(false)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)

  const totalPrincipalPln = useMemo(
    () => (data?.liabilities ?? []).reduce((sum, v) => sum + v.principalPlnMinor, 0),
    [data]
  )

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Loans</CardTitle>
        </CardHeader>
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load loans</CardTitle>
          <CardDescription>{(error as Error)?.message ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="installments-loans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Loans & e-raty</h2>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            Remaining principal <MoneyAmount amountMinor={totalPrincipalPln} className="!text-sm" /> ·
            scheduled this month{' '}
            <MoneyAmount amountMinor={data.installmentsPlnMinor} className="!text-sm" />
          </p>
        </div>
        <Button
          className="self-start"
          data-testid="add-liability-btn"
          onClick={() => {
            setEditingLiability(null)
            setLiabilityOpen(true)
          }}
        >
          Add installment
        </Button>
      </div>

      <Card className="flex max-h-[min(32rem,65vh)] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Open liabilities</CardTitle>
          <CardDescription>Principal and monthly payment</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {data.liabilities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
              <p className="text-sm text-ink-muted">No loans or e-raty yet.</p>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingLiability(null)
                  setLiabilityOpen(true)
                }}
              >
                Add installment
              </Button>
            </div>
          ) : (
            data.liabilities.map((v) => (
              <div
                key={v.liability.id}
                className="flex flex-col gap-2 rounded-lg bg-paper-deep/60 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <Sensitive placeholder={MASK.name} className="block font-medium">
                    {v.liability.name}
                  </Sensitive>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                    <Sensitive placeholder={MASK.nameShort}>
                      {v.liability.provider ?? 'Loan'}
                    </Sensitive>
                    {v.liability.nextDueDate ? (
                      <Sensitive placeholder={` · ${MASK.dateShort}`}>
                        {` · due ${v.liability.nextDueDate}`}
                      </Sensitive>
                    ) : null}
                    {' · '}
                    <MoneyAmount
                      amountMinor={v.monthlyPaymentPlnMinor}
                      showCurrency={false}
                      className="!text-xs"
                    />
                    /mo
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <MoneyAmount
                      amountMinor={v.principalPlnMinor}
                      className="!text-sm font-medium"
                    />
                    <div className="text-xs text-ink-muted">principal</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingLiability(v.liability)
                      setLiabilityOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete “${v.liability.name}”?`)) {
                        deleteLiability.mutate(v.liability.id)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LiabilityFormDialog
        open={liabilityOpen}
        onOpenChange={setLiabilityOpen}
        liability={editingLiability}
      />
    </div>
  )
}
