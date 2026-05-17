export type TierLabel = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Prime'
export type UserRole = 'borrower' | 'bank'
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
  encrypted_inputs?: string   // AES-256-GCM blob; decryptable only on originating device
  encrypted_at_rest?: boolean
  encrypted_at_rest_fp?: string   // sha256(ciphertext)[:16] — verification handle for at-rest cipher
}

export interface User {
  id: string
  email: string
  full_name: string | null
  date_of_birth: string | null
  profession: string | null
  wallet_address: string | null
  role: UserRole
  email_verified?: boolean
}

export interface Bank {
  bank_id: string
  name: string
  tagline: string
  min_score: number
  min_tier: number
  max_loan: number
  interest_rate: number
  term_months: number
  logo_color: string
  features: string[]
  approval_probability: number | null
}

export type LoanRequestStatus = 'pending' | 'approved' | 'rejected' | 'countered'

export interface LoanRequest {
  request_id: string
  user_id: string
  bank_id: string
  bank_name: string
  report_id: string
  amount: number
  tier: number
  tier_label: TierLabel
  score: number
  status: LoanRequestStatus
  created_at: string
  updated_at: string
  message: string | null
  tx_hash: string | null
  borrower_name?: string | null
  approval_probability?: number | null
  risk_score?: number | null
  risk_label?: string | null
  // Populated only when the bank has countered the application
  counter_amount?: number | null
  counter_rate?: number | null
  counter_term_months?: number | null
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

export type EmiStatus = 'paid' | 'due' | 'overdue' | 'upcoming'

export interface EmiRow {
  seq: number
  due_date: string
  principal: number
  interest: number
  emi: number
  balance: number
  status: EmiStatus
}

export interface LoanSchedule {
  report_id: string
  principal: number
  apr_pct: number
  term_months: number
  emi: number
  total_interest: number
  total_paid: number
  paid_count: number
  fully_repaid: boolean
  loan_tx_hash: string | null
  loan_repaid: boolean
  rows: EmiRow[]
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
