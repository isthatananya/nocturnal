import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle, XCircle, Clock, Building2, ChevronRight, Percent, Calendar } from 'lucide-react'
import AppNav from '../components/AppNav'
import { marketplace, credit } from '../lib/api'
import type { Bank, LoanRequest, Report } from '../types'
import LoanSlider from '../components/LoanSlider'
import TierBadge from '../components/TierBadge'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'
import { toast } from '../hooks/useToast'

const ease = [0.16, 1, 0.3, 1]

function ApprovalBar({ prob }: { prob: number }) {
  const color = prob >= 80 ? '#10b981' : prob >= 50 ? '#f59e0b' : prob > 0 ? '#ef4444' : '#52525b'
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
      <Clock size={11} /> Pending
    </span>
  )
}

export default function Marketplace() {
  const nav = useNavigate()
  const [banks, setBanks] = useState<Bank[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [myRequests, setMyRequests] = useState<LoanRequest[]>([])
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [amount, setAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const handleApply = async () => {
    if (!selectedBank || !report) return
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
      toast('Application submitted', {
        description: `Your loan request has been sent to ${req.bank_name}.`,
        variant: 'success',
      })
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to submit application'
      toast('Error', { description: msg, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav title="Loan Marketplace" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── Score context ───────────────────────────── */}
        <SlideUp>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loan Marketplace</h1>
              <p className="text-zinc-500 text-sm mt-1">
                {report
                  ? `Showing lenders matched to your ${report.tier_label} tier (score ${report.score})`
                  : 'Get your credit score first to see personalised approval odds'}
              </p>
            </div>
            {report && <TierBadge tier={report.tier_label} size="lg" />}
          </div>
        </SlideUp>

        {!report && !loading && (
          <SlideUp>
            <div className="glass rounded-2xl p-8 text-center space-y-4">
              <Building2 size={32} className="text-zinc-600 mx-auto" />
              <p className="text-zinc-300 font-medium">No credit score on file</p>
              <p className="text-zinc-500 text-sm">Compute your score first to see approval odds across all lenders.</p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => nav('/score')}
                className="btn-primary inline-flex items-center gap-2"
              >
                Compute score <ArrowRight size={15} />
              </motion.button>
            </div>
          </SlideUp>
        )}

        {/* ── Bank cards ─────────────────────────────── */}
        {banks.length > 0 && (
          <section>
            <h2 className="font-semibold text-zinc-200 mb-4 tracking-tight">Available lenders</h2>
            <Stagger className="grid gap-4 md:grid-cols-3">
              {banks.map(bank => {
                const prob = bank.approval_probability ?? 0
                const alreadyApplied = myRequests.some(r => r.bank_id === bank.bank_id && r.status === 'pending')
                return (
                  <StaggerItem key={bank.bank_id}>
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}
                      disabled={prob === 0}
                      onClick={() => setSelectedBank(bank)}
                      className={`w-full text-left glass rounded-2xl p-5 space-y-4 border transition-colors ${
                        prob === 0
                          ? 'opacity-50 cursor-not-allowed border-white/5'
                          : selectedBank?.bank_id === bank.bank_id
                          ? 'border-white/25 bg-white/6'
                          : 'border-white/8 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ background: `${bank.logo_color}22`, border: `1px solid ${bank.logo_color}44` }}
                          >
                            <Building2 size={16} style={{ color: bank.logo_color }} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm leading-tight">{bank.name}</div>
                            <div className="text-zinc-500 text-xs mt-0.5 leading-tight">{bank.tagline}</div>
                          </div>
                        </div>
                        {alreadyApplied && (
                          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">Applied</span>
                        )}
                      </div>

                      <ApprovalBar prob={prob} />

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Percent size={11} style={{ color: bank.logo_color }} />
                          {bank.interest_rate}% APR
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar size={11} style={{ color: bank.logo_color }} />
                          {bank.term_months}mo term
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
                    </motion.button>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </section>
        )}

        {/* ── Apply modal ─────────────────────────────── */}
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
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${selectedBank.logo_color}22`, border: `1px solid ${selectedBank.logo_color}44` }}
                  >
                    <Building2 size={14} style={{ color: selectedBank.logo_color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedBank.name}</p>
                    <p className="text-zinc-500 text-xs">Max ₹{selectedBank.max_loan.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedBank(null)} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
              </div>

              <LoanSlider
                max={Math.min(report.loan_limit, selectedBank.max_loan)}
                value={amount}
                onChange={setAmount}
                interestRate={String(selectedBank.interest_rate + '%')}
                termMonths={selectedBank.term_months}
              />

              <p className="text-xs text-zinc-600 leading-relaxed">
                Your ZK proof of credit tier will be shared with {selectedBank.name}. Your raw score and financial data remain private.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Submitting…' : <>Submit application <ChevronRight size={15} /></>}
                </motion.button>
                <button onClick={() => setSelectedBank(null)} className="btn-ghost px-5">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── My applications ─────────────────────────── */}
        {myRequests.length > 0 && (
          <section>
            <h2 className="font-semibold text-zinc-200 mb-4 tracking-tight">My applications</h2>
            <div className="space-y-3">
              {myRequests.map(req => (
                <motion.div
                  key={req.request_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 size={16} className="text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-zinc-100 truncate">{req.bank_name}</p>
                      <p className="text-zinc-500 text-xs">₹{req.amount.toLocaleString('en-IN')} · {req.tier_label} tier</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusChip status={req.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
