import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { credit } from '../lib/api'
import type { Report } from '../types'
import ReportCard from '../components/ReportCard'

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    credit.reports().then(setReports).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-semibold">Report History</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-2">No reports yet</p>
            <Link to="/score" className="text-indigo-400 text-sm hover:text-indigo-300">Run your first assessment →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => <ReportCard key={r.report_id} report={r} />)}
          </div>
        )}
      </main>
    </div>
  )
}
