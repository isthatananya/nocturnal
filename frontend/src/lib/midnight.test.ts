// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MidnightApiError,
  MidnightError,
  applyForLoan,
  connectWallet,
  isWalletAvailable,
} from './midnight'

const _origStubEnv = vi.stubEnv

beforeEach(() => {
  // @ts-expect-error — augment globals
  delete (window as any).midnight
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('isWalletAvailable', () => {
  it('returns false when window.midnight is undefined', () => {
    expect(isWalletAvailable()).toBe(false)
  })

  it('returns true when window.midnight.mnLace exists', () => {
    ;(window as any).midnight = { mnLace: { enable: vi.fn() } }
    expect(isWalletAvailable()).toBe(true)
  })
})

describe('connectWallet', () => {
  it('returns null when wallet is not installed', async () => {
    expect(await connectWallet()).toBeNull()
  })

  it('returns {address, api} when Lace authorizes', async () => {
    const fakeApi = { state: vi.fn().mockResolvedValue({ address: 'mid1abc123' }) }
    ;(window as any).midnight = {
      mnLace: { enable: vi.fn().mockResolvedValue(fakeApi) },
    }
    const conn = await connectWallet()
    expect(conn).not.toBeNull()
    expect(conn?.address).toBe('mid1abc123')
    expect(conn?.api).toBe(fakeApi)
  })

  it('returns null when Lace throws (user rejected)', async () => {
    ;(window as any).midnight = {
      mnLace: { enable: vi.fn().mockRejectedValue(new Error('user rejected')) },
    }
    expect(await connectWallet()).toBeNull()
  })
})

describe('applyForLoan error sentinels', () => {
  const baseParams = {
    walletAddress: 'mid1abc123',
    compiledContract: null,
    creditTier: 3,
    requestedAmount: 500n,
    interestRateBps: 1400,
    termMonths: 36,
  }

  it('throws WALLET_NOT_INSTALLED when no wallet on window', async () => {
    await expect(applyForLoan(baseParams)).rejects.toMatchObject({
      code: MidnightError.WALLET_NOT_INSTALLED,
    })
  })

  it('throws CONTRACT_NOT_DEPLOYED when wallet installed but VITE_CONTRACT_ADDRESS empty', async () => {
    ;(window as any).midnight = { mnLace: { enable: vi.fn() } }
    _origStubEnv('VITE_CONTRACT_ADDRESS', '')
    await expect(applyForLoan(baseParams)).rejects.toBeInstanceOf(MidnightApiError)
    await expect(applyForLoan(baseParams)).rejects.toMatchObject({
      code: MidnightError.CONTRACT_NOT_DEPLOYED,
    })
  })
})
