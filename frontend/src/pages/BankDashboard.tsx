import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Building2, RefreshCw, Users, TrendingUp } from 'lucide-react'
import AppNav from '../components/AppNav'
import { marketplace } from '../lib/api'
import type { LoanRequest, LoanRequestStatus } from '../types'
import TierBadge from '../components/TierBadge'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'
import { toast } from '../hooks/useToast'

const ease = [0.16, 1, 0.3, 1]

const COLUMNS: { status: LoanRequestStatus; label: string; icon: typeof Clock; color: string }[] = [
  { status: 'pending',  label: 'Pending',  icon: Clock,        color: 'text-amber-400' },
  { status: 'approved', label: 'Approved', icon: CheckCircle,  color: 'text-emerald-400' },
  { status: 'rejected', label: 'Rejected', icon: XCircle,      color: 'text-red-400' },
]

function RequestCard({ req, onDecide }: { req: LoanRequest; onDecide: (id: string, status: 'approved' | 'rejected') => void }) {
  const [deciding, setDeciding] = useState(false)

  const decide = async (status: 'approved' | 'rejected') => {
    setDeciding(true)
    await onDecide(req.request_id, status)
    setDeciding(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-xl p-4 space-y-3 border border-white/6"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-zinc-100">{req.borrower_name ?? 'Borrower'}</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            ₹{req.amount.toLocaleString('en-IN')} · {new Date(req.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
        <TierBadge tier={req.tier_label as any} />
      </div>

      <div className="text-xs text-zinc-500 bg-white/4 rounded-lg px-3 py-2">
        <span className="text-zinc-400">Bank:</span> {req.bank_name}
      </div>

      {req.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={deciding}
            onClick={() => decide('approved')}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            Approve
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={deciding}
            onClick={() => decide('rejected')}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Reject
          </motion.button>
        </div>
      )}

      {req.status !== 'pending' && req.message && (
        <p className="text-xs text-zinc-600 italic">{req.message}</p>
      )}
    </motion.div>
  )
}

export default function BankDashboard() {
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await marketplace.incoming()
      setRequests(data)
    } catch {
      toast('Failed to load requests', { variant: 'error' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDecide = async (request_id: string, status: 'approved' | 'rejected') => {
    try {
      const updated = await marketplace.decide(request_id, status)
      setRequests(prev => prev.map(r => r.request_id === request_id ? updated : r))
      toast(status === 'approved' ? 'Application approved' : 'Application rejected', {
        variant: status === 'approved' ? 'success' : 'error',
      })
    } catch {
      toast('Failed to update', { variant: 'error' })
    }
  }

  const byStatus = (status: LoanRequestStatus) => requests.filter(r => r.status === status)

  const stats = [
    { label: 'Total',    value: requests.length,                   icon: Users },
    { label: 'Pending',  value: byStatus('pending').length,  icon: Clock },
    { label: 'Approved', value: byStatus('approved').length, icon: TrendingUp },
  ]

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav title="Bank Dashboard" />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        <SlideUp>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
              <p className="text-zinc-500 text-sm mt-1">Incoming applications across all partner banks</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </motion.button>
          </div>
        </SlideUp>

        {/* ── Stats ───────────────────────────────────── */}
        <Stagger className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <StaggerItem key={label}>
              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-zinc-500 text-xs">{label}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-3">
                <div className="skeleton h-5 w-24 rounded" />
                {[0, 1].map(j => (
                  <div key={j} className="skeleton h-32 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* ── Kanban ─────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="grid md:grid-cols-3 gap-5"
          >
            {COLUMNS.map(({ status, label, icon: Icon, color }) => {
              const cards = byStatus(status)
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} className={color} />
                    <h2 className="font-semibold text-sm text-zinc-200">{label}</h2>
                    <span className="text-xs text-zinc-600 ml-auto">{cards.length}</span>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {cards.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/8 p-6 text-center">
                        <p className="text-xs text-zinc-600">No {label.toLowerCase()} requests</p>
                      </div>
                    )}
                    {cards.map(req => (
                      <RequestCard key={req.request_id} req={req} onDecide={handleDecide} />
                    ))}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {!loading && requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-3"
          >
            <Building2 size={36} className="text-zinc-700 mx-auto" />
            <p className="text-zinc-400 font-medium">No loan requests yet</p>
            <p className="text-zinc-600 text-sm">Borrowers who apply through the marketplace will appear here.</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
