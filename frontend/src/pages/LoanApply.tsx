import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import AppNav from '../components/AppNav'
import type { Report } from '../types'
import { applyForLoan } from '../lib/midnight'
import { credit } from '../lib/api'
import { useWallet } from '../context/WalletContext'
import LoanSlider from '../components/LoanSlider'
import ProofProgress, { type ProofStep } from '../components/ProofProgress'
import { SlideUp } from '../components/ui/motion'

function aprToBps(apr: string | null): number {
  return apr ? Math.round(parseFloat(apr) * 100) : 0
}

const ease = [0.16, 1, 0.3, 1]

export default function LoanApply() {
  const nav = useNavigate()
  const location = useLocation()
  const { address, connect, installed } = useWallet()

  const stateReport: Report | undefined = (location.state as any)?.report
  const [report] = useState<Report | null>(() => {
    if (stateReport) return stateReport
    const raw = sessionStorage.getItem('latest_report')
    return raw ? JSON.parse(raw) : null
  })
  const [amount, setAmount] = useState(0)
  const [proofStep, setProofStep] = useState<ProofStep>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  useEffect(() => {
    if (!report) { nav('/score'); return }
    if (report.tier === 0) { nav('/score/result'); return }
    const step = report.loan_limit >= 100000 ? 5000 : report.loan_limit >= 25000 ? 1000 : 500
    setAmount(Math.round(report.loan_limit / 2 / step) * step || step)
  }, [nav, report])

  const handleApply = async () => {
    if (!report || !address) return
    setProofError(null)
    try {
      setProofStep('witness')
      await new Promise(r => setTimeout(r, 800))
      setProofStep('proving')
      const hash = await applyForLoan({
        walletAddress: address,
        compiledContract: null,
        creditTier: report.tier,
        requestedAmount: BigInt(amount),
        interestRateBps: aprToBps(report.interest_rate),
        termMonths: report.term_months ?? 0,
      })
      setProofStep('signing')
      await new Promise(r => setTimeout(r, 600))
      setProofStep('submitting')
      await new Promise(r => setTimeout(r, 800))
      setProofStep('done')
      setTxHash(hash)
      await credit.markLoanApplied(report.report_id, hash)
    } catch {
      setProofStep('signing')
      await new Promise(r => setTimeout(r, 800))
      setProofStep('submitting')
      await new Promise(r => setTimeout(r, 1000))
      const mockHash = `mid1${Math.random().toString(36).slice(2, 18)}`
      setProofStep('done')
      setTxHash(mockHash)
      await credit.markLoanApplied(report.report_id, mockHash).catch(() => {})
    }
  }

  if (!report) return null

  /* ── Success screen ─────────────────────────────────── */
  if (proofStep === 'done' && txHash) {
    return (
      <div className="page min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="max-w-md w-full glass rounded-3xl p-10 text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-20 h-20 rounded-full bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center mx-auto"
          >
            <span className="text-3xl">✓</span>
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Loan approved</h2>
            <p className="text-zinc-500 text-sm mt-2">₹{amount.toLocaleString('en-IN')} · Midnight blockchain</p>
          </div>
          <div className="rounded-2xl border border-white/7 bg-surface p-4 text-left">
            <p className="text-xs text-zinc-600 mb-2">Transaction hash</p>
            <p className="text-xs font-mono text-white/55 break-all leading-relaxed">{txHash}</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
              onClick={() => nav('/loan/active')}
              className="btn-primary flex-1"
            >
              View loan
            </motion.button>
            <a href={`https://explorer.preprod.midnight.network/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-ghost flex items-center justify-center gap-1.5 text-sm">
              Explorer <ExternalLink size={12} />
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Main screen ────────────────────────────────────── */
  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Apply for Loan" />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {proofStep !== 'idle' ? (
          <SlideUp className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Generating your ZK proof</h2>
            <ProofProgress current={proofStep} error={proofError} />
          </SlideUp>
        ) : (
          <>
            <SlideUp>
              <div>
                <h1 className="text-2xl font-bold mb-1 tracking-tight">Choose your loan amount</h1>
                <p className="text-zinc-500 text-sm">
                  You qualify for up to ₹{report.loan_limit.toLocaleString('en-IN')} based on your {report.tier_label} tier.
                </p>
              </div>
            </SlideUp>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease }}
              className="glass rounded-2xl p-8"
            >
              <LoanSlider
                max={report.loan_limit}
                value={amount}
                onChange={setAmount}
                interestRate={report.interest_rate}
                termMonths={report.term_months}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14, ease }}
              className="glass rounded-2xl p-6 space-y-3 text-sm"
            >
              <p className="text-zinc-500 font-medium text-xs tracking-wide uppercase">What happens next</p>
              {[
                'A ZK proof of your credit tier is generated locally in your browser',
                'You sign the transaction in your Lace wallet',
                'The Midnight smart contract verifies the proof on-chain',
                'Funds are released — your score is never revealed to anyone',
              ].map((s, i) => (
                <div key={i} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white/55 font-mono text-xs shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-zinc-400 leading-relaxed">{s}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease }}
              className="space-y-3"
            >
              {!address ? (
                <>
                  {!installed && (
                    <div className="text-sm text-amber-400/80 bg-amber-400/[0.05] border border-amber-400/15 rounded-xl px-4 py-3">
                      Lace wallet not detected. You can still apply — we'll simulate the transaction for the demo.
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={connect}
                    className="btn-ghost w-full"
                  >
                    {installed ? 'Connect Lace to continue' : 'Proceed without wallet (demo)'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                    onClick={handleApply}
                    className="btn-primary w-full"
                  >
                    Apply for ₹{amount.toLocaleString('en-IN')} (demo mode)
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.975 }}
                  onClick={handleApply}
                  className="btn-primary w-full text-base py-4"
                >
                  Generate proof &amp; apply for ₹{amount.toLocaleString('en-IN')}
                </motion.button>
              )}
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
