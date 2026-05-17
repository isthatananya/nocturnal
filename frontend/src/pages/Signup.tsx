import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, BarChart2, Landmark, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import DateInput from '../components/ui/DateInput'
import { toast } from '../hooks/useToast'

function calcAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return age
}

const PROFESSIONS = [
  'Salaried Employee',
  'Self-employed / Freelancer',
  'Business Owner',
  'Student',
  'Homemaker',
  'Others',
]

const guarantees = [
  'Your data never leaves your browser',
  'No credit bureau access required',
  'ZK proof — not your raw score',
]

export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profession, setProfession] = useState('')
  const [customProfession, setCustomProfession] = useState('')
  const [loading, setLoading] = useState(false)

  const maxDob = new Date()
  maxDob.setFullYear(maxDob.getFullYear() - 16)
  const maxDobStr = maxDob.toISOString().split('T')[0]

  const firstName = name.trim().split(' ')[0]

  const validateStep1 = () => {
    if (!name.trim()) {
      toast('Name required', { description: 'Please enter your full name.', variant: 'error' })
      return false
    }
    if (!dob) {
      toast('Date of birth required', { description: 'Please enter your date of birth.', variant: 'error' })
      return false
    }
    if (calcAge(dob) < 16) {
      toast('Age restriction', { description: 'You must be at least 16 years old to register.', variant: 'error' })
      return false
    }
    if (!email) {
      toast('Email required', { description: 'Please enter your email.', variant: 'error' })
      return false
    }
    if (password.length < 8) {
      toast('Password too short', { description: 'Must be at least 8 characters.', variant: 'error' })
      return false
    }
    return true
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateStep1()) setStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profession) {
      toast('Select a profession', { description: 'Please choose what best describes you.', variant: 'error' })
      return
    }
    if (profession === 'Others' && !customProfession.trim()) {
      toast('Please specify your profession.', { variant: 'error' })
      return
    }
    setStep(3)
  }

  const handleGoal = async (goal: 'score' | 'marketplace' | 'bank') => {
    setLoading(true)
    const finalProfession = profession === 'Others' ? customProfession.trim() : profession
    const finalRole: 'borrower' | 'bank' = goal === 'bank' ? 'bank' : 'borrower'
    try {
      await signup(email, password, name.trim(), dob, finalProfession, finalRole)
      toast('Account created', { description: `Welcome to Nocturned, ${firstName}!`, variant: 'success' })
      nav(goal === 'score' ? '/score' : goal === 'bank' ? '/bank/dashboard' : '/marketplace')
    } catch (err: unknown) {
      const status = (err as any)?.response?.status
      const detail = (err as any)?.response?.data?.detail
      if (status === 409) {
        toast('Email already registered', { description: 'Try logging in instead.', variant: 'error' })
        setStep(1)
      } else if (status === 422 && detail) {
        const msg = Array.isArray(detail) ? detail[0]?.msg : detail
        toast('Validation error', { description: msg ?? 'Please check your inputs.', variant: 'error' })
        setStep(1)
      } else {
        toast('Failed to create account', { description: 'Please try again.', variant: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/4 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo + dynamic heading */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold">ZK<span className="text-white/55">Credit</span></Link>
          <p className="text-zinc-400 mt-3 h-6 transition-all duration-300">
            {step === 1 && firstName
              ? <span>Welcome, <span className="text-white font-medium">{firstName}</span> 👋</span>
              : step === 1
              ? 'Create your account'
              : step === 2
              ? <span>Nice to meet you, <span className="text-white font-medium">{firstName}</span>!</span>
              : 'What brings you to Nocturned?'}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s < step
                  ? 'bg-white w-4'
                  : s === step
                  ? 'bg-white w-8'
                  : 'bg-white/10 w-4'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Basic info ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="glass rounded-3xl p-8 space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
                className="input-field"
                required
                autoComplete="name"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <DateInput
                value={dob}
                onChange={setDob}
                max={maxDobStr}
                required
              />
              {dob && calcAge(dob) < 16 && (
                <p className="mt-1.5 text-xs text-red-400">You must be at least 16 years old.</p>
              )}
            </div>

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

            <Button type="submit" className="w-full mt-2">
              Continue <ChevronRight size={16} />
            </Button>

            <p className="text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-white/55 hover:text-white/70">Log in</Link>
            </p>
          </form>
        )}

        {/* ── Step 2: Profession ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="glass rounded-3xl p-8 space-y-5">
            <div>
              <label className="label">What best describes you?</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PROFESSIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfession(p)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium text-left transition-all duration-150 border ${
                      profession === p
                        ? 'bg-white/10 border-white/25 text-white/70'
                        : 'bg-white/4 border-white/8 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {profession === 'Others' && (
              <div>
                <label className="label">Please specify</label>
                <input
                  type="text"
                  value={customProfession}
                  onChange={e => setCustomProfession(e.target.value)}
                  placeholder="Your profession"
                  className="input-field"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Continue <ChevronRight size={16} />
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 3: Goal ── */}
        {step === 3 && (
          <div className="glass rounded-3xl p-8 space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoal('score')}
              className="group w-full flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/15 transition-all duration-200 text-left disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center shrink-0 group-hover:bg-white/12 transition-colors">
                <BarChart2 size={20} className="text-white/55" />
              </div>
              <div>
                <div className="font-medium text-zinc-100">Check Credit Score</div>
                <div className="text-xs text-zinc-400 mt-0.5">Upload statements, get a ZK-verified score</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoal('marketplace')}
              className="group w-full flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/4 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-200 text-left disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                <Landmark size={20} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-zinc-100">Browse Loan Marketplace</div>
                <div className="text-xs text-zinc-400 mt-0.5">See lenders and apply with ZK proof — as a borrower</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoal('bank')}
              className="group w-full flex items-center gap-4 p-5 rounded-2xl border border-white/8 bg-white/4 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all duration-200 text-left disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                <Building2 size={20} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-medium text-zinc-100">I'm a Lending Institution</div>
                <div className="text-xs text-zinc-400 mt-0.5">Review loan requests on the bank dashboard</div>
              </div>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(2)}
              className="w-full pt-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {guarantees.map(g => (
            <div key={g} className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
              {g}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
