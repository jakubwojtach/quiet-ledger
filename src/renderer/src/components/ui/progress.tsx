import * as React from 'react'
import { cn } from '@renderer/lib/utils'

export const Progress = React.forwardRef<
  HTMLProgressElement,
  React.ProgressHTMLAttributes<HTMLProgressElement> & { value?: number | null }
>(({ className, value = 0, max = 100, ...props }, ref) => (
  <progress
    ref={ref}
    className={cn('progress progress-primary w-full', className)}
    value={value ?? 0}
    max={max}
    {...props}
  />
))
Progress.displayName = 'Progress'
