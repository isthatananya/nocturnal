import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  current: number
  previous: number | null
  className?: string
}

export default function ScoreDelta({ current, previous, className = '' }: Props) {
  if (previous === null) return null
  const delta = current - previous
  if (delta === 0) return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}>
      <Minus size={12} /> No change from last assessment
    </span>
  )
  const up = delta > 0
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'} ${className}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {up ? '+' : ''}{delta} pts since last assessment
    </span>
  )
}
