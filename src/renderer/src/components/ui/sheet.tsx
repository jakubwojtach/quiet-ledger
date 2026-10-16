import * as React from 'react'
import type { JSX } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
  acquireElectronModalDragLock,
  releaseElectronModalDragLock
} from '@renderer/lib/electronModalDrag'
import { cn } from '@renderer/lib/utils'

export function Sheet({
  open,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>): JSX.Element {
  const wasOpen = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      if (!wasOpen.current) {
        acquireElectronModalDragLock()
        wasOpen.current = true
      }
    } else if (wasOpen.current) {
      releaseElectronModalDragLock()
      wasOpen.current = false
    }
    return () => {
      if (wasOpen.current) {
        releaseElectronModalDragLock()
        wasOpen.current = false
      }
    }
  }, [open])

  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />
}

export const SheetTrigger = DialogPrimitive.Trigger
export const SheetPortal = DialogPrimitive.Portal
export const SheetClose = DialogPrimitive.Close

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-ql-sheet-overlay=""
    className={cn('sheet-glass-overlay app-region-no-drag fixed inset-0 z-[200]', className)}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'right' | 'left'
  }
>(({ className, children, side = 'right', ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-ql-sheet-content=""
      data-side={side}
      className={cn(
        'sheet-glass-panel app-region-no-drag fixed z-[201] flex h-dvh w-full max-w-[420px] flex-col overflow-hidden outline-none',
        'border-[var(--line)] shadow-[-24px_0_48px_-28px_oklch(0_0_0/0.55)]',
        side === 'right' && 'top-0 right-0 border-l',
        side === 'left' && 'top-0 left-0 border-r shadow-[24px_0_48px_-28px_oklch(0_0_0/0.55)]',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        type="button"
        className="app-region-no-drag absolute top-3.5 right-3.5 z-20 inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
      >
        <X className="size-4" strokeWidth={1.75} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'shrink-0 space-y-1 border-b border-[var(--line)] bg-[color-mix(in_oklch,var(--surface-1)_70%,transparent)] px-5 pt-5 pr-12 pb-4',
        className
      )}
      {...props}
    />
  )
}

export function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-[color-mix(in_oklch,var(--surface-1)_70%,transparent)] px-5 py-3',
        className
      )}
      {...props}
    />
  )
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-[18px] leading-6 font-semibold tracking-[-0.02em] text-[var(--ink)]',
      className
    )}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[13px] leading-5 text-[var(--ink-3)]', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName
