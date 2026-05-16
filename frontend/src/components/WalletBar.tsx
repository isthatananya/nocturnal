import { Wallet, ExternalLink } from 'lucide-react'
import { useWallet } from '../context/WalletContext'

function truncate(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

export default function WalletBar() {
  const { address, installed, connecting, connect, error } = useWallet()

  if (address) {
    return (
      <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl text-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
        <span className="text-slate-300 font-mono text-xs">{truncate(address)}</span>
      </div>
    )
  }

  if (!installed) {
    return (
      <a
        href="https://lacewallet.io"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-amber-400 border border-amber-400/20 bg-amber-400/5 rounded-xl px-3 py-1.5 hover:bg-amber-400/10 transition-colors"
      >
        Install Lace <ExternalLink size={12} />
      </a>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={connecting}
        className="flex items-center gap-2 text-sm text-white/55 border border-white/10 bg-white/4 rounded-xl px-3 py-1.5 hover:bg-white/6 transition-colors disabled:opacity-50"
      >
        <Wallet size={14} />
        {connecting ? 'Connecting...' : 'Connect Lace'}
      </button>
      {error && <p className="text-xs text-red-400 max-w-48 text-right">{error}</p>}
    </div>
  )
}
