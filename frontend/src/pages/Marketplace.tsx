import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle, XCircle, Clock, Building2, ChevronRight,
  Percent, Calendar, ShieldCheck, AlertTriangle, Star, IndianRupee,
} from 'lucide-react'
import AppNav from '../components/AppNav'
import { marketplace, credit } from '../lib/api'
import type { Bank, LoanRequest, Report } from '../types'
import LoanSlider from '../components/LoanSlider'
import TierBadge from '../components/TierBadge'
import RiskBadge from '../components/RiskBadge'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'
import { useWebSocket } from '../hooks/useWebSocket'
import { toast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'

const ease = [0.16, 1, 0.3, 1]

function ProbBar({ prob }: { prob: number }) {
  const color = prob >= 75 ? '#10b981' : prob >= 50 ? '#f59e0b' : prob > 0 ? '#ef4444' : '#52525b'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">Approval odds</span>
        <span style={{ color }} className="font-semibold">{prob > 0 ? `~${prob}%` : 'Ineligible'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.7, ease }}
        />
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: LoanRequest['status'] }) {
  if (status === 'approved') return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
      <CheckCircle size={11} /> Approved
    </span>
  )
  if (status === 'rejected') return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-1">
      <XCircle size={11} /> Rejected
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
      <Clock size={11} /> Under review
    </span>
  )
}

export default function Marketplace() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [banks, setBanks] = useState<Bank[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [myRequests, setMyRequests] = useState<LoanRequest[]>([])
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [amount, setAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lowOddsConfirm, setLowOddsConfirm] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [reports, reqs] = await Promise.all([
          credit.reports().catch(() => [] as Report[]),
          marketplace.myRequests().catch(() => [] as LoanRequest[]),
        ])
        const latest = reports[0] ?? null
        setReport(latest)
        setMyRequests(reqs)
        const bankList = await marketplace.banks(latest?.score, latest?.tier)
        setBanks(bankList)
        if (latest && latest.tier > 0) {
          const step = latest.loan_limit >= 5000000 ? 100000 : latest.loan_limit >= 1000000 ? 50000 : latest.loan_limit >= 100000 ? 5000 : 1000
          setAmount(Math.round(latest.loan_limit / 2 / step) * step || step)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Real-time: when bank approves/rejects, update request status
  useWebSocket('/api/ws/borrower-feed', {
    enabled: user?.role !== 'bank',
    onMessage: useCallback((data: unknown) => {
      const msg = data as any
      if (msg?.type === 'decision') {
        setMyRequests(prev => prev.map(r =>
          r.request_id === msg.request_id
            ? { ...r, status: msg.status, message: msg.message }
            : r
        ))
        toast(
          msg.status === 'approved' ? `Loan approved by ${msg.bank_name}!` : `Update from ${msg.bank_name}`,
          {
            description: msg.message || (msg.status === 'approved' ? 'Congratulations!' : 'Application not approved.'),
            variant: msg.status === 'approved' ? 'success' : 'error',
          }
        )
      }
    }, []),
  })

  const handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank)
    setLowOddsConfirm(false)
  }

  const handleApply = async () => {
    if (!selectedBank || !report) return

    const prob = selectedBank.approval_probability ?? 0
    if (prob === 0 && !lowOddsConfirm) {
      setLowOddsConfirm(true)
      return
    }

    setSubmitting(true)
    try {
      const req = await marketplace.submit(
        selectedBank.bank_id,
        report.report_id,
        amount,
        report.score,
        report.tier,
        report.tier_label,
      )
      setMyRequests(prev => [req, ...prev])
      setSelectedBank(null)
      setLowOddsConfirm(false)
      toast('Application submitted', {
        description: `Your ZK proof of ${report.tier_label} tier was sent to ${req.bank_name}.`,
        variant: 'success',
      })
    } catch (err: any) {
      toast('Error', { description: err?.response?.data?.detail ?? 'Failed to submit', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyApplied = (bank_id: string) =>
    myRequests.some(r => r.bank_id === bank_id && r.status === 'pending')

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav title="Marketplace" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── Header ──────────────────────────────────── */}
        <SlideUp>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loan Marketplace</h1>
              <p className="text-zinc-500 text-sm mt-1">
                {report
                  ? `Personalised odds for your ${report.tier_label} tier · score ${report.score}`
                  : 'Compute your credit score to see personalised approval odds'}
              </p>
            </div>
            {report && <TierBadge tier={report.tier_label} size="lg" />}
          </div>
        </SlideUp>

        {/* ── No score CTA ──────────────────────────── */}
        {!report && !loading && (
          <SlideUp>
            <div className="glass rounded-2xl p-8 text-center space-y-4">
              <Building2 size={32} className="text-zinc-600 mx-auto" />
              <p className="text-zinc-300 font-medium">No credit score on file</p>
              <p className="text-zinc-500 text-sm">Get scored first to see approval odds across all lenders.</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => nav('/score')} className="btn-primary inline-flex items-center gap-2">
                Compute score <ArrowRight size={15} />
              </motion.button>
            </div>
          </SlideUp>
        )}

        {/* ── Bank grid ─────────────────────────────── */}
        {banks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-zinc-200 tracking-tight">Available lenders</h2>
              <span className="text-xs text-zinc-600">Sorted by approval odds</span>
            </div>
            <Stagger className="grid gap-4 md:grid-cols-3">
              {banks.map((bank, idx) => {
                const prob = bank.approval_probability ?? 0
                const isBest = idx === 0 && prob > 0
                const pending = alreadyApplied(bank.bank_id)
                return (
                  <StaggerItem key={bank.bank_id}>
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectBank(bank)}
                      className={`w-full text-left glass rounded-2xl p-5 space-y-4 border transition-colors relative ${
                        selectedBank?.bank_id === bank.bank_id
                          ? 'border-white/25 bg-white/6'
                          : 'border-white/8 hover:border-white/18'
                      }`}
                    >
                      {isBest && (
                        <span className="absolute -top-2 left-4 flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 rounded-full px-2 py-0.5">
                          <Star size={9} fill="currentColor" /> Best match
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-2 pt-1">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${bank.logo_color}22`, border: `1px solid ${bank.logo_color}44` }}>
                            <Building2 size={16} style={{ color: bank.logo_color }} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm leading-tight">{bank.name}</div>
                            <div className="text-zinc-500 text-xs mt-0.5 leading-tight">{bank.tagline}</div>
                          </div>
                        </div>
                        {pending && (
                          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">Applied</span>
                        )}
                      </div>

                      <ProbBar prob={prob} />

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Percent size={11} style={{ color: bank.logo_color }} />
                          {bank.interest_rate}% APR
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar size={11} style={{ color: bank.logo_color }} />
                          {bank.term_months}mo term
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                          <IndianRupee size={11} style={{ color: bank.logo_color }} />
                          Up to ₹{(bank.max_loan / 100000).toFixed(0)}L
                        </div>
                      </div>

                      <ul className="space-y-1">
                        {bank.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: bank.logo_color }} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {prob === 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 border border-dashed border-white/8 rounded-lg px-2.5 py-2">
                          <AlertTriangle size={11} className="text-amber-500/50 shrink-0" />
                          Below this lender's minimum — you can still apply
                        </div>
                      )}
                    </motion.button>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </section>
        )}

        {/* ── Apply panel ───────────────────────────── */}
        <AnimatePresence>
          {selectedBank && report && (
            <motion.div
              key="apply-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease }}
              className="glass rounded-2xl p-6 border border-white/15 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${selectedBank.logo_color}22`, border: `1px solid ${selectedBank.logo_color}44` }}>
                    <Building2 size={14} style={{ color: selectedBank.logo_color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedBank.name}</p>
                    <p className="text-zinc-500 text-xs">Max ₹{(selectedBank.max_loan / 100000).toFixed(0)}L</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedBank(null); setLowOddsConfirm(false) }}
                  className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
              </div>

              <LoanSlider
                max={Math.min(report.loan_limit, selectedBank.max_loan)}
                value={amount}
                onChange={setAmount}
                interestRate={`${selectedBank.interest_rate}%`}
                termMonths={selectedBank.term_months}
              />

              {/* Low odds warning */}
              <AnimatePresence>
                {lowOddsConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                      <AlertTriangle size={14} />
                      Below minimum criteria
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Your {report.tier_label} tier is below {selectedBank.name}'s minimum requirement.
                      Your application will still be reviewed, but approval is unlikely.
                      Click again to confirm.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ZK privacy note */}
              <div className="flex items-start gap-2 text-xs text-zinc-600 bg-white/3 rounded-lg px-3 py-2.5">
                <ShieldCheck size={12} className="text-emerald-500/60 shrink-0 mt-0.5" />
                Your ZK proof of <span className="text-zinc-400 font-medium mx-1">{report.tier_label} tier</span>
                will be encrypted and sent to {selectedBank.name}. Your raw score and financial data remain private.
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={submitting}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    lowOddsConfirm
                      ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25'
                      : 'btn-primary'
                  }`}
                >
                  {submitting ? 'Submitting…' : lowOddsConfirm ? 'Confirm — apply anyway' : <>Submit application <ChevronRight size={15} /></>}
                </motion.button>
                <button onClick={() => { setSelectedBank(null); setLowOddsConfirm(false) }} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── My applications ───────────────────────── */}
        {myRequests.length > 0 && (
          <section>
            <h2 className="font-semibold text-zinc-200 mb-4 tracking-tight">My applications</h2>
            <div className="space-y-3">
              {myRequests.map(req => (
                <motion.div key={req.request_id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 size={16} className="text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-zinc-100 truncate">{req.bank_name}</p>
                        <p className="text-zinc-500 text-xs">
                          ₹{req.amount.toLocaleString('en-IN')} · {req.tier_label} tier
                          {req.risk_label && ` · ${req.risk_label} risk`}
                        </p>
                      </div>
                    </div>
                    <StatusChip status={req.status} />
                  </div>
                  {req.message && (
                    <div className="flex items-start gap-2 text-xs text-zinc-500 bg-white/3 rounded-lg px-3 py-2">
                      <span className="shrink-0 mt-0.5">{req.status === 'approved' ? '✓' : req.status === 'rejected' ? '✗' : '○'}</span>
                      <span className="italic">{req.message}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
