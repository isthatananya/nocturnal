import type { FeatureVector } from '../types'

export interface DemoProfile {
  name: string
  role: string
  city: string
  scenario: string
  expectedTier: string
  features: FeatureVector
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    name: 'Priya Sharma',
    role: 'Senior Software Engineer',
    city: 'Bengaluru',
    scenario: 'Prime — perfect profile, full loan limit',
    expectedTier: 'Prime',
    features: {
      monthly_income: 120000,
      monthly_emi_obligations: 24000,  // FOIR 20% — home + car EMIs
      dpd_max_12m: 0,
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 84,       // 7 years of credit history
      hard_inquiries_6m: 0,
      credit_card_utilization: 0.18,
      active_loan_accounts: 2,         // home loan + car loan
      secured_loans_count: 2,
      employment_type: 'salaried',
      employment_months: 60,
      bank_bounce_count_12m: 0,
      itr_filed: true,
      existing_cibil_score: 792,
      signed_by: 'HDFC_Bank',
    },
  },
  {
    name: 'Rahul Gupta',
    role: 'Product Manager',
    city: 'Delhi NCR',
    scenario: 'Gold — strong profile with one late payment',
    expectedTier: 'Gold',
    features: {
      monthly_income: 68000,
      monthly_emi_obligations: 25840,  // FOIR 38%
      dpd_max_12m: 28,                 // one near-miss payment
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 42,
      hard_inquiries_6m: 2,
      credit_card_utilization: 0.42,
      active_loan_accounts: 2,
      secured_loans_count: 1,          // car loan
      employment_type: 'salaried',
      employment_months: 30,
      bank_bounce_count_12m: 1,        // one ECS bounce
      itr_filed: true,
      existing_cibil_score: 718,
      signed_by: 'ICICI_Bank',
    },
  },
  {
    name: 'Anita Desai',
    role: 'Freelance Graphic Designer',
    city: 'Pune',
    scenario: 'Silver — self-employed, irregular income',
    expectedTier: 'Silver',
    features: {
      monthly_income: 52000,
      monthly_emi_obligations: 21840,  // FOIR 42%
      dpd_max_12m: 45,                 // one 45-day delay
      missed_emi_12m: 1,
      has_settled_account: false,
      credit_history_months: 30,
      hard_inquiries_6m: 2,
      credit_card_utilization: 0.58,
      active_loan_accounts: 1,         // personal loan
      secured_loans_count: 0,
      employment_type: 'self_employed',
      employment_months: 28,
      bank_bounce_count_12m: 1,
      itr_filed: true,
      existing_cibil_score: null,
      signed_by: 'Axis_Bank',
    },
  },
  {
    name: 'Suresh Kumar',
    role: 'Retail Store Employee',
    city: 'Lucknow',
    scenario: 'Bronze — limited history, high EMI burden',
    expectedTier: 'Bronze',
    features: {
      monthly_income: 28000,
      monthly_emi_obligations: 12880,  // FOIR 46%
      dpd_max_12m: 40,
      missed_emi_12m: 1,
      has_settled_account: false,
      credit_history_months: 18,
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
    },
  },
  {
    name: 'Meena Pillai',
    role: 'Street Food Vendor',
    city: 'Chennai',
    scenario: 'None — ineligible, multiple defaults',
    expectedTier: 'None',
    features: {
      monthly_income: 18000,
      monthly_emi_obligations: 9900,   // FOIR 55%
      dpd_max_12m: 95,                 // 3-month default
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
    },
  },
  {
    name: 'Vikram Singh',
    role: 'IAS Officer',
    city: 'Mumbai',
    scenario: 'Fraudster — Prime score but requests over-limit amount',
    expectedTier: 'Prime',
    features: {
      monthly_income: 200000,
      monthly_emi_obligations: 20000,  // FOIR 10%
      dpd_max_12m: 0,
      missed_emi_12m: 0,
      has_settled_account: false,
      credit_history_months: 96,       // 8 years
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
    },
  },
]
