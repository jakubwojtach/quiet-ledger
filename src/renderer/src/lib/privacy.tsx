import type { JSX, ReactNode } from 'react'
import { usePreferences } from './preferences'
import { cn } from './utils'

/** True when amounts / names should be masked. */
export function usePrivacy(): boolean {
  return usePreferences().prefs.privacy
}

/** Placeholder glyphs — keep approximate width, no real data. */
export const MASK = {
  money: '······,··',
  moneyHero: '········,··',
  moneyShort: '····,··',
  name: '············',
  nameShort: '········',
  percent: '··,· %',
  delta: '···· · ··,· %',
  chart: '···',
  date: '···· ··· ····',
  dateShort: '·· ···',
  count: '··'
} as const

/** Masks children when privacy mode is on. */
export function Sensitive({
  children,
  placeholder = MASK.name,
  className,
  as: Tag = 'span'
}: {
  children: ReactNode
  placeholder?: string
  className?: string
  as?: 'span' | 'b' | 'div' | 'small'
}): JSX.Element {
  const privacy = usePrivacy()
  if (!privacy) {
    return <Tag className={className}>{children}</Tag>
  }
  return (
    <Tag
      className={cn('privacy-mask num select-none', className)}
      aria-hidden
      title={undefined}
      data-privacy="masked"
    >
      {placeholder}
    </Tag>
  )
}
