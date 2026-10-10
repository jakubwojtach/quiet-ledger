import type { JSX, ReactNode } from 'react'
import type React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

export function PageTransition({
  routeKey,
  children
}: {
  routeKey: string
  children: ReactNode
}): JSX.Element {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: reduce ? 0 : 0.28, ease }}
        className="w-full min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function FadeUp({
  children,
  delay = 0,
  className
}: {
  children: ReactNode
  delay?: number
  className?: string
}): JSX.Element {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerList({
  children,
  className,
  role,
  'aria-label': ariaLabel
}: {
  children: ReactNode
  className?: string
  role?: React.AriaRole
  'aria-label'?: string
}): JSX.Element {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      role={role}
      aria-label={ariaLabel}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: reduce ? 0 : 0.035 }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 6 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.25, ease }
        }
      }}
    >
      {children}
    </motion.div>
  )
}
