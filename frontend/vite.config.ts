/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})
