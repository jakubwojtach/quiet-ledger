import * as React from 'react'
import { cn } from '@renderer/lib/utils'

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23767B81' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

/** Native &lt;select&gt; styled for Quiet Ledger (replaces white Daisy selects). */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'>
>(({ className, children, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-9 w-full appearance-none rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] bg-[length:12px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] text-[var(--ink)] outline-none',
      'focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    style={{ backgroundImage: CHEVRON, ...style }}
    {...props}
  >
    {children}
  </select>
))
NativeSelect.displayName = 'NativeSelect'
