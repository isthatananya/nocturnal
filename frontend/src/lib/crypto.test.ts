// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { encryptReport, decryptReport } from './crypto'

const sampleReport = {
  report_id: 'rpt_test',
  score: 720,
  tier: 3,
  tier_label: 'Gold',
  loan_limit: 600000,
  interest_rate: '14',
  term_months: 36,
  breakdown: { payment_pts: 30, foir_pts: 22, history_pts: 12,
               credit_mix_pts: 11, inquiry_pts: 9, adjustment: 0 },
  data_source: 'form',
  generated_at: '2026-04-01T00:00:00Z',
  cached: false,
  loan_applied: false,
  loan_tx_hash: null,
}

describe('client-side encryptReport / decryptReport', () => {
  it('round-trips an arbitrary report through a password', async () => {
    const blob = await encryptReport(sampleReport, 'correct horse battery staple')
    const parsed = JSON.parse(blob)
    expect(parsed).toMatchObject({ salt: expect.any(String), iv: expect.any(String), ciphertext: expect.any(String) })

    const round = await decryptReport(blob, 'correct horse battery staple')
    expect(round).toEqual(sampleReport)
  })

  it('fails to decrypt with the wrong password', async () => {
    const blob = await encryptReport(sampleReport, 'right')
    await expect(decryptReport(blob, 'wrong')).rejects.toBeDefined()
  })

  it('produces different ciphertexts for the same plaintext (random IV+salt)', async () => {
    const a = await encryptReport(sampleReport, 'pw')
    const b = await encryptReport(sampleReport, 'pw')
    expect(a).not.toBe(b)
  })
})
