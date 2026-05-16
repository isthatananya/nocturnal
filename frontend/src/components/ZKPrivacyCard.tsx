import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff } from 'lucide-react'
import type { Report } from '../types'

interface Props {
  report: Report
}

export default function ZKPrivacyCard({ report }: Props) {
  const revealed = [
    `Credit tier: ${report.tier_label}`,
    report.tier > 0 ? `Loan eligible up to ₹${report.loan_limit.toLocaleString('en-IN')}` : 'Loan: not eligible',
    report.term_months ? `Term: ${report.term_months} months` : null,
    report.interest_rate ? `Rate: ${report.interest_rate} APR` : null,
  ].filter(Boolean) as string[]

  const hidden = [
    'Exact credit score (300–900)',
    'Monthly income & EMI obligations',
    'Payment history & DPD records',
    'Bank account or identity details',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Shield size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Zero-Knowledge Proof</p>
          <p className="text-xs text-zinc-500">Midnight blockchain · confidential smart contract</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Eye size={11} className="text-emerald-400" />
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Lender sees</p>
          </div>
          <div className="space-y-1.5">
            {revealed.map(item => (
              <p key={item} className="text-xs text-zinc-300 flex items-start gap-1.5">
                <span className="text-emerald-500 shrink-0 mt-px">✓</span>
                {item}
              </p>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <EyeOff size={11} className="text-zinc-500" />
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Stays private</p>
          </div>
          <div className="space-y-1.5">
            {hidden.map(item => (
              <p key={item} className="text-xs text-zinc-500 flex items-start gap-1.5">
                <span className="text-zinc-600 shrink-0 mt-px">✕</span>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 mt-4 pt-4 border-t border-white/5 leading-relaxed">
        Your financial data is encrypted on your device before reaching our servers.
        Loan approval is proven on-chain without revealing your score, income, or credit history.
      </p>
    </motion.div>
  )
}
