import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, LogOut, Settings, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { credit } from '../lib/api'
import type { Report } from '../types'
import ScoreGauge from '../components/ScoreGauge'
import TierBadge from '../components/TierBadge'
import ReportCard from '../components/ReportCard'
import WalletBar from '../components/WalletBar'
import ScoreDelta from '../components/ScoreDelta'
import ScoreHistoryChart from '../components/ScoreHistoryChart'

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [latest, setLatest] = useState<Report | null>(null)
  const [history, setHistory] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      credit.reports().catch(() => [] as Report[]),
    ]).then(([reports]) => {
      setHistory(reports)
      setLatest(reports[0] ?? null)
    }).finally(() => setLoading(false))
  }, [])

  const stale = latest && daysSince(latest.generated_at) >= 7

  const handleLogout = async () => {
    await logout()
    nav('/')
  }

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      {/* top nav */}
      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">ZK<span className="text-indigo-400">Credit</span></Link>
        <div className="flex items-center gap-3">
          <WalletBar />
          <Link to="/settings" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <Settings size={18} />
          </Link>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12 space-y-8">
        <div>
          <p className="text-slate-400 text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.full_name ?? user?.email}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* score card */}
            <div className="md:col-span-2 glass rounded-3xl p-8">
              {latest && !stale ? (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-slate-400 text-sm font-medium">Credit Score</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <TierBadge tier={latest.tier_label} size="lg" />
                        <span className="text-slate-500 text-sm">
                          {daysSince(latest.generated_at) === 0 ? 'Checked today' : `${daysSince(latest.generated_at)}d ago`}
                        </span>
                      </div>
                      {history.length > 1 && (
                        <div className="mt-2">
                          <ScoreDelta current={latest.score} previous={history[1]?.score ?? null} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 select-none" />
                  </div>

                  <div className="flex items-center gap-10">
                    <ScoreGauge score={latest.score} tier={latest.tier_label} size={160} />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Loan limit</span>
                        <span className="text-slate-100 font-semibold">₹{latest.loan_limit.toLocaleString('en-IN')}</span>
                      </div>
                      {latest.interest_rate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Interest rate</span>
                          <span className="text-slate-100 font-semibold">{latest.interest_rate} APR</span>
                        </div>
                      )}
                      {latest.term_months && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Term</span>
                          <span className="text-slate-100 font-semibold">{latest.term_months} months</span>
                        </div>
                      )}
                      {latest.tier > 0 && !latest.loan_applied && latest.data_source !== 'form' && (
                        <button onClick={() => nav('/loan/apply')} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                          Apply for loan <ArrowRight size={16} />
                        </button>
                      )}
                      {latest.tier > 0 && !latest.loan_applied && latest.data_source === 'form' && (
                        <p className="text-xs text-amber-400 mt-4 text-center">Simulation report — use Upload or PAN to apply for a loan.</p>
                      )}
                      {latest.loan_applied && (
                        <button onClick={() => nav('/loan/active')} className="btn-ghost w-full mt-4 flex items-center justify-center gap-2">
                          View active loan <ArrowRight size={16} />
                        </button>
                      )}
                      {latest.tier === 0 && (
                        <p className="text-sm text-slate-500 mt-4">Your current score doesn't qualify for a loan. Improve your financial profile and re-score.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {stale ? (
                    <>
                      <p className="text-slate-300 font-medium mb-1">Your report has expired</p>
                      <p className="text-slate-500 text-sm mb-6">Scores are valid for 7 days. Upload new data to re-score.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-300 font-medium mb-1">No credit score yet</p>
                      <p className="text-slate-500 text-sm mb-6">Upload your financial data to get started.</p>
                    </>
                  )}
                  <button onClick={() => nav('/score')} className="btn-primary flex items-center gap-2">
                    Check my credit <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* quick stats */}
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3">Reports</p>
                <p className="text-3xl font-bold">{history.length}</p>
                <p className="text-slate-500 text-sm mt-0.5">total assessments</p>
              </div>
              <div className="glass rounded-2xl p-5">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3">Active loans</p>
                <p className="text-3xl font-bold">{history.filter(r => r.loan_applied).length}</p>
                <p className="text-slate-500 text-sm mt-0.5">on Midnight chain</p>
              </div>
              <button onClick={() => nav('/reports')} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
                <FileText size={15} /> View all reports
              </button>
            </div>
          </div>
        )}

        {/* score history chart */}
        {history.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">Score history</h2>
              <span className="text-xs text-slate-500">{history.length} assessments</span>
            </div>
            <div className="glass rounded-2xl p-6">
              <ScoreHistoryChart reports={history} />
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-slate-600">
                {[
                  { label: 'Prime', color: '#6366f1' },
                  { label: 'Gold', color: '#eab308' },
                  { label: 'Silver', color: '#94a3b8' },
                  { label: 'Bronze', color: '#d97706' },
                  { label: 'None', color: '#ef4444' },
                ].map(t => (
                  <span key={t.label} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* report history preview */}
        {history.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">Recent reports</h2>
              <Link to="/reports" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
            </div>
            <div className="space-y-3">
              {history.slice(1, 4).map(r => <ReportCard key={r.report_id} report={r} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
