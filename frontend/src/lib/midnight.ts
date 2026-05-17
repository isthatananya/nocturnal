// Midnight Network integration.
//
// **Option B (this PR, default)** — real Lace wallet connection + real proof-server
// health probe. Contract calls throw typed errors so the UI can render an
// instructive "deploy contract first" screen instead of silently mocking a tx hash.
//
// **Option A flip** — once you've run `./contract/compile.sh` and deployed
// `credit_lending.compact` to preprod, set VITE_CONTRACT_ADDRESS in `.env` and
// uncomment the marked block in `applyForLoan` below. The packages and imports
// needed for the real ZK proof path are already installed via package.json.

import type { DAppConnectorWalletAPI } from '@midnight-ntwrk/dapp-connector-api'

// ── Error sentinels ──────────────────────────────────────────────────────────

export const MidnightError = {
  WALLET_NOT_INSTALLED: 'WALLET_NOT_INSTALLED',
  WALLET_REJECTED:      'WALLET_REJECTED',
  CONTRACT_NOT_DEPLOYED:'CONTRACT_NOT_DEPLOYED',
  PROOF_SERVER_DOWN:    'PROOF_SERVER_DOWN',
  PROOF_FAILED:         'PROOF_FAILED',
  TX_FAILED:            'TX_FAILED',
} as const
export type MidnightErrorCode = (typeof MidnightError)[keyof typeof MidnightError]

export class MidnightApiError extends Error {
  constructor(public code: MidnightErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'MidnightApiError'
  }
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).midnight?.mnLace
}

export interface WalletConnection {
  address: string
  api: DAppConnectorWalletAPI
}

export async function connectWallet(): Promise<WalletConnection | null> {
  if (!isWalletAvailable()) return null
  try {
    const api: DAppConnectorWalletAPI = await (window as any).midnight.mnLace.enable()
    const address = await api.state().then((s: any) => s.address)
    return { address, api }
  } catch {
    return null
  }
}

// ── Proof server ─────────────────────────────────────────────────────────────

export interface ProofServerStatus {
  healthy: boolean
  latencyMs: number
  status?: number
  error?: string
}

const PROOF_PROBE_PATH = '/proof/health'   // Vite/nginx proxies /proof/* → proof-server

export async function probeProofServer(timeoutMs = 2000): Promise<ProofServerStatus> {
  const started = performance.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(PROOF_PROBE_PATH, { method: 'GET', signal: ctrl.signal })
    // Treat any non-network response as "reachable" — some proof-server builds
    // 404 on /health but still respond. We only care that the box is alive.
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

// ── Loan apply / repay ───────────────────────────────────────────────────────

export interface LoanParams {
  walletAddress: string
  compiledContract: unknown
  creditTier: number
  requestedAmount: bigint
  interestRateBps: number
  termMonths: number
}

export async function applyForLoan(_params: LoanParams): Promise<string> {
  if (!isWalletAvailable()) {
    throw new MidnightApiError(MidnightError.WALLET_NOT_INSTALLED)
  }
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS
  if (!contractAddr) {
    throw new MidnightApiError(MidnightError.CONTRACT_NOT_DEPLOYED)
  }

  // ── Option A activation ──────────────────────────────────────────────────
  // Uncomment after running `./contract/compile.sh` and deploying the contract:
  //
  // import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider'
  // import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
  // import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
  // import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts'
  // import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id'
  // import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider'
  // import { CreditLending } from '/contract/zk-artifacts/index.cjs'   // emitted by compile.sh
  //
  // setNetworkId(NetworkId.TestNet)
  // const providers = {
  //   midnightProvider: ...,
  //   publicDataProvider: indexerPublicDataProvider(
  //     import.meta.env.VITE_INDEXER_URL,
  //     import.meta.env.VITE_INDEXER_WS,
  //   ),
  //   proofProvider: httpClientProofProvider(import.meta.env.VITE_PROOF_SERVER_URL),
  //   zkConfigProvider: fetchZkConfigProvider(),
  //   privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'zkc' }),
  //   walletProvider: { ... } /* derived from connectWallet() result */,
  // }
  // const deployed = await findDeployedContract(providers, {
  //   contractAddress: contractAddr,
  //   contract: CreditLending,
  //   initialPrivateState: { creditTier: _params.creditTier,
  //                          expectedInterestBps: _params.interestRateBps,
  //                          expectedTermMonths: _params.termMonths },
  // })
  // const tx = await deployed.callTx.applyForLoan(
  //   _params.requestedAmount,
  //   _params.interestRateBps,
  //   _params.termMonths,
  // )
  // return tx.public.txHash
  // ────────────────────────────────────────────────────────────────────────

  throw new MidnightApiError(
    MidnightError.CONTRACT_NOT_DEPLOYED,
    'Option A block not activated — see contract/README.md',
  )
}

export async function repayLoan(
  _walletAddress: string,
  _compiledContract: unknown,
  _amount: bigint,
): Promise<string> {
  if (!isWalletAvailable()) {
    throw new MidnightApiError(MidnightError.WALLET_NOT_INSTALLED)
  }
  if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
    throw new MidnightApiError(MidnightError.CONTRACT_NOT_DEPLOYED)
  }
  // Same Option A pattern as applyForLoan; flip when contract is deployed.
  throw new MidnightApiError(MidnightError.CONTRACT_NOT_DEPLOYED)
}
