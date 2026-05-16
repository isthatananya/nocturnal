import Papa from 'papaparse'
import type { EmploymentType, FeatureVector } from '../types'

const REQUIRED = [
  'monthly_income',
  'monthly_emi_obligations',
  'dpd_max_12m',
  'missed_emi_12m',
  'credit_history_months',
  'hard_inquiries_6m',
  'credit_card_utilization',
  'active_loan_accounts',
  'secured_loans_count',
  'employment_type',
  'employment_months',
  'bank_bounce_count_12m',
] as const

const VALID_EMP: EmploymentType[] = ['salaried', 'self_employed', 'business_owner', 'unemployed']

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'yes'
}

function parseEmpType(v: unknown): EmploymentType {
  const s = String(v).toLowerCase().trim() as EmploymentType
  if (!VALID_EMP.includes(s))
    throw new Error(`Invalid employment_type "${v}". Must be: ${VALID_EMP.join(' | ')}`)
  return s
}

function buildFeatures(row: Record<string, unknown>): FeatureVector {
  for (const key of REQUIRED) {
    if (row[key] === undefined || row[key] === null || row[key] === '')
      throw new Error(`Missing required field: ${key}`)
  }

  const rawCibil = row.existing_cibil_score
  const cibil = rawCibil !== undefined && rawCibil !== null && rawCibil !== '' && rawCibil !== 'null'
    ? Number(rawCibil)
    : null

  return {
    monthly_income:          Number(row.monthly_income),
    monthly_emi_obligations: Number(row.monthly_emi_obligations),
    dpd_max_12m:             Number(row.dpd_max_12m),
    missed_emi_12m:          Number(row.missed_emi_12m),
    has_settled_account:     parseBool(row.has_settled_account ?? false),
    credit_history_months:   Number(row.credit_history_months),
    hard_inquiries_6m:       Number(row.hard_inquiries_6m),
    credit_card_utilization: Number(row.credit_card_utilization),
    active_loan_accounts:    Number(row.active_loan_accounts),
    secured_loans_count:     Number(row.secured_loans_count),
    employment_type:         parseEmpType(row.employment_type),
    employment_months:       Number(row.employment_months),
    bank_bounce_count_12m:   Number(row.bank_bounce_count_12m),
    itr_filed:               parseBool(row.itr_filed ?? false),
    existing_cibil_score:    cibil,
    signed_by:               String(row.signed_by ?? 'Manual_Upload'),
  }
}

export function extractFromCSV(file: File): Promise<FeatureVector> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const row = results.data[0] as Record<string, unknown>
          if (!row) return reject(new Error('CSV is empty'))
          resolve(buildFeatures(row))
        } catch (e) { reject(e) }
      },
      error(err) { reject(new Error(err.message)) },
    })
  })
}

export function extractFromJSON(file: File): Promise<FeatureVector> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(buildFeatures(JSON.parse(reader.result as string)))
      } catch (e) {
        reject(e instanceof SyntaxError ? new Error('Invalid JSON') : e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export async function extractFeatures(file: File): Promise<FeatureVector> {
  if (file.name.endsWith('.csv')) return extractFromCSV(file)
  if (file.name.endsWith('.json')) return extractFromJSON(file)
  throw new Error('Unsupported file type. Use .csv or .json')
}
