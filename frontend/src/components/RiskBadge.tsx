interface Props {
  label: string
  score?: number
}

const RISK_STYLES: Record<string, string> = {
  'Very Low': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  'Low':      'text-sky-400    bg-sky-500/10    border-sky-500/25',
  'Medium':   'text-amber-400  bg-amber-500/10  border-amber-500/25',
  'High':     'text-orange-400 bg-orange-500/10 border-orange-500/25',
  'Very High':'text-red-400    bg-red-500/10    border-red-500/25',
}

export default function RiskBadge({ label, score }: Props) {
  const cls = RISK_STYLES[label] ?? RISK_STYLES['Medium']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 ${cls}`}>
      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label} risk{score !== undefined ? ` · ${score}` : ''}
    </span>
  )
}
