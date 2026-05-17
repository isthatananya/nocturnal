import type { FeatureVector } from '../types'
import panProfileData from '../data/pan_profiles.json'

export interface DemoProfile {
  id: string                   // e.g. "prime_profile_01" — stable across renames
  scenario: string
  expectedTier: string
  features: FeatureVector
}

const _RAW: Omit<DemoProfile, 'id'>[] = [
  {
    scenario: 'Prime — perfect profile, full loan limit',
    expectedTier: 'Prime',
    features: {
      monthly_income: 120000,
      monthly_emi_obligations: 24000,
      dpd_max_12m: 0,
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 84,
      hard_inquiries_6m: 0,
      credit_card_utilization: 0.18,
      active_loan_accounts: 2,
      secured_loans_count: 2,
      employment_type: 'salaried',
      employment_months: 60,
      bank_bounce_count_12m: 0,
      itr_filed: true,
      existing_cibil_score: 792,
      signed_by: 'HDFC_Bank',
      data_source: 'upload',
    },
  },
  {
    scenario: 'Gold — strong profile with one late payment',
    expectedTier: 'Gold',
    features: {
      monthly_income: 68000,
      monthly_emi_obligations: 25840,
      dpd_max_12m: 28,
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 42,
      hard_inquiries_6m: 2,
      credit_card_utilization: 0.42,
      active_loan_accounts: 2,
      secured_loans_count: 1,
      employment_type: 'salaried',
      employment_months: 30,
      bank_bounce_count_12m: 1,
      itr_filed: true,
      existing_cibil_score: 718,
      signed_by: 'ICICI_Bank',
      data_source: 'upload',
    },
  },
  {
    scenario: 'Silver — self-employed, irregular income',
    expectedTier: 'Silver',
    features: {
      monthly_income: 52000,
      monthly_emi_obligations: 21840,
      dpd_max_12m: 45,
      missed_emi_12m: 1,
      has_settled_account: false,
      credit_history_months: 30,
      hard_inquiries_6m: 2,
      credit_card_utilization: 0.58,
      active_loan_accounts: 1,
      secured_loans_count: 0,
      employment_type: 'self_employed',
      employment_months: 36,
      bank_bounce_count_12m: 1,
      itr_filed: true,
      existing_cibil_score: 680,
      signed_by: 'Axis_Bank',
      data_source: 'upload',
    },
  },
  {
    scenario: 'Bronze — limited history, high EMI burden',
    expectedTier: 'Bronze',
    features: {
      monthly_income: 28000,
      monthly_emi_obligations: 12880,
      dpd_max_12m: 40,
      missed_emi_12m: 1,
      has_settled_account: false,
      credit_history_months: 24,
      hard_inquiries_6m: 3,
      credit_card_utilization: 0.72,
      active_loan_accounts: 2,
      secured_loans_count: 0,
      employment_type: 'salaried',
      employment_months: 14,
      bank_bounce_count_12m: 2,
      itr_filed: false,
      existing_cibil_score: null,
      signed_by: 'Kotak_Bank',
      data_source: 'upload',
    },
  },
  {
    scenario: 'None — ineligible, multiple defaults',
    expectedTier: 'None',
    features: {
      monthly_income: 18000,
      monthly_emi_obligations: 9900,
      dpd_max_12m: 95,
      missed_emi_12m: 4,
      has_settled_account: false,
      credit_history_months: 8,
      hard_inquiries_6m: 5,
      credit_card_utilization: 0.88,
      active_loan_accounts: 1,
      secured_loans_count: 0,
      employment_type: 'self_employed',
      employment_months: 6,
      bank_bounce_count_12m: 4,
      itr_filed: false,
      existing_cibil_score: null,
      signed_by: 'Manual_Upload',
      data_source: 'upload',
    },
  },
  {
    scenario: 'Fraudster — Prime score, will request over-limit amount',
    expectedTier: 'Prime',
    features: {
      monthly_income: 200000,
      monthly_emi_obligations: 20000,
      dpd_max_12m: 0,
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 96,
      hard_inquiries_6m: 0,
      credit_card_utilization: 0.08,
      active_loan_accounts: 3,
      secured_loans_count: 2,
      employment_type: 'salaried',
      employment_months: 84,
      bank_bounce_count_12m: 0,
      itr_filed: true,
      existing_cibil_score: 845,
      signed_by: 'SBI',
      data_source: 'upload',
    },
  },
]

// Number each profile within its tier so labels stay stable when entries are added/removed.
const _counters: Record<string, number> = {}
export const DEMO_PROFILES: DemoProfile[] = _RAW.map(p => {
  const slug = p.expectedTier.toLowerCase()
  _counters[slug] = (_counters[slug] ?? 0) + 1
  const n = String(_counters[slug]).padStart(2, '0')
  return { id: `${slug}_profile_${n}`, ...p }
})

export function profileLabel(p: DemoProfile): string {
  return `${p.expectedTier} Profile ${p.id.slice(-2)}`
}

// PAN lookup — maps 4-digit numeric part of PAN to one of 20 tier-distributed profiles.
// Indices 0-3: None, 4-7: Bronze, 8-11: Silver, 12-15: Gold, 16-19: Prime.
export function mockPanLookup(pan: string): FeatureVector {
  const idx = (parseInt(pan.slice(5, 9)) || 0) % 20
  const profile = panProfileData.profiles[idx] as FeatureVector
  return { ...profile, data_source: 'pan', signed_by: 'Synthetic_Bureau' }
}
