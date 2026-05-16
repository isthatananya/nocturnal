import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import WalletBar from '../components/WalletBar'

export default function Settings() {
  const { user } = useAuth()
  const { address } = useWallet()
  const network = import.meta.env.VITE_NETWORK_ID

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-semibold">Settings</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12 space-y-6">
        <div className="glass rounded-2xl divide-y divide-white/5">
          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Account</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Email</span>
              <span className="text-slate-100">{user?.email}</span>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Wallet</p>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">{address ? 'Connected' : 'Not connected'}</span>
              <WalletBar />
            </div>
          </div>

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

        <div className="glass rounded-2xl p-6 text-sm text-slate-500">
          <p className="font-medium text-slate-400 mb-2">Privacy notice</p>
          <p className="leading-relaxed">
            Raw financial data you upload is processed entirely in your browser and is never transmitted to our servers.
            Credit scores are computed from derived features only. Report data is stored encrypted — only you can decrypt it.
          </p>
        </div>
      </main>
    </div>
  )
}
