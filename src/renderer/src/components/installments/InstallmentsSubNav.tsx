import type { JSX } from 'react'
import { NavLink } from 'react-router-dom'
import { useMonthParam, withMonth } from './useMonthParam'
import { useLocale } from '@renderer/lib/i18n/locale'
import { cn } from '@renderer/lib/utils'

/** Cashflow section segment — lives in the sticky bar. */
export function InstallmentsSubNav(): JSX.Element {
  const [month] = useMonthParam()
  const { t } = useLocale()

  const links = [
    { to: '/installments', end: true, label: t('nav.overview') },
    { to: '/installments/expenses', end: false, label: t('nav.expenses') },
    { to: '/installments/income', end: false, label: t('nav.income') },
    { to: '/installments/loans', end: false, label: t('nav.loans') }
  ] as const

  return (
    <nav
      className="inline-flex rounded-[7px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5"
      aria-label="Cashflow sections"
    >
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={withMonth(link.to, month)}
          end={link.end}
          className={({ isActive }) =>
            cn(
              'flex h-[22px] items-center rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
              isActive
                ? 'bg-[var(--surface-1)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
