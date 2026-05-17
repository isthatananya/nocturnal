import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Lock, X } from 'lucide-react'
import type { Report } from '../types'
import { encryptReport } from '../lib/crypto'

interface Props {
  report: Report
}

function strengthHint(pw: string): { label: string; color: string; pct: number } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const buckets = [
    { label: 'Too short',  color: 'bg-red-500',     pct: 10  },
    { label: 'Weak',       color: 'bg-red-400',     pct: 25  },
    { label: 'OK',         color: 'bg-amber-400',   pct: 50  },
    { label: 'Good',       color: 'bg-emerald-400', pct: 75  },
    { label: 'Strong',     color: 'bg-emerald-500', pct: 90  },
    { label: 'Very strong',color: 'bg-emerald-500', pct: 100 },
  ]
  return buckets[Math.min(score, 5)]
}

export default function EncryptedDownloadButton({ report }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setPassword('')
    setConfirm('')
    setError(null)
    setBusy(false)
  }
  const close = () => { setOpen(false); reset() }

  const handleSubmit = async () => {
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const blob = await encryptReport(report, password)
      const file = new Blob([blob], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      const tier = report.tier_label.toLowerCase()
      const date = (report.generated_at || new Date().toISOString()).slice(0, 10)
      a.download = `Nocturned-report-${tier}-${date}.encrypted.json`
      a.click()
      URL.revokeObjectURL(url)
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encryption failed')
      setBusy(false)
    }
  }

  const hint = strengthHint(password)

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
        title="Download a password-encrypted copy of this report"
      >
        <Lock size={13} /> Encrypted
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-sm space-y-4 text-zinc-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold tracking-tight">Encrypt &amp; download</h3>
                <button onClick={close} className="text-zinc-500 hover:text-zinc-200 p-1 -m-1">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pick a password. The report is encrypted with AES-256-GCM (PBKDF2-SHA256, 100k iterations)
                before download. Lose the password and the file is unrecoverable.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Password</label>
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
                  />
                  {password.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${hint.color}`} style={{ width: `${hint.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-500 tabular-nums">{hint.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/[0.04] border border-red-500/15 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={busy || !password || !confirm}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} /> {busy ? 'Encrypting…' : 'Encrypt and download'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
