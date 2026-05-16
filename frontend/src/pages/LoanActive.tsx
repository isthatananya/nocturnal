import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react'
import { credit } from '../lib/api'
import type { Report } from '../types'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'

const ease = [0.16, 1, 0.3, 1]

export default function LoanActive() {
  const nav = useNavigate()
  const [loan, setLoan] = useState<Report | null>(null)

  useEffect(() => {
    credit.reports().then(reports => {
      const active = reports.find(r => r.loan_applied)
      if (!active) { nav('/dashboard'); return }
      setLoan(active)
    })
  }, [nav])

  if (!loan) return (
    <div className="page min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page min-h-screen text-slate-100">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-200 transition-colors">
            <ArrowLeft size={17} />
          </Link>
          <span className="font-semibold tracking-tight">Active Loan</span>
        </div>
        <span className="chip border-emerald-500/25 text-emerald-400 bg-emerald-500/8 text-xs">
          <CheckCircle size={11} /> Active
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        {/* loan amount hero */}
        <SlideUp>
          <div className="glass rounded-3xl p-8">
            <p className="eyebrow mb-3">Loan amount</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
              className="text-5xl font-bold tracking-tight mb-1"
            >
              ₹{loan.loan_limit.toLocaleString('en-IN')}
            </motion.p>
            <p className="text-slate-600 text-sm">disbursed on Midnight blockchain</p>
          </div>
        </SlideUp>

        {/* stats */}
        <Stagger className="grid grid-cols-2 gap-3">
          {[
            ['Interest rate', loan.interest_rate ?? '—'],
            ['Term', loan.term_months ? `${loan.term_months} months` : '—'],
            ['Credit tier', loan.tier_label],
            ['Score at issuance', `${loan.score}/900`],
          ].map(([k, v]) => (
            <StaggerItem key={k}>
              <div className="glass rounded-2xl p-4">
                <p className="text-slate-600 text-xs mb-1">{k}</p>
                <p className="text-slate-100 font-semibold">{v}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* tx hash */}
        {loan.loan_tx_hash && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="glass rounded-2xl p-5"
          >
            <p className="text-slate-600 text-xs mb-2">On-chain transaction</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono text-white/55 truncate">{loan.loan_tx_hash}</p>
              <a href={`https://explorer.preprod.midnight.network/tx/${loan.loan_tx_hash}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-300 transition-colors">
                <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>
        )}

        {/* repay */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease }}
          className="glass rounded-2xl p-6"
        >
          <p className="text-slate-600 text-xs mb-3 font-medium tracking-wide uppercase">Repayment</p>
          <p className="text-slate-500 text-sm mb-4">On-chain repayment coming in V2 — track manually for now.</p>
          <button disabled className="btn-ghost w-full opacity-35 cursor-not-allowed">Repay loan</button>
        </motion.div>
      </main>
    </div>
  )
}
