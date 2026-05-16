import { createContext, useContext, useEffect, useState } from 'react'
import { connectWallet, isWalletAvailable } from '../lib/midnight'
import { auth } from '../lib/api'
import { useAuth } from './AuthContext'

interface WalletState {
  address: string | null
  installed: boolean
  connecting: boolean
  connect: () => Promise<void>
  error: string | null
}

const WalletContext = createContext<WalletState>(null!)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [address, setAddress] = useState<string | null>(user?.wallet_address ?? null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const installed = isWalletAvailable()

  useEffect(() => {
    if (user?.wallet_address) setAddress(user.wallet_address)
  }, [user])

  const connect = async () => {
    if (!installed) {
      setError('Lace wallet not detected. Install it from lacewallet.io to apply for loans.')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const addr = await connectWallet()
      if (!addr) throw new Error('Wallet returned no address')
      setAddress(addr)
      await auth.linkWallet(addr)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <WalletContext.Provider value={{ address, installed, connecting, connect, error }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
