import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Download } from 'lucide-react'
import { extractFeatures } from '../lib/featureExtract'
import { credit } from '../lib/api'
import { DEMO_PROFILES } from '../lib/demoData'
import FileDropzone from '../components/FileDropzone'
import type { FeatureVector } from '../types'

type Step = 'upload' | 'preview' | 'scoring'

const INR = (n: number) => '₹' + n.toLocaleString('en-IN')

const EMP_LABEL: Record<string, string> = {
  salaried: 'Salaried',
  self_employed: 'Self-employed',
  business_owner: 'Business owner',
  unemployed: 'Unemployed',
}

function PreviewRow({ label, value, flag }: { label: string; value: string; flag?: 'good' | 'warn' | 'bad' }) {
  const color =
    flag === 'good' ? 'text-emerald-400' :
    flag === 'bad'  ? 'text-red-400' :
    flag === 'warn' ? 'text-amber-400' :
    'text-slate-100'
  return (
    <div className="flex justify-between px-5 py-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: string }) {
  return <p className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white/2">{children}</p>
}

function foirPct(f: FeatureVector) {
  return ((f.monthly_emi_obligations / f.monthly_income) * 100).toFixed(0)
}

export default function Score() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [features, setFeatures] = useState<FeatureVector | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      setFeatures(await extractFeatures(file))
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

  const submit = async () => {
    if (!features) return
    setStep('scoring')
    try {
      const result = await credit.score(features)
      sessionStorage.setItem('latest_report', JSON.stringify(result))
      nav('/score/result')
    } catch {
      setError('Scoring failed — please try again.')
      setStep('upload')
    }
  }

  const downloadTemplate = () => {
    const cols = [
      'monthly_income','monthly_emi_obligations','dpd_max_12m','missed_emi_12m',
      'has_settled_account','credit_history_months','hard_inquiries_6m',
      'credit_card_utilization','active_loan_accounts','secured_loans_count',
      'employment_type','employment_months','bank_bounce_count_12m',
      'itr_filed','existing_cibil_score','signed_by',
    ]
    const example = '75000,18000,0,0,false,48,1,0.25,2,1,salaried,36,0,true,720,My_Bank'
    const blob = new Blob([cols.join(',') + '\n' + example], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'zkcredit_india_template.csv'
    a.click()
  }

  if (step === 'scoring') {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-100">Computing your score</p>
            <p className="text-slate-500 text-sm mt-1">Running CIBIL-aligned India credit model</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <header className="border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-semibold">Credit Assessment</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        {step === 'preview' && features ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Confirm your data</h1>
              <p className="text-slate-400 text-sm">Only these derived features are sent. Your raw file stays in your browser.</p>
            </div>

            {selectedDemo !== null && (
              <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3 mb-5">
                <div>
                  <span className="text-amber-400 font-medium text-sm">{DEMO_PROFILES[selectedDemo].name}</span>
                  <span className="text-slate-400 text-sm"> · {DEMO_PROFILES[selectedDemo].role}, {DEMO_PROFILES[selectedDemo].city}</span>
                  <p className="text-slate-500 text-xs mt-0.5">{DEMO_PROFILES[selectedDemo].scenario}</p>
                </div>
              </div>
            )}

            <div className="glass rounded-2xl divide-y divide-white/5 mb-6 overflow-hidden">
              <SectionHeader>Income & Obligations</SectionHeader>
              <PreviewRow label="Monthly income" value={INR(features.monthly_income)} />
              <PreviewRow label="Monthly EMI obligations" value={INR(features.monthly_emi_obligations)} />
              <PreviewRow
                label="FOIR (EMI / Income)"
                value={`${foirPct(features)}%`}
                flag={Number(foirPct(features)) <= 35 ? 'good' : Number(foirPct(features)) <= 50 ? 'warn' : 'bad'}
              />

              <SectionHeader>Payment History</SectionHeader>
              <PreviewRow
                label="Max DPD (12 months)"
                value={features.dpd_max_12m === 0 ? 'Clean · 0 days overdue' : `${features.dpd_max_12m} days overdue`}
                flag={features.dpd_max_12m === 0 ? 'good' : features.dpd_max_12m <= 30 ? 'warn' : 'bad'}
              />
              <PreviewRow
                label="Missed EMIs (12 months)"
                value={features.missed_emi_12m === 0 ? 'None' : String(features.missed_emi_12m)}
                flag={features.missed_emi_12m === 0 ? 'good' : 'bad'}
              />
              {features.has_settled_account && (
                <PreviewRow label="Settled / written-off account" value="Yes" flag="bad" />
              )}

              <SectionHeader>Credit Profile</SectionHeader>
              <PreviewRow label="Credit history age" value={`${features.credit_history_months} months`} />
              <PreviewRow
                label="Hard inquiries (6 months)"
                value={String(features.hard_inquiries_6m)}
                flag={features.hard_inquiries_6m === 0 ? 'good' : features.hard_inquiries_6m <= 2 ? 'warn' : 'bad'}
              />
              <PreviewRow
                label="Credit card utilization"
                value={`${(features.credit_card_utilization * 100).toFixed(0)}%`}
                flag={features.credit_card_utilization <= 0.30 ? 'good' : features.credit_card_utilization <= 0.60 ? 'warn' : 'bad'}
              />
              <PreviewRow
                label="Active loans"
                value={`${features.active_loan_accounts} total · ${features.secured_loans_count} secured`}
              />

              <SectionHeader>Employment & Banking</SectionHeader>
              <PreviewRow
                label="Employment"
                value={`${EMP_LABEL[features.employment_type]} · ${features.employment_months} months`}
              />
              <PreviewRow
                label="Bank bounces (ECS/NACH, 12m)"
                value={features.bank_bounce_count_12m === 0 ? 'None' : String(features.bank_bounce_count_12m)}
                flag={features.bank_bounce_count_12m === 0 ? 'good' : 'bad'}
              />
              <PreviewRow
                label="ITR filed"
                value={features.itr_filed ? 'Yes' : 'No'}
                flag={features.itr_filed ? 'good' : undefined}
              />
              {features.existing_cibil_score !== null && features.existing_cibil_score !== undefined && (
                <PreviewRow
                  label="CIBIL score (self-reported)"
                  value={String(features.existing_cibil_score)}
                  flag={features.existing_cibil_score >= 750 ? 'good' : features.existing_cibil_score >= 650 ? 'warn' : 'bad'}
                />
              )}
              <PreviewRow label="Data source" value={features.signed_by} />
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="btn-ghost flex-1">Change data</button>
              <button onClick={submit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Compute score <ChevronRight size={16} />
              </button>
            </div>
          </>

        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Upload your financial data</h1>
              <p className="text-slate-400 text-sm mb-1">India credit profile — 15 factors, CIBIL-aligned model.</p>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-3">
                <Download size={13} /> Download CSV template
              </button>
            </div>

            <FileDropzone onFile={handleFile} />
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

            <div className="mt-4 glass rounded-xl p-4">
              <p className="text-xs font-medium text-slate-400 mb-1.5">Required CSV columns</p>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                monthly_income · monthly_emi_obligations · dpd_max_12m · missed_emi_12m ·
                credit_history_months · hard_inquiries_6m · credit_card_utilization ·
                active_loan_accounts · secured_loans_count · employment_type ·
                employment_months · bank_bounce_count_12m
              </p>
            </div>

            <div className="mt-8">
              <p className="text-slate-500 text-sm mb-3 text-center">or try a demo profile</p>
              <div className="grid grid-cols-2 gap-3">
                {DEMO_PROFILES.map((p, i) => (
                  <button key={p.name} onClick={() => loadDemo(i)} className="glass-hover rounded-xl p-4 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-200">{p.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        p.expectedTier === 'Prime'  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' :
                        p.expectedTier === 'Gold'   ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                        p.expectedTier === 'Silver' ? 'text-slate-300 bg-slate-300/10 border-slate-300/30' :
                        p.expectedTier === 'Bronze' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' :
                                                      'text-slate-500 bg-slate-500/10 border-slate-500/30'
                      }`}>{p.expectedTier}</span>
                    </div>
                    <p className="text-xs text-slate-500">{p.role}</p>
                    <p className="text-xs text-slate-600">{p.city}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
