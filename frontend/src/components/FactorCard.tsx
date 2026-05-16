import { CheckCircle, AlertTriangle, XCircle, Lightbulb } from 'lucide-react'
import type { FactorDetail, FactorStatus } from '../lib/scoreAnalysis'

export function statusConfig(s: FactorStatus) {
  return {
    excellent: { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/8  border-emerald-500/20', bar: 'bg-emerald-500', label: 'Excellent' },
    good:      { icon: CheckCircle,   color: 'text-sky-400',     bg: 'bg-sky-500/8      border-sky-500/20',     bar: 'bg-sky-400',    label: 'Good' },
    fair:      { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/8   border-amber-500/20',   bar: 'bg-amber-400',  label: 'Fair' },
    poor:      { icon: AlertTriangle, color: 'text-orange-400',  bg: 'bg-orange-500/8   border-orange-500/20',  bar: 'bg-orange-400', label: 'Poor' },
    critical:  { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/8      border-red-500/20',     bar: 'bg-red-500',    label: 'Critical' },
  }[s]
}

export default function FactorCard({ f }: { f: FactorDetail }) {
  const cfg = statusConfig(f.status)
  const Icon = cfg.icon
  const barWidth = Math.max(0, Math.min(100, (f.pts / f.max) * 100))

  return (
    <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className={cfg.color} />
          <span className="font-semibold text-slate-100 text-sm">{f.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} bg-black/20`}>{f.statusLabel}</span>
        </div>
        <span className="text-sm font-mono text-slate-400 shrink-0">{f.pts}<span className="text-slate-600">/{f.max}</span></span>
      </div>

      <div className="h-1.5 bg-black/20 rounded-full mb-3 overflow-hidden">
        <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${barWidth}%` }} />
      </div>

      <p className="text-sm text-slate-300 mb-2">{f.verdict}</p>

      {f.tip && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-white/5">
          <Lightbulb size={13} className="text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">{f.tip}</p>
        </div>
      )}
    </div>
  )
}
