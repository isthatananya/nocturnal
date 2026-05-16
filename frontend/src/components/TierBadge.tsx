import type { TierLabel } from '../types'
import { TIER_COLORS, TIER_BG } from '../types'

interface Props {
  tier: TierLabel
  size?: 'sm' | 'md' | 'lg'
}

const ICONS: Record<TierLabel, string> = {
  None:   '—',
  Bronze: '◆',
  Silver: '◆',
  Gold:   '◆',
  Prime:  '◆',
}

export default function TierBadge({ tier, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${padding} ${TIER_COLORS[tier]} ${TIER_BG[tier]}`}>
      <span className="text-xs">{ICONS[tier]}</span>
      {tier}
    </span>
  )
}
