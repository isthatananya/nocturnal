import { useEffect, useRef, useState } from 'react'
import type { Report } from '../types'

interface Props {
  reports: Report[]   // ordered most-recent-first from the API
}

const SCORE_MIN = 300
const SCORE_MAX = 900

const TIER_THRESHOLDS = [
  { score: 780, label: 'Prime',  color: '#e5e5e7' },
  { score: 690, label: 'Gold',   color: '#eab308' },
  { score: 600, label: 'Silver', color: '#94a3b8' },
  { score: 510, label: 'Bronze', color: '#d97706' },
]

function scoreColor(score: number): string {
  if (score >= 780) return '#e5e5e7'
  if (score >= 690) return '#eab308'
  if (score >= 600) return '#94a3b8'
  if (score >= 510) return '#d97706'
  return '#ef4444'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev[0] + curr[0]) / 2
    d += ` C ${cx} ${prev[1]}, ${cx} ${curr[1]}, ${curr[0]} ${curr[1]}`
  }
  return d
}

export default function ScoreHistoryChart({ reports }: Props) {
  const svgRef = useRef<SVGPathElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const data = [...reports].reverse()

  const W = 560, H = 200
  const PAD = { top: 16, right: 32, bottom: 36, left: 42 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const xOf = (i: number) => PAD.left + (data.length < 2 ? cW / 2 : (i / (data.length - 1)) * cW)
  const yOf = (score: number) => PAD.top + cH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * cH

  const pts: [number, number][] = data.map((r, i) => [xOf(i), yOf(r.score)])
  const linePath = smoothPath(pts)
  const areaPath = pts.length
    ? linePath + ` L ${pts[pts.length - 1][0]} ${PAD.top + cH} L ${pts[0][0]} ${PAD.top + cH} Z`
    : ''

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`
    el.style.transition = 'stroke-dashoffset 1.2s ease-out'
    requestAnimationFrame(() => { el.style.strokeDashoffset = '0' })
  }, [reports])

  if (data.length === 0) return null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 200 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            {data.map((r, i) => (
              <stop key={i} offset={`${(i / Math.max(data.length - 1, 1)) * 100}%`} stopColor={scoreColor(r.score)} />
            ))}
          </linearGradient>
        </defs>

        {/* Tier threshold reference lines */}
        {TIER_THRESHOLDS.map(({ score, label, color }) => {
          const y = yOf(score)
          return (
            <g key={label}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
              <text x={PAD.left + cW + 4} y={y + 4} fontSize="9" fill={color} opacity="0.6">{label}</text>
            </g>
          )
        })}

        {/* Y axis ticks */}
        {[300, 450, 600, 750, 900].map(v => (
          <text key={v} x={PAD.left - 6} y={yOf(v) + 4} fontSize="9" fill="rgba(255,255,255,0.25)" textAnchor="end">{v}</text>
        ))}

        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {linePath && (
          <path ref={svgRef} d={linePath} fill="none"
            stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {pts.map(([x, y], i) => {
          const r = data[i]
          const isHov = hovered === i
          return (
            <g key={i}>
              <rect x={x - 20} y={PAD.top} width={40} height={cH} fill="transparent" onMouseEnter={() => setHovered(i)} />
              <circle cx={x} cy={y} r={isHov ? 5 : 3.5}
                fill={scoreColor(r.score)} stroke="#000000" strokeWidth="2"
                style={{ transition: 'r 0.15s' }} />
              {isHov && (
                <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + cH}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
              )}
              {(data.length <= 6 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                <text x={x} y={H - 6} fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="middle">
                  {formatDate(r.generated_at)}
                </text>
              )}
            </g>
          )
        })}

        {hovered !== null && (() => {
          const [x, y] = pts[hovered]
          const r = data[hovered]
          const tipW = 96, tipH = 44
          const tipX = Math.min(x - tipW / 2, W - tipW - 4)
          return (
            <g>
              <rect x={tipX} y={y - tipH - 10} width={tipW} height={tipH}
                rx="6" fill="#0f0f1a" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x={tipX + tipW / 2} y={y - tipH - 10 + 16}
                fontSize="18" fontWeight="700" fill={scoreColor(r.score)} textAnchor="middle">
                {r.score}
              </text>
              <text x={tipX + tipW / 2} y={y - tipH - 10 + 32}
                fontSize="9" fill="rgba(255,255,255,0.5)" textAnchor="middle">
                {r.tier_label} · {formatDate(r.generated_at)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
