import { useNavigate } from 'react-router-dom'
import { Shield, Zap, Lock, ArrowRight, CheckCircle } from 'lucide-react'

const steps = [
  { n: '01', title: 'Upload locally', body: "Drop your financial data. It's parsed entirely in your browser — the file never touches a server." },
  { n: '02', title: 'AI scores privately', body: 'Your feature vector (not raw data) is scored. The algorithm is deterministic and auditable.' },
  { n: '03', title: 'ZK proof generated', body: "A cryptographic proof of your tier is created. It proves you qualify without revealing your score." },
  { n: '04', title: 'Loan unlocked on-chain', body: 'The Midnight smart contract verifies the proof and releases funds. No collateral needed.' },
]

const features = [
  { icon: Lock, title: 'Zero data exposure', body: "Raw financial data never leaves your device. We score a derived vector, not your records." },
  { icon: Shield, title: 'Cryptographic fairness', body: 'Credit tiers are enforced by ZK circuits, not UI logic. The contract cannot be gamed.' },
  { icon: Zap, title: 'Truly undercollateralized', body: 'Most DeFi loans demand 150% collateral. ZKCredit uses proof-of-creditworthiness instead.' },
]

export default function Landing() {
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-midnight text-slate-100 overflow-x-hidden">
      {/* nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-midnight/80 backdrop-blur-xl">
        <span className="font-bold text-lg tracking-tight">ZK<span className="text-indigo-400">Credit</span></span>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/auth/login')} className="btn-ghost py-2 px-4 text-sm">Log in</button>
          <button onClick={() => nav('/auth/signup')} className="btn-primary py-2 px-4 text-sm">Get started</button>
        </div>
      </nav>

      {/* hero */}
      <section className="relative pt-40 pb-32 px-8 max-w-5xl mx-auto text-center">
        {/* background glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-indigo-400 border border-indigo-500/30 bg-indigo-500/5 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Built on Midnight · Zero-Knowledge Privacy
        </div>

        <h1 className="text-6xl font-bold leading-tight mb-6">
          Borrow on your merit.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            Prove it without showing it.
          </span>
        </h1>

        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-10">
          A DeFi lending protocol that uses Zero-Knowledge Proofs to unlock undercollateralized loans — without ever seeing your financial data.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button onClick={() => nav('/auth/signup')} className="btn-primary flex items-center gap-2 text-base">
            Check my credit <ArrowRight size={16} />
          </button>
          <button onClick={() => nav('/auth/login')} className="btn-ghost text-base">
            Log in
          </button>
        </div>

        {/* trust badges */}
        <div className="flex items-center justify-center gap-8 mt-14 text-sm text-slate-500">
          {['Data never transmitted', 'ZK proof on Midnight', 'Open source contract'].map(t => (
            <span key={t} className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {steps.map(s => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <span className="text-5xl font-black text-indigo-500/20">{s.n}</span>
              <h3 className="font-semibold text-slate-100 mt-2 mb-2">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Why ZKCredit</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="glass rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5">
                <f.icon size={22} className="text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* comparison */}
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Traditional DeFi vs ZKCredit</h2>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 text-sm text-slate-400 px-6 py-4 border-b border-white/5">
            <span />
            <span className="text-center font-medium">Traditional DeFi</span>
            <span className="text-center font-medium text-indigo-400">ZKCredit</span>
          </div>
          {[
            ['Collateral required', '150%+ of loan', 'None'],
            ['Data shared with lender', 'N/A', 'Zero'],
            ['Credit visibility', 'None', 'ZK-proven'],
            ['Loan size', 'Collateral-capped', 'Credit-based'],
            ['Privacy', 'Public wallet history', 'Fully private score'],
          ].map(([label, bad, good]) => (
            <div key={label} className="grid grid-cols-3 px-6 py-4 border-b border-white/5 last:border-0">
              <span className="text-slate-300 text-sm">{label}</span>
              <span className="text-center text-slate-500 text-sm">{bad}</span>
              <span className="text-center text-emerald-400 text-sm font-medium">{good}</span>
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="py-24 px-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to prove your creditworthiness?</h2>
        <p className="text-slate-400 mb-8">No collateral. No data exposure. Just math.</p>
        <button onClick={() => nav('/auth/signup')} className="btn-primary text-lg px-10 py-4">
          Get started — it's free
        </button>
      </section>

      <footer className="border-t border-white/5 px-8 py-8 text-center text-slate-600 text-sm">
        ZKCredit · Built on Midnight · Midnight Hackathon May 2026
      </footer>
    </div>
  )
}
