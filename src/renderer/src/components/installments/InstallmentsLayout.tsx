import type { JSX } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useMonthParam, withMonth } from './useMonthParam'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { cn } from '@renderer/lib/utils'

const LINKS = [
  { to: '/installments', end: true, label: 'Overview' },
  { to: '/installments/expenses', end: false, label: 'Expenses' },
  { to: '/installments/income', end: false, label: 'Income' },
  { to: '/installments/loans', end: false, label: 'Loans' }
] as const

/** Shared chrome: month picker + sub-nav for Installments routes. */
export function InstallmentsLayout(): JSX.Element {
  const [month, setMonth] = useMonthParam()

  return (
    <div className="flex w-full min-w-0 flex-col gap-4" data-testid="installments-view">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <nav className="flex min-w-0 flex-wrap gap-2" aria-label="Installments sections">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={withMonth(link.to, month)}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'min-h-10 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-forest text-white' : 'bg-paper-deep text-ink hover:bg-line'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="w-full space-y-1.5 sm:w-auto">
          <Label htmlFor="month-picker">Month</Label>
          <Input
            id="month-picker"
            type="month"
            className="w-full sm:w-auto"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>
      <Outlet />
    </div>
  )
}
