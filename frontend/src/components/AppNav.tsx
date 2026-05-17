import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, BarChart2, ArrowLeft, Landmark, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { marketplace } from '../lib/api'

interface Props {
  back?: boolean
  title?: string
}

export default function AppNav({ back = false, title }: Props) {
  const { logout, user } = useAuth()
  const nav = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const isBank = user?.role === 'bank'

  useEffect(() => {
    if (!isBank) return
    marketplace.pendingCount().then(d => setPendingCount(d.pending)).catch(() => {})
    const interval = setInterval(() => {
      marketplace.pendingCount().then(d => setPendingCount(d.pending)).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [isBank])

  const handleLogout = async () => {
    await logout()
    nav('/')
  }

  return (
    <header className="app-header">
      {back ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft size={17} />
          </button>
          {title && <span className="font-semibold tracking-tight">{title}</span>}
        </div>
      ) : (
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          ZK<span className="gradient-text">Credit</span>
          <span className="text-[10px] font-normal text-amber-400/60 border border-amber-400/20 rounded px-1.5 py-0.5 leading-none">preprod</span>
        </Link>
      )}

      <div className="flex items-center gap-1">
        {isBank ? (
          <Link
            to="/bank/dashboard"
            title="Bank dashboard"
            className="relative p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <Building2 size={17} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-black px-1 leading-none">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
        ) : (
          <>
            <Link
              to="/marketplace"
              title="Loan marketplace"
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <Landmark size={17} />
            </Link>
            <Link
              to="/score"
              title="Check score"
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <BarChart2 size={17} />
            </Link>
          </>
        )}
        <Link
          to="/settings"
          title="Settings"
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <Settings size={17} />
        </Link>
        <button
          onClick={handleLogout}
          title="Log out"
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
