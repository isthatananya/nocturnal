import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { toast } from '../hooks/useToast'

const ease = [0.25, 0.46, 0.45, 0.94]

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
      const me = await login(email, password)
      nav(me.role === 'bank' ? '/bank/dashboard' : '/dashboard')
    } catch {
      toast('Invalid credentials', { description: 'Check your email and password.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.025] blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        {/* logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="text-center mb-10"
        >
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Noc<span className="gradient-text">turned</span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Welcome back</p>
        </motion.div>

        {/* form card */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
          className="glass rounded-2xl p-8 space-y-5"
        >
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
              autoFocus
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

          <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}>
            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </motion.div>

          <p className="text-center text-sm text-zinc-500">
            No account?{' '}
            <Link to="/auth/signup" className="text-white/55 hover:text-white/70 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </motion.form>

        {/* demo hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-xs text-zinc-500 mt-6"
        >
          Demo accounts: priya@zkcredit.demo · rahul@zkcredit.demo · password: demo1234
        </motion.p>
      </div>
    </div>
  )
}
