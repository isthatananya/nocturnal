import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import type { Report } from '../types'
import { assertionsForApply } from '../lib/tierAssertions'

function aprToBps(apr: string | null): number {
  return apr ? Math.round(parseFloat(apr) * 100) : 0
}

interface Props {
  report: Report
}

export default function TierProofPreview({ report }: Props) {
  const [open, setOpen] = useState(false)
  if (report.tier === 0) return null

  const previewAmount = report.loan_limit
  const assertions = assertionsForApply(
    report.tier,
    previewAmount,
    aprToBps(report.interest_rate),
    report.term_months ?? 0,
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass rounded-2xl"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-sky-400/80" />
          <span className="text-sm font-semibold text-zinc-200">
            What the on-chain proof will assert
          </span>
        </div>
        <ChevronDown size={14}
          className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                These are the assertions the Compact contract&nbsp;
                <code className="font-mono text-zinc-400">credit_lending.compact</code>&nbsp;
                will enforce in zero knowledge. Your tier is never revealed on-chain.
              </p>
              <ol className="space-y-2">
                {assertions.map((a, i) => (
                  <li key={i} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs">
                    <p className="font-mono text-sky-300/85">{a.label}</p>
                    <p className="text-zinc-400 mt-0.5 leading-relaxed">{a.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
