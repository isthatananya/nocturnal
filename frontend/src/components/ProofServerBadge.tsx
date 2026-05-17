import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, RefreshCw } from 'lucide-react'
import { probeProofServer, type ProofServerStatus } from '../lib/midnightShared'

type State = { kind: 'checking' } | { kind: 'result'; status: ProofServerStatus }

export default function ProofServerBadge() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  const probe = useCallback(async () => {
    setState({ kind: 'checking' })
    const status = await probeProofServer()
    setState({ kind: 'result', status })
  }, [])

  useEffect(() => {
    probe()
    const onFocus = () => probe()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [probe])

  if (state.kind === 'checking') {
    return (
      <Pill tone="amber" Icon={Activity}>
        Probing proof server…
      </Pill>
    )
  }

  const { status } = state
  if (status.healthy) {
    return (
      <Pill tone="emerald" Icon={Activity}>
        Proof server online <span className="text-zinc-500 tabular-nums">· {status.latencyMs}ms</span>
      </Pill>
    )
  }

  return (
    <Pill tone="red" Icon={RefreshCw} onClick={probe} title={status.error}>
      Proof server offline · retry
    </Pill>
  )
}

const TONE = {
  emerald: { dot: 'bg-emerald-400', text: 'text-emerald-300/80', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.05]' },
  amber:   { dot: 'bg-amber-400',   text: 'text-amber-300/80',   border: 'border-amber-500/20',   bg: 'bg-amber-500/[0.05]'  },
  red:     { dot: 'bg-red-400',     text: 'text-red-300/80',     border: 'border-red-500/25',     bg: 'bg-red-500/[0.05]'    },
}

function Pill({
  tone, Icon, children, onClick, title,
}: {
  tone: keyof typeof TONE
  Icon: typeof Activity
  children: React.ReactNode
  onClick?: () => void
  title?: string
}) {
  const t = TONE[tone]
  const Wrap: any = onClick ? motion.button : 'div'
  return (
    <Wrap
      {...(onClick && {
        onClick,
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.98 },
      })}
      title={title}
      className={`inline-flex items-center gap-2 text-[11px] font-medium rounded-full border px-3 py-1 ${t.border} ${t.bg} ${t.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      <Icon size={10} />
      {children}
    </Wrap>
  )
}
