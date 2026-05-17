import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Clock, Circle } from 'lucide-react'
import type { EmiRow, EmiStatus, LoanSchedule } from '../types'

const STATUS_STYLE: Record<EmiStatus, { color: string; bg: string; Icon: typeof Clock; label: string }> = {
  paid:     { color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/20', Icon: CheckCircle2, label: 'Paid' },
  due:      { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25',   Icon: Clock,        label: 'Due now' },
  overdue:  { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25',       Icon: AlertCircle,  label: 'Overdue' },
  upcoming: { color: 'text-zinc-500',    bg: 'bg-white/3 border-white/8',             Icon: Circle,       label: 'Upcoming' },
}

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

export default function AmortisationSchedule({ schedule }: { schedule: LoanSchedule }) {
  const remaining = schedule.term_months - schedule.paid_count
  const progress = schedule.term_months > 0
    ? Math.round((schedule.paid_count / schedule.term_months) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wide mb-1">Monthly EMI</p>
            <p className="text-zinc-100 font-bold text-base">₹{fmt(schedule.emi)}</p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wide mb-1">EMIs paid</p>
            <p className="text-zinc-100 font-bold text-base">{schedule.paid_count} / {schedule.term_months}</p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wide mb-1">Remaining</p>
            <p className="text-zinc-100 font-bold text-base">{remaining} months</p>
          </div>
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-wide mb-1">Total interest</p>
            <p className="text-zinc-100 font-bold text-base">₹{fmt(schedule.total_interest)}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Repayment progress</span>
            <span className="text-zinc-400 font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Schedule rows */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_repeat(4,_auto)] gap-3 px-4 py-2.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wide border-b border-white/6 bg-white/3">
          <span>#</span>
          <span>Due</span>
          <span className="text-right">Principal</span>
          <span className="text-right">Interest</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Status</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/4">
          {schedule.rows.map(row => <Row key={row.seq} row={row} />)}
        </div>
      </div>
    </div>
  )
}

function Row({ row }: { row: EmiRow }) {
  const style = STATUS_STYLE[row.status]
  const Icon = style.Icon
  return (
    <div className="grid grid-cols-[40px_1fr_repeat(4,_auto)] gap-3 px-4 py-2.5 items-center text-xs hover:bg-white/3 transition-colors">
      <span className="font-mono text-zinc-600">{row.seq}</span>
      <span className="text-zinc-300">{row.due_date}</span>
      <span className="text-right text-zinc-400 tabular-nums">₹{fmt(row.principal)}</span>
      <span className="text-right text-zinc-500 tabular-nums">₹{fmt(row.interest)}</span>
      <span className="text-right text-zinc-400 tabular-nums">₹{fmt(row.balance)}</span>
      <span className={`inline-flex items-center gap-1 justify-end ${style.color}`}>
        <Icon size={11} />
        <span className="text-[10px] font-medium">{style.label}</span>
      </span>
    </div>
  )
}
