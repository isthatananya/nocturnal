// Midnight Network integration — Option A (real ZK flow).
//
// Connects Lace (v4 dapp-connector-api), builds the six MidnightProviders
// required by `@midnight-ntwrk/midnight-js-contracts`, and exposes high-level
// `deployCreditLending`, `applyForLoan`, and `repayLoan` operations.
//
// The compiled Compact contract is loaded dynamically from
// `/contract/zk-artifacts/index.cjs` (emitted by `./contract/compile.sh`).
// If those artifacts are missing, every operation throws CONTRACT_NOT_DEPLOYED
// with an explanatory message so the UI can show an instructive screen.

import {
  connectLace,
  buildProviders,
  getLaceInitialAPI,
  type LaceConnection,
} from './midnightProviders'
import {
  deployContract,
  findDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'

export {
  MidnightError,
  MidnightApiError,
  probeProofServer,
} from './midnightShared'
export type { MidnightErrorCode, ProofServerStatus } from './midnightShared'

// ── Wallet detection / connect ───────────────────────────────────────────────

export function isWalletAvailable(): boolean {
  return getLaceInitialAPI() !== null
}

export interface WalletConnection {
  address: string
  connection: LaceConnection
}

export async function connectWallet(): Promise<WalletConnection | null> {
  if (!isWalletAvailable()) return null
  const networkId = import.meta.env.VITE_NETWORK_ID || 'testnet'
  try {
    setNetworkId(networkId)
    const connection = await connectLace(networkId)
    return { address: connection.shieldedAddress, connection }
  } catch {
    return null
  }
}

// ── Compiled-contract loader ─────────────────────────────────────────────────
// compile.sh writes the contract module to /contract/zk-artifacts/index.cjs;
// we dynamically import it so the app still bundles even when the artifacts
// haven't been generated yet.

const ZK_ARTIFACTS_BASE = '/contract/zk-artifacts'
const COMPILED_MODULE_URL = `${ZK_ARTIFACTS_BASE}/index.cjs`

async function loadCompiledContract(): Promise<unknown> {
  try {
    // Vite handles /url-style dynamic imports for runtime-only modules.
    const mod = await import(/* @vite-ignore */ COMPILED_MODULE_URL)
    // Compact emits a default Contract export; allow either shape.
    return (mod as any).CreditLending ?? (mod as any).Contract ?? (mod as any).default ?? mod
  } catch (e) {
    throw new MidnightApiError(
      MidnightError.CONTRACT_NOT_DEPLOYED,
      `Compiled contract artifacts not found at ${COMPILED_MODULE_URL}. Run ./contract/compile.sh first.`,
    )
  }
}

// ── Provider bundle helper ───────────────────────────────────────────────────

const PRIVATE_STATE_ID = 'credit-lending'

async function buildProvidersForConn(conn: LaceConnection) {
  return buildProviders({
    conn,
    indexerUrl:    import.meta.env.VITE_INDEXER_URL,
    indexerWsUrl:  import.meta.env.VITE_INDEXER_WS,
    proofServerUrl: import.meta.env.VITE_PROOF_SERVER_URL || '/proof',
    zkArtifactsBaseUrl: ZK_ARTIFACTS_BASE,
    accountId: conn.coinPublicKey,
    // Derive a per-wallet password from the coin public key — stable across
    // sessions, never leaves the browser. Real prod would prompt the user.
    privateStoragePassword: `nocturnal::${conn.coinPublicKey}`.padEnd(32, '0').slice(0, 32),
  })
}

// ── Deploy (used once by /deploy page) ───────────────────────────────────────

export interface DeployResult {
  contractAddress: string
  txHash: string
}

export async function deployCreditLending(): Promise<DeployResult> {
  const wallet = await connectWallet()
  if (!wallet) throw new MidnightApiError(MidnightError.WALLET_NOT_INSTALLED)

  const compiledContract = await loadCompiledContract()
  const providers = await buildProvidersForConn(wallet.connection)

  try {
    const deployed = await deployContract(providers as any, {
      compiledContract: compiledContract as any,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {
        creditTier: 0,
        expectedInterestBps: 0,
        expectedTermMonths: 0,
      },
    } as any)
    return {
      contractAddress: (deployed.deployTxData.public as any).contractAddress,
      txHash: (deployed.deployTxData.public as any).txHash,
    }
  } catch (e) {
    if (e instanceof MidnightApiError) throw e
    throw new MidnightApiError(
      MidnightError.TX_FAILED,
      e instanceof Error ? e.message : String(e),
    )
  }
}

// ── Loan apply ───────────────────────────────────────────────────────────────

export interface LoanParams {
  walletAddress: string
  compiledContract: unknown   // ignored — loaded from disk
  creditTier: number
  requestedAmount: bigint
  interestRateBps: number
  termMonths: number
}

export async function applyForLoan(params: LoanParams): Promise<string> {
  if (!isWalletAvailable()) {
    throw new MidnightApiError(MidnightError.WALLET_NOT_INSTALLED)
  }
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS
  if (!contractAddr) {
    throw new MidnightApiError(MidnightError.CONTRACT_NOT_DEPLOYED)
  }

  const wallet = await connectWallet()
  if (!wallet) throw new MidnightApiError(MidnightError.WALLET_REJECTED)

  const compiledContract = await loadCompiledContract()
  const providers = await buildProvidersForConn(wallet.connection)

  try {
    const deployed = await findDeployedContract(providers as any, {
      compiledContract: compiledContract as any,
      contractAddress: contractAddr as any,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {
        creditTier: params.creditTier,
        expectedInterestBps: params.interestRateBps,
        expectedTermMonths: params.termMonths,
      },
    } as any)

    const tx = await (deployed.callTx as any).applyForLoan(
      params.requestedAmount,
      params.interestRateBps,
      params.termMonths,
    )
    return (tx.public as any).txHash
  } catch (e) {
    if (e instanceof MidnightApiError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    if (/prove|circuit|zk/i.test(msg)) {
      throw new MidnightApiError(MidnightError.PROOF_FAILED, msg)
    }
    throw new MidnightApiError(MidnightError.TX_FAILED, msg)
  }
}

// ── Loan repay ───────────────────────────────────────────────────────────────

export async function repayLoan(
  _walletAddress: string,
  _compiledContract: unknown,
  amount: bigint,
): Promise<string> {
  if (!isWalletAvailable()) {
    throw new MidnightApiError(MidnightError.WALLET_NOT_INSTALLED)
  }
  const contractAddr = import.meta.env.VITE_CONTRACT_ADDRESS
  if (!contractAddr) {
    throw new MidnightApiError(MidnightError.CONTRACT_NOT_DEPLOYED)
  }

  const wallet = await connectWallet()
  if (!wallet) throw new MidnightApiError(MidnightError.WALLET_REJECTED)

  const compiledContract = await loadCompiledContract()
  const providers = await buildProvidersForConn(wallet.connection)

  try {
    const deployed = await findDeployedContract(providers as any, {
      compiledContract: compiledContract as any,
      contractAddress: contractAddr as any,
      privateStateId: PRIVATE_STATE_ID,
    } as any)
    const tx = await (deployed.callTx as any).repay(amount)
    return (tx.public as any).txHash
  } catch (e) {
    if (e instanceof MidnightApiError) throw e
    throw new MidnightApiError(
      MidnightError.TX_FAILED,
      e instanceof Error ? e.message : String(e),
    )
  }
}
