import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, full_name: string, date_of_birth: string, profession: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    await auth.login(email, password)
    const me = await auth.me()
    setUser(me)
  }

  const signup = async (email: string, password: string, full_name: string, date_of_birth: string, profession: string) => {
    await auth.signup(email, password, full_name, date_of_birth, profession)
    const me = await auth.me()
    setUser(me)
  }

  const logout = async () => {
    await auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
