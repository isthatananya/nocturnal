// Lace ↔ midnight-js v4 provider adapters.
//
// `@midnight-ntwrk/midnight-js-contracts` v4 expects six `MidnightProviders`
// (privateState, publicData, zkConfig, proof, wallet, midnight). The Lace
// browser wallet exposes a DAppConnectorWalletAPI that can satisfy the
// wallet+midnight slots (it balances + submits transactions). The other four
// slots come from installed @midnight-ntwrk/midnight-js-* packages.
//
// The bridge between Lace's serialized-string transaction format and
// midnight-js's typed Transaction objects is done here.

import type {
  ConnectedAPI,
  InitialAPI,
} from '@midnight-ntwrk/dapp-connector-api'
import {
  Transaction,
  type SignatureEnabled,
  type Proof,
  type Binding,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/ledger-v8'
import type {
  CoinPublicKey,
  EncPublicKey,
} from '@midnight-ntwrk/ledger-v8'
import type {
  MidnightProvider,
  MidnightProviders,
  UnboundTransaction,
  WalletProvider,
} from '@midnight-ntwrk/midnight-js-types'
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types'
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider'

// ── Hex (de)serialization ────────────────────────────────────────────────────

function bytesToHex(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0')
  return s
}
function hexToBytes(h: string): Uint8Array {
  const clean = h.startsWith('0x') ? h.slice(2) : h
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return out
}

// ── Lace handle + address tuple ──────────────────────────────────────────────

export interface LaceConnection {
  api: ConnectedAPI
  shieldedAddress: string
  coinPublicKey: CoinPublicKey
  encryptionPublicKey: EncPublicKey
  networkId: string
}

export function getLaceInitialAPI(): InitialAPI | null {
  if (typeof window === 'undefined') return null
  return (window.midnight?.mnLace ?? null) as InitialAPI | null
}

export async function connectLace(networkId: string): Promise<LaceConnection> {
  const initial = getLaceInitialAPI()
  if (!initial) throw new Error('Lace wallet not installed')
  const api = await initial.connect(networkId)
  const addrs = await api.getShieldedAddresses()
  return {
    api,
    shieldedAddress: addrs.shieldedAddress,
    coinPublicKey: addrs.shieldedCoinPublicKey as CoinPublicKey,
    encryptionPublicKey: addrs.shieldedEncryptionPublicKey as EncPublicKey,
    networkId,
  }
}

// ── WalletProvider adapter ───────────────────────────────────────────────────
// Balances a proven-but-unbound transaction through Lace.

function laceAsWalletProvider(conn: LaceConnection): WalletProvider {
  return {
    async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
      const serialized = bytesToHex(tx.serialize())
      const balanced = await conn.api.balanceUnsealedTransaction(serialized)
      // Lace returns a sealed (signature-enabled, proven, fully-bound) transaction.
      const raw = hexToBytes(balanced.tx)
      return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
        'signature',
        'proof',
        'binding',
        raw,
      ) as FinalizedTransaction
    },
    getCoinPublicKey() {
      return conn.coinPublicKey
    },
    getEncryptionPublicKey() {
      return conn.encryptionPublicKey
    },
  }
}

// ── MidnightProvider adapter ─────────────────────────────────────────────────
// Submits a sealed transaction through Lace.

function laceAsMidnightProvider(conn: LaceConnection): MidnightProvider {
  return {
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      const serialized = bytesToHex(tx.serialize())
      await conn.api.submitTransaction(serialized)
      // submitTransaction returns void; the txId is the first identifier
      // already embedded in the transaction.
      const ids = (tx as unknown as { identifiers(): TransactionId[] }).identifiers()
      return ids[0]
    },
  }
}

// ── Top-level provider bundle builder ────────────────────────────────────────

export interface BuildProvidersConfig {
  conn: LaceConnection
  /** Indexer GraphQL URL — VITE_INDEXER_URL */
  indexerUrl: string
  /** Indexer WebSocket URL — VITE_INDEXER_WS */
  indexerWsUrl: string
  /** Proof server URL — VITE_PROOF_SERVER_URL (or '/proof' if proxied) */
  proofServerUrl: string
  /** Base URL where compile.sh emitted the ZK artifacts; used by FetchZkConfigProvider */
  zkArtifactsBaseUrl: string
  /** Stable account id for the LevelDB private-state store */
  accountId: string
  /** Password for the private-state storage (≥16 chars). Derived per-user. */
  privateStoragePassword: string
}

export function buildProviders<PCK extends string = string>(
  cfg: BuildProvidersConfig,
): MidnightProviders<PCK, string, unknown> {
  const zkConfigProvider = new FetchZkConfigProvider<PCK>(cfg.zkArtifactsBaseUrl)

  // The Lace v4 ConnectedAPI also exposes `getProvingProvider(keyMaterial)`
  // which proves locally inside the wallet — a stronger privacy story but
  // heavier on the wallet. We default to the HTTP proof server because it's
  // what docker-compose wires up and what the demo screens probe.
  //
  // httpClientProvingProvider returns a low-level ProvingProvider; we wrap
  // it into a high-level ProofProvider via createProofProvider. We import
  // lazily to keep the dependency tree clean for tests.
  const proofProviderPromise = (async () => {
    const mod = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider')
    const lowLevel = mod.httpClientProvingProvider(cfg.proofServerUrl, zkConfigProvider)
    return createProofProvider(lowLevel)
  })()

  // Sync proxy: forward calls to the async-resolved proof provider.
  const proofProvider = {
    async proveTx(unprovenTx: any, proveCfg?: any) {
      const p = await proofProviderPromise
      return p.proveTx(unprovenTx, proveCfg)
    },
  }

  const publicDataProvider = indexerPublicDataProvider(cfg.indexerUrl, cfg.indexerWsUrl)

  const privateStateProvider = levelPrivateStateProvider({
    accountId: cfg.accountId,
    privateStoragePasswordProvider: () => cfg.privateStoragePassword,
  })

  const walletProvider = laceAsWalletProvider(cfg.conn)
  const midnightProvider = laceAsMidnightProvider(cfg.conn)

  return {
    zkConfigProvider,
    proofProvider: proofProvider as any,
    publicDataProvider,
    privateStateProvider: privateStateProvider as any,
    walletProvider,
    midnightProvider,
  }
}

// ── Notes for the deploy/apply flows ─────────────────────────────────────────
// 1. The `compiledContract` argument to deployContract/findDeployedContract is
//    produced by running `./contract/compile.sh`; it lives at
//    `/contract/zk-artifacts/index.cjs` and is loaded with a dynamic import.
// 2. The privateStoragePassword should be derived from a stable per-user
//    secret. For the hackathon demo we use a deterministic hash of the
//    wallet's coin public key — good enough for browser-local LevelDB.
// 3. If the host page does not run on HTTPS, IndexedDB+LevelDB may not be
//    available. The /deploy page surfaces this as an actionable error.

export { bytesToHex, hexToBytes }
