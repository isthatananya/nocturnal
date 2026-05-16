import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Download, Upload, FileText, CreditCard, AlertTriangle } from 'lucide-react'
import { extractFeatures } from '../lib/featureExtract'
import { credit } from '../lib/api'
import { DEMO_PROFILES, mockPanLookup } from '../lib/demoData'
import FileDropzone from '../components/FileDropzone'
import { Button } from '../components/ui/button'
import type { FeatureVector, EmploymentType } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

type Mode = 'select' | 'upload' | 'form' | 'pan'
type Step = Mode | 'preview' | 'scoring'

const INR = (n: number) => '₹' + n.toLocaleString('en-IN')

const EMP_OPTS: { value: EmploymentType; label: string }[] = [
  { value: 'salaried',       label: 'Salaried Employee' },
  { value: 'self_employed',  label: 'Self-employed / Freelancer' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'unemployed',     label: 'Unemployed' },
]

function foirPct(f: FeatureVector) {
  return ((f.monthly_emi_obligations / f.monthly_income) * 100).toFixed(0)
}

function PreviewRow({ label, value, flag }: { label: string; value: string; flag?: 'good' | 'warn' | 'bad' }) {
  const color = flag === 'good' ? 'text-emerald-400' : flag === 'bad' ? 'text-red-400' : flag === 'warn' ? 'text-amber-400' : 'text-zinc-100'
  return (
    <div className="flex justify-between px-5 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: string }) {
  return <p className="px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white/2">{children}</p>
}

// ── empty form state ──────────────────────────────────────────────────────────

const emptyForm = {
  monthly_income: '',
  monthly_emi_obligations: '',
  employment_type: 'salaried' as EmploymentType,
  employment_months: '',
  itr_filed: false,
  dpd_max_12m: '0',
  missed_emi_12m: '0',
  has_settled_account: false,
  bank_bounce_count_12m: '0',
  credit_history_months: '',
  hard_inquiries_6m: '0',
  credit_card_utilization: '0',
  active_loan_accounts: '0',
  secured_loans_count: '0',
  existing_cibil_score: '',
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Score() {
  const nav = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<Step>('select')
  const [mode, setMode] = useState<Mode>('select')
  const [features, setFeatures] = useState<FeatureVector | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null)

  // Form state
  const [formStep, setFormStep] = useState(1)
  const [form, setForm] = useState(emptyForm)

  // PAN state
  const [pan, setPan] = useState('')
  const [panLoading, setPanLoading] = useState(false)

  // Auto-enter mode when navigated here from ScoreResult's method cards
  useEffect(() => {
    const m = (location.state as any)?.mode as Mode | undefined
    if (m && m !== 'select') enterMode(m)
  }, [])

  const enterMode = (m: Mode) => { setMode(m); setStep(m); setError(null) }

  // ── Upload mode ──────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const f = await extractFeatures(file)
      setFeatures({ ...f, data_source: 'upload' })
      setSelectedDemo(null)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file')
    }
  }

  const loadDemo = (idx: number) => {
    setFeatures(DEMO_PROFILES[idx].features)
    setSelectedDemo(idx)
    setStep('preview')
    setError(null)
  }

  const downloadTemplate = () => {
    const cols = ['monthly_income','monthly_emi_obligations','dpd_max_12m','missed_emi_12m','has_settled_account','credit_history_months','hard_inquiries_6m','credit_card_utilization','active_loan_accounts','secured_loans_count','employment_type','employment_months','bank_bounce_count_12m','itr_filed','existing_cibil_score','signed_by']
    const example = '75000,18000,0,0,false,48,1,0.25,2,1,salaried,36,0,true,720,My_Bank'
    const blob = new Blob([cols.join(',') + '\n' + example], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'zkcredit_india_template.csv'
    a.click()
  }

  // ── PAN mode ──────────────────────────────────────────────────────────────────

  const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

  const handlePan = async () => {
    const p = pan.toUpperCase().trim()
    if (!PAN_RE.test(p)) { setError('Invalid PAN format. Expected: ABCDE1234F'); return }
    setError(null)
    setPanLoading(true)
    // Simulate bureau lookup latency
    await new Promise(r => setTimeout(r, 1600))
    const f = mockPanLookup(p)
    setFeatures(f)
    setPanLoading(false)
    // PAN goes straight to scoring — no preview step
    setStep('scoring')
    try {
      const result = await credit.score(f)
      sessionStorage.setItem('latest_report', JSON.stringify(result))
      nav('/score/result', { state: { report: result } })
    } catch {
      setError('Scoring failed — please try again.')
      setStep('pan')
    }
  }

  // ── Form mode ─────────────────────────────────────────────────────────────────

  const updateForm = (k: keyof typeof emptyForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const buildFeaturesFromForm = (): FeatureVector => ({
    monthly_income:          Number(form.monthly_income),
    monthly_emi_obligations: Number(form.monthly_emi_obligations),
    employment_type:         form.employment_type,
    employment_months:       Number(form.employment_months) || 0,
    itr_filed:               form.itr_filed,
    dpd_max_12m:             Number(form.dpd_max_12m),
    missed_emi_12m:          Number(form.missed_emi_12m),
    has_settled_account:     form.has_settled_account,
    bank_bounce_count_12m:   Number(form.bank_bounce_count_12m),
    credit_history_months:   Number(form.credit_history_months) || 0,
    hard_inquiries_6m:       Number(form.hard_inquiries_6m),
    credit_card_utilization: Number(form.credit_card_utilization) / 100,
    active_loan_accounts:    Number(form.active_loan_accounts),
    secured_loans_count:     Number(form.secured_loans_count),
    existing_cibil_score:    form.existing_cibil_score ? Number(form.existing_cibil_score) : null,
    signed_by:               'Manual_Form',
    data_source:             'form',
  })

  const handleFormNext = () => {
    if (formStep === 1) {
      if (!form.monthly_income || Number(form.monthly_income) <= 0) { setError('Monthly income is required.'); return }
      if (!form.monthly_emi_obligations && form.monthly_emi_obligations !== '0') { setError('EMI obligations required (enter 0 if none).'); return }
    }
    setError(null)
    if (formStep < 4) { setFormStep(s => s + 1); return }
    // Step 4 submit
    const f = buildFeaturesFromForm()
    setFeatures(f)
    setStep('preview')
  }

  // ── Shared submit ─────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!features) return
    setStep('scoring')
    try {
      const result = await credit.score(features)
      sessionStorage.setItem('latest_report', JSON.stringify(result))
      nav('/score/result', { state: { report: result } })
    } catch {
      setError('Scoring failed — please try again.')
      setStep(mode)
    }
  }

  // ── Scoring screen ────────────────────────────────────────────────────────────

  if (step === 'scoring' || panLoading) {
    return (
      <div className="page min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/6 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-100">
              {panLoading ? 'Fetching bureau data…' : 'Computing your score'}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              {panLoading ? 'Connecting to Experian India (simulated)' : 'Running CIBIL-aligned India credit model'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview screen ────────────────────────────────────────────────────────────

  if (step === 'preview' && features) {
    const isForm = features.data_source === 'form'
    return (
      <div className="page min-h-screen text-zinc-100">
        <header className="app-header flex items-center gap-3">
          <button onClick={() => { setStep(mode); setFormStep(1) }} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ArrowLeft size={18} /></button>
          <span className="font-semibold">Confirm your data</span>
          {isForm && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 rounded-full px-3 py-1">
              <AlertTriangle size={11} /> Simulation only — loan not available
            </span>
          )}
        </header>
        <main className="max-w-2xl mx-auto px-8 py-10">
          <p className="text-zinc-400 text-sm mb-5">Only these derived features are sent. Your raw data stays local.</p>

          {selectedDemo !== null && (
            <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3 mb-5">
              <div>
                <span className="text-amber-400 font-medium text-sm">{DEMO_PROFILES[selectedDemo].name}</span>
                <span className="text-zinc-400 text-sm"> · {DEMO_PROFILES[selectedDemo].role}, {DEMO_PROFILES[selectedDemo].city}</span>
                <p className="text-zinc-500 text-xs mt-0.5">{DEMO_PROFILES[selectedDemo].scenario}</p>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl divide-y divide-white/5 mb-6 overflow-hidden">
            <SectionHeader>Income & Obligations</SectionHeader>
            <PreviewRow label="Monthly income" value={INR(features.monthly_income)} />
            <PreviewRow label="Monthly EMI obligations" value={INR(features.monthly_emi_obligations)} />
            <PreviewRow label="FOIR (EMI / Income)" value={`${foirPct(features)}%`}
              flag={Number(foirPct(features)) <= 35 ? 'good' : Number(foirPct(features)) <= 50 ? 'warn' : 'bad'} />

            <SectionHeader>Payment History</SectionHeader>
            <PreviewRow label="Max DPD (12 months)"
              value={features.dpd_max_12m === 0 ? 'Clean · 0 days overdue' : `${features.dpd_max_12m} days overdue`}
              flag={features.dpd_max_12m === 0 ? 'good' : features.dpd_max_12m <= 30 ? 'warn' : 'bad'} />
            <PreviewRow label="Missed EMIs (12 months)"
              value={features.missed_emi_12m === 0 ? 'None' : String(features.missed_emi_12m)}
              flag={features.missed_emi_12m === 0 ? 'good' : 'bad'} />
            {features.has_settled_account && <PreviewRow label="Settled / written-off account" value="Yes" flag="bad" />}

            <SectionHeader>Credit Profile</SectionHeader>
            <PreviewRow label="Credit history age" value={`${features.credit_history_months} months`} />
            <PreviewRow label="Hard inquiries (6 months)" value={String(features.hard_inquiries_6m)}
              flag={features.hard_inquiries_6m === 0 ? 'good' : features.hard_inquiries_6m <= 2 ? 'warn' : 'bad'} />
            <PreviewRow label="Credit card utilization"
              value={`${(features.credit_card_utilization * 100).toFixed(0)}%`}
              flag={features.credit_card_utilization <= 0.30 ? 'good' : features.credit_card_utilization <= 0.60 ? 'warn' : 'bad'} />
            <PreviewRow label="Active loans" value={`${features.active_loan_accounts} total · ${features.secured_loans_count} secured`} />

            <SectionHeader>Employment & Banking</SectionHeader>
            <PreviewRow label="Employment" value={`${EMP_OPTS.find(e => e.value === features.employment_type)?.label ?? features.employment_type} · ${features.employment_months} months`} />
            <PreviewRow label="Bank bounces (ECS/NACH, 12m)"
              value={features.bank_bounce_count_12m === 0 ? 'None' : String(features.bank_bounce_count_12m)}
              flag={features.bank_bounce_count_12m === 0 ? 'good' : 'bad'} />
            <PreviewRow label="ITR filed" value={features.itr_filed ? 'Yes' : 'No'} flag={features.itr_filed ? 'good' : undefined} />
            {features.existing_cibil_score !== null && features.existing_cibil_score !== undefined && (
              <PreviewRow label="CIBIL score (self-reported)" value={String(features.existing_cibil_score)}
                flag={features.existing_cibil_score >= 750 ? 'good' : features.existing_cibil_score >= 650 ? 'warn' : 'bad'} />
            )}
            <PreviewRow label="Source" value={features.signed_by} />
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => { setStep(mode); setFormStep(4) }} className="btn-ghost flex-1">Change data</button>
            <button onClick={submit} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isForm ? 'Run simulation' : 'Compute score'} <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Mode selection ────────────────────────────────────────────────────────────

  if (step === 'select') {
    return (
      <div className="page min-h-screen text-zinc-100">
        <header className="app-header flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ArrowLeft size={18} /></Link>
          <span className="font-semibold">Credit Assessment</span>
        </header>
        <main className="max-w-2xl mx-auto px-8 py-12">
          <h1 className="text-2xl font-bold mb-2">How would you like to proceed?</h1>
          <p className="text-zinc-400 text-sm mb-8">Choose your data source — PAN and upload are eligible for loan approval. Form entries are for simulation only.</p>

          <div className="space-y-4">
            <button onClick={() => enterMode('upload')} className="group w-full glass-hover rounded-2xl p-6 text-left flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center shrink-0 group-hover:bg-white/12 transition-colors">
                <Upload size={22} className="text-white/55" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-100">Upload bank statement / CSV</p>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Loan eligible</span>
                </div>
                <p className="text-zinc-400 text-sm mt-0.5">CSV / JSON export from your bank. Supports all 6 demo profiles.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
            </button>

            <button onClick={() => enterMode('pan')} className="group w-full glass-hover rounded-2xl p-6 text-left flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <CreditCard size={22} className="text-white/60" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-100">PAN Card lookup</p>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Loan eligible</span>
                </div>
                <p className="text-zinc-400 text-sm mt-0.5">Enter your PAN number — bureau data is fetched automatically. One step, instant result.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
            </button>

            <button onClick={() => enterMode('form')} className="group w-full glass-hover rounded-2xl p-6 text-left flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                <FileText size={22} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-100">Fill out manually</p>
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">Simulation only</span>
                </div>
                <p className="text-zinc-400 text-sm mt-0.5">Enter your financial details step by step. Great for exploring eligibility — no loan approval.</p>
              </div>
              <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Upload mode ───────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="page min-h-screen text-zinc-100">
        <header className="app-header flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ArrowLeft size={18} /></button>
          <span className="font-semibold">Upload Data</span>
        </header>
        <main className="max-w-2xl mx-auto px-8 py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Upload your financial data</h1>
            <p className="text-zinc-400 text-sm">India credit profile · 15 factors · CIBIL-aligned model · Score 300–900</p>
            <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-white/55 hover:text-white/70 transition-colors mt-3">
              <Download size={13} /> Download CSV template
            </button>
          </div>

          <FileDropzone onFile={handleFile} />
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <div className="mt-8">
            <p className="text-zinc-500 text-sm mb-3 text-center">or try a demo profile</p>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_PROFILES.map((p, i) => (
                <button key={p.name} onClick={() => loadDemo(i)} className="glass-hover rounded-xl p-4 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-200">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      p.expectedTier === 'Prime'  ? 'text-white/55 bg-white/6 border-white/12' :
                      p.expectedTier === 'Gold'   ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                      p.expectedTier === 'Silver' ? 'text-zinc-300 bg-zinc-300/10 border-zinc-300/30' :
                      p.expectedTier === 'Bronze' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' :
                                                    'text-zinc-500 bg-zinc-500/10 border-zinc-500/30'
                    }`}>{p.expectedTier}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{p.role}</p>
                  <p className="text-xs text-zinc-500">{p.city}</p>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── PAN mode ──────────────────────────────────────────────────────────────────

  if (step === 'pan') {
    return (
      <div className="page min-h-screen text-zinc-100">
        <header className="app-header flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ArrowLeft size={18} /></button>
          <span className="font-semibold">PAN Card Lookup</span>
        </header>
        <main className="max-w-md mx-auto px-8 py-16 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Enter your PAN number</h1>
            <p className="text-zinc-400 text-sm">We'll fetch your credit bureau data instantly. Format: ABCDE1234F</p>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <label className="label">PAN Number</label>
              <input
                type="text"
                value={pan}
                onChange={e => { setPan(e.target.value.toUpperCase()); setError(null) }}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="input-field font-mono tracking-widest text-lg"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handlePan()}
              />
              {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>
            <Button onClick={handlePan} disabled={pan.length !== 10} className="w-full">
              Fetch credit data <ChevronRight size={16} />
            </Button>
          </div>

          <div className="glass rounded-xl p-4 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-400">Demo PAN numbers to try</p>
            {[
              ['PRIYA0001A', 'Prime (~900)'],
              ['RAHUL0002B', 'Gold (~720)'],
              ['ANITA0003C', 'Silver (~612)'],
              ['SURESH004D', 'Bronze (~510)'],
              ['MEENA0005E', 'None (~312)'],
            ].map(([p, label]) => (
              <button key={p} onClick={() => { setPan(p); setError(null) }}
                className="block w-full text-left hover:text-zinc-300 transition-colors font-mono">
                {p} — {label}
              </button>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // ── Form mode (4 steps) ───────────────────────────────────────────────────────

  if (step === 'form') {
    const inputCls = 'input-field'
    return (
      <div className="page min-h-screen text-zinc-100">
        <header className="app-header">
          <div className="flex items-center gap-4">
            <button onClick={() => formStep > 1 ? setFormStep(s => s - 1) : setStep('select')} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400">
              <ArrowLeft size={18} />
            </button>
            <span className="font-semibold">Manual Form</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Simulation only
            </span>
            <span className="text-xs text-zinc-500">Step {formStep} of 4</span>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div className="h-full bg-white/80 transition-all duration-300" style={{ width: `${(formStep / 4) * 100}%` }} />
        </div>

        <main className="max-w-lg mx-auto px-8 py-10 space-y-5">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {formStep === 1 && (
            <>
              <h2 className="text-xl font-bold mb-1">Income & Employment</h2>
              <div>
                <label className="label">Monthly take-home income (₹)</label>
                <input type="number" value={form.monthly_income} onChange={e => updateForm('monthly_income', e.target.value)} placeholder="e.g. 75000" className={inputCls} min="0" />
              </div>
              <div>
                <label className="label">Total monthly EMI obligations (₹)</label>
                <input type="number" value={form.monthly_emi_obligations} onChange={e => updateForm('monthly_emi_obligations', e.target.value)} placeholder="e.g. 18000" className={inputCls} min="0" />
              </div>
              <div>
                <label className="label">Employment type</label>
                <select value={form.employment_type} onChange={e => updateForm('employment_type', e.target.value)} className={inputCls}>
                  {EMP_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Months at current job / in current business</label>
                <input type="number" value={form.employment_months} onChange={e => updateForm('employment_months', e.target.value)} placeholder="e.g. 36" className={inputCls} min="0" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.itr_filed} onChange={e => updateForm('itr_filed', e.target.checked)} className="w-4 h-4 rounded accent-white" />
                <span className="text-sm text-zinc-300">ITR filed for last financial year</span>
              </label>
            </>
          )}

          {formStep === 2 && (
            <>
              <h2 className="text-xl font-bold mb-1">Payment History</h2>
              <div>
                <label className="label">Max days overdue (DPD) in last 12 months</label>
                <input type="number" value={form.dpd_max_12m} onChange={e => updateForm('dpd_max_12m', e.target.value)} placeholder="0 if clean" className={inputCls} min="0" max="365" />
                <p className="text-xs text-zinc-500 mt-1">0 = no delays. A 30-DPD means a payment was 30 days late.</p>
              </div>
              <div>
                <label className="label">Missed EMI payments in last 12 months</label>
                <input type="number" value={form.missed_emi_12m} onChange={e => updateForm('missed_emi_12m', e.target.value)} placeholder="0" className={inputCls} min="0" max="24" />
              </div>
              <div>
                <label className="label">Bank bounces (ECS/NACH) in last 12 months</label>
                <input type="number" value={form.bank_bounce_count_12m} onChange={e => updateForm('bank_bounce_count_12m', e.target.value)} placeholder="0" className={inputCls} min="0" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.has_settled_account} onChange={e => updateForm('has_settled_account', e.target.checked)} className="w-4 h-4 rounded accent-white" />
                <span className="text-sm text-zinc-300">I have a settled or written-off loan account</span>
              </label>
            </>
          )}

          {formStep === 3 && (
            <>
              <h2 className="text-xl font-bold mb-1">Credit Profile</h2>
              <div>
                <label className="label">Credit history age (months since oldest account)</label>
                <input type="number" value={form.credit_history_months} onChange={e => updateForm('credit_history_months', e.target.value)} placeholder="e.g. 48" className={inputCls} min="0" />
              </div>
              <div>
                <label className="label">Hard credit inquiries in last 6 months</label>
                <input type="number" value={form.hard_inquiries_6m} onChange={e => updateForm('hard_inquiries_6m', e.target.value)} placeholder="0" className={inputCls} min="0" max="20" />
              </div>
              <div>
                <label className="label">Credit card utilization (%)</label>
                <input type="number" value={form.credit_card_utilization} onChange={e => updateForm('credit_card_utilization', e.target.value)} placeholder="e.g. 35" className={inputCls} min="0" max="100" />
                <p className="text-xs text-zinc-500 mt-1">Balance as % of total credit limit. Below 30% is ideal.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Active loan accounts</label>
                  <input type="number" value={form.active_loan_accounts} onChange={e => updateForm('active_loan_accounts', e.target.value)} placeholder="0" className={inputCls} min="0" />
                </div>
                <div>
                  <label className="label">Of which are secured</label>
                  <input type="number" value={form.secured_loans_count} onChange={e => updateForm('secured_loans_count', e.target.value)} placeholder="0" className={inputCls} min="0" />
                  <p className="text-xs text-zinc-500 mt-1">Home / car / gold loans</p>
                </div>
              </div>
            </>
          )}

          {formStep === 4 && (
            <>
              <h2 className="text-xl font-bold mb-1">Optional Details</h2>
              <div>
                <label className="label">Existing CIBIL score (self-reported, optional)</label>
                <input type="number" value={form.existing_cibil_score} onChange={e => updateForm('existing_cibil_score', e.target.value)} placeholder="e.g. 720" className={inputCls} min="300" max="900" />
                <p className="text-xs text-zinc-500 mt-1">If you know your CIBIL score, it acts as a cross-reference signal.</p>
              </div>
              <div className="glass rounded-xl p-4 text-sm text-zinc-400">
                <p className="font-medium text-amber-400 mb-1 text-xs uppercase tracking-wide">Simulation mode</p>
                <p className="text-xs leading-relaxed">This report is for self-assessment only. Manual entries are not verified and cannot be used for loan applications. Upload bank data or use PAN lookup for a verified score.</p>
              </div>
            </>
          )}

          <Button onClick={handleFormNext} className="w-full mt-2">
            {formStep < 4 ? <>Next <ChevronRight size={16} /></> : 'Preview & simulate'}
          </Button>
        </main>
      </div>
    )
  }

  return null
}
