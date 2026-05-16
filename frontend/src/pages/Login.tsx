import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { toast } from '../hooks/useToast'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      nav('/dashboard')
    } catch {
      toast('Invalid credentials', { description: 'Check your email and password.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-bold">ZK<span className="text-indigo-400">Credit</span></Link>
          <p className="text-slate-400 mt-3">Welcome back</p>
        </div>

        <form onSubmit={submit} className="glass rounded-3xl p-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/auth/signup" className="text-indigo-400 hover:text-indigo-300">Sign up</Link>
          </p>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Demo accounts: alice@zkcredit.demo · bob@zkcredit.demo · password: demo1234
        </p>
      </div>
    </div>
  )
}
