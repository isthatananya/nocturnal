import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Download, RefreshCw, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { Report } from '../types'
import ScoreGauge from '../components/ScoreGauge'
import TierBadge from '../components/TierBadge'
import ScoreDelta from '../components/ScoreDelta'
import ScoreHistoryChart from '../components/ScoreHistoryChart'
import FactorCard from '../components/FactorCard'
import { analyseReport } from '../lib/scoreAnalysis'
import { credit } from '../lib/api'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'

const ease = [0.16, 1, 0.3, 1]

export default function ScoreResult() {
  const nav = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<Report[]>([])
  const [prevScore, setPrevScore] = useState<number | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('latest_report')
    if (!raw) { nav('/score'); return }
    const r: Report = JSON.parse(raw)
    setReport(r)
    credit.reports().then(all => {
      setHistory(all)
      setPrevScore(all.find(h => h.report_id !== r.report_id)?.score ?? null)
    }).catch(() => {})
  }, [nav])

  const exportJSON = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zkcredit-report-${report.report_id}.json`
    a.click()
  }

  if (!report) return null
  const inputs = (report as any).inputs ?? undefined
  const analysis = analyseReport(report.breakdown, inputs)

  return (
    <div className="page min-h-screen text-slate-100">

      {/* header */}
      <header className="app-header">
        <Link to="/dashboard" className="text-slate-500 hover:text-slate-200 transition-colors text-sm font-medium flex items-center gap-1.5">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <ScoreDelta current={report.score} previous={prevScore} />
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={exportJSON}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
          >
            <Download size={14} /> Export
          </motion.button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* ── Simulation banner ─────────────────────────── */}
        {report.data_source === 'form' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex items-start gap-3 rounded-2xl px-5 py-4 border border-amber-500/20 bg-amber-500/[0.06]"
          >
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-300/80 leading-relaxed">
              This is a <strong className="text-amber-300">simulation</strong> based on manually entered data.
              Loan applications require Upload or PAN card verification.
            </p>
          </motion.div>
        )}

        {/* ── Score overview ─────────────────────────────── */}
        <SlideUp>
          <div className="glass rounded-3xl p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex flex-col items-center gap-3">
                <ScoreGauge score={report.score} tier={report.tier_label} size={180} />
                <TierBadge tier={report.tier_label} size="lg" />
              </div>

              <div className="flex-1 w-full space-y-4">
                {report.tier > 0 ? (
                  <div className="rounded-2xl border border-white/7 bg-surface p-5 space-y-3">
                    {report.data_source === 'form' && (
                      <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/[0.06]
                                      border border-amber-500/20 rounded-xl px-3 py-2">
                        <AlertCircle size={12} className="shrink-0" />
                        Simulation only — upload or PAN required for loan applications
                      </div>
                    )}
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                      <span className="text-slate-500">Max loan</span>
                      <span className="text-slate-100 font-bold text-lg">₹{report.loan_limit.toLocaleString('en-IN')}</span>
                    </div>
                    {report.interest_rate && (
                      <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-500">Interest rate</span>
                        <span className="text-slate-100 font-semibold">{report.interest_rate} APR</span>
                      </div>
                    )}
                    {report.term_months && (
                      <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-500">Term</span>
                        <span className="text-slate-100 font-semibold">{report.term_months} months</span>
                      </div>
                    )}
                    {report.data_source === 'form' ? (
                      <button disabled className="btn-primary w-full mt-2 opacity-35 cursor-not-allowed flex items-center justify-center gap-2">
                        Apply for loan <ArrowRight size={15} />
                      </button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        onClick={() => nav('/loan/apply')}
                        className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
                      >
                        Apply for loan <ArrowRight size={15} />
                      </motion.button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5 text-center">
                    <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
                    <p className="text-slate-300 text-sm font-medium mb-1">Below eligibility threshold</p>
                    <p className="text-slate-500 text-xs">Need 510+ to qualify · Current: {report.score}</p>
                    <p className="text-slate-600 text-xs mt-2">Follow the improvement tips below to qualify.</p>
                  </div>
                )}

                {/* Adjustment note */}
                <div className="flex items-start gap-2 text-xs text-slate-600 px-1">
                  {report.breakdown.adjustment >= 0
                    ? <TrendingUp size={11} className="text-emerald-500/70 shrink-0 mt-0.5" />
                    : <TrendingDown size={11} className="text-red-400/70 shrink-0 mt-0.5" />
                  }
                  <span className="leading-relaxed">{analysis.adjustmentNote}</span>
                </div>
              </div>
            </div>
          </div>
        </SlideUp>

        {/* ── Strengths ─────────────────────────────────── */}
        {analysis.strengths.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={14} className="text-emerald-400" />
              <h2 className="font-semibold text-slate-200 tracking-tight">What's working in your favour</h2>
            </div>
            <Stagger className="grid gap-3">
              {analysis.strengths.map(f => (
                <StaggerItem key={f.key}>
                  <FactorCard f={f} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* ── Weaknesses ────────────────────────────────── */}
        {analysis.weaknesses.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-amber-400" />
              <h2 className="font-semibold text-slate-200 tracking-tight">Areas pulling your score down</h2>
            </div>
            <Stagger className="grid gap-3">
              {analysis.weaknesses.map(f => (
                <StaggerItem key={f.key}>
                  <FactorCard f={f} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* ── Score history ──────────────────────────────── */}
        {history.length > 1 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200 tracking-tight">Score history</h2>
              <span className="text-xs text-slate-600">{history.length} assessments</span>
            </div>
            <div className="glass rounded-2xl p-6">
              <ScoreHistoryChart reports={history} />
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/5 text-xs text-slate-600">
                {[
                  { label: 'Prime', color: '#6366f1' }, { label: 'Gold', color: '#eab308' },
                  { label: 'Silver', color: '#94a3b8' }, { label: 'Bronze', color: '#d97706' },
                  { label: 'None', color: '#ef4444' },
                ].map(t => (
                  <span key={t.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} /> {t.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Actions ───────────────────────────────────── */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={() => nav('/score')}
            className="btn-ghost flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Re-assess
          </motion.button>
          <Link to="/reports" className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm font-medium">
            View all reports
          </Link>
        </div>
      </main>
    </div>
  )
}
