// Mirror of the constants in contract/credit_lending.compact.
// Keeping these in TypeScript lets the UI render a human-readable preview of
// the assertions the on-chain ZK circuit will enforce — without depending on
// the contract being compiled or deployed.
//
// If you change the contract, update both files in lockstep.

export interface TierTerms {
  tier: number
  label: string
  maxLoanDust: number     // Uint<64> in the contract — symbolic rupee-equivalent units
  rateBps: number         // basis points; 1050 = 10.5%
  termMonths: number
}

// Source: contract/credit_lending.compact, circuits maxLoanForTier / rateForTier / termForTier
export const TIER_TERMS: TierTerms[] = [
  { tier: 0, label: 'None',   maxLoanDust: 0,        rateBps: 2400, termMonths: 12 },
  { tier: 1, label: 'Bronze', maxLoanDust: 500000,   rateBps: 2400, termMonths: 12 },
  { tier: 2, label: 'Silver', maxLoanDust: 2000000,  rateBps: 1800, termMonths: 24 },
  { tier: 3, label: 'Gold',   maxLoanDust: 5000000,  rateBps: 1400, termMonths: 36 },
  { tier: 4, label: 'Prime',  maxLoanDust: 10000000, rateBps: 1050, termMonths: 60 },
]

export function termsForTier(tier: number): TierTerms | undefined {
  return TIER_TERMS.find(t => t.tier === tier)
}

export interface AssertionPreview {
  label: string
  detail: string
}

/** Human-readable preview of the assertions credit_lending.compact will enforce. */
export function assertionsForApply(
  tier: number,
  requestedAmount: number,
  interestRateBps: number,
  termMonths: number,
): AssertionPreview[] {
  const t = termsForTier(tier)
  return [
    {
      label: 'tier ≥ 1',
      detail: `Your private tier (${t?.label ?? '—'}) qualifies for a loan.`,
    },
    {
      label: 'requestedAmount ≤ maxLoanForTier(tier)',
      detail: `₹${requestedAmount.toLocaleString('en-IN')} is within the ${t?.label ?? '—'} cap.`,
    },
    {
      label: 'interestBps == rateForTier(tier)',
      detail: `Rate ${(interestRateBps / 100).toFixed(2)}% matches the contracted ${t?.label ?? '—'} rate.`,
    },
    {
      label: 'termMonths == termForTier(tier)',
      detail: `${termMonths}-month term matches the contracted ${t?.label ?? '—'} term.`,
    },
    {
      label: 'witness terms match public terms',
      detail: 'Prevents you from claiming terms the scoring engine did not assign.',
    },
  ]
}
