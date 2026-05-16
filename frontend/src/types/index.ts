export type TierLabel = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Prime'
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner' | 'unemployed'

export interface Breakdown {
  payment_pts: number      // max 35
  foir_pts: number         // max 25 — Fixed Obligation to Income Ratio
  history_pts: number      // max 15
  credit_mix_pts: number   // max 15
  inquiry_pts: number      // max 10
  adjustment: number       // employment / ITR / CIBIL / bounce bonus-penalty
}

export type DataSource = 'upload' | 'form' | 'pan'

export interface Report {
  report_id: string
  user_id?: string
  score: number         // 300-900 CIBIL scale
  tier: number
  tier_label: TierLabel
  loan_limit: number    // INR
  interest_rate: string | null
  term_months: number | null
  breakdown: Breakdown
  data_source: DataSource
  generated_at: string
  cached: boolean
  loan_applied: boolean
  loan_tx_hash: string | null
}

export interface User {
  id: string
  email: string
  full_name: string | null
  date_of_birth: string | null
  profession: string | null
  wallet_address: string | null
  email_verified?: boolean
}

export interface FeatureVector {
  monthly_income: number
  monthly_emi_obligations: number
  dpd_max_12m: number
  missed_emi_12m: number
  has_settled_account: boolean
  credit_history_months: number
  hard_inquiries_6m: number
  credit_card_utilization: number
  active_loan_accounts: number
  secured_loans_count: number
  employment_type: EmploymentType
  employment_months: number
  bank_bounce_count_12m: number
  itr_filed: boolean
  existing_cibil_score: number | null
  signed_by: string
  data_source: DataSource
}

export interface ActiveLoan {
  report_id: string
  amount: number
  tx_hash: string
  issued_at: string
  due_at: string
  repaid: boolean
  interest_rate: string
  term_months: number
}

export const TIER_COLORS: Record<TierLabel, string> = {
  None:   'text-zinc-400',
  Bronze: 'text-amber-500',
  Silver: 'text-zinc-300',
  Gold:   'text-yellow-400',
  Prime:  'text-white',
}

export const TIER_BG: Record<TierLabel, string> = {
  None:   'bg-zinc-500/10 border-zinc-500/30',
  Bronze: 'bg-amber-500/10 border-amber-500/30',
  Silver: 'bg-zinc-300/10 border-zinc-300/30',
  Gold:   'bg-yellow-400/10 border-yellow-400/30',
  Prime:  'bg-white/8 border-white/20',
}
