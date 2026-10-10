import type { JSX } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useMonthParam, withMonth } from './useMonthParam'
import { PageTransition } from '@renderer/components/motion/PageTransition'
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
  const location = useLocation()
  const reduce = useReducedMotion()
  const routeKey = `${location.pathname}${location.search}`

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
                  'relative min-h-10 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'bg-paper-deep/80 text-ink hover:bg-line'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId={reduce ? undefined : 'installments-tab'}
                      className="absolute inset-0 rounded-md bg-forest"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </>
              )}
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
      <PageTransition routeKey={routeKey}>
        <Outlet />
      </PageTransition>
    </div>
  )
}
