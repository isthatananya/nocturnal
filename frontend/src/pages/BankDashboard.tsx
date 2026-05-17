import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, Clock, Building2, RefreshCw,
  ShieldCheck, Wifi, WifiOff, IndianRupee, ChevronDown,
} from 'lucide-react'
import AppNav from '../components/AppNav'
import { marketplace } from '../lib/api'
import type { LoanRequest, LoanRequestStatus } from '../types'
import TierBadge from '../components/TierBadge'
import RiskBadge from '../components/RiskBadge'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'
import { useWebSocket } from '../hooks/useWebSocket'
import { toast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'

const ease = [0.16, 1, 0.3, 1]

const COLUMNS: { status: LoanRequestStatus; label: string; icon: typeof Clock; color: string; bg: string }[] = [
  { status: 'pending',  label: 'Pending',  icon: Clock,        color: 'text-amber-400',  bg: 'border-amber-500/20' },
  { status: 'approved', label: 'Approved', icon: CheckCircle,  color: 'text-emerald-400', bg: 'border-emerald-500/20' },
  { status: 'rejected', label: 'Rejected', icon: XCircle,      color: 'text-red-400',    bg: 'border-red-500/20' },
]

interface DecideModalProps {
  req: LoanRequest
  onClose: () => void
  onDecide: (id: string, status: 'approved' | 'rejected', message: string) => Promise<void>
}

function DecideModal({ req, onClose, onDecide }: DecideModalProps) {
  const [action, setAction] = useState<'approved' | 'rejected' | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!action) return
    setSubmitting(true)
    await onDecide(req.request_id, action, message)
    setSubmitting(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease }}
        className="glass rounded-2xl p-6 w-full max-w-md space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-zinc-100">Review application</h3>
            <p className="text-zinc-500 text-sm mt-0.5">{req.borrower_name ?? 'Borrower'}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
        </div>

        {/* Request summary */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Requested</span>
            <span className="font-bold text-zinc-100 flex items-center gap-1">
              <IndianRupee size={13} />{req.amount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Credit tier</span>
            <TierBadge tier={req.tier_label as any} />
          </div>
          {req.risk_label && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Risk profile</span>
              <RiskBadge label={req.risk_label} score={req.risk_score ?? undefined} />
            </div>
          )}
          {req.approval_probability != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Approval odds</span>
              <span className={`font-semibold ${req.approval_probability >= 70 ? 'text-emerald-400' : req.approval_probability >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {req.approval_probability > 0 ? `~${req.approval_probability}%` : 'Below criteria'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/70 pt-1 border-t border-white/5">
            <ShieldCheck size={11} />
            ZK proof of tier verified on Midnight — raw score not disclosed
          </div>
        </div>

        {/* Decision buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(['approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setAction(action === s ? null : s)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                action === s
                  ? s === 'approved'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-white/4 border-white/8 text-zinc-400 hover:border-white/20'
              }`}
            >
              {s === 'approved' ? '✓ Approve' : '✗ Reject'}
            </button>
          ))}
        </div>

        {/* Decision message */}
        <div>
          <label className="label">Note to borrower <span className="text-zinc-600">(optional)</span></label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={action === 'approved'
              ? 'e.g. Approved at standard rates. Funds will be disbursed within 2 business days.'
              : 'e.g. Current FOIR exceeds our threshold. Please reduce existing obligations.'}
            className="input-field resize-none h-20 text-sm mt-1"
            maxLength={300}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
          disabled={!action || submitting}
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
            action === 'approved'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              : action === 'rejected'
              ? 'bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25'
              : 'bg-white/5 border border-white/10 text-zinc-400'
          }`}
        >
          {submitting ? 'Processing…' : action ? `Confirm ${action}` : 'Select a decision above'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function RequestCard({ req, onReview }: { req: LoanRequest; onReview: (r: LoanRequest) => void }) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'just now'
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-xl p-4 space-y-3 border border-white/6 hover:border-white/12 transition-colors"
    >
      {/* Borrower + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-zinc-100 truncate">{req.borrower_name ?? 'Borrower'}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{timeAgo(req.created_at)}</p>
        </div>
        <TierBadge tier={req.tier_label as any} />
      </div>

      {/* Amount + bank */}
      <div className="flex items-center justify-between text-sm bg-white/3 rounded-lg px-3 py-2">
        <span className="text-zinc-500 text-xs">{req.bank_name}</span>
        <span className="font-bold text-zinc-100 flex items-center gap-1">
          <IndianRupee size={12} className="text-zinc-400" />
          {req.amount.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Risk + probability row */}
      <div className="flex items-center gap-2 flex-wrap">
        {req.risk_label && <RiskBadge label={req.risk_label} />}
        {req.approval_probability != null && (
          <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${
            req.approval_probability >= 70
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
              : req.approval_probability >= 40
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
              : req.approval_probability > 0
              ? 'text-orange-400 bg-orange-500/10 border-orange-500/25'
              : 'text-red-400 bg-red-500/10 border-red-500/25'
          }`}>
            {req.approval_probability > 0 ? `~${req.approval_probability}% odds` : 'Below criteria'}
          </span>
        )}
      </div>

      {/* ZK proof badge */}
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/60 border border-emerald-500/15 rounded-lg px-2 py-1.5">
        <ShieldCheck size={10} />
        ZK-encrypted tier proof · Midnight network
      </div>

      {req.message && (
        <p className="text-xs text-zinc-500 italic leading-relaxed">"{req.message}"</p>
      )}

      {/* Action */}
      {req.status === 'pending' && (
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={() => onReview(req)}
          className="w-full py-2 rounded-lg text-xs font-semibold bg-white/6 border border-white/12 text-zinc-300 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
        >
          Review <ChevronDown size={11} />
        </motion.button>
      )}
    </motion.div>
  )
}

export default function BankDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeModal, setActiveModal] = useState<LoanRequest | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [filterBank, setFilterBank] = useState<string>('all')

  const load = useCallback(async (silent = false) => {
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
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time WebSocket
  useWebSocket('/api/ws/bank-feed', {
    enabled: user?.role === 'bank',
    onMessage: useCallback((data: unknown) => {
      const msg = data as any
      if (msg?.type === 'new_request') {
        setWsConnected(true)
        toast(`New loan request — ${msg.bank_name}`, {
          description: `₹${Number(msg.amount).toLocaleString('en-IN')} · ${msg.tier_label} tier · ${msg.risk_label} risk`,
          variant: 'success',
        })
        // Refresh to get full request data
        load(true)
      }
    }, [load]),
  })

  const handleDecide = async (request_id: string, status: 'approved' | 'rejected', message: string) => {
    try {
      const updated = await marketplace.decide(request_id, status, message)
      setRequests(prev => prev.map(r => r.request_id === request_id ? updated : r))
      toast(status === 'approved' ? 'Application approved' : 'Application rejected', {
        variant: status === 'approved' ? 'success' : 'error',
      })
    } catch {
      toast('Failed to update', { variant: 'error' })
    }
  }

  // Unique bank names for filter tabs
  const bankOptions = Array.from(new Set(requests.map(r => r.bank_id)))
  const displayed = filterBank === 'all' ? requests : requests.filter(r => r.bank_id === filterBank)
  const byStatus = (s: LoanRequestStatus) => displayed.filter(r => r.status === s)

  const totalVolume = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0)
  const approvalRate = requests.length > 0
    ? Math.round((requests.filter(r => r.status === 'approved').length / requests.filter(r => r.status !== 'pending').length || 0) * 100)
    : 0

  const stats = [
    { label: 'Total requests',   value: requests.length,                   sub: 'all time'           },
    { label: 'Pending review',   value: byStatus('pending').length,         sub: 'awaiting decision'  },
    { label: 'Approved volume',  value: `₹${(totalVolume/100000).toFixed(1)}L`, sub: 'total disbursed' },
    { label: 'Approval rate',    value: `${approvalRate}%`,                 sub: 'of decided requests' },
  ]

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav title="Bank Dashboard" />

      <AnimatePresence>
        {activeModal && (
          <DecideModal
            req={activeModal}
            onClose={() => setActiveModal(null)}
            onDecide={handleDecide}
          />
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        <SlideUp>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${wsConnected ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-zinc-600 bg-white/4 border-white/8'}`}>
                  {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {wsConnected ? 'live' : 'polling'}
                </span>
              </div>
              <p className="text-zinc-500 text-sm">ZK-verified applications across partner banks</p>
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

        {/* ── Stats ─────────────────────────────────────── */}
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, sub }) => (
            <StaggerItem key={label}>
              <div className="glass rounded-2xl p-5">
                <p className="text-2xl font-bold text-zinc-100">{value}</p>
                <p className="text-xs font-medium text-zinc-300 mt-1">{label}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* ── Bank filter tabs ──────────────────────────── */}
        {bankOptions.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterBank('all')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterBank === 'all' ? 'bg-white/10 border-white/20 text-zinc-100' : 'bg-white/4 border-white/8 text-zinc-400 hover:border-white/15'}`}
            >
              All banks
            </button>
            {bankOptions.map(bid => {
              const name = requests.find(r => r.bank_id === bid)?.bank_name ?? bid
              return (
                <button
                  key={bid}
                  onClick={() => setFilterBank(bid)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterBank === bid ? 'bg-white/10 border-white/20 text-zinc-100' : 'bg-white/4 border-white/8 text-zinc-400 hover:border-white/15'}`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-3">
                <div className="skeleton h-5 w-24 rounded" />
                {[0, 1].map(j => <div key={j} className="skeleton h-40 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : (
          /* ── Kanban ────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="grid md:grid-cols-3 gap-5"
          >
            {COLUMNS.map(({ status, label, icon: Icon, color, bg }) => {
              const cards = byStatus(status)
              return (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${bg}`}>
                    <Icon size={14} className={color} />
                    <h2 className="font-semibold text-sm text-zinc-200">{label}</h2>
                    <span className="text-xs text-zinc-600 ml-auto font-mono">{cards.length}</span>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {cards.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/6 p-6 text-center">
                        <p className="text-xs text-zinc-700">No {label.toLowerCase()} requests</p>
                      </div>
                    )}
                    {cards.map(req => (
                      <RequestCard key={req.request_id} req={req} onReview={setActiveModal} />
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
            <p className="text-zinc-600 text-sm">Borrowers who apply through the marketplace will appear here in real time.</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
