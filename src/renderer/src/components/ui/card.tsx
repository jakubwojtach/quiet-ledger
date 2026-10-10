import * as React from 'react'
import type { JSX } from 'react'
import { cn } from '@renderer/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full overflow-hidden rounded-xl border border-line/70 bg-white/65 shadow-[0_12px_40px_-28px_rgba(15,46,34,0.45)] backdrop-blur-md',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col gap-1.5 p-5 pb-2', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={cn('font-display text-lg font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <p className={cn('text-sm text-ink-muted', className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('p-5 pt-2', className)} {...props} />
}
