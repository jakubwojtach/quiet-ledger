import type { JSX } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageTransition } from '@renderer/components/motion/PageTransition'

/** Outlet only — section tabs live in the sticky Shell header. */
export function InstallmentsLayout(): JSX.Element {
  const location = useLocation()
  const contentKey = `${location.pathname}${location.search}`

  return (
    <div className="flex w-full min-w-0 flex-col" data-testid="installments-view">
      <PageTransition routeKey={contentKey}>
        <Outlet />
      </PageTransition>
    </div>
  )
}
