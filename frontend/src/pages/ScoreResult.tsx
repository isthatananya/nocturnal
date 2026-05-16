import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Download, RefreshCw, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import type { Report } from '../types'
import ScoreGauge from '../components/ScoreGauge'
import TierBadge from '../components/TierBadge'
import ScoreDelta from '../components/ScoreDelta'
import ScoreHistoryChart from '../components/ScoreHistoryChart'
import FactorCard from '../components/FactorCard'
import { analyseReport } from '../lib/scoreAnalysis'
import { credit } from '../lib/api'

// ── Page ─────────────────────────────────────────────────────────────────────

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
      const prev = all.find(h => h.report_id !== r.report_id)
      setPrevScore(prev?.score ?? null)
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
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 bg-midnight/80 backdrop-blur-sm z-10">
        <Link to="/dashboard" className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">← Dashboard</Link>
        <div className="flex items-center gap-4">
          <ScoreDelta current={report.score} previous={prevScore} />
          <button onClick={exportJSON} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <Download size={15} /> Export
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-10 space-y-8">

        {/* ── Score overview ── */}
        <div className="glass rounded-3xl p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <ScoreGauge score={report.score} tier={report.tier_label} size={180} />
              <TierBadge tier={report.tier_label} size="lg" />
            </div>

            <div className="flex-1 w-full space-y-4">
              {report.tier > 0 ? (
                <div className="glass rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Max loan</span>
                    <span className="text-slate-100 font-bold text-lg">{report.loan_limit.toLocaleString()} tDUST</span>
                  </div>
                  {report.interest_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Interest rate</span>
                      <span className="text-slate-100 font-semibold">{report.interest_rate} APR</span>
                    </div>
                  )}
                  {report.term_months && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Term</span>
                      <span className="text-slate-100 font-semibold">{report.term_months} months</span>
                    </div>
                  )}
                  <button onClick={() => nav('/loan/apply')} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    Apply for loan <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="glass rounded-2xl p-5 text-center">
                  <p className="text-slate-400 text-sm mb-1">Score below eligibility threshold</p>
                  <p className="text-slate-500 text-xs">Need 35+ points · Current: {report.score}</p>
                  <p className="text-slate-500 text-xs mt-3">Follow the improvement tips below to qualify.</p>
                </div>
              )}

              {/* Adjustment note */}
              <div className="flex items-start gap-2 text-xs text-slate-500 px-1">
                {report.breakdown.adjustment >= 0
                  ? <TrendingUp size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  : <TrendingDown size={12} className="text-red-400 shrink-0 mt-0.5" />
                }
                <span className="leading-relaxed">{analysis.adjustmentNote}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── What's working ── */}
        {analysis.strengths.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-slate-200">What's working in your favour</h2>
            </div>
            <div className="grid gap-3">
              {analysis.strengths.map(f => <FactorCard key={f.key} f={f} />)}
            </div>
          </section>
        )}

        {/* ── Needs improvement ── */}
        {analysis.weaknesses.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-400" />
              <h2 className="font-semibold text-slate-200">Areas pulling your score down</h2>
            </div>
            <div className="grid gap-3">
              {analysis.weaknesses.map(f => <FactorCard key={f.key} f={f} />)}
            </div>
          </section>
        )}

        {/* ── Score history chart ── */}
        {history.length > 1 && (
          <section>
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
          </section>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button onClick={() => nav('/score')} className="btn-ghost flex-1 flex items-center justify-center gap-2">
            <RefreshCw size={15} /> Re-assess
          </button>
          <Link to="/reports" className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm font-medium">
            View all reports
          </Link>
        </div>
      </main>
    </div>
  )
}
