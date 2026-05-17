// Deploy credit_lending.compact to the configured Midnight network.
//
// Reads MIDNIGHT_WALLET_SEED from .env.local, builds providers, calls
// deployContract from @midnight-ntwrk/midnight-js-contracts, and prints the
// resulting contract address to stdout. The bash wrapper (deploy.sh) captures
// it and writes it back into .env.
//
// Activate by uncommenting the body below once `compile.sh` has produced
// contract/build/index.cjs and the packages are installed at the repo root.
//
// import { deployContract } from '@midnight-ntwrk/midnight-js-contracts'
// import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider'
// import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
// import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
// import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id'
// import { CreditLending } from '../build/index.cjs'

if (!process.env.MIDNIGHT_WALLET_SEED) {
  console.error('MIDNIGHT_WALLET_SEED not set (place in .env.local)')
  process.exit(1)
}

// --- Option A activation block (paste the real deploy here) ----------------
//
// setNetworkId(NetworkId.TestNet)
// const providers = {
//   midnightProvider: ... ,  // wallet-backed signer derived from MIDNIGHT_WALLET_SEED
//   publicDataProvider: indexerPublicDataProvider(
//     process.env.VITE_INDEXER_URL,
//     process.env.VITE_INDEXER_WS,
//   ),
//   proofProvider: httpClientProofProvider(process.env.VITE_PROOF_SERVER_URL),
//   zkConfigProvider: fetchZkConfigProvider(),
//   privateStateProvider: ... ,
// }
// const result = await deployContract(providers, {
//   contract: CreditLending,
//   initialPrivateState: { creditTier: 0, expectedInterestBps: 0, expectedTermMonths: 0 },
// })
// console.log(result.deployTxData.public.contractAddress)
// process.exit(0)
// ---------------------------------------------------------------------------

console.error(
  'deploy.mjs is scaffolded but not yet activated.\n' +
  'See contract/README.md and uncomment the activation block when ready.',
)
process.exit(2)
