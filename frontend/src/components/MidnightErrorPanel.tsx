import { AlertTriangle, ExternalLink, RefreshCw, Terminal } from 'lucide-react'
import { motion } from 'framer-motion'
import { MidnightError, type MidnightErrorCode } from '../lib/midnightShared'

interface Props {
  code: MidnightErrorCode
  onRetry?: () => void
}

export default function MidnightErrorPanel({ code, onRetry }: Props) {
  if (code === MidnightError.WALLET_NOT_INSTALLED) {
    return (
      <Frame tone="amber" title="Lace wallet not detected">
        <p>
          To apply for a loan with a zero-knowledge proof you need the Midnight Lace
          wallet browser extension installed.
        </p>
        <a href="https://www.lace.io/" target="_blank" rel="noopener noreferrer"
           className="btn-primary inline-flex items-center gap-1.5 mt-3 text-sm">
          Install Lace <ExternalLink size={12} />
        </a>
      </Frame>
    )
  }

  if (code === MidnightError.CONTRACT_NOT_DEPLOYED) {
    return (
      <Frame tone="sky" title="Smart contract not deployed yet">
        <p className="mb-3">
          The Compact contract <code className="font-mono text-zinc-300">credit_lending.compact</code> has
          not been compiled and deployed to preprod yet. The on-chain ZK proof flow becomes
          available the moment <code className="font-mono text-zinc-300">VITE_CONTRACT_ADDRESS</code> is set.
        </p>
        <CodeBlock>
{`./contract/compile.sh
MIDNIGHT_WALLET_SEED=… ./contract/deploy.sh`}
        </CodeBlock>
        <p className="mt-3 text-xs text-zinc-500">
          See <code className="font-mono">contract/README.md</code> for the full runbook.
        </p>
      </Frame>
    )
  }

  if (code === MidnightError.PROOF_SERVER_DOWN) {
    return (
      <Frame tone="red" title="Proof server unreachable">
        <p className="mb-3">
          The local proof server at <code className="font-mono text-zinc-300">{import.meta.env.VITE_PROOF_SERVER_URL}</code>{' '}
          is not responding.
        </p>
        <CodeBlock>docker compose up proof-server</CodeBlock>
        {onRetry && <RetryBtn onClick={onRetry} />}
      </Frame>
    )
  }

  if (code === MidnightError.WALLET_REJECTED) {
    return (
      <Frame tone="amber" title="Wallet authorization declined">
        <p>You declined the Lace wallet authorization. Reconnect to try again.</p>
        {onRetry && <RetryBtn onClick={onRetry} />}
      </Frame>
    )
  }

  if (code === MidnightError.PROOF_FAILED) {
    return (
      <Frame tone="red" title="ZK proof generation failed">
        <p>
          The proof server rejected the inputs. This usually means a tier
          mismatch — your private state's tier does not justify the requested loan terms.
        </p>
        {onRetry && <RetryBtn onClick={onRetry} />}
      </Frame>
    )
  }

  return (
    <Frame tone="red" title="Transaction failed">
      <p>Something went wrong submitting the transaction. Check the proof-server logs.</p>
      {onRetry && <RetryBtn onClick={onRetry} />}
    </Frame>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

const TONE = {
  amber: { border: 'border-amber-400/30', bg: 'bg-amber-400/[0.06]', text: 'text-amber-300' },
  sky:   { border: 'border-sky-400/30',   bg: 'bg-sky-400/[0.06]',   text: 'text-sky-300'   },
  red:   { border: 'border-red-400/30',   bg: 'bg-red-400/[0.06]',   text: 'text-red-300'   },
}

function Frame({
  tone, title, children,
}: { tone: keyof typeof TONE; title: string; children: React.ReactNode }) {
  const t = TONE[tone]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border ${t.border} ${t.bg} p-5 text-sm text-zinc-300 space-y-1`}
    >
      <div className={`flex items-center gap-2 font-semibold ${t.text} mb-1`}>
        <AlertTriangle size={14} /> {title}
      </div>
      <div className="text-zinc-400 leading-relaxed">{children}</div>
    </motion.div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-black/40 border border-white/8 rounded-lg p-3 text-xs font-mono text-zinc-200 overflow-x-auto flex items-start gap-2">
      <Terminal size={12} className="mt-0.5 shrink-0 text-zinc-500" />
      <code>{children}</code>
    </pre>
  )
}

function RetryBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-ghost inline-flex items-center gap-1.5 text-xs mt-3"
    >
      <RefreshCw size={11} /> Retry
    </button>
  )
}
