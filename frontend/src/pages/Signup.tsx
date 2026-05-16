import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { toast } from '../hooks/useToast'

export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast('Password too short', { description: 'Must be at least 8 characters.', variant: 'error' })
      return
    }
    setLoading(true)
    try {
      await signup(email, password)
      toast('Account created', { description: 'Welcome to ZKCredit.', variant: 'success' })
      nav('/dashboard')
    } catch (err: unknown) {
      const status = (err as any)?.response?.status
      if (status === 409) {
        toast('Email already registered', { description: 'Try logging in instead.', variant: 'error' })
      } else {
        toast('Failed to create account', { description: 'Please try again.', variant: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const guarantees = [
    'Your data never leaves your browser',
    'No credit bureau access required',
    'ZK proof — not your raw score',
  ]

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-bold">ZK<span className="text-indigo-400">Credit</span></Link>
          <p className="text-slate-400 mt-3">Create your account</p>
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
              placeholder="Min. 8 characters"
              className="input-field"
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-indigo-400 hover:text-indigo-300">Log in</Link>
          </p>
        </form>

        <div className="mt-6 space-y-2">
          {guarantees.map(g => (
            <div key={g} className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
              {g}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
