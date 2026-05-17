import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import AppNav from '../components/AppNav'
import AmortisationSchedule from '../components/AmortisationSchedule'
import MidnightErrorPanel from '../components/MidnightErrorPanel'
import ProofServerBadge from '../components/ProofServerBadge'
import { credit } from '../lib/api'
import { MidnightApiError, MidnightError, repayLoan, type MidnightErrorCode } from '../lib/midnight'
import type { LoanSchedule, Report } from '../types'
import { SlideUp, Stagger, StaggerItem } from '../components/ui/motion'
import { toast } from '../hooks/useToast'

const ease = [0.16, 1, 0.3, 1]
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === '1'

export default function LoanActive() {
  const nav = useNavigate()
  const [loan, setLoan] = useState<Report | null>(null)
  const [schedule, setSchedule] = useState<LoanSchedule | null>(null)
  const [repaying, setRepaying] = useState(false)
  const [error, setError] = useState<MidnightErrorCode | null>(null)

  const load = useCallback(async () => {
    const reports = await credit.reports()
    const active = reports.find(r => r.loan_applied)
    if (!active) { nav('/dashboard'); return }
    setLoan(active)
    try {
      const s = await credit.schedule(active.report_id)
      setSchedule(s)
    } catch {
      // Backend may not have schedule data for legacy loans — degrade gracefully.
      setSchedule(null)
    }
  }, [nav])

  useEffect(() => { load() }, [load])

  const handleRepay = async () => {
    if (!loan || !schedule || schedule.fully_repaid) return
    setRepaying(true)
    setError(null)

    let txHash: string | undefined
    try {
      // Try the real on-chain repayment first. Falls through to backend-only
      // record-keeping when the contract isn't deployed or wallet isn't installed.
      if (!DEMO_MODE) {
        try {
          // We pass the EMI amount as the on-chain repayment amount.
          // The Midnight contract just flips the loan's repaid flag.
          txHash = await repayLoan('', null, BigInt(schedule.emi))
        } catch (e) {
          if (e instanceof MidnightApiError) {
            // CONTRACT_NOT_DEPLOYED / WALLET_NOT_INSTALLED are expected when
            // running Option B — surface as a soft note but still record the
            // EMI payment on the backend so the user can demo the flow.
            if (e.code !== MidnightError.CONTRACT_NOT_DEPLOYED && e.code !== MidnightError.WALLET_NOT_INSTALLED) {
              setError(e.code)
              setRepaying(false)
              return
            }
          } else {
            throw e
          }
        }
      } else {
        // Demo mode: fabricate a tx hash for the visual flow.
        txHash = `mid1${Math.random().toString(36).slice(2, 18)}`
      }

      const result = await credit.repayNextEmi(loan.report_id, txHash)
      const updated = await credit.schedule(loan.report_id)
      setSchedule(updated)
      toast(
        result.loan_repaid ? 'Loan fully repaid 🎉' : `EMI ${result.paid_emi_count} of ${schedule.term_months} paid`,
        { variant: 'success' },
      )
    } catch {
      toast('Failed to record repayment', { variant: 'error' })
    } finally {
      setRepaying(false)
    }
  }

  if (!loan) return (
    <div className="page min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const fullyRepaid = schedule?.fully_repaid ?? loan.loan_tx_hash === null

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Active Loan" />
      <div className="fixed bottom-4 right-4 z-30">
        <ProofServerBadge />
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-5">

        {/* hero */}
        <SlideUp>
          <div className="glass rounded-3xl p-8">
            <p className="eyebrow mb-3">Loan amount</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
              className="text-5xl font-bold tracking-tight mb-1"
            >
              ₹{loan.loan_limit.toLocaleString('en-IN')}
            </motion.p>
            <p className="text-zinc-600 text-sm">
              {fullyRepaid ? 'fully repaid' : 'disbursed on Midnight blockchain'}
            </p>
          </div>
        </SlideUp>

        {/* stats */}
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Interest rate', loan.interest_rate ?? '—'],
            ['Term', loan.term_months ? `${loan.term_months} months` : '—'],
            ['Credit tier', loan.tier_label],
            ['Score at issuance', `${loan.score}/900`],
          ].map(([k, v]) => (
            <StaggerItem key={k}>
              <div className="glass rounded-2xl p-4">
                <p className="text-zinc-600 text-xs mb-1">{k}</p>
                <p className="text-zinc-100 font-semibold">{v}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* tx hash */}
        {loan.loan_tx_hash && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="glass rounded-2xl p-5"
          >
            <p className="text-zinc-600 text-xs mb-2">On-chain disbursement</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono text-white/55 truncate">{loan.loan_tx_hash}</p>
              <a href={`https://explorer.preprod.midnight.network/tx/${loan.loan_tx_hash}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-colors">
                <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>
        )}

        {/* schedule + repay */}
        {schedule ? (
          <SlideUp className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-200 tracking-tight">Repayment schedule</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70">
                <ShieldCheck size={11} />
                ZK-private — only tier proven on-chain
              </div>
            </div>

            <AmortisationSchedule schedule={schedule} />

            {error && (
              <MidnightErrorPanel code={error} onRetry={() => setError(null)} />
            )}

            {!schedule.fully_repaid ? (
              <motion.button
                whileHover={{ scale: repaying ? 1 : 1.01 }}
                whileTap={{ scale: repaying ? 1 : 0.98 }}
                disabled={repaying}
                onClick={handleRepay}
                className="btn-primary w-full disabled:opacity-50"
              >
                {repaying
                  ? 'Submitting repayment…'
                  : `Pay next EMI (₹${schedule.emi.toLocaleString('en-IN')})`}
              </motion.button>
            ) : (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 text-center">
                <p className="text-emerald-300 font-semibold text-sm">Loan fully repaid</p>
                <p className="text-zinc-500 text-xs mt-1">
                  Your repayment history will boost the payment-history factor on the next score recompute.
                </p>
              </div>
            )}
          </SlideUp>
        ) : (
          /* Legacy loan (issued before schedules existed) — graceful fallback. */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease }}
            className="glass rounded-2xl p-6"
          >
            <p className="text-zinc-600 text-xs mb-3 font-medium tracking-wide uppercase">Repayment</p>
            <p className="text-zinc-500 text-sm">
              No amortisation schedule available for this loan. Newer loans will show a full month-by-month schedule here.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
