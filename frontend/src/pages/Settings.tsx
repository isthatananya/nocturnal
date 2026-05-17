import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock } from 'lucide-react'
import AppNav from '../components/AppNav'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/api'
import { toast } from '../hooks/useToast'
import { Button } from '../components/ui/button'

export default function Settings() {
  const { user } = useAuth()
  const network = import.meta.env.VITE_NETWORK_ID

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 8) {
      toast('Password too short', { description: 'New password must be at least 8 characters.', variant: 'error' })
      return
    }
    if (newPw !== confirmPw) {
      toast('Passwords do not match', { variant: 'error' })
      return
    }
    setPwLoading(true)
    try {
      await auth.changePassword(currentPw, newPw)
      toast('Password updated', { description: 'Your password has been changed successfully.', variant: 'success' })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: unknown) {
      const status = (err as any)?.response?.status
      if (status === 400) {
        toast('Incorrect password', { description: 'Current password is wrong.', variant: 'error' })
      } else {
        toast('Failed to update password', { variant: 'error' })
      }
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="page min-h-screen text-zinc-100">
      <AppNav back title="Settings" />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* ── Account info ── */}
        <div className="glass rounded-2xl divide-y divide-white/5" style={{marginTop:0}}>
          <div className="px-6 py-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-4">Account</p>
            <div className="space-y-3 text-sm">
              {user?.full_name && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Name</span>
                  <span className="text-zinc-100">{user.full_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Email</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-100">{user?.email}</span>
                  {user?.email_verified ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                      <CheckCircle size={11} /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                      <Clock size={11} /> Unverified
                    </span>
                  )}
                </div>
              </div>
              {user?.profession && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Profession</span>
                  <span className="text-zinc-100">{user.profession}</span>
                </div>
              )}
              {user?.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Date of birth</span>
                  <span className="text-zinc-100">{user.date_of_birth}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Role</span>
                <span className="text-zinc-100 capitalize">{user?.role ?? 'borrower'}</span>
              </div>
            </div>
          </div>

          {/* ── Network ── */}
          <div className="px-6 py-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-4">Network</p>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Midnight network</span>
              <span className={`font-medium ${network === 'mainnet' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {network}
              </span>
            </div>
          </div>
        </div>

        {/* ── Password change ── */}
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-5">Change password</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                className="input-field"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="input-field"
                required
                autoComplete="new-password"
              />
              {confirmPw && newPw !== confirmPw && (
                <p className="mt-1.5 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>
            <Button type="submit" loading={pwLoading} size="sm">
              Update password
            </Button>
          </form>
        </div>

        {/* ── Privacy notice ── */}
        <div className="glass rounded-2xl p-6 text-sm text-zinc-500">
          <p className="font-medium text-zinc-400 mb-2">Privacy notice</p>
          <p className="leading-relaxed">
            Raw financial data you upload is processed entirely in your browser and is never transmitted to our servers.
            Credit scores are computed from derived features only. Report data is stored encrypted — only you can decrypt it.
            Lenders receive only a ZK proof of your credit tier, never your raw score or financial details.
          </p>
        </div>
        </motion.div>
      </main>
    </div>
  )
}
