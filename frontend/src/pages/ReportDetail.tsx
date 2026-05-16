import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { credit } from '../lib/api'
import type { Report } from '../types'
import ScoreGauge from '../components/ScoreGauge'
import TierBadge from '../components/TierBadge'
import FactorCard from '../components/FactorCard'
import { analyseReport } from '../lib/scoreAnalysis'

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    if (!id) return
    credit.report(id).then(setReport).catch(() => nav('/reports'))
  }, [id, nav])

  const exportJSON = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zkcredit-${report.report_id}.json`
    a.click()
  }

  if (!report) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inputs = (report as any).inputs ?? undefined
  const analysis = analyseReport(report.breakdown, inputs)

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/reports" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-semibold">Report</span>
          <span className="text-xs font-mono text-slate-500">{report.report_id}</span>
        </div>
        <button onClick={exportJSON} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <Download size={15} /> Export JSON
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12 space-y-6">

        {/* ── Score overview ── */}
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4">
          <ScoreGauge score={report.score} tier={report.tier_label} size={180} />
          <TierBadge tier={report.tier_label} size="lg" />
          <p className="text-slate-500 text-sm">{new Date(report.generated_at).toLocaleString()}</p>
        </div>

        {/* ── Loan terms ── */}
        <div className="glass rounded-2xl divide-y divide-white/5">
          {[
            ['Loan limit', `${report.loan_limit.toLocaleString()} tDUST`],
            ['Interest rate', report.interest_rate ?? '—'],
            ['Term', report.term_months ? `${report.term_months} months` : '—'],
            ['Loan applied', report.loan_applied ? 'Yes' : 'No'],
            ['TX hash', report.loan_tx_hash ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between px-6 py-4 text-sm">
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-100 font-medium font-mono text-xs truncate max-w-48">{v}</span>
            </div>
          ))}
        </div>

        {/* ── Adjustment note ── */}
        <div className="flex items-start gap-2 text-xs text-slate-500 px-1">
          {report.breakdown.adjustment >= 0
            ? <TrendingUp size={12} className="text-emerald-500 shrink-0 mt-0.5" />
            : <TrendingDown size={12} className="text-red-400 shrink-0 mt-0.5" />
          }
          <span className="leading-relaxed">{analysis.adjustmentNote}</span>
        </div>

        {/* ── What's working ── */}
        {analysis.strengths.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-slate-200">What worked in your favour</h2>
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
              <h2 className="font-semibold text-slate-200">Areas that pulled the score down</h2>
            </div>
            <div className="grid gap-3">
              {analysis.weaknesses.map(f => <FactorCard key={f.key} f={f} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
