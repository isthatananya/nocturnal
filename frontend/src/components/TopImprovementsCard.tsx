import { motion } from 'framer-motion'
import { ArrowUpRight, Lightbulb } from 'lucide-react'
import type { ImprovementAction } from '../lib/scoreAnalysis'

interface Props {
  actions: ImprovementAction[]
  currentScore: number
}

const ease = [0.16, 1, 0.3, 1]

const DIFFICULTY_STYLE: Record<ImprovementAction['difficulty'], string> = {
  easy:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400  bg-amber-500/10  border-amber-500/20',
  hard:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

export default function TopImprovementsCard({ actions, currentScore }: Props) {
  if (actions.length === 0) return null

  const totalGain = actions.reduce((sum, a) => sum + a.cibilPointGain, 0)
  const projectedScore = Math.min(900, currentScore + totalGain)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="glass rounded-2xl p-6 space-y-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sky-500/12 border border-sky-500/25 flex items-center justify-center">
            <Lightbulb size={13} className="text-sky-400" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-100 tracking-tight">Top {actions.length} ways to improve</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Ranked by CIBIL-score impact</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Potential reach</p>
          <p className="font-mono text-base text-zinc-100">
            <span className="text-zinc-500">{currentScore}</span>
            <ArrowUpRight size={12} className="inline mx-1 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">{projectedScore}</span>
          </p>
          <p className="text-[10px] text-emerald-400/80 mt-0.5">+{totalGain} pts total</p>
        </div>
      </header>

      <ol className="space-y-2.5">
        {actions.map((a, i) => (
          <motion.li
            key={`${a.factorKey}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.06, ease }}
            className="flex gap-3 rounded-xl border border-white/7 bg-black/20 p-3.5"
          >
            <span className="font-mono text-xs text-zinc-500 shrink-0 mt-0.5 w-5">{i + 1}.</span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm text-zinc-200 leading-snug">{a.action}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono text-emerald-300 font-semibold">+{a.cibilPointGain} pts</span>
                <span className="text-zinc-600">·</span>
                <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${DIFFICULTY_STYLE[a.difficulty]}`}>
                  {a.difficulty}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{a.timeline}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{a.factorLabel}</span>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>

      <p className="text-[11px] text-zinc-600 leading-relaxed pt-1">
        Estimates use the same factor weights as the scoring engine. Actual gains
        depend on bureau reporting cycles and other factors moving in parallel.
      </p>
    </motion.section>
  )
}
