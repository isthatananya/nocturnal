import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Zap, Lock, ArrowRight, CheckCircle, ChevronRight, Building2, Percent, Users } from 'lucide-react'

const ease = [0.25, 0.46, 0.45, 0.94]

const steps = [
  { n: '01', title: 'Upload locally', body: "Drop your bank CSV or enter a PAN. Data is parsed in your browser — nothing touches a server." },
  { n: '02', title: 'Score privately', body: 'A 15-feature credit vector is scored. The algorithm is deterministic and fully auditable.' },
  { n: '03', title: 'ZK proof minted', body: "A cryptographic proof of your tier is created on Midnight. It proves you qualify without revealing your score." },
  { n: '04', title: 'Marketplace match', body: 'Browse lenders, see approval odds, and apply — your raw score is never revealed to any bank.' },
]

const features = [
  { icon: Lock,   title: 'Zero data exposure',      body: "Raw financial data never leaves your device. We score a derived feature vector, not your records." },
  { icon: Shield, title: 'Cryptographic fairness',  body: 'Credit tiers are enforced by ZK circuits, not UI logic. The contract cannot be gamed or manipulated.' },
  { icon: Zap,    title: 'Truly undercollateralized', body: 'Most DeFi demands 150% collateral. ZKCredit uses proof-of-creditworthiness instead.' },
]

const LENDERS = [
  { name: 'Neon Bank',      color: '#6366f1', rate: '12.5%', tier: 'Gold+',   max: '₹50L',  desc: 'Premium rates for top-tier borrowers' },
  { name: 'Apex Credit',    color: '#f59e0b', rate: '22.0%', tier: 'Bronze+', max: '₹20L',  desc: 'Accessible credit for all eligible borrowers' },
  { name: 'Horizon DeFi',   color: '#10b981', rate: '17.5%', tier: 'Silver+', max: '₹30L',  desc: 'Decentralised lending on Midnight blockchain' },
]

const comparison = [
  ['Collateral required',  '150%+ of loan value', 'None'],
  ['Data shared',          'N / A',                'Zero'],
  ['Credit visibility',    'None',                 'ZK-proven tier'],
  ['Loan size basis',      'Collateral-capped',    'Credit score'],
  ['Privacy',              'Public wallet history', 'Fully private'],
]

/* ── Mock product preview card ──────────────────────────── */
function ProductPreview() {
  const nav = useNavigate()
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="w-[300px] mx-auto"
    >
      <div className="rounded-3xl p-6 shadow-lifted select-none" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-semibold text-zinc-500 tracking-wide uppercase">Credit Score</span>
          <span className="chip border-white/12 text-white/55 bg-white/5">
            <span className="glow-dot" />Prime
          </span>
        </div>

        {/* score arc */}
        <div className="flex flex-col items-center mb-5">
          <svg width="130" height="80" viewBox="0 0 130 80">
            <path d="M 15 75 A 50 50 0 1 1 115 75"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 15 75 A 50 50 0 1 1 115 75"
              fill="none" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="157" strokeDashoffset="20" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f5f5f7" />
                <stop offset="100%" stopColor="#86868b" />
              </linearGradient>
            </defs>
            <text x="65" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#f1f5f9">792</text>
          </svg>
          <span className="text-xs text-zinc-500 -mt-1">out of 900</span>
        </div>

        {/* stats */}
        {[
          ['Max loan', '₹10,00,000'],
          ['Interest rate', '10.5% APR'],
          ['Term', '60 months'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-4)' }}>{k}</span>
            <span className="font-medium" style={{ color: 'var(--text-1)' }}>{v}</span>
          </div>
        ))}

        <button onClick={() => nav("/auth/signup")} className="btn-primary w-full mt-5 text-sm py-2.5">
          Apply for loan <ArrowRight size={14} />
        </button>
      </div>

      {/* floating accent chips */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -right-4 top-8 rounded-2xl px-3 py-2 shadow-card flex items-center gap-2"
        style={{ background: 'var(--bg-4)', border: '1px solid var(--border-2)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px 2px rgba(52,211,153,0.55)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>ZK proof verified</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
        className="absolute -left-6 bottom-16 rounded-2xl px-3 py-2 shadow-card"
        style={{ background: 'var(--bg-4)', border: '1px solid var(--border-2)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>+47 pts since Jan</span>
      </motion.div>
    </motion.div>
  )
}

export default function Landing() {
  const nav = useNavigate()

  return (
    <div className="page min-h-screen overflow-x-hidden" style={{ color: 'var(--text-2)' }}>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-bold text-lg tracking-tight">
          ZK<span className="gradient-text">Credit</span>
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => nav('/auth/login')} className="btn-ghost py-2 px-4 text-sm">Log in</button>
          <button onClick={() => nav('/auth/signup')} className="btn-primary py-2 px-4 text-sm">
            Get started <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-8">
        {/* background glow — Fey-style: minimal single radial, not loud */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-hero-glow opacity-80" />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.025] blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/70
                         border border-white/12 bg-white/5 rounded-full px-4 py-1.5 mb-8"
            >
              <span className="glow-dot" />
              Built on Midnight · Zero-Knowledge Privacy
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease }}
              className="text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight mb-6"
            >
              Borrow on your merit.{' '}
              <span className="gradient-text">
                Prove it without showing it.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16, ease }}
              className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-10"
            >
              A DeFi lending protocol that uses Zero-Knowledge Proofs to unlock undercollateralized loans —
              without ever exposing your financial data.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease }}
              className="flex items-center gap-3 flex-wrap"
            >
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                onClick={() => nav('/auth/signup')}
                className="btn-primary text-base px-7 py-3.5"
              >
                Check my credit <ArrowRight size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                onClick={() => nav('/auth/login')}
                className="btn-ghost text-base px-7 py-3.5"
              >
                Log in
              </motion.button>
            </motion.div>

            {/* trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center flex-wrap gap-6 mt-10 text-sm text-zinc-500"
            >
              {['Data never transmitted', 'ZK proof on Midnight', 'Open-source contract'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-500" /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* right: product preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="relative flex justify-center lg:justify-end"
          >
            <ProductPreview />
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section className="py-28 px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="text-3xl font-bold tracking-tight">Four steps to privacy-first credit</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.07, ease }}
              whileHover={{ y: -4, scale: 1.005 }}
              className="glass rounded-2xl p-6 transition-shadow hover:shadow-card-hover"
            >
              <span className="text-5xl font-black text-white/18 leading-none">{s.n}</span>
              <h3 className="font-semibold text-zinc-100 mt-3 mb-2 text-sm">{s.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-3">Why ZKCredit</p>
          <h2 className="text-3xl font-bold tracking-tight">Privacy is not a feature. It's the foundation.</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.09, ease }}
              whileHover={{ y: -5, scale: 1.008 }}
              className="glass rounded-2xl p-8 group cursor-default"
              style={{ transition: 'box-shadow 0.25s ease' }}
            >
              <div className="w-11 h-11 rounded-xl bg-white/6 border border-white/10
                              flex items-center justify-center mb-5
                              group-hover:bg-white/8 group-hover:border-white/18
                              transition-all duration-300">
                <f.icon size={20} className="text-white/55" />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────── */}
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease }}
          className="text-center mb-12"
        >
          <p className="eyebrow mb-3">Comparison</p>
          <h2 className="text-3xl font-bold tracking-tight">Traditional DeFi vs ZKCredit</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-3 text-xs text-zinc-500 px-6 py-4 border-b border-white/5 font-semibold tracking-wide uppercase">
            <span />
            <span className="text-center">Traditional DeFi</span>
            <span className="text-center text-white/55">ZKCredit</span>
          </div>
          {comparison.map(([label, bad, good]) => (
            <div key={label} className="grid grid-cols-3 px-6 py-4 last:border-0 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
              <span className="text-center text-sm" style={{ color: 'var(--text-5)' }}>{bad}</span>
              <span className="text-center text-emerald-400 text-sm font-semibold">{good}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Lender marketplace section ───────────────────── */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease }}
          className="text-center mb-14"
        >
          <p className="eyebrow mb-3">Marketplace</p>
          <h2 className="text-3xl font-bold tracking-tight">Three lenders. One ZK proof.</h2>
          <p className="text-zinc-400 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            Your encrypted credit tier is submitted to the lenders you choose. They see only what the ZK proof discloses — nothing else.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {LENDERS.map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
              className="glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${l.color}22`, border: `1px solid ${l.color}44` }}>
                  <Building2 size={18} style={{ color: l.color }} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-100">{l.name}</div>
                  <div className="text-zinc-500 text-xs">{l.tier} eligible</div>
                </div>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{l.desc}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Percent size={11} style={{ color: l.color }} /> {l.rate} APR
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <ArrowRight size={11} style={{ color: l.color }} /> Up to {l.max}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-center"
        >
          <button onClick={() => nav('/auth/signup')}
            className="btn-ghost inline-flex items-center gap-2 text-sm">
            Join as a lender <Building2 size={14} />
          </button>
        </motion.div>
      </section>

      {/* ── Dual CTA ─────────────────────────────────────── */}
      <section className="py-28 px-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-radial from-white/[0.03] via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold tracking-tight mb-3">Ready to get started?</h2>
            <p className="text-zinc-400">Join as a borrower or a lending institution.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="glass rounded-2xl p-7 text-center space-y-4 border border-white/8 hover:border-white/15 transition-colors cursor-pointer"
              onClick={() => nav('/auth/signup')}>
              <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center mx-auto">
                <Users size={22} className="text-white/55" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 mb-1">I'm a Borrower</h3>
                <p className="text-zinc-500 text-sm">Get a ZK-verified credit score and apply for loans across multiple lenders.</p>
              </div>
              <span className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5">
                Check my credit <ArrowRight size={14} />
              </span>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="glass rounded-2xl p-7 text-center space-y-4 border border-indigo-500/15 hover:border-indigo-500/35 transition-colors cursor-pointer"
              onClick={() => nav('/auth/signup')}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center mx-auto">
                <Building2 size={22} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 mb-1">I'm a Lender</h3>
                <p className="text-zinc-500 text-sm">Review ZK-verified loan applications in real time. Zero raw data exposure.</p>
              </div>
              <span className="btn-ghost inline-flex items-center gap-2 text-sm py-2.5 px-5 border-indigo-500/25 hover:border-indigo-500/45">
                Open bank dashboard <ArrowRight size={14} />
              </span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-8 py-8 flex items-center justify-between text-zinc-600 text-sm max-w-5xl mx-auto">
        <span className="font-semibold text-zinc-500">ZK<span className="text-white/40">Credit</span></span>
        <span>Built on Midnight · Hackathon May 2026</span>
      </footer>
    </div>
  )
}
