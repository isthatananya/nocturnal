/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_NETWORK_ID: string
  readonly VITE_INDEXER_URL: string
  readonly VITE_INDEXER_WS: string
  readonly VITE_NODE_RPC: string
  readonly VITE_PROOF_SERVER_URL: string
  readonly VITE_CONTRACT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
