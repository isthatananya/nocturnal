import { useEffect, useRef, useCallback } from 'react'

type MessageHandler = (data: unknown) => void

interface Options {
  enabled?: boolean
  onMessage: MessageHandler
}

export function useWebSocket(path: string, { enabled = true, onMessage }: Options) {
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled || unmountedRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}${path}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.type === 'ping') return
        onMessageRef.current(data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!unmountedRef.current) {
        // Reconnect after 3s
        timerRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [enabled, path])

  useEffect(() => {
    unmountedRef.current = false
    if (enabled) connect()

    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [enabled, connect])
}
