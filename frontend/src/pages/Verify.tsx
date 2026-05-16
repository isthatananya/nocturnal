import { useEffect, useState } from 'react'
import { ExternalLink, FileCode2, Globe } from 'lucide-react'
import AppNav from '../components/AppNav'
import ProofServerBadge from '../components/ProofServerBadge'
import { TIER_TERMS } from '../lib/tierAssertions'
import { SlideUp } from '../components/ui/motion'

export default function Verify() {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    fetch('/contract/credit_lending.compact')
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(setSource)
      .catch(() => setSource(null))
  }, [])

  const env = import.meta.env

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Verify" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        <SlideUp>
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Verify scoring integrity</h1>
            <p className="text-sm text-zinc-500">
              Everything this app commits to: the on-chain contract that enforces it,
              the proof server it talks to, and the network it lives on.
            </p>
          </header>
        </SlideUp>

        {/* ── Live infrastructure ───────────────────────── */}
        <SlideUp>
          <section className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-200 text-sm">Live infrastructure</h2>
              <ProofServerBadge />
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs">
              <Row label="Network ID"    value={env.VITE_NETWORK_ID} />
              <Row label="Indexer"       value={env.VITE_INDEXER_URL} />
              <Row label="Indexer WS"    value={env.VITE_INDEXER_WS} />
              <Row label="Node RPC"      value={env.VITE_NODE_RPC} />
              <Row label="Proof server"  value={env.VITE_PROOF_SERVER_URL} />
              <Row label="Contract addr" value={env.VITE_CONTRACT_ADDRESS || '— (not yet deployed)'} />
            </dl>
          </section>
        </SlideUp>

        {/* ── Tier terms (matches the contract) ─────────── */}
        <SlideUp>
          <section className="glass rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-zinc-200 text-sm">Tier terms enforced on-chain</h2>
            <table className="w-full text-xs">
              <thead className="text-zinc-500">
                <tr className="text-left">
                  <th className="py-1.5 font-medium">Tier</th>
                  <th className="py-1.5 font-medium text-right">Max loan (DUST)</th>
                  <th className="py-1.5 font-medium text-right">Rate</th>
                  <th className="py-1.5 font-medium text-right">Term</th>
                </tr>
              </thead>
              <tbody>
                {TIER_TERMS.map(t => (
                  <tr key={t.tier} className="border-t border-white/5">
                    <td className="py-1.5 text-zinc-300 font-medium">{t.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.maxLoanDust.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums">{(t.rateBps / 100).toFixed(2)}%</td>
                    <td className="py-1.5 text-right tabular-nums">{t.termMonths} mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Sourced from <code className="font-mono">contract/credit_lending.compact</code>.
              UI and contract share these numbers verbatim — if they ever drift, scoring breaks.
            </p>
          </section>
        </SlideUp>

        {/* ── Contract source ───────────────────────────── */}
        <SlideUp>
          <section className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 size={14} className="text-sky-400/80" />
                <h2 className="font-semibold text-zinc-200 text-sm">credit_lending.compact</h2>
              </div>
              <a href="/contract/credit_lending.compact"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
                Raw <ExternalLink size={11} />
              </a>
            </div>
            <pre className="bg-black/40 border border-white/8 rounded-lg p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-96">
              {source ?? 'Loading contract source…'}
            </pre>
          </section>
        </SlideUp>

        {/* ── External links ────────────────────────────── */}
        <SlideUp>
          <section className="flex flex-wrap gap-2">
            <a href={env.VITE_INDEXER_URL} target="_blank" rel="noopener noreferrer"
              className="btn-ghost inline-flex items-center gap-1.5 text-xs">
              <Globe size={11} /> Open indexer
            </a>
            <a href="https://docs.midnight.network/" target="_blank" rel="noopener noreferrer"
              className="btn-ghost inline-flex items-center gap-1.5 text-xs">
              <ExternalLink size={11} /> Midnight docs
            </a>
          </section>
        </SlideUp>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 border-t border-white/5 first:border-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono text-zinc-300 break-all">{value || '—'}</dd>
    </div>
  )
}
