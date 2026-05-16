import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, CheckCircle } from 'lucide-react'
import type { Report } from '../types'
import TierBadge from './TierBadge'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

export default function ReportCard({ report }: { report: Report }) {
  const nav = useNavigate()
  return (
    <motion.button
      onClick={() => nav(`/reports/${report.report_id}`)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-hover w-full text-left rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-2">
          <TierBadge tier={report.tier_label} size="sm" />
          {report.loan_applied && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle size={11} /> Loan active
            </span>
          )}
          {report.data_source === 'form' && (
            <span className="text-xs text-amber-400/70 font-medium">Simulation</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-100 font-bold text-lg tabular-nums">
            {report.score}<span className="text-slate-600 text-sm font-normal">/900</span>
          </span>
          <span className="text-slate-500">₹{report.loan_limit.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
          <Clock size={10} />
          <span>{timeAgo(report.generated_at)}</span>
        </div>
      </div>
      <ArrowRight size={15} className="text-slate-600 shrink-0" />
    </motion.button>
  )
}
