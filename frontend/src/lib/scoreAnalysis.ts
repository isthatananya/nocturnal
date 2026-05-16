import type { Breakdown, FeatureVector } from '../types'

export type FactorStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

export interface FactorDetail {
  key: string
  label: string
  pts: number
  max: number
  pct: number
  status: FactorStatus
  statusLabel: string
  what: string        // what this measures
  verdict: string     // 1-line current state
  tip: string | null  // improvement action (null if already excellent)
}

export interface ScoreAnalysis {
  factors: FactorDetail[]
  strengths: FactorDetail[]      // status excellent or good
  weaknesses: FactorDetail[]     // status fair, poor, or critical
  adjustmentNote: string
}

function status(pct: number): FactorStatus {
  if (pct >= 0.9)  return 'excellent'
  if (pct >= 0.70) return 'good'
  if (pct >= 0.45) return 'fair'
  if (pct >= 0.20) return 'poor'
  return 'critical'
}

function statusLabel(s: FactorStatus): string {
  return { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', critical: 'Critical' }[s]
}

const EMP: Record<string, string> = {
  salaried: 'Salaried', self_employed: 'Self-employed',
  business_owner: 'Business owner', unemployed: 'Unemployed',
}

function paymentFactor(bd: Breakdown, inp?: Partial<FeatureVector>): FactorDetail {
  const pct = bd.payment_pts / 35
  const s = status(pct)
  const dpd = inp?.dpd_max_12m ?? null
  const missed = inp?.missed_emi_12m ?? null
  const settled = inp?.has_settled_account ?? false

  let verdict: string
  let tip: string | null = null

  if (settled) {
    verdict = 'You have a settled/written-off account on record.'
    tip = 'A settlement stays on your CIBIL report for 7 years. Write to the lender to explore "no-due certificate" conversion — some lenders allow it after 2 years of good conduct.'
  } else if (dpd !== null && dpd > 90) {
    verdict = `Severe delinquency — ${dpd} days overdue on an account.`
    tip = 'Clear all outstanding dues immediately. Any payment — even partial — stops the delinquency clock. Negotiate a restructuring plan with your lender before the account is written off.'
  } else if (dpd !== null && dpd > 30) {
    verdict = `Late payment of ${dpd} days detected in the last 12 months.`
    tip = 'Set up NACH (auto-debit) for all EMIs. Even one missed payment in 12 months drops this category by ~40%. Allow a 2-day float buffer in your EMI account.'
  } else if (missed !== null && missed > 0) {
    verdict = `${missed} EMI payment${missed > 1 ? 's' : ''} missed in the last 12 months.`
    tip = 'Enable auto-debit for every loan EMI. Keep a minimum balance of 2× your largest EMI in the account linked for NACH.'
  } else if (dpd !== null && dpd > 0) {
    verdict = `One ${dpd}-day delay detected — just short of a missed payment.`
    tip = 'This minor delay will age off after 12 months. Maintain a perfect record going forward and it will not recur.'
  } else {
    verdict = 'Perfect payment record — no delays, no defaults.'
  }

  return { key: 'payment', label: 'Payment History', pts: bd.payment_pts, max: 35, pct, status: s, statusLabel: statusLabel(s), what: 'EMI repayment discipline: DPD, missed payments, write-offs', verdict, tip }
}

function foirFactor(bd: Breakdown, inp?: Partial<FeatureVector>): FactorDetail {
  const pct = bd.foir_pts / 25
  const s = status(pct)
  const emi = inp?.monthly_emi_obligations
  const inc = inp?.monthly_income
  const foirPct = emi && inc ? Math.round((emi / inc) * 100) : null

  let verdict: string
  let tip: string | null = null

  if (foirPct !== null && foirPct > 55) {
    verdict = `FOIR of ${foirPct}% — most lenders cap approval at 55%.`
    tip = `To reach a healthy FOIR, reduce monthly EMIs by ₹${Math.round((emi! - inc! * 0.4)).toLocaleString('en-IN')} or increase monthly income by ₹${Math.round((emi! / 0.4 - inc!)).toLocaleString('en-IN')}. Prepay the highest-interest loan first (usually personal loan or credit card).`
  } else if (foirPct !== null && foirPct > 45) {
    verdict = `FOIR of ${foirPct}% — elevated; reduces loan eligibility.`
    tip = 'Avoid taking any new loans in the next 6 months. Use any bonus or windfall to prepay part of a personal loan EMI to bring FOIR below 40%.'
  } else if (foirPct !== null && foirPct > 35) {
    verdict = `FOIR of ${foirPct}% — moderate; room to improve.`
    tip = 'You are close to the ideal range. One prepayment of 3 EMIs on your highest-rate loan would likely move you into the "excellent" band.'
  } else if (foirPct !== null) {
    verdict = `FOIR of ${foirPct}% — healthy EMI-to-income ratio.`
  } else {
    verdict = pct >= 0.9 ? 'Excellent EMI-to-income ratio.' : 'Moderate EMI-to-income ratio.'
  }

  return { key: 'foir', label: 'EMI Burden (FOIR)', pts: bd.foir_pts, max: 25, pct, status: s, statusLabel: statusLabel(s), what: 'Monthly EMI obligations as % of take-home income', verdict, tip }
}

function historyFactor(bd: Breakdown, inp?: Partial<FeatureVector>): FactorDetail {
  const pct = bd.history_pts / 15
  const s = status(pct)
  const months = inp?.credit_history_months ?? null
  const years = months !== null ? (months / 12).toFixed(1) : null

  let verdict: string
  let tip: string | null = null

  if (months !== null && months < 6) {
    verdict = `Only ${months} months of credit history — very thin file.`
    tip = 'Apply for a secured credit card (against FD) to start building history. Use it for small monthly expenses and pay the full bill every month.'
  } else if (months !== null && months < 24) {
    verdict = `${months} months (${years} years) — limited history.`
    tip = 'Keep your oldest credit card or loan account active even if you rarely use it — closing it shortens your average history age and hurts this score.'
  } else if (months !== null && months < 60) {
    verdict = `${months} months (${years} years) — building steadily.`
    tip = 'This improves with time. Focus on maintaining existing accounts rather than opening new ones.'
  } else {
    verdict = months !== null ? `${months} months (${years} years) — strong credit history.` : 'Strong credit history.'
  }

  return { key: 'history', label: 'Credit History Age', pts: bd.history_pts, max: 15, pct, status: s, statusLabel: statusLabel(s), what: 'Age of your oldest credit account', verdict, tip }
}

function mixFactor(bd: Breakdown, inp?: Partial<FeatureVector>): FactorDetail {
  const pct = bd.credit_mix_pts / 15
  const s = status(pct)
  const util = inp?.credit_card_utilization ?? null
  const loans = inp?.active_loan_accounts ?? null
  const secured = inp?.secured_loans_count ?? null
  const utilPct = util !== null ? Math.round(util * 100) : null

  let verdict: string
  let tip: string | null = null

  if (utilPct !== null && utilPct > 75) {
    verdict = `CC utilization at ${utilPct}% — very high; severely impacts score.`
    tip = `Target below 30% utilization. Your current balance is using ${utilPct}% of your limit. Pay down at least ${utilPct - 30}% of your outstanding CC balance before the statement date to improve next month's score.`
  } else if (utilPct !== null && utilPct > 50) {
    verdict = `CC utilization at ${utilPct}% — above the recommended 30% threshold.`
    tip = 'Request a credit limit increase from your bank (without increasing spending) — this instantly improves your utilization ratio. Or pay the balance mid-cycle, before the statement is generated.'
  } else if (utilPct !== null && utilPct > 30) {
    verdict = `CC utilization at ${utilPct}% — slightly elevated.`
    tip = 'Bringing utilization below 30% (ideally 10–20%) is the fastest way to improve this category — results show in the next billing cycle.'
  } else if (loans !== null && loans === 0) {
    verdict = 'No active loans — limited credit mix.'
    tip = 'A secured credit card or a small gold loan builds credit mix quickly. Avoid personal loans until your history is stronger.'
  } else if (secured !== null && secured === 0 && loans !== null && loans > 0) {
    verdict = `${loans} active loan${loans > 1 ? 's' : ''} — all unsecured; no secured credit.`
    tip = 'Adding a secured loan (home, car, or gold loan) signals financial stability and improves your mix score. A gold loan against jewellery is the fastest to get (1–2 days).'
  } else {
    verdict = utilPct !== null
      ? `CC utilization at ${utilPct}% — healthy. Good loan mix.`
      : 'Good credit mix with healthy utilization.'
  }

  return { key: 'mix', label: 'Credit Mix & Utilization', pts: bd.credit_mix_pts, max: 15, pct, status: s, statusLabel: statusLabel(s), what: 'Credit card utilization + diversity of loan types', verdict, tip }
}

function inquiryFactor(bd: Breakdown, inp?: Partial<FeatureVector>): FactorDetail {
  const pct = bd.inquiry_pts / 10
  const s = status(pct)
  const n = inp?.hard_inquiries_6m ?? null

  let verdict: string
  let tip: string | null = null

  if (n !== null && n > 4) {
    verdict = `${n} loan applications in 6 months — signals financial stress to lenders.`
    tip = 'Each hard inquiry stays on your CIBIL report for 2 years. Stop applying for new loans for at least 6 months. Use an eligibility checker (soft pull) instead of direct applications to find the best offer without hurting your score.'
  } else if (n !== null && n > 2) {
    verdict = `${n} hard inquiries in the last 6 months — above ideal.`
    tip = 'Avoid new loan applications for the next 4–6 months. Multiple inquiries in quick succession signal loan-seeking behavior, which lowers lender confidence.'
  } else if (n !== null && n > 0) {
    verdict = `${n} hard inquiry — minor impact, will age off in 6 months.`
    tip = n > 1 ? 'Hold off on new applications for the next 3 months.' : null
  } else {
    verdict = 'No recent credit applications — maximum score in this category.'
  }

  return { key: 'inquiry', label: 'New Applications', pts: bd.inquiry_pts, max: 10, pct, status: s, statusLabel: statusLabel(s), what: 'Hard credit inquiries in the last 6 months', verdict, tip }
}

function adjustmentNote(bd: Breakdown, inp?: Partial<FeatureVector>): string {
  const parts: string[] = []
  const adj = bd.adjustment

  if (!inp) {
    return adj >= 0
      ? `Employment, ITR, and banking behaviour added +${adj} bonus points.`
      : `Employment, ITR, or banking issues reduced the score by ${Math.abs(adj)} points.`
  }

  if (inp.employment_type === 'unemployed') {
    parts.push('No employment (−8 pts)')
  } else {
    const months = inp.employment_months ?? 0
    if (inp.employment_type === 'salaried' && months >= 36) parts.push(`Stable salaried employment — ${months}m (+4 pts)`)
    else if (inp.employment_type === 'salaried' && months >= 12) parts.push(`Salaried ${months}m (+1–2 pts)`)
    else if (months >= 36) parts.push(`Established ${EMP[inp.employment_type ?? '']} business (+2 pts)`)
  }

  const bounces = inp.bank_bounce_count_12m ?? 0
  if (bounces === 0) parts.push('Zero bank bounces (+1 pt)')
  else if (bounces <= 2) parts.push(`${bounces} ECS bounce${bounces > 1 ? 's' : ''} (−3 pts)`)
  else parts.push(`${bounces} ECS bounces (−7 pts)`)

  if (inp.itr_filed) parts.push('ITR filed (+2 pts)')
  else parts.push('ITR not filed (0 pts — missed +2)')

  if (inp.existing_cibil_score) {
    const c = inp.existing_cibil_score
    if (c >= 750) parts.push(`CIBIL ${c} cross-reference (+3 pts)`)
    else if (c >= 700) parts.push(`CIBIL ${c} cross-reference (+1 pt)`)
    else parts.push(`CIBIL ${c} cross-reference (−3 pts)`)
  }

  return parts.join(' · ')
}

export function analyseReport(bd: Breakdown, inputs?: Partial<FeatureVector>): ScoreAnalysis {
  const factors: FactorDetail[] = [
    paymentFactor(bd, inputs),
    foirFactor(bd, inputs),
    historyFactor(bd, inputs),
    mixFactor(bd, inputs),
    inquiryFactor(bd, inputs),
  ]

  return {
    factors,
    strengths: factors.filter(f => f.status === 'excellent' || f.status === 'good'),
    weaknesses: factors.filter(f => f.status === 'fair' || f.status === 'poor' || f.status === 'critical'),
    adjustmentNote: adjustmentNote(bd, inputs),
  }
}
