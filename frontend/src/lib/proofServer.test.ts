// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeProofServer } from './midnight'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('probeProofServer', () => {
  it('reports healthy on a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))
    const r = await probeProofServer(500)
    expect(r.healthy).toBe(true)
    expect(r.status).toBe(200)
    expect(r.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('reports healthy even on a 404 (some builds 404 /health but stay reachable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', { status: 404 })))
    const r = await probeProofServer(500)
    expect(r.healthy).toBe(true)
    expect(r.status).toBe(404)
  })

  it('reports unhealthy when fetch throws (network down)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect refused')))
    const r = await probeProofServer(500)
    expect(r.healthy).toBe(false)
    expect(r.error).toContain('connect refused')
  })

  it('reports unhealthy on abort (timeout)', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    }))
    const r = await probeProofServer(50)
    expect(r.healthy).toBe(false)
  })
})
