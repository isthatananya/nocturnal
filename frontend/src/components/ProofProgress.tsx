import { CheckCircle, Loader, Lock, Send, Shield } from 'lucide-react'
import { Progress } from './ui/progress'

export type ProofStep = 'idle' | 'witness' | 'proving' | 'signing' | 'submitting' | 'done' | 'error'

const STEPS: { step: ProofStep; label: string; tooltip: string; icon: typeof Shield }[] = [
  {
    step: 'witness',
    label: 'Building witness from credit tier commitment',
    tooltip: 'Your credit tier is encoded as a private witness. The exact score, income, and history remain hidden — only the tier threshold is committed.',
    icon: Lock,
  },
  {
    step: 'proving',
    label: 'Generating ZK-SNARK proof (Midnight compact)',
    tooltip: 'A zero-knowledge proof is computed locally in your browser. It proves tier eligibility without revealing any underlying credit data.',
    icon: Shield,
  },
  {
    step: 'signing',
    label: 'Signing proof with Lace wallet',
    tooltip: 'Sign the proof transaction in your Lace wallet to authorise the on-chain submission.',
    icon: Loader,
  },
  {
    step: 'submitting',
    label: 'Submitting to Midnight preprod smart contract',
    tooltip: 'The Midnight contract verifies the ZK proof on-chain. If valid, the loan commitment is recorded without any credit data touching the ledger.',
    icon: Send,
  },
]

const ORDER: ProofStep[] = ['witness', 'proving', 'signing', 'submitting', 'done']

interface Props {
  current: ProofStep
  error?: string | null
}

export default function ProofProgress({ current, error }: Props) {
  const currentIdx = ORDER.indexOf(current)
  const pct = current === 'done' ? 100 : current === 'error' ? 0 : Math.round((currentIdx / (ORDER.length - 1)) * 100)

  return (
    <div className="space-y-3">
      <Progress value={pct} className="mb-4 h-1.5" />
      {STEPS.map(({ step, label, tooltip, icon: Icon }) => {
        const idx = ORDER.indexOf(step)
        const done = currentIdx > idx || current === 'done'
        const active = current === step

        return (
          <div key={step} className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
            active ? 'border-white/12 bg-white/4' :
            done  ? 'border-white/5 bg-white/2 opacity-60' :
                    'border-white/5 opacity-30'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              done   ? 'bg-emerald-500/20 text-emerald-400' :
              active ? 'bg-white/8 text-white/60' :
                       'bg-white/5 text-zinc-600'
            }`}>
              {done
                ? <CheckCircle size={16} />
                : active
                ? <Icon size={16} className="animate-pulse" />
                : <Icon size={16} />
              }
            </div>
            <div>
              <p className={`text-sm font-medium ${done ? 'text-zinc-400' : active ? 'text-zinc-100' : 'text-zinc-600'}`}>
                {label}
              </p>
              {active && (
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{tooltip}</p>
              )}
            </div>
          </div>
        )
      })}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
