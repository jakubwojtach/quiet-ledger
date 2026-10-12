import * as React from 'react'
import { cn } from '@renderer/lib/utils'

/** Quiet Ledger field — dark-friendly, no Daisy white flash. */
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 text-[13px] text-[var(--ink)] outline-none transition-[border-color,box-shadow]',
        'placeholder:text-[var(--ink-3)]',
        'focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'
