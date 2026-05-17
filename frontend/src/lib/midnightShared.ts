// Lightweight Midnight helpers — NO imports from midnightProviders or any
// @midnight-ntwrk SDK package. Safe to import from any eagerly-loaded module.

export const MidnightError = {
  WALLET_NOT_INSTALLED:  'WALLET_NOT_INSTALLED',
  WALLET_REJECTED:       'WALLET_REJECTED',
  CONTRACT_NOT_DEPLOYED: 'CONTRACT_NOT_DEPLOYED',
  PROOF_SERVER_DOWN:     'PROOF_SERVER_DOWN',
  PROOF_FAILED:          'PROOF_FAILED',
  TX_FAILED:             'TX_FAILED',
} as const

export type MidnightErrorCode = (typeof MidnightError)[keyof typeof MidnightError]

export class MidnightApiError extends Error {
  constructor(public code: MidnightErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'MidnightApiError'
  }
}

export interface ProofServerStatus {
  healthy: boolean
  latencyMs: number
  status?: number
  error?: string
}

const PROOF_PROBE_PATH = '/proof/health'

export async function probeProofServer(timeoutMs = 2000): Promise<ProofServerStatus> {
  const started = performance.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(PROOF_PROBE_PATH, { method: 'GET', signal: ctrl.signal })
    return {
      healthy: true,
      latencyMs: Math.round(performance.now() - started),
      status: res.status,
    }
  } catch (e) {
    return {
      healthy: false,
      latencyMs: Math.round(performance.now() - started),
      error: e instanceof Error ? e.message : String(e),
    }
  } finally {
    clearTimeout(timer)
  }
}

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!(window as Record<string, unknown>).midnight
}
