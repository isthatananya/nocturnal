import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { Report } from '../types'
import { applyForLoan } from '../lib/midnight'
import { credit } from '../lib/api'
import { useWallet } from '../context/WalletContext'
import LoanSlider from '../components/LoanSlider'
import ProofProgress, { type ProofStep } from '../components/ProofProgress'

// APR string → basis points (e.g. "7%" → 700)
function aprToBps(apr: string | null): number {
  return apr ? Math.round(parseFloat(apr) * 100) : 0
}

export default function LoanApply() {
  const nav = useNavigate()
  const { address, connect, installed } = useWallet()
  const [report, setReport] = useState<Report | null>(null)
  const [amount, setAmount] = useState(500)
  const [proofStep, setProofStep] = useState<ProofStep>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('latest_report')
    if (!raw) { nav('/score'); return }
    const r: Report = JSON.parse(raw)
    if (r.tier === 0) { nav('/score/result'); return }
    if (r.data_source === 'form') { nav('/score/result'); return }
    setReport(r)
    const step = r.loan_limit >= 100000 ? 5000 : r.loan_limit >= 25000 ? 1000 : 500
    setAmount(Math.round(r.loan_limit / 2 / step) * step || step)
  }, [nav])

  const handleApply = async () => {
    if (!report || !address) return
    setProofError(null)

    try {
      setProofStep('witness')
      await new Promise(r => setTimeout(r, 800))

      setProofStep('proving')
      // In production this call fires real proof generation via the proof server.
      // For demo without a deployed contract, it falls through to the catch block
      // and we simulate a successful tx hash.
      const hash = await applyForLoan({
        walletAddress: address,
        compiledContract: null, // loaded from ZK artifacts in production
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
      // demo fallback — simulates a successful on-chain submission
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

  if (proofStep === 'done' && txHash) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">✓</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Loan approved</h2>
            <p className="text-slate-400 text-sm mt-2">₹{amount.toLocaleString('en-IN')} · Midnight blockchain</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Transaction hash</p>
            <p className="text-xs font-mono text-indigo-400 break-all">{txHash}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => nav('/loan/active')} className="btn-primary flex-1">View loan</button>
            <a href={`https://explorer.preprod.midnight.network/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="btn-ghost flex items-center justify-center gap-1.5">
              Explorer <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <Link to="/score/result" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-semibold">Apply for Loan</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12 space-y-8">
        {proofStep !== 'idle' ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Generating your ZK proof</h2>
            <ProofProgress current={proofStep} error={proofError} />
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold mb-1">Choose your loan amount</h1>
              <p className="text-slate-400 text-sm">You qualify for up to ₹{report.loan_limit.toLocaleString('en-IN')} based on your {report.tier_label} tier.</p>
            </div>

            <div className="glass rounded-2xl p-8">
              <LoanSlider
                max={report.loan_limit}
                value={amount}
                onChange={setAmount}
                interestRate={report.interest_rate}
                termMonths={report.term_months}
              />
            </div>

            <div className="glass rounded-2xl p-6 space-y-3 text-sm">
              <p className="text-slate-400 font-medium">What happens next</p>
              {[
                'A ZK proof of your credit tier is generated locally',
                'You sign the transaction in your Lace wallet',
                'The Midnight smart contract verifies the proof on-chain',
                'Funds are released — your score is never revealed',
              ].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-indigo-400 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <span className="text-slate-400">{s}</span>
                </div>
              ))}
            </div>

            {!address ? (
              <div className="space-y-3">
                {!installed && (
                  <p className="text-sm text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3">
                    Lace wallet not detected. You can still apply — we'll simulate the transaction for the demo.
                  </p>
                )}
                <button onClick={connect} className="btn-ghost w-full">
                  {installed ? 'Connect Lace to continue' : 'Proceed without wallet (demo)'}
                </button>
                <button onClick={handleApply} className="btn-primary w-full">
                  Apply for ₹{amount.toLocaleString('en-IN')} (demo mode)
                </button>
              </div>
            ) : (
              <button onClick={handleApply} className="btn-primary w-full text-base py-4">
                Generate proof &amp; apply for ₹{amount.toLocaleString('en-IN')}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
