import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Clock, Unlink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { auth } from '../lib/api'
import { toast } from '../hooks/useToast'
import { Button } from '../components/ui/button'

function truncate(addr: string) {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

export default function Settings() {
  const { user } = useAuth()
  const { address, installed, connect, disconnect, connecting } = useWallet()
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

  const handleDisconnect = async () => {
    await disconnect()
    toast('Wallet disconnected', { variant: 'success' })
  }

  return (
    <div className="page min-h-screen text-slate-100">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-200 transition-colors">
            <ArrowLeft size={17} />
          </Link>
          <span className="font-semibold tracking-tight">Settings</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* ── Account info ── */}
        <div className="glass rounded-2xl divide-y divide-white/5" style={{marginTop:0}}>
          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Account</p>
            <div className="space-y-3 text-sm">
              {user?.full_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="text-slate-100">{user.full_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-100">{user?.email}</span>
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
                  <span className="text-slate-400">Profession</span>
                  <span className="text-slate-100">{user.profession}</span>
                </div>
              )}
              {user?.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of birth</span>
                  <span className="text-slate-100">{user.date_of_birth}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Wallet ── */}
          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Wallet</p>
            {address ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-100 font-mono text-xs">{truncate(address)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Midnight Lace wallet</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 bg-red-400/5 hover:bg-red-400/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Unlink size={12} /> Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">No wallet connected</span>
                {installed ? (
                  <Button size="sm" onClick={connect} loading={connecting}>Connect Lace</Button>
                ) : (
                  <a href="https://lacewallet.io" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-amber-400 border border-amber-400/20 bg-amber-400/5 rounded-lg px-3 py-1.5 hover:bg-amber-400/10 transition-colors">
                    Install Lace wallet
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Network ── */}
          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Network</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Midnight network</span>
              <span className={`font-medium ${network === 'mainnet' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {network}
              </span>
            </div>
          </div>
        </div>

        {/* ── Password change ── */}
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-5">Change password</p>
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
        <div className="glass rounded-2xl p-6 text-sm text-slate-500">
          <p className="font-medium text-slate-400 mb-2">Privacy notice</p>
          <p className="leading-relaxed">
            Raw financial data you upload is processed entirely in your browser and is never transmitted to our servers.
            Credit scores are computed from derived features only. Report data is stored encrypted — only you can decrypt it.
          </p>
        </div>
        </motion.div>
      </main>
    </div>
  )
}
