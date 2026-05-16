import { CheckCircle, Loader, Lock, Send, Shield } from 'lucide-react'
import { Progress } from './ui/progress'

export type ProofStep = 'idle' | 'witness' | 'proving' | 'signing' | 'submitting' | 'done' | 'error'

const STEPS: { step: ProofStep; label: string; tooltip: string; icon: typeof Shield }[] = [
  {
    step: 'witness',
    label: 'Preparing witness',
    tooltip: 'Your credit tier is being packaged as a private input. No one — not even ZKCredit — can see it.',
    icon: Lock,
  },
  {
    step: 'proving',
    label: 'Generating ZK proof',
    tooltip: 'A mathematical proof is being created that says "this user qualifies" — without revealing why.',
    icon: Shield,
  },
  {
    step: 'signing',
    label: 'Awaiting wallet signature',
    tooltip: 'Sign to authorize the proof transaction in Lace.',
    icon: Loader,
  },
  {
    step: 'submitting',
    label: 'Submitting to Midnight',
    tooltip: 'Your proof is being verified on-chain.',
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
            active ? 'border-indigo-500/40 bg-indigo-500/5' :
            done  ? 'border-white/5 bg-white/2 opacity-60' :
                    'border-white/5 opacity-30'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              done   ? 'bg-emerald-500/20 text-emerald-400' :
              active ? 'bg-indigo-500/20 text-indigo-400' :
                       'bg-white/5 text-slate-600'
            }`}>
              {done
                ? <CheckCircle size={16} />
                : active
                ? <Icon size={16} className="animate-pulse" />
                : <Icon size={16} />
              }
            </div>
            <div>
              <p className={`text-sm font-medium ${done ? 'text-slate-400' : active ? 'text-slate-100' : 'text-slate-600'}`}>
                {label}
              </p>
              {active && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tooltip}</p>
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
