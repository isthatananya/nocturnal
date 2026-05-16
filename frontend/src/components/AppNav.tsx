import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, BarChart2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import WalletBar from './WalletBar'

interface Props {
  /** Show a back arrow + title instead of the logo */
  back?: boolean
  title?: string
}

export default function AppNav({ back = false, title }: Props) {
  const { logout } = useAuth()
  const nav = useNavigate()

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
        <Link to="/dashboard" className="font-bold text-lg tracking-tight">
          ZK<span className="gradient-text">Credit</span>
        </Link>
      )}

      <div className="flex items-center gap-1">
        <WalletBar />
        <Link
          to="/score"
          title="Check score"
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <BarChart2 size={17} />
        </Link>
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
