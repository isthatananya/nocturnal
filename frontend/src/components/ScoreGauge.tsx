import type { TierLabel } from '../types'

const TIER_STROKE: Record<TierLabel, string> = {
  None:   '#64748b',
  Bronze: '#d97706',
  Silver: '#94a3b8',
  Gold:   '#eab308',
  Prime:  '#6366f1',
}

const SCORE_MIN = 300
const SCORE_MAX = 900

interface Props {
  score: number   // 300-900
  tier: TierLabel
  size?: number
}

export default function ScoreGauge({ score, tier, size = 180 }: Props) {
  const r = 70
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = 10
  const circumference = 2 * Math.PI * r
  const arcLength = (circumference * 240) / 360
  const pct = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)
  const filled = pct * arcLength
  const color = TIER_STROKE[tier]

  function describeArc(startAngle: number, endAngle: number): string {
    const toRad = (d: number) => (d * Math.PI) / 180
    const sx = cx + r * Math.cos(toRad(startAngle))
    const sy = cy + r * Math.sin(toRad(startAngle))
    const ex = cx + r * Math.cos(toRad(endAngle))
    const ey = cy + r * Math.sin(toRad(endAngle))
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`
  }

  const trackPath = describeArc(150, 390)
  const filledEnd = 150 + pct * 240
  const filledPath = pct > 0 ? describeArc(150, filledEnd) : ''

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} strokeLinecap="round" />
        {filledPath && (
          <path d={filledPath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-100">{score}</span>
        <span className="text-xs text-slate-500 mt-0.5">out of 900</span>
        <span className="text-sm font-medium mt-1" style={{ color }}>{tier}</span>
      </div>
    </div>
  )
}
