import type { JSX } from 'react'
import {
  Building2,
  Car,
  Landmark,
  LineChart,
  PiggyBank,
  TreePine,
  Wallet
} from 'lucide-react'
import type { AssetClass } from '@shared/types'
import { cn } from '@renderer/lib/utils'

const ICONS: Record<AssetClass, typeof LineChart> = {
  etf: LineChart,
  bond: Landmark,
  retirement: TreePine,
  savings_usd: Wallet,
  savings_pln: PiggyBank,
  apartment: Building2,
  land: TreePine,
  car: Car
}

const TONES: Record<AssetClass, string> = {
  etf: 'bg-primary/15 text-primary',
  bond: 'bg-secondary/15 text-secondary',
  retirement: 'bg-success/15 text-success',
  savings_usd: 'bg-info/15 text-info',
  savings_pln: 'bg-primary/12 text-primary',
  apartment: 'bg-warning/15 text-warning',
  land: 'bg-success/12 text-success',
  car: 'bg-error/12 text-error'
}

export function AssetClassIcon({
  assetClass,
  className,
  size = 'md'
}: {
  assetClass: AssetClass
  className?: string
  size?: 'sm' | 'md'
}): JSX.Element {
  const Icon = ICONS[assetClass] ?? Wallet
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-9' : 'size-11',
        TONES[assetClass] ?? 'bg-base-200 text-ink',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} strokeWidth={1.75} />
    </span>
  )
}
