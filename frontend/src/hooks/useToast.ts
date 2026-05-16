import { useState, useCallback } from 'react'

export type ToastVariant = 'default' | 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  open: boolean
}

const listeners: Array<(toasts: ToastItem[]) => void> = []
let toasts: ToastItem[] = []

function dispatch(t: ToastItem[]) {
  toasts = t
  listeners.forEach(l => l(toasts))
}

export function toast(title: string, opts?: { description?: string; variant?: ToastVariant }) {
  const id = Math.random().toString(36).slice(2)
  dispatch([...toasts, { id, title, description: opts?.description, variant: opts?.variant ?? 'default', open: true }])
  setTimeout(() => {
    dispatch(toasts.map(t => (t.id === id ? { ...t, open: false } : t)))
    setTimeout(() => dispatch(toasts.filter(t => t.id !== id)), 400)
  }, 4000)
}

export function useToastStore() {
  const [items, setItems] = useState<ToastItem[]>(toasts)
  const update = useCallback((t: ToastItem[]) => setItems([...t]), [])

  useState(() => {
    listeners.push(update)
    return () => { listeners.splice(listeners.indexOf(update), 1) }
  })

  return items
}
