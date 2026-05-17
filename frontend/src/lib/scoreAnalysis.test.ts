// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { analyseReport } from './scoreAnalysis'
import type { Breakdown, FeatureVector } from '../types'

const FULL: Breakdown = {
  payment_pts: 35,
  foir_pts: 25,
  history_pts: 15,
  credit_mix_pts: 15,
  inquiry_pts: 10,
  adjustment: 0,
}

const PERFECT_INPUTS: Partial<FeatureVector> = {
  monthly_income: 80000,
  monthly_emi_obligations: 8000,    // 10% FOIR
  dpd_max_12m: 0,
  missed_emi_12m: 0,
  has_settled_account: false,
  credit_history_months: 84,
  hard_inquiries_6m: 0,
  credit_card_utilization: 0.18,
  active_loan_accounts: 2,
  secured_loans_count: 1,
}

describe('analyseReport.topImprovements', () => {
  it('is empty when every factor is maxed', () => {
    const a = analyseReport(FULL, PERFECT_INPUTS)
    expect(a.topImprovements).toEqual([])
  })

  it('surfaces the biggest reachable win first (easy wins beat hard wins on ties)', () => {
    // High CC utilization is the textbook "fast and big" credit win — pay
    // down balance before statement and score jumps within one cycle. The
    // ranker should put it ahead of FOIR even though FOIR is also weak,
    // because mix bracket jumps give more raw points than the FOIR bracket
    // ladder over the same period.
    const bd: Breakdown = { payment_pts: 35, foir_pts: 3, history_pts: 15, credit_mix_pts: 0, inquiry_pts: 10, adjustment: 0 }
    const inputs: Partial<FeatureVector> = {
      monthly_income: 80000,
      monthly_emi_obligations: 50000,        // ~62% FOIR
      credit_card_utilization: 0.85,         // critical mix bucket
      active_loan_accounts: 2,
      secured_loans_count: 1,
      credit_history_months: 48,
    }
    const a = analyseReport(bd, inputs)
    expect(a.topImprovements.length).toBeGreaterThan(0)
    expect(a.topImprovements[0].factorKey).toBe('mix')
  })

  it('caps at three actions even when many factors are weak', () => {
    const bd: Breakdown = { payment_pts: 0, foir_pts: 0, history_pts: 0, credit_mix_pts: 0, inquiry_pts: 0, adjustment: 0 }
    const inputs: Partial<FeatureVector> = {
      monthly_income: 20000,
      monthly_emi_obligations: 18000,
      dpd_max_12m: 95,
      missed_emi_12m: 4,
      credit_history_months: 0,
      credit_card_utilization: 0.9,
      active_loan_accounts: 0,
      secured_loans_count: 0,
      hard_inquiries_6m: 6,
    }
    const a = analyseReport(bd, inputs)
    expect(a.topImprovements.length).toBeLessThanOrEqual(3)
  })

  it('all actions carry positive point gains and difficulty/timeline metadata', () => {
    const bd: Breakdown = { payment_pts: 15, foir_pts: 10, history_pts: 6, credit_mix_pts: 5, inquiry_pts: 5, adjustment: 0 }
    const inputs: Partial<FeatureVector> = {
      monthly_income: 50000,
      monthly_emi_obligations: 25000,
      dpd_max_12m: 35,
      credit_card_utilization: 0.4,
      credit_history_months: 18,
      hard_inquiries_6m: 3,
    }
    const a = analyseReport(bd, inputs)
    for (const action of a.topImprovements) {
      expect(action.cibilPointGain).toBeGreaterThan(0)
      expect(action.cibilPointGain).toBe(action.rawPointGain * 6)
      expect(['easy', 'medium', 'hard']).toContain(action.difficulty)
      expect(action.timeline.length).toBeGreaterThan(0)
    }
  })
})
