/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // The Midnight onchain-runtime + ledger packages ship as WASM modules.
    // Vite needs explicit help to load them in the browser bundle.
    wasm(),
    topLevelAwait(),
    // midnight-js-contracts pulls in Node-style `fs` / `path` etc. internally;
    // polyfill them so the browser bundle doesn't crash on import.
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util', 'crypto', 'path'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  // The Midnight SDK uses `globalThis.process` and `Buffer` at module-load time;
  // pin both so the polyfills initialise before any SDK code runs.
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/dataset': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/proof': {
        target: process.env.PROOF_PROXY_TARGET || 'http://localhost:6300',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/proof/, ''),
      },
    },
  },
  // Exclude all Midnight SDK packages from Vite's esbuild pre-bundler.
  // compact-js ships ESM-only (no dist/cjs/) — esbuild can't process it,
  // crashing the entire module graph on startup. Native ESM imports work fine.
  optimizeDeps: {
    exclude: [
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-types',
      '@midnight-ntwrk/midnight-js-network-id',
      '@midnight-ntwrk/midnight-js-fetch-zk-config-provider',
      '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
      '@midnight-ntwrk/midnight-js-level-private-state-provider',
      '@midnight-ntwrk/midnight-js-utils',
      '@midnight-ntwrk/dapp-connector-api',
      '@midnight-ntwrk/platform-js',
      '@midnight-ntwrk/wallet-sdk-address-format',
    ],
  },
  worker: {
    format: 'es',
  },
})
