import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { credit } from '../lib/api'
import type { Report } from '../types'

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
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-semibold">Active Loan</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12 space-y-6">
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm">Loan amount</p>
              <p className="text-4xl font-bold mt-1">— tDUST</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1">Active</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Interest rate', loan.interest_rate ?? '—'],
              ['Term', loan.term_months ? `${loan.term_months} months` : '—'],
              ['Credit tier', loan.tier_label],
              ['Score at issuance', `${loan.score}/100`],
            ].map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-4">
                <p className="text-slate-500 text-xs">{k}</p>
                <p className="text-slate-100 font-semibold mt-1">{v}</p>
              </div>
            ))}
          </div>

          {loan.loan_tx_hash && (
            <div className="glass rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">On-chain transaction</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-mono text-indigo-400 truncate">{loan.loan_tx_hash}</p>
                <a href={`https://explorer.preprod.midnight.network/tx/${loan.loan_tx_hash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="text-slate-500 text-xs mb-3">Repayment — coming soon in V2</p>
            <button disabled className="btn-ghost w-full opacity-40 cursor-not-allowed">Repay loan</button>
          </div>
        </div>
      </main>
    </div>
  )
}
