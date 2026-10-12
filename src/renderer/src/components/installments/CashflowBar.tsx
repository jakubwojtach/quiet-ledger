import { useEffect, useMemo, useState, type JSX } from 'react'
import { Plus } from 'lucide-react'
import { useCashflowHistory, useMonthSummary } from '@renderer/hooks/useNetWorth'
import { ExpenseFormDialog } from '@renderer/components/forms/ExpenseFormDialog'
import { IncomeFormDialog } from '@renderer/components/forms/IncomeFormDialog'
import { MonthStepper } from '@renderer/components/shell/MonthStepper'
import { MonthStrip } from '@renderer/components/shell/MonthStrip'
import { PrivacyToggle } from '@renderer/components/shell/PrivacyToggle'
import { InstallmentsSubNav } from './InstallmentsSubNav'
import { useMonthParam } from './useMonthParam'
import { currentMonth, shiftMonth, todayInMonth } from './month'
import { useLocale } from '@renderer/lib/i18n/locale'
import { Button } from '@renderer/components/ui/button'

/** Title bar controls for Cashflow: stepper, strip, section segment, add actions. */
export function CashflowBar(): JSX.Element {
  const { t } = useLocale()
  const [month, setMonth] = useMonthParam()
  const history = useCashflowHistory()
  const { data } = useMonthSummary(month)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)

  const liabilities = useMemo(
    () => (data?.liabilities ?? []).map((v) => v.liability),
    [data]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (e.key === 'ArrowLeft') setMonth(shiftMonth(month, -1))
      else {
        const next = shiftMonth(month, 1)
        if (next <= currentMonth()) setMonth(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [month, setMonth])

  return (
    <div
      className="flex min-h-[52px] flex-wrap items-center gap-2"
      data-testid="cashflow-bar"
    >
      <h1 className="text-[15px] leading-5 font-semibold tracking-[-0.01em]">
        {t('installments.title')}
      </h1>
      <MonthStepper month={month} onChange={setMonth} />
      <MonthStrip
        points={history.data ?? []}
        activeMonth={month}
        onSelect={setMonth}
      />
      <span className="flex-1" />
      <InstallmentsSubNav />
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 rounded-md"
        onClick={() => setIncomeOpen(true)}
        data-testid="add-income-btn"
      >
        <Plus className="size-3.5" />
        {t('action.addIncome')}
      </Button>
      <Button
        size="sm"
        className="h-7 gap-1 rounded-md"
        onClick={() => setExpenseOpen(true)}
        data-testid="add-expense-btn"
      >
        <Plus className="size-3.5" />
        {t('action.addExpense')}
      </Button>
      <PrivacyToggle />

      <ExpenseFormDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        month={month}
        defaultDate={todayInMonth(month)}
        liabilities={liabilities}
      />
      <IncomeFormDialog open={incomeOpen} onOpenChange={setIncomeOpen} month={month} />
    </div>
  )
}
