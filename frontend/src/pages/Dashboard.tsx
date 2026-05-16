import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, LogOut, Settings, FileText, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { credit } from '../lib/api'
import type { Report } from '../types'
import ScoreGauge from '../components/ScoreGauge'
import TierBadge from '../components/TierBadge'
import ReportCard from '../components/ReportCard'
import WalletBar from '../components/WalletBar'
import ScoreDelta from '../components/ScoreDelta'
import ScoreHistoryChart from '../components/ScoreHistoryChart'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'

const ease = [0.16, 1, 0.3, 1]

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function SkeletonCard() {
  return (
    <div className="glass rounded-3xl p-8 space-y-4">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton h-10 w-40 rounded-xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [latest, setLatest] = useState<Report | null>(null)
  const [history, setHistory] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    credit.reports().catch(() => [] as Report[]).then(reports => {
      setHistory(reports)
      setLatest(reports[0] ?? null)
    }).finally(() => setLoading(false))
  }, [])

  const stale = latest && daysSince(latest.generated_at) >= 7

  const handleLogout = async () => {
    await logout()
    nav('/')
  }

  const firstName = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="page min-h-screen text-slate-100">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="app-header">
        <Link to="/" className="font-bold text-lg tracking-tight">
          ZK<span className="gradient-text">Credit</span>
        </Link>
        <div className="flex items-center gap-2">
          <WalletBar />
          <Link to="/settings"
            className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-200 transition-colors">
            <Settings size={17} />
          </Link>
          <button onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* ── Welcome ─────────────────────────────────────── */}
        <SlideUp>
          <div>
            <p className="text-slate-500 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold mt-0.5 tracking-tight">{firstName}</h1>
          </div>
        </SlideUp>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2"><SkeletonCard /></div>
            <div className="space-y-4">
              <div className="skeleton h-32 rounded-2xl" />
              <div className="skeleton h-32 rounded-2xl" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">

            {/* ── Score card ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="md:col-span-2 glass rounded-3xl p-8"
            >
              {latest && !stale ? (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="eyebrow mb-2">Credit Score</p>
                      <div className="flex items-center gap-3">
                        <TierBadge tier={latest.tier_label} size="lg" />
                        <span className="text-slate-600 text-sm">
                          {daysSince(latest.generated_at) === 0 ? 'Today' : `${daysSince(latest.generated_at)}d ago`}
                        </span>
                      </div>
                      {history.length > 1 && (
                        <div className="mt-2">
                          <ScoreDelta current={latest.score} previous={history[1]?.score ?? null} />
                        </div>
                      )}
                    </div>
                    {latest.data_source === 'form' && (
                      <span className="chip border-amber-500/25 text-amber-400 bg-amber-500/8 text-xs">
                        Simulation
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-10">
                    <ScoreGauge score={latest.score} tier={latest.tier_label} size={160} />

                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between text-sm py-2.5 border-b border-white/5">
                        <span className="text-slate-500">Loan limit</span>
                        <span className="text-slate-100 font-semibold">₹{latest.loan_limit.toLocaleString('en-IN')}</span>
                      </div>
                      {latest.interest_rate && (
                        <div className="flex justify-between text-sm py-2.5 border-b border-white/5">
                          <span className="text-slate-500">Interest rate</span>
                          <span className="text-slate-100 font-semibold">{latest.interest_rate} APR</span>
                        </div>
                      )}
                      {latest.term_months && (
                        <div className="flex justify-between text-sm py-2.5 border-b border-white/5">
                          <span className="text-slate-500">Term</span>
                          <span className="text-slate-100 font-semibold">{latest.term_months} months</span>
                        </div>
                      )}

                      {latest.tier > 0 && !latest.loan_applied && latest.data_source !== 'form' && (
                        <motion.button
                          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                          onClick={() => nav('/loan/apply')}
                          className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
                        >
                          Apply for loan <ArrowRight size={15} />
                        </motion.button>
                      )}
                      {latest.tier > 0 && !latest.loan_applied && latest.data_source === 'form' && (
                        <p className="text-xs text-amber-400/70 mt-3 text-center leading-relaxed">
                          Simulation report — use Upload or PAN to apply for a loan.
                        </p>
                      )}
                      {latest.loan_applied && (
                        <motion.button
                          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                          onClick={() => nav('/loan/active')}
                          className="btn-ghost w-full mt-3 flex items-center justify-center gap-2"
                        >
                          View active loan <ArrowRight size={15} />
                        </motion.button>
                      )}
                      {latest.tier === 0 && (
                        <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                          Score below the 510 threshold. Follow the improvement tips on your report.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20
                                  flex items-center justify-center mb-5">
                    <Zap size={24} className="text-indigo-400" />
                  </div>
                  {stale ? (
                    <>
                      <p className="text-slate-200 font-semibold mb-1">Report expired</p>
                      <p className="text-slate-500 text-sm mb-6">Scores are valid for 7 days. Upload fresh data to re-score.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-200 font-semibold mb-1">No credit score yet</p>
                      <p className="text-slate-500 text-sm mb-6">Upload your financial data or enter your PAN to get started.</p>
                    </>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => nav('/score')}
                    className="btn-primary flex items-center gap-2"
                  >
                    Check my credit <ArrowRight size={15} />
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* ── Quick stats ─────────────────────────────── */}
            <Stagger className="space-y-4">
              <StaggerItem>
                <div className="glass rounded-2xl p-5">
                  <p className="eyebrow mb-3">Reports</p>
                  <p className="text-3xl font-bold">{history.length}</p>
                  <p className="text-slate-600 text-sm mt-0.5">assessments run</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="glass rounded-2xl p-5">
                  <p className="eyebrow mb-3">Active loans</p>
                  <p className="text-3xl font-bold">{history.filter(r => r.loan_applied).length}</p>
                  <p className="text-slate-600 text-sm mt-0.5">on Midnight chain</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  onClick={() => nav('/reports')}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
                >
                  <FileText size={14} /> View all reports
                </motion.button>
              </StaggerItem>
            </Stagger>
          </div>
        )}

        {/* ── Score history chart ────────────────────────── */}
        {history.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200 tracking-tight">Score history</h2>
              <span className="text-xs text-slate-600">{history.length} assessments</span>
            </div>
            <div className="glass rounded-2xl p-6">
              <ScoreHistoryChart reports={history} />
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/5 text-xs text-slate-600">
                {[
                  { label: 'Prime', color: '#6366f1' },
                  { label: 'Gold', color: '#eab308' },
                  { label: 'Silver', color: '#94a3b8' },
                  { label: 'Bronze', color: '#d97706' },
                  { label: 'None', color: '#ef4444' },
                ].map(t => (
                  <span key={t.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Recent reports ─────────────────────────────── */}
        {history.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200 tracking-tight">Recent reports</h2>
              <Link to="/reports" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View all</Link>
            </div>
            <div className="space-y-2">
              {history.slice(1, 4).map(r => <ReportCard key={r.report_id} report={r} />)}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
