import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import AppNav from '../components/AppNav'
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
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Report History" />

      <main className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-500/10 border border-white/5
                            flex items-center justify-center mb-5">
              <FileText size={22} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">No reports yet</p>
            <p className="text-zinc-600 text-sm mb-6">Run your first credit assessment to get started.</p>
            <Link to="/score" className="btn-primary text-sm">
              Check my credit
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="space-y-2"
          >
            {reports.map(r => (
              <motion.div
                key={r.report_id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
              >
                <ReportCard report={r} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
