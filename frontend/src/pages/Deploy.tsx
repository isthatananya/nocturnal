import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, ExternalLink, Rocket } from 'lucide-react'
import AppNav from '../components/AppNav'
import ProofServerBadge from '../components/ProofServerBadge'
import MidnightErrorPanel from '../components/MidnightErrorPanel'
import { useWallet } from '../context/WalletContext'
import {
  deployCreditLending,
  MidnightApiError,
  MidnightError,
  type MidnightErrorCode,
} from '../lib/midnight'
import { SlideUp } from '../components/ui/motion'

type Phase = 'idle' | 'connecting' | 'compiling' | 'deploying' | 'done' | 'error'

export default function Deploy() {
  const { address, installed, connect } = useWallet()
  const [phase, setPhase] = useState<Phase>('idle')
  const [contractAddress, setContractAddress] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<MidnightErrorCode | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const existing = import.meta.env.VITE_CONTRACT_ADDRESS

  const handleDeploy = async () => {
    setPhase('deploying')
    setErrorCode(null)
    setErrorMsg(null)
    try {
      const result = await deployCreditLending()
      setContractAddress(result.contractAddress)
      setTxHash(result.txHash)
      setPhase('done')
    } catch (e) {
      const code: MidnightErrorCode = e instanceof MidnightApiError
        ? e.code
        : MidnightError.TX_FAILED
      const msg = e instanceof Error ? e.message : String(e)
      setErrorCode(code)
      setErrorMsg(msg)
      setPhase('error')
    }
  }

  const copy = (s: string) => navigator.clipboard.writeText(s)

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Deploy contract" />
      <div className="fixed bottom-4 right-4 z-30">
        <ProofServerBadge />
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <SlideUp>
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Deploy credit_lending.compact</h1>
            <p className="text-sm text-zinc-500">
              One-time setup. Connects Lace, signs a deploy transaction, and returns the
              on-chain address. Paste it into <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code>
              {' '}in <code className="font-mono text-xs">.env</code> and restart the dev server.
            </p>
          </header>
        </SlideUp>

        {existing && (
          <SlideUp>
            <section className="glass rounded-2xl p-4 border-amber-500/20 bg-amber-500/[0.04]">
              <p className="text-xs text-amber-400/90 font-medium mb-1">Contract already deployed</p>
              <p className="font-mono text-xs text-zinc-300 break-all">{existing}</p>
              <p className="text-[11px] text-zinc-500 mt-2">
                Re-deploying will create a new contract instance; loans recorded under the
                previous address will be inaccessible. Only proceed if you intended to.
              </p>
            </section>
          </SlideUp>
        )}

        {/* ── Prereqs checklist ─────────────────────────── */}
        <SlideUp>
          <section className="glass rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-zinc-200 text-sm">Prerequisites</h2>
            <ul className="space-y-2 text-sm">
              <Item ok={installed} label="Lace wallet installed">
                Install the <a href="https://www.lace.io/" target="_blank" rel="noopener noreferrer" className="underline">Lace browser extension</a> and switch it to <code className="font-mono text-xs">{import.meta.env.VITE_NETWORK_ID || 'testnet'}</code>.
              </Item>
              <Item ok={Boolean(address)} label="Wallet connected to this dApp">
                {address
                  ? <span className="font-mono text-xs text-zinc-500 break-all">{address}</span>
                  : <button onClick={connect} className="text-sky-400 underline">Connect Lace</button>}
              </Item>
              <Item ok={true} label="Wallet funded with preprod tDUST">
                Visit the <a href="https://docs.midnight.network/" target="_blank" rel="noopener noreferrer" className="underline">Midnight docs</a> for the current faucet link. tDUST pays gas for the deploy transaction.
              </Item>
              <Item ok={true} label="Compact CLI installed and contract compiled">
                Run <code className="font-mono text-xs">./contract/compile.sh</code> from a terminal with Midnight's <code className="font-mono text-xs">compact</code> CLI on PATH. This emits the ZK artifacts under <code className="font-mono text-xs">/contract/zk-artifacts/</code>.
              </Item>
            </ul>
          </section>
        </SlideUp>

        {/* ── Deploy action ──────────────────────────────── */}
        {phase === 'done' && contractAddress ? (
          <SlideUp>
            <section className="glass rounded-2xl p-6 space-y-4 border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h2 className="font-semibold text-emerald-200">Deployed</h2>
              </div>
              <div className="space-y-3 text-sm">
                <Field label="Contract address" value={contractAddress} onCopy={() => copy(contractAddress)} />
                {txHash && (
                  <Field
                    label="Deploy tx hash"
                    value={txHash}
                    onCopy={() => copy(txHash)}
                    explorerHref={`https://explorer.preprod.midnight.network/tx/${txHash}`}
                  />
                )}
              </div>
              <div className="rounded-xl bg-black/30 border border-white/8 p-4 text-xs font-mono text-zinc-400 whitespace-pre-wrap">
                {`# add to .env\nVITE_CONTRACT_ADDRESS=${contractAddress}\n\n# then restart the dev server`}
              </div>
            </section>
          </SlideUp>
        ) : phase === 'error' && errorCode ? (
          <SlideUp className="space-y-3">
            <MidnightErrorPanel code={errorCode} onRetry={() => { setPhase('idle'); setErrorCode(null) }} />
            {errorMsg && (
              <pre className="rounded-lg bg-black/40 border border-white/8 p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
                {errorMsg}
              </pre>
            )}
          </SlideUp>
        ) : (
          <SlideUp>
            <motion.button
              whileHover={{ scale: address && phase === 'idle' ? 1.01 : 1 }}
              whileTap={{ scale: address && phase === 'idle' ? 0.98 : 1 }}
              disabled={!address || phase !== 'idle'}
              onClick={handleDeploy}
              className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Rocket size={16} />
              {phase === 'deploying' ? 'Deploying — confirm in Lace…'
                : !address ? 'Connect Lace to deploy'
                : 'Deploy contract'}
            </motion.button>
          </SlideUp>
        )}
      </main>
    </div>
  )
}

function Item({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <span className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] ${
        ok ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
      }`}>
        {ok ? '✓' : ''}
      </span>
      <div className="flex-1">
        <div className="text-zinc-300 font-medium">{label}</div>
        <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{children}</div>
      </div>
    </li>
  )
}

function Field({ label, value, onCopy, explorerHref }: {
  label: string
  value: string
  onCopy: () => void
  explorerHref?: string
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-surface p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          <button onClick={onCopy} title="Copy" className="text-zinc-500 hover:text-zinc-300">
            <Copy size={12} />
          </button>
          {explorerHref && (
            <a href={explorerHref} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <p className="font-mono text-xs text-zinc-300 break-all leading-relaxed">{value}</p>
    </div>
  )
}
