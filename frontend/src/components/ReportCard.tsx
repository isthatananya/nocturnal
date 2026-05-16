import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, CheckCircle } from 'lucide-react'
import type { Report } from '../types'
import TierBadge from './TierBadge'

interface Props {
  report: Report
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

export default function ReportCard({ report }: Props) {
  const nav = useNavigate()
  return (
    <button
      onClick={() => nav(`/reports/${report.report_id}`)}
      className="glass-hover w-full text-left rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <TierBadge tier={report.tier_label} size="sm" />
          {report.loan_applied && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle size={12} /> Loan active
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="text-slate-100 font-semibold text-lg">{report.score}<span className="text-slate-500 text-sm font-normal">/100</span></span>
          <span>Limit: {report.loan_limit.toLocaleString()} tDUST</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
          <Clock size={11} />
          {timeAgo(report.generated_at)}
        </div>
      </div>
      <ArrowRight size={16} className="text-slate-600 shrink-0" />
    </button>
  )
}
